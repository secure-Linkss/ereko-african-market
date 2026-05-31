import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EmailJobsService {
  private readonly logger = new Logger(EmailJobsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  private get frontendUrl(): string {
    return this.config.get<string>('frontend.url') ?? 'https://ereko-african-market.vercel.app/en-gb';
  }

  // ─── Feature 2: Abandoned Cart ──────────────────────────────────────────────
  // Run every 15 minutes, check for carts older than 1 hour that haven't been purchased

  @Cron('0 */15 * * * *')
  async processAbandonedCarts(): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const cutoff = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // don't email carts older than 25h

    // Find carts: has a userId (so has email), not converted to paid order, no email sent yet
    const { data: carts } = await this.supabase.db
      .from('Cart')
      .select('id, userId, updatedAt, subtotalMinor, abandonedEmailSentAt')
      .not('userId', 'is', null)
      .is('abandonedEmailSentAt', null)
      .lt('updatedAt', oneHourAgo)
      .gt('updatedAt', cutoff);

    if (!carts?.length) return;

    for (const cart of carts) {
      try {
        await this.sendAbandonedCartEmail(cart);
      } catch (err) {
        this.logger.error(`Abandoned cart email failed for cart ${cart.id}: ${err.message}`);
      }
    }
  }

  private async sendAbandonedCartEmail(cart: any): Promise<void> {
    // Check cart still has items
    const { data: items } = await this.supabase.db
      .from('CartItem')
      .select('id, variantId, quantity, unitPriceMinor')
      .eq('cartId', cart.id);

    if (!items || items.length === 0) return;

    // Check user hasn't placed an order after the cart was created
    const { data: recentOrders } = await this.supabase.db
      .from('Order')
      .select('id')
      .eq('userId', cart.userId)
      .not('status', 'in', '(PENDING_PAYMENT,CANCELLED)')
      .gte('placedAt', cart.updatedAt)
      .limit(1);

    if (recentOrders?.length) {
      // User completed a purchase — mark cart so we don't try again
      await this.supabase.db.from('Cart').update({ abandonedEmailSentAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).eq('id', cart.id);
      return;
    }

    // Get user email
    const { data: user } = await this.supabase.db
      .from('User')
      .select('email, firstName')
      .eq('id', cart.userId)
      .single();

    if (!user?.email) return;

    // Enrich cart items
    const variantIds = items.map((i: any) => i.variantId);
    const { data: variants } = await this.supabase.db
      .from('ProductVariant')
      .select('id, productId, name, priceAmountMinor')
      .in('id', variantIds);

    const productIds = [...new Set((variants ?? []).map((v: any) => v.productId))];
    const { data: products } = await this.supabase.db
      .from('Product')
      .select('id, title, slug')
      .in('id', productIds);

    const variantMap = new Map((variants ?? []).map((v: any) => [v.id, v]));
    const productMap = new Map((products ?? []).map((p: any) => [p.id, p]));

    const cartItems = items.map((item: any) => {
      const variant = variantMap.get(item.variantId) ?? {};
      const product = productMap.get((variant as any).productId) ?? {};
      return {
        title: (product as any).title ?? 'Product',
        variantName: (variant as any).name ?? '',
        quantity: item.quantity,
        price: `£${(item.unitPriceMinor / 100).toFixed(2)}`,
      };
    });

    const subtotalMinor = items.reduce((sum: number, i: any) => sum + i.unitPriceMinor * i.quantity, 0);
    const cartUrl = `${this.frontendUrl}/cart`;
    const unsubscribeUrl = `${this.frontendUrl}/account?unsubscribe=cart`;

    await this.notifications.sendAbandonedCart({
      email: user.email,
      firstName: user.firstName ?? 'there',
      cartUrl,
      cartSubtotal: `£${(subtotalMinor / 100).toFixed(2)}`,
      items: cartItems,
      unsubscribeUrl,
    });

    // Mark email sent
    await this.supabase.db.from('Cart').update({
      abandonedEmailSentAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).eq('id', cart.id);

    // Log in AbandonedCartLog
    await this.supabase.db.from('AbandonedCartLog').upsert({
      id: uuidv4(),
      cartId: cart.id,
      email: user.email,
      sentAt: new Date().toISOString(),
      cartTotal: subtotalMinor,
    }, { onConflict: 'cartId' });

    this.logger.log(`Abandoned cart email sent to ${user.email} for cart ${cart.id}`);
  }

  // ─── Feature 4: Review Request ──────────────────────────────────────────────
  // Run every hour, find orders delivered 3 days ago without review request sent

  @Cron(CronExpression.EVERY_HOUR)
  async processReviewRequests(): Promise<void> {
    // Default: 3 days (259200000 ms). Use 3-day window: delivered between 3d and 4d ago
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();

    const { data: orders } = await this.supabase.db
      .from('Order')
      .select('id, email, userId, orderNumber, deliveredAt')
      .eq('status', 'DELIVERED')
      .is('reviewRequestSentAt', null)
      .lte('deliveredAt', threeDaysAgo)
      .gte('deliveredAt', fourDaysAgo);

    if (!orders?.length) return;

    for (const order of orders) {
      try {
        await this.sendReviewRequestEmail(order);
      } catch (err) {
        this.logger.error(`Review request email failed for order ${order.id}: ${err.message}`);
      }
    }
  }

  private async sendReviewRequestEmail(order: any): Promise<void> {
    const { data: items } = await this.supabase.db
      .from('OrderItem')
      .select('variantId, title, productSlug, productImage')
      .eq('orderId', order.id);

    if (!items?.length) return;

    // Check if customer already reviewed all products
    const productIds: string[] = [];
    for (const item of items) {
      if (item.productSlug) productIds.push(item.productSlug);
    }

    let firstName = 'there';
    if (order.userId) {
      const { data: user } = await this.supabase.db
        .from('User')
        .select('firstName')
        .eq('id', order.userId)
        .single();
      firstName = user?.firstName ?? 'there';
    }

    const frontendUrl = this.frontendUrl;
    const products = items.slice(0, 5).map((item: any) => ({
      id: item.variantId,
      title: item.title,
      imageUrl: item.productImage || undefined,
      reviewUrl: `${frontendUrl}/product/${item.productSlug}?writeReview=1&order=${order.id}&rating=5`,
    }));

    await this.notifications.sendReviewRequest({
      email: order.email,
      firstName,
      orderNumber: order.orderNumber,
      products,
      unsubscribeUrl: `${frontendUrl}/account?unsubscribe=reviews`,
    });

    // Mark review request sent
    await this.supabase.db.from('Order').update({
      reviewRequestSentAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).eq('id', order.id);

    this.logger.log(`Review request email sent to ${order.email} for order ${order.orderNumber}`);
  }
}
