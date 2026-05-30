import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { SupabaseService } from '../../supabase/supabase.service';
import { InventoryService } from '../inventory/inventory.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { ContactService } from '../contact/contact.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UpdateOrderStatusDto, AdjustInventoryDto, ResolveReturnDto, OrderStatus, ReturnStatus } from './admin.dto';
import { serializeOrder } from '../orders/orders.serializer';
import { encodeCursor, decodeCursor } from '../../common/utils/pagination.util';
import { v4 as uuidv4 } from 'uuid';

const POST_SHIP_STATUSES: OrderStatus[] = [
  OrderStatus.SHIPPED,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.DELIVERED,
];

const ALLOWED_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  [OrderStatus.PENDING_PAYMENT]: [OrderStatus.PAID, OrderStatus.ON_HOLD, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.ALLOCATED, OrderStatus.ON_HOLD, OrderStatus.CANCELLED],
  [OrderStatus.ALLOCATED]: [OrderStatus.PICKING, OrderStatus.PACKED, OrderStatus.READY_FOR_PICKUP, OrderStatus.ON_HOLD, OrderStatus.CANCELLED],
  [OrderStatus.PICKING]: [OrderStatus.PACKED, OrderStatus.READY_FOR_PICKUP, OrderStatus.ON_HOLD, OrderStatus.CANCELLED],
  [OrderStatus.PACKED]: [OrderStatus.SHIPPED, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED, OrderStatus.READY_FOR_PICKUP, OrderStatus.ON_HOLD, OrderStatus.CANCELLED],
  [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.PICKED_UP, OrderStatus.ON_HOLD, OrderStatus.CANCELLED],
  [OrderStatus.PICKED_UP]: [OrderStatus.DELIVERED],
  [OrderStatus.SHIPPED]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED, OrderStatus.ON_HOLD, OrderStatus.CANCELLED],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED, OrderStatus.ON_HOLD, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [OrderStatus.RETURN_REQUESTED, OrderStatus.DISPUTED, OrderStatus.REFUNDED],
  [OrderStatus.RETURN_REQUESTED]: [OrderStatus.RETURNED],
  [OrderStatus.RETURNED]: [OrderStatus.REFUNDED],
  [OrderStatus.DISPUTED]: [OrderStatus.REFUNDED, OrderStatus.DELIVERED],
  [OrderStatus.ON_HOLD]: [OrderStatus.PAID, OrderStatus.ALLOCATED, OrderStatus.PICKING, OrderStatus.PACKED, OrderStatus.CANCELLED],
};

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly inventory: InventoryService,
    private readonly webhooks: WebhooksService,
    private readonly contact: ContactService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {
    this.stripe = new Stripe(this.config.get<string>('stripe.secretKey') ?? '', {
      apiVersion: '2024-06-20',
    });
  }

  private async fetchOrderWithRelations(orderId: string): Promise<any | null> {
    const { data: order } = await this.supabase.db
      .from('Order')
      .select('*')
      .eq('id', orderId)
      .single();

    if (!order) return null;

    const [{ data: items }, { data: events }, { data: addresses }, { data: slots }] =
      await Promise.all([
        this.supabase.db.from('OrderItem').select('*').eq('orderId', orderId),
        this.supabase.db.from('OrderEvent').select('*').eq('orderId', orderId).order('createdAt', { ascending: true }),
        this.supabase.db.from('OrderAddress').select('*').eq('orderId', orderId),
        this.supabase.db.from('DeliverySlotBooking').select('*').eq('orderId', orderId).limit(1),
      ]);

    return {
      ...order,
      items: items ?? [],
      events: events ?? [],
      addresses: addresses ?? [],
      deliverySlotBooking: slots?.[0] ?? null,
    };
  }

  // ─── DASHBOARD ─────────────────────────────────────────────────────────────

  async getDashboardStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();

    const [
      { count: todayOrdersCount },
      { data: revenueData },
      lowStockItemsCount,
      { count: pendingRefundsCount },
      { count: activeDisputesCount },
      { count: webhookFailuresCount },
      unreadContactsCount,
    ] = await Promise.all([
      this.supabase.db
        .from('Order')
        .select('id', { count: 'exact', head: true })
        .gte('placedAt', todayISO),
      this.supabase.db
        .from('Order')
        .select('totalMinor')
        .gte('placedAt', todayISO)
        .not('status', 'in', '(CANCELLED,PENDING_PAYMENT)'),
      this.inventory.countLowStock(),
      this.supabase.db
        .from('Return')
        .select('id', { count: 'exact', head: true })
        .eq('status', ReturnStatus.PENDING_REVIEW),
      this.supabase.db
        .from('Order')
        .select('id', { count: 'exact', head: true })
        .eq('status', OrderStatus.DISPUTED),
      this.supabase.db
        .from('WebhookEvent')
        .select('id', { count: 'exact', head: true })
        .in('status', ['failed', 'retrying']),
      this.contact.countUnread(),
    ]);

    const todayRevenueMinor = (revenueData ?? []).reduce(
      (sum: number, o: any) => sum + (o.totalMinor ?? 0),
      0,
    );

    return {
      todayOrdersCount: todayOrdersCount ?? 0,
      todayRevenueMinor,
      lowStockItemsCount,
      pendingRefundsCount: pendingRefundsCount ?? 0,
      activeDisputesCount: activeDisputesCount ?? 0,
      webhookFailuresCount: webhookFailuresCount ?? 0,
      unreadContactsCount: unreadContactsCount ?? 0,
    };
  }

  // ─── ORDERS ────────────────────────────────────────────────────────────────

  async listOrders(status?: OrderStatus, limit = 20, cursor?: string, q?: string) {
    const take = Math.min(Math.max(limit, 1), 100);

    let query = this.supabase.db
      .from('Order')
      .select('id, placedAt')
      .order('placedAt', { ascending: false })
      .limit(take + 1);

    if (status) query = query.eq('status', status);
    if (q) {
      // Sanitize search query: allow only alphanumeric, spaces, hyphens, @, and dots
      const safeQ = String(q).replace(/[^a-zA-Z0-9 @.\-_+]/g, '').slice(0, 100);
      if (safeQ) query = query.or(`orderNumber.ilike.%${safeQ}%,email.ilike.%${safeQ}%`);
    }

    if (cursor) {
      const decoded = decodeCursor(cursor);
      query = query.lt('placedAt', decoded);
    }

    const { data: orderRows } = await query;
    const rows = orderRows ?? [];

    let nextCursor: string | null = null;
    if (rows.length > take) {
      rows.pop();
      nextCursor = encodeCursor(rows[rows.length - 1].placedAt);
    }

    const orders = await Promise.all(rows.map((r: any) => this.fetchOrderWithRelations(r.id)));

    return {
      orders: orders.filter(Boolean).map(serializeOrder),
      nextCursor,
    };
  }

  async updateOrderStatus(dto: UpdateOrderStatusDto, actorId: string, idempotencyKey: string) {
    const { orderId, status, notes, carrierName, trackingNumber, privilegedOverrideReason } = dto;

    const full = await this.fetchOrderWithRelations(orderId);
    if (!full) throw new NotFoundException(`Order ${orderId} not found`);

    const allowed = ALLOWED_TRANSITIONS[full.status as OrderStatus] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Cannot transition order from ${full.status} to ${status}`,
      );
    }

    if (
      status === OrderStatus.CANCELLED &&
      POST_SHIP_STATUSES.includes(full.status as OrderStatus) &&
      !privilegedOverrideReason
    ) {
      throw new BadRequestException(
        `Cancelling an order with status ${full.status} requires a privilegedOverrideReason`,
      );
    }

    if (status === OrderStatus.SHIPPED && (!trackingNumber || !carrierName)) {
      throw new BadRequestException(
        'trackingNumber and carrierName are required when setting status to SHIPPED',
      );
    }

    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = { status, updatedAt: now };

    if (status === OrderStatus.SHIPPED) {
      updateData.trackingNumber = trackingNumber;
      updateData.carrierName = carrierName;
      updateData.shippedAt = now;
    }
    if (status === OrderStatus.DELIVERED) updateData.deliveredAt = now;
    if (status === OrderStatus.CANCELLED) updateData.cancelledAt = now;

    await this.supabase.db.from('Order').update(updateData).eq('id', orderId);

    // Inventory lifecycle:
    // DELIVERED or PICKED_UP → finalize sale: deduct stockOnHand AND release stockReserved
    // CANCELLED → release reservation only
    if (status === OrderStatus.DELIVERED || status === OrderStatus.PICKED_UP) {
      const { data: items } = await this.supabase.db
        .from('OrderItem')
        .select('variantId, quantity')
        .eq('orderId', orderId);
      for (const item of items ?? []) {
        const { data: variant } = await this.supabase.db
          .from('ProductVariant')
          .select('stockOnHand, stockReserved')
          .eq('id', item.variantId)
          .single();
        if (variant) {
          await this.supabase.db.from('ProductVariant').update({
            stockOnHand: Math.max(0, (variant.stockOnHand ?? 0) - item.quantity),
            stockReserved: Math.max(0, (variant.stockReserved ?? 0) - item.quantity),
            updatedAt: now,
          }).eq('id', item.variantId);
        }
      }
    } else if (status === OrderStatus.CANCELLED) {
      // Release reservation only (don't deduct stock — order was never fulfilled)
      const { data: items } = await this.supabase.db
        .from('OrderItem')
        .select('variantId, quantity')
        .eq('orderId', orderId);
      for (const item of items ?? []) {
        const { data: variant } = await this.supabase.db
          .from('ProductVariant')
          .select('stockReserved')
          .eq('id', item.variantId)
          .single();
        if (variant) {
          await this.supabase.db.from('ProductVariant').update({
            stockReserved: Math.max(0, (variant.stockReserved ?? 0) - item.quantity),
            updatedAt: now,
          }).eq('id', item.variantId);
        }
      }
    }

    // OrderEvent has NO updatedAt column
    await this.supabase.db.from('OrderEvent').insert({
      id: uuidv4(),
      orderId,
      eventType: `STATUS_CHANGED_TO_${status}`,
      actorId,
      payload: {
        from: full.status,
        to: status,
        notes: notes ?? null,
        carrierName: carrierName ?? null,
        trackingNumber: trackingNumber ?? null,
        privilegedOverrideReason: privilegedOverrideReason ?? null,
        idempotencyKey,
        timestamp: now,
      },
      createdAt: now,
    });

    await this.webhooks
      .dispatch('order.status_changed', {
        orderId,
        orderNumber: full.orderNumber,
        from: full.status,
        to: status,
        trackingNumber: trackingNumber ?? null,
        carrierName: carrierName ?? null,
        timestamp: now,
      })
      .catch((err) =>
        this.logger.error(`Webhook dispatch failed for order ${orderId}: ${err.message}`),
      );

    // ── Email + in-app notification to customer ───────────────────────────────
    const EMAIL_NOTIFY_STATUSES = [
      OrderStatus.SHIPPED, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED,
      OrderStatus.READY_FOR_PICKUP, OrderStatus.PICKED_UP, OrderStatus.CANCELLED,
      OrderStatus.REFUNDED, OrderStatus.ON_HOLD, OrderStatus.RETURN_REQUESTED,
      OrderStatus.RETURNED, OrderStatus.DISPUTED,
    ] as string[];

    if (EMAIL_NOTIFY_STATUSES.includes(status as string)) {
      const frontendUrl = this.config.get<string>('frontend.url') ?? 'https://ereko-african-market.vercel.app/en-gb';
      const customerEmail = full.email;
      let customerName = 'Customer';
      if (full.userId) {
        const { data: ur } = await this.supabase.db.from('User').select('firstName').eq('id', full.userId).single();
        customerName = ur?.firstName ?? 'Customer';
      }

      this.notifications.sendOrderStatusUpdate({
        email: customerEmail,
        firstName: customerName,
        orderNumber: full.orderNumber,
        status,
        trackingNumber: trackingNumber ?? undefined,
        carrierName: carrierName ?? undefined,
        notes: notes ?? undefined,
        orderUrl: `${frontendUrl}/track?order=${full.orderNumber}&email=${encodeURIComponent(customerEmail)}`,
        frontendUrl,
      }).catch(err => this.logger.error(`Status email failed for ${full.orderNumber}: ${err.message}`));

      // In-app notification for account holders
      if (full.userId) {
        const IN_APP_TITLES: Record<string, string> = {
          SHIPPED: '📦 Order shipped!', OUT_FOR_DELIVERY: '🚚 Out for delivery!',
          DELIVERED: '✅ Order delivered!', READY_FOR_PICKUP: '🏪 Ready to collect!',
          PICKED_UP: '🎉 Order collected!', CANCELLED: '❌ Order cancelled',
          REFUNDED: '💳 Refund processed', ON_HOLD: '⏸️ Order on hold',
          RETURN_REQUESTED: '🔄 Return request received',
        };
        const inAppTitle = IN_APP_TITLES[status as string] ?? `Order update: ${(status as string).replace(/_/g, ' ')}`;
        await this.supabase.db.from('Notification').insert({
          id: uuidv4(),
          userId: full.userId,
          type: `order_${(status as string).toLowerCase()}`,
          title: inAppTitle,
          body: `Order ${full.orderNumber} status updated to ${(status as string).replace(/_/g, ' ').toLowerCase()}.`,
          data: { orderId, orderNumber: full.orderNumber, status },
          isRead: false,
          createdAt: now,
        }).catch(err => this.logger.error(`In-app notification insert failed: ${err.message}`));
      }
    }

    const updated = await this.fetchOrderWithRelations(orderId);
    return serializeOrder(updated);
  }

  // ─── INVENTORY ─────────────────────────────────────────────────────────────

  async listInventory(cursor?: string, limit = 20) {
    return this.inventory.getWarehouseStock(undefined, cursor, limit);
  }

  async adjustInventory(dto: AdjustInventoryDto, actorId: string) {
    await this.inventory.adjustStock(
      dto.warehouseId,
      dto.variantId,
      dto.adjustmentQty,
      dto.reasonCode,
      actorId,
      undefined,
      dto.notes,
    );
  }

  async seedAllInventory(actorId: string): Promise<{ seeded: number; skipped: number; errors: string[] }> {
    const { data: warehouses } = await this.supabase.db.from('Warehouse').select('id, code').eq('isActive', true);
    if (!warehouses?.length) throw new BadRequestException('No active warehouses found');

    const { data: variants } = await this.supabase.db
      .from('ProductVariant')
      .select('id, sku, stockOnHand, safetyStockThreshold, isActive')
      .eq('isActive', true);
    if (!variants?.length) return { seeded: 0, skipped: 0, errors: ['No active variants found'] };

    let seeded = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const warehouse of warehouses) {
      for (const variant of variants) {
        const { data: existing } = await this.supabase.db
          .from('WarehouseStock')
          .select('id')
          .eq('warehouseId', warehouse.id)
          .eq('variantId', variant.id)
          .single();

        if (existing) { skipped++; continue; }

        const qty = variant.stockOnHand > 0 ? variant.stockOnHand : 0;
        try {
          await this.inventory.adjustStock(
            warehouse.id,
            variant.id,
            qty > 0 ? qty : 1,
            'receipt' as any,
            actorId,
            undefined,
            `Seeded from product variant stockOnHand (${warehouse.code})`,
          );
          seeded++;
        } catch (e: any) {
          errors.push(`${variant.sku}@${warehouse.code}: ${e.message}`);
        }
      }
    }

    return { seeded, skipped, errors };
  }

  async runOrderStatusMigration(): Promise<{ ok: boolean; message: string; details: string[] }> {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const details: string[] = [];
    try {
      // ALTER TYPE ADD VALUE must run outside a transaction; Prisma $executeRaw handles this
      await prisma.$executeRaw`ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'READY_FOR_PICKUP'`;
      details.push('READY_FOR_PICKUP: added or already exists');
    } catch (e: any) {
      details.push(`READY_FOR_PICKUP: ${e.message}`);
    }
    try {
      await prisma.$executeRaw`ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PICKED_UP'`;
      details.push('PICKED_UP: added or already exists');
    } catch (e: any) {
      details.push(`PICKED_UP: ${e.message}`);
    }
    await prisma.$disconnect();
    return { ok: true, message: 'Migration complete', details };
  }

  // ─── RETURNS ───────────────────────────────────────────────────────────────

  async listReturns() {
    const { data: returns } = await this.supabase.db
      .from('Return')
      .select('id, orderId, status, refundAmountMinor, createdAt')
      .order('createdAt', { ascending: false });

    if (!returns?.length) return [];

    const orderIds = returns.map((r: any) => r.orderId);
    const returnIds = returns.map((r: any) => r.id);

    const [{ data: orders }, { data: returnItems }] = await Promise.all([
      this.supabase.db.from('Order').select('id, orderNumber, email').in('id', orderIds),
      this.supabase.db.from('ReturnItem').select('returnId, reasonCode').in('returnId', returnIds),
    ]);

    const orderMap = new Map((orders ?? []).map((o: any) => [o.id, o]));
    const firstItemByReturn = new Map<string, string>();
    for (const item of returnItems ?? []) {
      if (!firstItemByReturn.has(item.returnId)) {
        firstItemByReturn.set(item.returnId, item.reasonCode);
      }
    }

    return returns.map((r: any) => {
      const order = orderMap.get(r.orderId) ?? {};
      return {
        id: r.id,
        orderNumber: (order as any).orderNumber,
        customerEmail: (order as any).email,
        status: r.status,
        reasonCode: firstItemByReturn.get(r.id) ?? null,
        refundAmountMinor: r.refundAmountMinor,
        createdAt: r.createdAt,
      };
    });
  }

  async resolveReturn(dto: ResolveReturnDto, actorId: string, idempotencyKey: string) {
    const { rmaId, action, reason, customRefundAmountMinor } = dto;

    const { data: rmaRows } = await this.supabase.db
      .from('Return')
      .select('id, orderId, status, refundAmountMinor')
      .eq('id', rmaId)
      .limit(1);

    const rma = rmaRows?.[0];
    if (!rma) throw new NotFoundException(`Return ${rmaId} not found`);

    if (rma.status !== ReturnStatus.PENDING_REVIEW) {
      throw new ConflictException(`Return ${rmaId} has already been resolved (status=${rma.status})`);
    }

    const { data: orderRows } = await this.supabase.db
      .from('Order')
      .select('id, stripePaymentIntentId')
      .eq('id', rma.orderId)
      .limit(1);

    const order = orderRows?.[0];
    const now = new Date().toISOString();
    const newStatus = action === 'approve' ? ReturnStatus.APPROVED : ReturnStatus.REJECTED;

    if (action === 'approve') {
      const refundAmount =
        customRefundAmountMinor !== undefined ? customRefundAmountMinor : rma.refundAmountMinor;

      if (refundAmount > 0 && order?.stripePaymentIntentId) {
        try {
          const paymentIntent = await this.stripe.paymentIntents.retrieve(
            order.stripePaymentIntentId,
          );
          const chargeId =
            typeof paymentIntent.latest_charge === 'string'
              ? paymentIntent.latest_charge
              : paymentIntent.latest_charge?.id;

          if (chargeId) {
            await this.stripe.refunds.create({
              charge: chargeId,
              amount: refundAmount,
              metadata: { rmaId, orderId: rma.orderId, actorId, idempotencyKey },
            });
            this.logger.log(`Stripe refund created: rmaId=${rmaId} amount=${refundAmount} charge=${chargeId}`);
          }
        } catch (err) {
          this.logger.error(`Stripe refund failed for rmaId=${rmaId}: ${err.message}`);
        }
      }

      await this.supabase.db
        .from('Return')
        .update({
          status: newStatus,
          resolvedAt: now,
          resolvedBy: actorId,
          resolveReason: reason ?? null,
          customRefundMinor: customRefundAmountMinor !== undefined ? customRefundAmountMinor : null,
          updatedAt: now,
        })
        .eq('id', rmaId);

      await this.supabase.db
        .from('Order')
        .update({ status: OrderStatus.REFUNDED, updatedAt: now })
        .eq('id', rma.orderId);

      await this.supabase.db.from('OrderEvent').insert({
        id: uuidv4(),
        orderId: rma.orderId,
        eventType: 'RETURN_APPROVED',
        actorId,
        payload: {
          rmaId,
          refundAmountMinor: customRefundAmountMinor ?? rma.refundAmountMinor,
          reason: reason ?? null,
          idempotencyKey,
          timestamp: now,
        },
        createdAt: now,
      });
    } else {
      await this.supabase.db
        .from('Return')
        .update({ status: newStatus, resolvedAt: now, resolvedBy: actorId, resolveReason: reason ?? null, updatedAt: now })
        .eq('id', rmaId);

      await this.supabase.db.from('OrderEvent').insert({
        id: uuidv4(),
        orderId: rma.orderId,
        eventType: 'RETURN_REJECTED',
        actorId,
        payload: { rmaId, reason: reason ?? null, idempotencyKey, timestamp: now },
        createdAt: now,
      });
    }

    this.logger.log(`Return ${rmaId} ${action}d by admin ${actorId}`);
  }

  // ── Product Management ───────────────────────────────────────────────────

  async listProducts(limit: number, cursor?: string) {
    let query = this.supabase.db
      .from('Product')
      .select('id, slug, title, brand, storageType, isPublished, originCountry, descriptionShort, createdAt, discountEnabled, discountPercent, discountBadge, variants:ProductVariant(id,sku,name,priceAmountMinor,stockOnHand,stockReserved,isActive), images:ProductImage(id,url,alt,position), categories:ProductCategory(category:Category(id,slug,name))')
      .order('createdAt', { ascending: false })
      .limit(limit);
    if (cursor) query = query.lt('createdAt', cursor);
    const { data, error } = await query;
    if (error) throw new Error(`Failed to list products: ${error.message}`);
    return { products: data ?? [] };
  }

  async createProduct(body: any, adminId: string) {
    const now = new Date().toISOString();
    const slug = body.slug ?? body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const { data: product, error: productError } = await this.supabase.db
      .from('Product')
      .insert({
        id: uuidv4(),
        slug,
        title: body.title,
        brand: body.brand ?? null,
        originCountry: body.originCountry ?? 'Nigeria',
        descriptionShort: body.descriptionShort ?? '',
        descriptionLong: body.descriptionLong ?? '',
        storageType: body.storageType ?? 'ambient',
        isPublished: body.isPublished ?? true,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();

    if (productError || !product) throw new Error(`Failed to create product: ${productError?.message}`);

    if (body.priceAmountMinor !== undefined) {
      await this.supabase.db.from('ProductVariant').insert({
        id: uuidv4(),
        productId: product.id,
        sku: body.sku ?? `${slug.toUpperCase()}-DEFAULT`,
        name: body.title,
        priceAmountMinor: Math.round(body.priceAmountMinor),
        compareAtAmountMinor: body.compareAtAmountMinor ?? null,
        currency: 'GBP',
        stockOnHand: body.stockOnHand ?? 0,
        stockReserved: 0,
        safetyStockThreshold: 5,
        isActive: true,
        weightGrams: body.weightGrams ?? 500,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (body.categoryId) {
      await this.supabase.db.from('ProductCategory').insert({ productId: product.id, categoryId: body.categoryId });
    }

    this.logger.log(`Product created: ${product.title} by admin ${adminId}`);
    return product;
  }

  async updateProduct(productId: string, body: any, adminId: string) {
    const now = new Date().toISOString();
    const updates: Record<string, any> = { updatedAt: now };
    if (body.title !== undefined) updates.title = body.title;
    if (body.brand !== undefined) updates.brand = body.brand;
    if (body.descriptionShort !== undefined) updates.descriptionShort = body.descriptionShort;
    if (body.descriptionLong !== undefined) updates.descriptionLong = body.descriptionLong;
    if (body.storageType !== undefined) updates.storageType = body.storageType;
    if (body.isPublished !== undefined) updates.isPublished = body.isPublished;
    if (body.originCountry !== undefined) updates.originCountry = body.originCountry;

    const { data: product, error } = await this.supabase.db
      .from('Product')
      .update(updates)
      .eq('id', productId)
      .select()
      .single();

    if (error || !product) throw new Error(`Failed to update product: ${error?.message}`);

    if (body.priceAmountMinor !== undefined || body.stockOnHand !== undefined) {
      const variantUpdates: Record<string, any> = { updatedAt: now };
      if (body.priceAmountMinor !== undefined) variantUpdates.priceAmountMinor = Math.round(body.priceAmountMinor);
      if (body.stockOnHand !== undefined) variantUpdates.stockOnHand = body.stockOnHand;
      await this.supabase.db.from('ProductVariant').update(variantUpdates).eq('productId', productId).eq('isActive', true);
    }

    this.logger.log(`Product updated: ${productId} by admin ${adminId}`);
    return product;
  }

  async deleteProduct(productId: string, adminId: string) {
    const now = new Date().toISOString();
    await this.supabase.db.from('Product').update({ isPublished: false, updatedAt: now }).eq('id', productId);
    this.logger.log(`Product unpublished: ${productId} by admin ${adminId}`);
    return { ok: true, productId };
  }

  async uploadProductImage(productId: string, file: Express.Multer.File, adminId: string): Promise<{ url: string; imageId: string }> {
    const ext = (file.originalname.split('.').pop() ?? 'jpg').toLowerCase();
    const filename = `products/${productId}-${Date.now()}.${ext}`;

    const { error: uploadError } = await this.supabase.db.storage
      .from('product-images')
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
        cacheControl: '31536000',
      });

    if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);

    const { data: urlData } = this.supabase.db.storage.from('product-images').getPublicUrl(filename);
    const url = urlData.publicUrl;

    const existing = await this.supabase.db
      .from('ProductImage')
      .select('id')
      .eq('productId', productId)
      .eq('position', 0)
      .maybeSingle();

    let imageId: string;
    if (existing.data) {
      await this.supabase.db.from('ProductImage').update({ url, updatedAt: new Date().toISOString() }).eq('id', existing.data.id);
      imageId = existing.data.id;
    } else {
      const id = uuidv4();
      await this.supabase.db.from('ProductImage').insert({ id, productId, url, alt: '', position: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      imageId = id;
    }

    this.logger.log(`Image uploaded for product ${productId} by admin ${adminId}`);
    return { url, imageId };
  }

  // ── User Management ─────────────────────────────────────────────────────────

  async listUsers(limit = 30, cursor?: string, q?: string, role?: string) {
    const safeQ = q ? String(q).replace(/[^a-zA-Z0-9 @.\-_+]/g, '').slice(0, 100) : '';

    // Staff/team members come from TeamMember table; regular customers from User table
    if (role === 'staff') {
      const { data, error } = await this.supabase.db
        .from('TeamMember')
        .select('id, email, firstName, lastName, teamRole, status, lastLoginAt, createdAt, inviteToken')
        .order('createdAt', { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return { users: (data ?? []).map((m: any) => ({ ...m, _type: 'staff' })), nextCursor: null };
    }

    let q2 = this.supabase.db
      .from('User')
      .select('id, email, firstName, lastName, phone, isActive, isAdmin, isSuperAdmin, createdAt')
      .order('createdAt', { ascending: false });

    if (!q || role !== 'all') {
      // Default: only regular customers (not admin/super admin)
      if (role !== 'all') q2 = q2.eq('isAdmin', false);
    }

    if (safeQ) q2 = q2.or(`email.ilike.%${safeQ}%,firstName.ilike.%${safeQ}%,lastName.ilike.%${safeQ}%`);
    if (cursor) q2 = q2.lt('createdAt', cursor);

    q2 = q2.limit(limit + 1);
    const { data, error } = await q2;
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    // Fetch loyalty data for each user
    const userIds = items.map((u: any) => u.id);
    const { data: loyalty } = await this.supabase.db
      .from('LoyaltyAccount')
      .select('userId, pointsBalance, tier')
      .in('userId', userIds);
    const loyaltyMap = new Map((loyalty ?? []).map((l: any) => [l.userId, l]));

    // Order counts
    const { data: orderCounts } = await this.supabase.db
      .from('Order')
      .select('userId')
      .in('userId', userIds)
      .not('status', 'in', '(CANCELLED,PENDING_PAYMENT)');
    const countMap = new Map<string, number>();
    for (const o of orderCounts ?? []) {
      countMap.set(o.userId, (countMap.get(o.userId) ?? 0) + 1);
    }

    const users = items.map((u: any) => ({
      ...u,
      _type: 'customer',
      loyaltyTier: loyaltyMap.get(u.id)?.tier ?? 'Member',
      loyaltyPoints: loyaltyMap.get(u.id)?.pointsBalance ?? 0,
      totalOrders: countMap.get(u.id) ?? 0,
    }));

    return { users, nextCursor: hasMore ? items[items.length - 1]?.createdAt : null };
  }

  async getUserDetail(userId: string) {
    const { data: user } = await this.supabase.db
      .from('User')
      .select('id, email, firstName, lastName, phone, isActive, isAdmin, isSuperAdmin, createdAt')
      .eq('id', userId)
      .single();
    if (!user) throw new Error('User not found');

    const [{ data: orders }, { data: addresses }, { data: loyalty }] = await Promise.all([
      this.supabase.db.from('Order').select('id, orderNumber, status, totalMinor, placedAt').eq('userId', userId).order('placedAt', { ascending: false }).limit(10),
      this.supabase.db.from('Address').select('*').eq('userId', userId).limit(5),
      this.supabase.db.from('LoyaltyAccount').select('pointsBalance, tier').eq('userId', userId).single(),
    ]);

    return { ...user, orders: orders ?? [], addresses: addresses ?? [], loyalty: loyalty ?? { pointsBalance: 0, tier: 'Member' } };
  }

  async updateUserStatus(userId: string, isActive: boolean, reason?: string, actorId?: string) {
    const { data: user } = await this.supabase.db.from('User').select('id, isAdmin, isSuperAdmin').eq('id', userId).single();
    if (!user) throw new Error('User not found');
    // Cannot suspend super admin or admin accounts via this endpoint
    if (user.isAdmin || user.isSuperAdmin) throw new Error('Cannot modify admin accounts via user management');

    await this.supabase.db.from('User').update({ isActive, updatedAt: new Date().toISOString() }).eq('id', userId);
    // Audit log entry — non-fatal
    try {
      await this.supabase.db.from('OrderEvent').insert({
        id: uuidv4(),
        orderId: 'system',
        eventType: isActive ? 'USER_ACTIVATED' : 'USER_SUSPENDED',
        actorId: actorId ?? null,
        payload: { userId, reason: reason ?? null },
        createdAt: new Date().toISOString(),
      });
    } catch { /* non-fatal */ }

    return { success: true, isActive };
  }

  // ── Audit Log ────────────────────────────────────────────────────────────────

  async getAuditLog(staffId?: string, limit = 50) {
    let q = this.supabase.db
      .from('OrderEvent')
      .select('id, orderId, eventType, actorId, payload, createdAt')
      .not('actorId', 'is', null)
      .order('createdAt', { ascending: false })
      .limit(limit);
    if (staffId) q = q.eq('actorId', staffId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return { entries: data ?? [] };
  }
}
