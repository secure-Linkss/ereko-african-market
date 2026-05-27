import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../notifications/notifications.service';

interface OrderPlacedJob {
  orderId: string;
  userId: string | null;
  totalMinor: number;
  email: string;
  orderNumber: string;
}

/**
 * Processes background jobs for the 'orders' Bull queue.
 *
 * order.placed:
 *   1. Awards loyalty points to the user (1 point per £1 spent = 100 pence = 1 point)
 *   2. Creates an in-app notification
 *   3. (Email would be sent here via a mailer service)
 */
@Processor('orders')
export class OrdersProcessor {
  private readonly logger = new Logger(OrdersProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  @Process('order.placed')
  async handleOrderPlaced(job: Job<OrderPlacedJob>) {
    const { orderId, userId, totalMinor, email, orderNumber } = job.data;
    this.logger.log(`Processing order.placed for order ${orderNumber} (${orderId})`);

    try {
      // ── 1. Award loyalty points ───────────────────────────────────────────
      if (userId) {
        // 1 point per £1 spent (100 pence = 1 point)
        const pointsToAward = Math.floor(totalMinor / 100);

        if (pointsToAward > 0) {
          // Upsert loyalty account
          await this.prisma.loyaltyAccount.upsert({
            where: { userId },
            create: {
              userId,
              pointsBalance: pointsToAward,
              totalEarned: pointsToAward,
            },
            update: {
              pointsBalance: { increment: pointsToAward },
              totalEarned: { increment: pointsToAward },
            },
          });

          const loyaltyAccount = await this.prisma.loyaltyAccount.findUnique({
            where: { userId },
          });

          if (loyaltyAccount) {
            await this.prisma.loyaltyTransaction.create({
              data: {
                loyaltyId: loyaltyAccount.id,
                orderId,
                points: pointsToAward,
                type: 'earn',
                description: `Points earned from order ${orderNumber}`,
              },
            });

            // Update tier based on total earned
            const totalEarned = loyaltyAccount.totalEarned;
            const familyThreshold = this.config.get<number>('loyalty.familyThreshold') ?? 500;
            const elderThreshold = this.config.get<number>('loyalty.elderThreshold') ?? 2000;
            const royaltyThreshold = this.config.get<number>('loyalty.royaltyThreshold') ?? 5000;

            let newTier = loyaltyAccount.tier;
            if (totalEarned >= royaltyThreshold) newTier = 'Royalty' as any;
            else if (totalEarned >= elderThreshold) newTier = 'Elder' as any;
            else if (totalEarned >= familyThreshold) newTier = 'Family' as any;
            else newTier = 'Member' as any;

            if (newTier !== loyaltyAccount.tier) {
              await this.prisma.loyaltyAccount.update({
                where: { id: loyaltyAccount.id },
                data: { tier: newTier },
              });
            }
          }

          // Update order with loyalty points earned
          await this.prisma.order.update({
            where: { id: orderId },
            data: { loyaltyPointsEarned: pointsToAward },
          });

          this.logger.log(`Awarded ${pointsToAward} loyalty points to user ${userId} for order ${orderNumber}`);
        }

        // ── 2. Create in-app notification ──────────────────────────────────
        await this.prisma.notification.create({
          data: {
            userId,
            type: 'order_placed',
            title: 'Order Confirmed!',
            body: `Your order ${orderNumber} has been confirmed and is being processed.`,
            data: {
              orderId,
              orderNumber,
              totalMinor,
            },
          },
        });
      }

      // ── 3. Add order event ─────────────────────────────────────────────────
      await this.prisma.orderEvent.create({
        data: {
          orderId,
          eventType: 'order.confirmed',
          payload: {
            loyaltyPointsAwarded: userId ? Math.floor(totalMinor / 100) : 0,
            email,
          },
        },
      });

      // ── 4. Deduct loyalty points redeemed ──────────────────────────────────
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { loyaltyPointsRedeemed: true },
      });

      if (userId && order && order.loyaltyPointsRedeemed > 0) {
        const loyaltyAccount = await this.prisma.loyaltyAccount.findUnique({
          where: { userId },
        });

        if (loyaltyAccount) {
          const pointsToDeduct = order.loyaltyPointsRedeemed;

          await this.prisma.loyaltyAccount.update({
            where: { id: loyaltyAccount.id },
            data: {
              pointsBalance: { decrement: pointsToDeduct },
              totalRedeemed: { increment: pointsToDeduct },
            },
          });

          await this.prisma.loyaltyTransaction.create({
            data: {
              loyaltyId: loyaltyAccount.id,
              orderId,
              points: -pointsToDeduct,
              type: 'redeem',
              description: `Points redeemed for order ${orderNumber}`,
            },
          });
        }
      }

      // ── 5. Send order confirmation email ─────────────────────────────────────
      const frontendUrl = this.config.get<string>('frontend.url') ?? 'https://ereko.market';

      const orderForEmail = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          addresses: { where: { type: 'shipping' }, take: 1 },
          items: { select: { title: true, variantName: true, quantity: true, priceAmountMinor: true } },
          user: { select: { firstName: true } },
        },
      });

      const addr = orderForEmail?.addresses?.[0];
      await this.notifications.sendOrderConfirmation({
        email,
        orderNumber,
        orderTotal: `£${(totalMinor / 100).toFixed(2)}`,
        firstName: orderForEmail?.user?.firstName ?? 'Customer',
        orderItems: (orderForEmail?.items ?? []).map((item) => ({
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
      throw err; // Re-throw so Bull can retry
    }
  }
}
