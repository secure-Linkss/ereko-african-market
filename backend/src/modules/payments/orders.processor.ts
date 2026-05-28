import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { SupabaseService } from '../../supabase/supabase.service';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../notifications/notifications.service';
import { v4 as uuidv4 } from 'uuid';

interface OrderPlacedJob {
  orderId: string;
  userId: string | null;
  totalMinor: number;
  email: string;
  orderNumber: string;
}

@Processor('orders')
export class OrdersProcessor {
  private readonly logger = new Logger(OrdersProcessor.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  @Process('order.placed')
  async handleOrderPlaced(job: Job<OrderPlacedJob>) {
    const { orderId, userId, totalMinor, email, orderNumber } = job.data;
    this.logger.log(`Processing order.placed for order ${orderNumber} (${orderId})`);

    try {
      const now = new Date().toISOString();

      // ── 1. Award loyalty points ───────────────────────────────────────────
      if (userId) {
        const pointsToAward = Math.floor(totalMinor / 100);

        if (pointsToAward > 0) {
          const { data: existingLoyalty } = await this.supabase.db
            .from('LoyaltyAccount')
            .select('id, pointsBalance, totalEarned, tier')
            .eq('userId', userId)
            .single();

          if (existingLoyalty) {
            const newBalance = existingLoyalty.pointsBalance + pointsToAward;
            const newTotalEarned = existingLoyalty.totalEarned + pointsToAward;

            const familyThreshold = this.config.get<number>('loyalty.familyThreshold') ?? 500;
            const elderThreshold = this.config.get<number>('loyalty.elderThreshold') ?? 2000;
            const royaltyThreshold = this.config.get<number>('loyalty.royaltyThreshold') ?? 5000;

            let newTier = existingLoyalty.tier;
            if (newTotalEarned >= royaltyThreshold) newTier = 'Royalty';
            else if (newTotalEarned >= elderThreshold) newTier = 'Elder';
            else if (newTotalEarned >= familyThreshold) newTier = 'Family';
            else newTier = 'Member';

            await this.supabase.db
              .from('LoyaltyAccount')
              .update({ pointsBalance: newBalance, totalEarned: newTotalEarned, tier: newTier, updatedAt: now })
              .eq('id', existingLoyalty.id);

            // LoyaltyTransaction has NO updatedAt column
            await this.supabase.db.from('LoyaltyTransaction').insert({
              id: uuidv4(),
              loyaltyId: existingLoyalty.id,
              orderId,
              points: pointsToAward,
              type: 'earn',
              description: `Points earned from order ${orderNumber}`,
              createdAt: now,
            });
          } else {
            // Create new loyalty account
            const loyaltyId = uuidv4();
            await this.supabase.db.from('LoyaltyAccount').insert({
              id: loyaltyId,
              userId,
              pointsBalance: pointsToAward,
              totalEarned: pointsToAward,
              totalRedeemed: 0,
              tier: 'Member',
              createdAt: now,
              updatedAt: now,
            });

            await this.supabase.db.from('LoyaltyTransaction').insert({
              id: uuidv4(),
              loyaltyId,
              orderId,
              points: pointsToAward,
              type: 'earn',
              description: `Points earned from order ${orderNumber}`,
              createdAt: now,
            });
          }

          await this.supabase.db
            .from('Order')
            .update({ loyaltyPointsEarned: pointsToAward, updatedAt: now })
            .eq('id', orderId);

          this.logger.log(`Awarded ${pointsToAward} loyalty points to user ${userId} for order ${orderNumber}`);
        }

        // ── 2. Create in-app notification ──────────────────────────────────
        // Notification has NO updatedAt column
        await this.supabase.db.from('Notification').insert({
          id: uuidv4(),
          userId,
          type: 'order_placed',
          title: 'Order Confirmed!',
          body: `Your order ${orderNumber} has been confirmed and is being processed.`,
          data: { orderId, orderNumber, totalMinor },
          createdAt: now,
        });
      }

      // ── 3. Add order event ─────────────────────────────────────────────────
      // OrderEvent has NO updatedAt column
      await this.supabase.db.from('OrderEvent').insert({
        id: uuidv4(),
        orderId,
        eventType: 'order.confirmed',
        payload: {
          loyaltyPointsAwarded: userId ? Math.floor(totalMinor / 100) : 0,
          email,
        },
        createdAt: now,
      });

      // ── 4. Deduct loyalty points redeemed ──────────────────────────────────
      const { data: orderRows } = await this.supabase.db
        .from('Order')
        .select('loyaltyPointsRedeemed')
        .eq('id', orderId)
        .limit(1);

      const order = orderRows?.[0];

      if (userId && order && order.loyaltyPointsRedeemed > 0) {
        const { data: loyaltyRows } = await this.supabase.db
          .from('LoyaltyAccount')
          .select('id, pointsBalance, totalRedeemed')
          .eq('userId', userId)
          .limit(1);

        const loyaltyAccount = loyaltyRows?.[0];
        if (loyaltyAccount) {
          const pointsToDeduct = order.loyaltyPointsRedeemed;
          const newBalance = Math.max(0, loyaltyAccount.pointsBalance - pointsToDeduct);
          const newTotalRedeemed = loyaltyAccount.totalRedeemed + pointsToDeduct;

          await this.supabase.db
            .from('LoyaltyAccount')
            .update({ pointsBalance: newBalance, totalRedeemed: newTotalRedeemed, updatedAt: now })
            .eq('id', loyaltyAccount.id);

          await this.supabase.db.from('LoyaltyTransaction').insert({
            id: uuidv4(),
            loyaltyId: loyaltyAccount.id,
            orderId,
            points: -pointsToDeduct,
            type: 'redeem',
            description: `Points redeemed for order ${orderNumber}`,
            createdAt: now,
          });
        }
      }

      // ── 5. Send order confirmation email ─────────────────────────────────────
      const frontendUrl = this.config.get<string>('frontend.url') ?? 'https://ereko.market';

      const { data: fullOrder } = await this.supabase.db
        .from('Order')
        .select('id, userId')
        .eq('id', orderId)
        .single();

      const [{ data: items }, { data: addresses }] = await Promise.all([
        this.supabase.db
          .from('OrderItem')
          .select('title, variantName, quantity, priceAmountMinor')
          .eq('orderId', orderId),
        this.supabase.db
          .from('OrderAddress')
          .select('*')
          .eq('orderId', orderId)
          .eq('type', 'shipping')
          .limit(1),
      ]);

      let firstName = 'Customer';
      if (fullOrder?.userId) {
        const { data: userRows } = await this.supabase.db
          .from('User')
          .select('firstName')
          .eq('id', fullOrder.userId)
          .limit(1);
        firstName = userRows?.[0]?.firstName ?? 'Customer';
      }

      const addr = addresses?.[0];
      await this.notifications.sendOrderConfirmation({
        email,
        orderNumber,
        orderTotal: `£${(totalMinor / 100).toFixed(2)}`,
        firstName,
        orderItems: (items ?? []).map((item: any) => ({
          title: item.title,
          variantName: item.variantName,
          quantity: item.quantity,
          price: `£${(item.priceAmountMinor / 100).toFixed(2)}`,
        })),
        shippingAddress: {
          line1: addr?.line1 ?? '',
          line2: addr?.line2 ?? undefined,
          city: addr?.city ?? '',
          postcode: addr?.postcode ?? '',
          countryCode: addr?.countryCode ?? 'GB',
        },
        orderUrl: `${frontendUrl}/account/orders/${orderId}`,
      });

      this.logger.log(`order.placed job completed for ${orderNumber}`);
    } catch (err) {
      this.logger.error(
        `Failed to process order.placed for ${orderNumber}: ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }
}
