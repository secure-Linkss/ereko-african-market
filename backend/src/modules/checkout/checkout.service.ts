import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  InternalServerErrorException,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  StartCheckoutDto,
  PaymentIntentDto,
  ConfirmOrderDto,
  AddressDto,
} from './checkout.dto';
import { PaymentsService } from '../payments/payments.service';
import { DiscountService } from '../discounts/discount.service';
import { v4 as uuidv4 } from 'uuid';

const FREE_SHIPPING_THRESHOLD = 5500;
const STANDARD_SHIPPING = 399;

function generateOrderNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let rand = '';
  for (let i = 0; i < 5; i++) {
    rand += chars[Math.floor(Math.random() * chars.length)];
  }
  return `ERK-${dateStr}-${rand}`;
}

function serializeOrderLocal(order: any) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    userId: order.userId ?? null,
    email: order.email,
    phone: order.phone ?? null,
    status: order.status,
    currency: order.currency,
    subtotalMinor: order.subtotalMinor,
    discountMinor: order.discountMinor,
    shippingMinor: order.shippingMinor,
    taxMinor: order.taxMinor,
    totalMinor: order.totalMinor,
    shippingAddress: order.shippingAddress ?? null,
    billingAddress: order.billingAddress ?? null,
    deliverySlot: order.deliverySlotBooking ?? null,
    deliveryMethod: order.deliveryMethod,
    notesCustomer: order.notesCustomer ?? null,
    loyaltyPointsEarned: order.loyaltyPointsEarned,
    loyaltyPointsRedeemed: order.loyaltyPointsRedeemed,
    placedAt: order.placedAt,
    paidAt: order.paidAt ?? null,
    shippedAt: order.shippedAt ?? null,
    deliveredAt: order.deliveredAt ?? null,
    trackingNumber: order.trackingNumber ?? null,
    carrierName: order.carrierName ?? null,
    events: order.events ?? [],
    items: (order.items ?? []).map((item: any) => ({
      id: item.id,
      variantId: item.variantId,
      sku: item.sku,
      title: item.title,
      variantName: item.variantName,
      quantity: item.quantity,
      priceAmountMinor: item.priceAmountMinor,
      productSlug: item.productSlug,
      productImage: item.productImage,
    })),
  };
}

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
    private readonly paymentsService: PaymentsService,
    private readonly discountService: DiscountService,
    @Optional() @InjectQueue('orders') private readonly ordersQueue: Queue | null,
  ) {}

  // ─── Delivery slots ─────────────────────────────────────────────────────────

  async getDeliverySlots(postcode: string) {
    const postcodeArea = postcode.trim().toUpperCase().split(' ')[0];

    const { data: templates } = await this.supabase.db
      .from('DeliverySlotTemplate')
      .select('*')
      .eq('isActive', true);

    const slots: { date: string; slotStart: string; slotEnd: string; priceMinor: number }[] = [];
    const now = new Date();

    for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
      const target = new Date(now);
      target.setDate(now.getDate() + dayOffset);
      const dayOfWeek = target.getDay();
      const dateStr = target.toISOString().slice(0, 10);

      const matchedTemplates = (templates ?? []).filter(
        (t: any) => t.dayOfWeek === dayOfWeek && (!t.postcodeArea || postcodeArea.startsWith(t.postcodeArea.slice(0, 2))),
      );

      for (const tmpl of matchedTemplates) {
        const { count } = await this.supabase.db
          .from('DeliverySlotBooking')
          .select('id', { count: 'exact', head: true })
          .eq('date', dateStr)
          .eq('slotStart', tmpl.slotStart)
          .eq('slotEnd', tmpl.slotEnd);

        if ((count ?? 0) >= tmpl.capacity) continue;

        slots.push({
          date: dateStr,
          slotStart: tmpl.slotStart,
          slotEnd: tmpl.slotEnd,
          priceMinor: tmpl.priceMinor,
        });
      }
    }

    return slots;
  }

  // ─── Start checkout ─────────────────────────────────────────────────────────

  async startCheckout(dto: StartCheckoutDto, userId?: string) {
    const { data: cartRows } = await this.supabase.db
      .from('Cart')
      .select('*')
      .eq('id', dto.cartId)
      .limit(1);

    const cart = cartRows?.[0];
    if (!cart) throw new NotFoundException('Cart not found');
    if (userId && cart.userId && cart.userId !== userId) {
      throw new ConflictException('Cart does not belong to this user');
    }

    // Idempotency: return existing PENDING_PAYMENT order for this cart if one exists
    const { data: existingOrders } = await this.supabase.db
      .from('Order')
      .select('id, orderNumber')
      .eq('status', 'PENDING_PAYMENT')
      .contains('payload', {})
      .limit(1);
    // Simpler: search by checking if any order has items matching this cart's variants
    // Use cartId stored via promoCode or a dedicated field — check via orderId association
    // For now: check if an order was created within the last 30 minutes for the same email + cart total
    const { data: recentOrders } = await this.supabase.db
      .from('Order')
      .select('id, orderNumber, status')
      .eq('status', 'PENDING_PAYMENT')
      .eq('email', dto.email)
      .gte('placedAt', new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .limit(1);
    if (recentOrders?.[0]) {
      const { data: orderItems } = await this.supabase.db
        .from('OrderItem')
        .select('variantId')
        .eq('orderId', recentOrders[0].id);
      const cartVariantIds = new Set((await this.supabase.db
        .from('CartItem').select('variantId').eq('cartId', dto.cartId))?.data?.map((i: any) => i.variantId) ?? []);
      const orderVariantIds = new Set((orderItems ?? []).map((i: any) => i.variantId));
      const isMatch = [...cartVariantIds].every(id => orderVariantIds.has(id)) && cartVariantIds.size === orderVariantIds.size;
      if (isMatch) {
        this.logger.warn(`Duplicate checkout attempt for ${dto.email} — returning existing order ${recentOrders[0].orderNumber}`);
        const deliverySlots = await this.getDeliverySlots(dto.postcode);
        return { orderId: recentOrders[0].id, orderNumber: recentOrders[0].orderNumber, cart: { id: cart.id, items: [] }, stockReservedUntil: new Date(Date.now() + 15 * 60 * 1000), availableDeliverySlots: deliverySlots, discount: null };
      }
    }

    const { data: cartItems } = await this.supabase.db
      .from('CartItem')
      .select('id, variantId, quantity, unitPriceMinor')
      .eq('cartId', cart.id);

    if (!cartItems || cartItems.length === 0) {
      throw new BadRequestException('Cannot checkout an empty cart');
    }

    const variantIds = cartItems.map((i: any) => i.variantId);
    const { data: variants } = await this.supabase.db
      .from('ProductVariant')
      .select('id, productId, sku, name, stockOnHand, stockReserved, priceAmountMinor, taxClassId, isActive')
      .in('id', variantIds);

    const productIds = [...new Set((variants ?? []).map((v: any) => v.productId))];
    const { data: products } = await this.supabase.db
      .from('Product')
      .select('id, title, slug, storageType')
      .in('id', productIds);
    const { data: images } = await this.supabase.db
      .from('ProductImage')
      .select('productId, url, position')
      .in('productId', productIds)
      .order('position', { ascending: true });

    const variantMap = new Map((variants ?? []).map((v: any) => [v.id, v]));
    const productMap = new Map((products ?? []).map((p: any) => [p.id, p]));
    const imageMap = new Map<string, string>();
    for (const img of images ?? []) {
      if (!imageMap.has(img.productId)) imageMap.set(img.productId, img.url);
    }

    // Reserve stock
    for (const item of cartItems) {
      const variant = variantMap.get(item.variantId);
      if (!variant) throw new BadRequestException(`Variant ${item.variantId} not found`);
      const available = variant.stockOnHand - variant.stockReserved;
      if (item.quantity > available) {
        throw new UnprocessableEntityException(`Insufficient stock for ${variant.sku}. Available: ${available}`);
      }
      await this.supabase.db
        .from('ProductVariant')
        .update({ stockReserved: variant.stockReserved + item.quantity, updatedAt: new Date().toISOString() })
        .eq('id', variant.id);
    }

    const deliverySlots = await this.getDeliverySlots(dto.postcode);

    // Generate unique order number
    let orderNumber = '';
    let attempts = 0;
    do {
      orderNumber = generateOrderNumber();
      attempts++;
      if (attempts > 10) throw new InternalServerErrorException('Failed to generate order number');
      const { data: existing } = await this.supabase.db
        .from('Order')
        .select('id')
        .eq('orderNumber', orderNumber)
        .limit(1);
      if (!existing || existing.length === 0) break;
    } while (true);

    let userRecord: any = null;
    if (userId) {
      const { data: users } = await this.supabase.db
        .from('User')
        .select('firstName, lastName')
        .eq('id', userId)
        .limit(1);
      userRecord = users?.[0] ?? null;
    }

    const taxMinor = cart.taxMinor;
    const subtotal = cart.subtotalMinor;
    let cartDiscount = cart.discountMinor + cart.loyaltyDiscountMinor;
    let appliedDiscountCodeId: string | null = null;
    let appliedPromoCode: string | null = cart.promoCode ?? null;

    // Apply discount code if provided
    let discountCodeMessage: string | null = null;
    let discountCodeAmountMinor = 0;
    if (dto.discountCode) {
      const discountResult = await this.discountService.validate({
        code: dto.discountCode.toUpperCase().trim(),
        cartTotalMinor: subtotal,
        email: dto.email,
      });
      discountCodeMessage = discountResult.message;
      if (discountResult.valid) {
        cartDiscount += discountResult.discountAmountMinor;
        discountCodeAmountMinor = discountResult.discountAmountMinor;
        appliedDiscountCodeId = discountResult.codeId;
        appliedPromoCode = discountResult.code;
      }
    }

    const discountedSubtotal = Math.max(0, subtotal - cartDiscount);
    const shipping = discountedSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
    const total = discountedSubtotal + shipping;
    const now = new Date().toISOString();
    const orderId = uuidv4();

    const { data: newOrder, error: orderErr } = await this.supabase.db
      .from('Order')
      .insert({
        id: orderId,
        orderNumber,
        userId: userId ?? null,
        email: dto.email,
        status: 'PENDING_PAYMENT',
        currency: cart.currency,
        subtotalMinor: subtotal,
        discountMinor: cartDiscount,
        shippingMinor: shipping,
        taxMinor,
        totalMinor: total,
        promoCode: appliedPromoCode,
        discountCodeId: appliedDiscountCodeId,
        loyaltyPointsRedeemed: cart.loyaltyPointsRedeemed,
        loyaltyPointsEarned: 0,
        deliveryMethod: 'standard',
        placedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .select('*')
      .single();

    if (orderErr || !newOrder) {
      throw new InternalServerErrorException(`Failed to create order: ${orderErr?.message}`);
    }

    // Create order items
    await this.supabase.db.from('OrderItem').insert(
      cartItems.map((item: any) => {
        const variant = variantMap.get(item.variantId) ?? {};
        const product = productMap.get(variant.productId) ?? {};
        return {
          id: uuidv4(),
          orderId,
          variantId: item.variantId,
          sku: variant.sku ?? '',
          title: product.title ?? '',
          variantName: variant.name ?? '',
          quantity: item.quantity,
          priceAmountMinor: item.unitPriceMinor,
          productSlug: product.slug ?? '',
          productImage: imageMap.get(product.id) ?? '',
          createdAt: now,
        };
      }),
    );

    // Create checkout started event
    await this.supabase.db.from('OrderEvent').insert({
      id: uuidv4(),
      orderId,
      eventType: 'checkout.started',
      payload: { postcode: dto.postcode, cartId: dto.cartId },
      createdAt: now,
    });

    const serializedCart = {
      id: cart.id,
      userId: cart.userId,
      anonymousToken: cart.anonymousToken,
      currency: cart.currency,
      promoCode: cart.promoCode,
      discountMinor: cart.discountMinor,
      subtotalMinor: cart.subtotalMinor,
      taxMinor: cart.taxMinor,
      shippingMinor: cart.shippingMinor,
      totalMinor: cart.totalMinor,
      loyaltyPointsRedeemed: cart.loyaltyPointsRedeemed,
      loyaltyDiscountMinor: cart.loyaltyDiscountMinor,
      expiresAt: cart.expiresAt,
      items: cartItems.map((item: any) => {
        const variant = variantMap.get(item.variantId) ?? {};
        const product = productMap.get(variant.productId) ?? {};
        return {
          id: item.id,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPriceMinor: item.unitPriceMinor,
          sku: variant.sku ?? '',
          title: product.title ?? '',
          variantName: variant.name ?? '',
          productSlug: product.slug ?? '',
          productImage: imageMap.get(product.id) ?? '',
          storageType: product.storageType ?? 'ambient',
          availableStock: Math.max(0, variant.stockOnHand - variant.stockReserved),
        };
      }),
    };

    return {
      orderId,
      orderNumber,
      cart: serializedCart,
      stockReservedUntil: new Date(Date.now() + 15 * 60 * 1000),
      availableDeliverySlots: deliverySlots,
      discount: appliedDiscountCodeId ? {
        applied: true,
        code: appliedPromoCode,
        discountAmountMinor: discountCodeAmountMinor,
        message: discountCodeMessage,
      } : null,
    };
  }

  // ─── Create payment intent ──────────────────────────────────────────────────

  async createPaymentIntent(dto: PaymentIntentDto, userId?: string) {
    const { data: orders } = await this.supabase.db
      .from('Order')
      .select('*')
      .eq('id', dto.orderId)
      .limit(1);

    const order = orders?.[0];
    if (!order) throw new NotFoundException('Order not found');
    if (userId && order.userId && order.userId !== userId) {
      throw new ConflictException('Order does not belong to this user');
    }
    if (order.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException('Order is not in a payable state');
    }

    if (order.stripePaymentIntentId) {
      const existing = await this.paymentsService.retrievePaymentIntent(order.stripePaymentIntentId);
      if (existing && existing.status !== 'canceled') {
        return {
          clientSecret: existing.client_secret,
          publishableKey: this.config.get<string>('stripe.publishableKey'),
          amountMinor: order.totalMinor,
        };
      }
    }

    // V4: Log intent BEFORE making external API call (immutable ledger principle)
    const piIdempotencyKey = `pi-${order.id}`;
    this.logger.log(`V4: Recording payment intent BEFORE Stripe API call — order=${order.orderNumber} idempotencyKey=${piIdempotencyKey}`);

    const paymentIntent = await this.paymentsService.createPaymentIntent({
      amount: order.totalMinor,
      currency: order.currency.toLowerCase(),
      metadata: { orderId: order.id, orderNumber: order.orderNumber, userId: order.userId ?? 'guest' },
      paymentMethodTypes: [this.mapPaymentMethod(dto.paymentMethod)],
      idempotencyKey: piIdempotencyKey,
    });

    await this.supabase.db
      .from('Order')
      .update({ stripePaymentIntentId: paymentIntent.id, stripePaymentStatus: paymentIntent.status, updatedAt: new Date().toISOString() })
      .eq('id', order.id);

    return {
      clientSecret: paymentIntent.client_secret,
      publishableKey: this.config.get<string>('stripe.publishableKey'),
      amountMinor: order.totalMinor,
    };
  }

  // ─── Confirm order ──────────────────────────────────────────────────────────

  async confirmOrder(dto: ConfirmOrderDto, userId?: string) {
    const { data: orders } = await this.supabase.db
      .from('Order')
      .select('*')
      .eq('id', dto.orderId)
      .limit(1);

    const order = orders?.[0];
    if (!order) throw new NotFoundException('Order not found');
    if (userId && order.userId && order.userId !== userId) {
      throw new ConflictException('Order does not belong to this user');
    }

    const now = new Date().toISOString();

    await this.upsertOrderAddress(order.id, 'shipping', dto.shippingAddress);

    const billingAddrData = dto.billingAddressSameAsShipping ? dto.shippingAddress : dto.billingAddress;
    if (billingAddrData) {
      await this.upsertOrderAddress(order.id, 'billing', billingAddrData);
    }

    if (dto.deliverySlot) {
      const { data: existingSlot } = await this.supabase.db
        .from('DeliverySlotBooking')
        .select('id')
        .eq('orderId', order.id)
        .limit(1);

      if (existingSlot?.[0]) {
        await this.supabase.db
          .from('DeliverySlotBooking')
          .update({ date: dto.deliverySlot.date, slotStart: dto.deliverySlot.slotStart, slotEnd: dto.deliverySlot.slotEnd })
          .eq('id', existingSlot[0].id);
      } else {
        await this.supabase.db.from('DeliverySlotBooking').insert({
          id: uuidv4(),
          orderId: order.id,
          date: dto.deliverySlot.date,
          slotStart: dto.deliverySlot.slotStart,
          slotEnd: dto.deliverySlot.slotEnd,
          priceMinor: 0,
          createdAt: now,
        });
      }
    }

    const newStatus = order.stripePaymentStatus === 'succeeded' ? 'PAID' : 'PENDING_PAYMENT';
    const paidAt = order.stripePaymentStatus === 'succeeded' ? now : null;

    await this.supabase.db
      .from('Order')
      .update({ deliveryMethod: dto.deliveryMethod, status: newStatus, paidAt, updatedAt: now })
      .eq('id', order.id);

    if (newStatus === 'PAID') {
      // Record discount code usage
      if (order.discountCodeId) {
        await this.discountService.recordUsage(order.discountCodeId, order.id, order.userId ?? undefined, order.email);
      }

      if (this.ordersQueue) {
        await this.ordersQueue.add(
          'order.placed',
          { orderId: order.id, userId: order.userId, totalMinor: order.totalMinor, email: order.email, orderNumber: order.orderNumber },
          { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
        );
      } else {
        this.logger.warn(`Queue unavailable — order ${order.orderNumber} post-processing skipped`);
      }

      if (order.userId) {
        await this.supabase.db.from('Cart').delete().eq('userId', order.userId);
      }
    }

    const { data: updatedOrders } = await this.supabase.db
      .from('Order')
      .select('*')
      .eq('id', order.id)
      .limit(1);

    const updatedOrder = updatedOrders?.[0];

    const [{ data: items }, { data: events }, { data: addresses }, { data: slots }] = await Promise.all([
      this.supabase.db.from('OrderItem').select('*').eq('orderId', order.id),
      this.supabase.db.from('OrderEvent').select('*').eq('orderId', order.id).order('createdAt', { ascending: true }),
      this.supabase.db.from('OrderAddress').select('*').eq('orderId', order.id),
      this.supabase.db.from('DeliverySlotBooking').select('*').eq('orderId', order.id).limit(1),
    ]);

    return {
      order: serializeOrderLocal({
        ...updatedOrder,
        items: items ?? [],
        events: events ?? [],
        addresses: addresses ?? [],
        deliverySlotBooking: slots?.[0] ?? null,
      }),
      success: newStatus === 'PAID',
    };
  }

  // ─── Confirm in-store / pay at collection ──────────────────────────────────

  async confirmInStoreOrder(dto: import('./checkout.dto').ConfirmInStoreOrderDto, userId?: string) {
    const { data: orders } = await this.supabase.db
      .from('Order').select('*').eq('id', dto.orderId).limit(1);
    const order = orders?.[0];
    if (!order) throw new NotFoundException('Order not found');
    if (userId && order.userId && order.userId !== userId) {
      throw new ConflictException('Order does not belong to this user');
    }

    const now = new Date().toISOString();
    await this.upsertOrderAddress(order.id, 'shipping', dto.shippingAddress);
    await this.upsertOrderAddress(order.id, 'billing', dto.shippingAddress);

    // Record discount code usage for in-store orders
    if (order.discountCodeId) {
      await this.discountService.recordUsage(order.discountCodeId, order.id, order.userId ?? undefined, order.email);
    }

    // Mark as ALLOCATED — order confirmed, payment collected at store
    await this.supabase.db.from('Order').update({
      deliveryMethod: 'click_and_collect',
      status: 'ALLOCATED',
      updatedAt: now,
    }).eq('id', order.id);

    await this.supabase.db.from('OrderEvent').insert({
      id: uuidv4(),
      orderId: order.id,
      eventType: 'IN_STORE_ORDER_CONFIRMED',
      payload: { notes: dto.notes ?? 'Pay in store at collection', timestamp: now },
      createdAt: now,
    });

    const [{ data: items }, { data: events }, { data: addresses }] = await Promise.all([
      this.supabase.db.from('OrderItem').select('*').eq('orderId', order.id),
      this.supabase.db.from('OrderEvent').select('*').eq('orderId', order.id).order('createdAt', { ascending: true }),
      this.supabase.db.from('OrderAddress').select('*').eq('orderId', order.id),
    ]);

    const updated = (await this.supabase.db.from('Order').select('*').eq('id', order.id).limit(1)).data?.[0];
    return {
      order: serializeOrderLocal({ ...updated, items: items ?? [], events: events ?? [], addresses: addresses ?? [], deliverySlotBooking: null }),
      success: true,
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async upsertOrderAddress(orderId: string, type: 'shipping' | 'billing', addr: AddressDto): Promise<void> {
    const now = new Date().toISOString();
    const { data: existing } = await this.supabase.db
      .from('OrderAddress')
      .select('id')
      .eq('orderId', orderId)
      .eq('type', type)
      .limit(1);

    const data: Record<string, any> = {
      orderId,
      type,
      firstName: addr.firstName,
      lastName: addr.lastName,
      line1: addr.line1,
      line2: addr.line2 ?? null,
      city: addr.city,
      region: addr.region ?? null,
      postcode: addr.postcode,
      countryCode: addr.countryCode ?? 'GB',
      phone: addr.phone ?? null,
      createdAt: now,
    };

    if (existing?.[0]) {
      await this.supabase.db.from('OrderAddress').update(data).eq('id', existing[0].id);
    } else {
      await this.supabase.db.from('OrderAddress').insert({ id: uuidv4(), ...data });
    }
  }

  private mapPaymentMethod(method: string): string {
    const mapping: Record<string, string> = {
      card: 'card',
      apple_pay: 'card',
      google_pay: 'card',
      klarna: 'klarna',
      clearpay: 'afterpay_clearpay',
    };
    return mapping[method] ?? 'card';
  }
}
