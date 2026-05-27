import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
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
import { OrderStatus, DeliveryMethod, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const STOCK_RESERVE_MINUTES = 15;
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

function serializeOrder(order: any) {
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
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly paymentsService: PaymentsService,
    @InjectQueue('orders') private readonly ordersQueue: Queue,
  ) {}

  // â”€â”€â”€ Delivery slots â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getDeliverySlots(postcode: string) {
    const postcodeArea = postcode.trim().toUpperCase().split(' ')[0];

    const templates = await this.prisma.deliverySlotTemplate.findMany({
      where: {
        isActive: true,
        OR: [{ postcodeArea: null }, { postcodeArea: { startsWith: postcodeArea.slice(0, 2) } }],
      },
    });

    const slots: {
      date: string;
      slotStart: string;
      slotEnd: string;
      priceMinor: number;
    }[] = [];

    const now = new Date();
    for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
      const target = new Date(now);
      target.setDate(now.getDate() + dayOffset);
      const dayOfWeek = target.getDay(); // 0=Sun, 6=Sat
      const dateStr = target.toISOString().slice(0, 10);

      const matchedTemplates = templates.filter((t) => t.dayOfWeek === dayOfWeek);
      for (const tmpl of matchedTemplates) {
        // Check booking capacity
        const existingBookings = await this.prisma.deliverySlotBooking.count({
          where: { date: dateStr, slotStart: tmpl.slotStart, slotEnd: tmpl.slotEnd },
        });
        if (existingBookings >= tmpl.capacity) continue;

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

  // â”€â”€â”€ Start checkout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async startCheckout(dto: StartCheckoutDto, userId?: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: dto.cartId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: { images: { orderBy: { position: 'asc' } } },
                },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    if (cart.items.length === 0) {
      throw new BadRequestException('Cannot checkout an empty cart');
    }

    // Verify cart ownership
    if (userId && cart.userId && cart.userId !== userId) {
      throw new ConflictException('Cart does not belong to this user');
    }

    // Reserve stock for each item (15-minute hold)
    const stockReservedUntil = new Date(Date.now() + STOCK_RESERVE_MINUTES * 60 * 1000);

    await this.prisma.$transaction(async (tx) => {
      for (const item of cart.items) {
        const variant = item.variant;
        const available = variant.stockOnHand - variant.stockReserved;

        if (item.quantity > available) {
          throw new UnprocessableEntityError(
            `Insufficient stock for ${variant.sku}. Available: ${available}`,
          );
        }

        await tx.productVariant.update({
          where: { id: variant.id },
          data: { stockReserved: { increment: item.quantity } },
        });
      }
    });

    const deliverySlots = await this.getDeliverySlots(dto.postcode);

    // Build serialized cart for response
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
      items: cart.items.map((item) => {
        const variant = item.variant;
        const product = variant.product;
        const primaryImage = product.images[0];
        return {
          id: item.id,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPriceMinor: item.unitPriceMinor,
          sku: variant.sku,
          title: product.title,
          variantName: variant.name,
          productSlug: product.slug,
          productImage: primaryImage?.url ?? '',
          storageType: product.storageType,
          availableStock: Math.max(0, variant.stockOnHand - variant.stockReserved),
        };
      }),
    };

    // Create a pending order
    let orderNumber: string;
    let attempts = 0;
    do {
      orderNumber = generateOrderNumber();
      attempts++;
      if (attempts > 10) throw new InternalServerErrorException('Failed to generate order number');
    } while (
      await this.prisma.order.findUnique({ where: { orderNumber } })
    );

    // Derive email and name from user or dto
    const userRecord = userId
      ? await this.prisma.user.findUnique({ where: { id: userId } })
      : null;

    const email = dto.email;
    const firstName = dto.firstName ?? userRecord?.firstName ?? '';
    const lastName = dto.lastName ?? userRecord?.lastName ?? '';

    const taxMinor = cart.taxMinor;
    const subtotal = cart.subtotalMinor;
    const discount = cart.discountMinor + cart.loyaltyDiscountMinor;
    const discountedSubtotal = Math.max(0, subtotal - discount);
    const shipping = discountedSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
    const total = discountedSubtotal + shipping;

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        userId: userId ?? null,
        email,
        status: OrderStatus.PENDING_PAYMENT,
        currency: cart.currency,
        subtotalMinor: subtotal,
        discountMinor: discount,
        shippingMinor: shipping,
        taxMinor,
        totalMinor: total,
        promoCode: cart.promoCode,
        loyaltyPointsRedeemed: cart.loyaltyPointsRedeemed,
        deliveryMethod: DeliveryMethod.standard,
        items: {
          create: cart.items.map((item) => ({
            variantId: item.variantId,
            sku: item.variant.sku,
            title: item.variant.product.title,
            variantName: item.variant.name,
            quantity: item.quantity,
            priceAmountMinor: item.unitPriceMinor,
            productSlug: item.variant.product.slug,
            productImage: item.variant.product.images[0]?.url ?? '',
          })),
        },
        events: {
          create: [
            {
              eventType: 'checkout.started',
              payload: {
                postcode: dto.postcode,
                cartId: dto.cartId,
                stockReservedUntil: stockReservedUntil.toISOString(),
              },
            },
          ],
        },
      },
      include: {
        items: true,
        events: true,
        addresses: true,
        deliverySlotBooking: true,
      },
    });

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      cart: serializedCart,
      stockReservedUntil,
      availableDeliverySlots: deliverySlots,
    };
  }

  // â”€â”€â”€ Create payment intent â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async createPaymentIntent(dto: PaymentIntentDto, userId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (userId && order.userId && order.userId !== userId) {
      throw new ConflictException('Order does not belong to this user');
    }
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Order is not in a payable state');
    }

    // Idempotent: reuse existing payment intent if already created
    if (order.stripePaymentIntentId) {
      const existing = await this.paymentsService.retrievePaymentIntent(
        order.stripePaymentIntentId,
      );
      if (existing && existing.status !== 'canceled') {
        return {
          clientSecret: existing.client_secret,
          publishableKey: this.config.get<string>('stripe.publishableKey'),
          amountMinor: order.totalMinor,
        };
      }
    }

    const paymentIntent = await this.paymentsService.createPaymentIntent({
      amount: order.totalMinor,
      currency: order.currency.toLowerCase(),
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        userId: order.userId ?? 'guest',
      },
      paymentMethodTypes: [this.mapPaymentMethod(dto.paymentMethod)],
    });

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        stripePaymentIntentId: paymentIntent.id,
        stripePaymentStatus: paymentIntent.status,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      publishableKey: this.config.get<string>('stripe.publishableKey'),
      amountMinor: order.totalMinor,
    };
  }

  // â”€â”€â”€ Confirm order â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async confirmOrder(dto: ConfirmOrderDto, userId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        items: true,
        events: true,
        addresses: true,
        deliverySlotBooking: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (userId && order.userId && order.userId !== userId) {
      throw new ConflictException('Order does not belong to this user');
    }

    // Verify payment intent is paid
    if (order.stripePaymentIntentId) {
      const pi = await this.paymentsService.retrievePaymentIntent(
        order.stripePaymentIntentId,
      );
      if (pi && pi.status !== 'succeeded') {
        // Payment may not have completed yet â€” webhook will handle it
        // We still create addresses and booking, marking as pending
      }
    }

    // Upsert shipping address
    const shippingAddr = await this.upsertOrderAddress(
      order.id,
      'shipping',
      dto.shippingAddress,
    );

    // Upsert billing address
    const billingAddrData = dto.billingAddressSameAsShipping
      ? dto.shippingAddress
      : dto.billingAddress;

    let billingAddr: Awaited<ReturnType<typeof this.upsertOrderAddress>> | undefined;
    if (billingAddrData) {
      billingAddr = await this.upsertOrderAddress(order.id, 'billing', billingAddrData);
    }

    // Book delivery slot if provided
    let slotBooking: Awaited<ReturnType<typeof this.prisma.deliverySlotBooking.upsert>> | undefined;
    if (dto.deliverySlot) {
      slotBooking = await this.prisma.deliverySlotBooking.upsert({
        where: { orderId: order.id },
        create: {
          orderId: order.id,
          date: dto.deliverySlot.date,
          slotStart: dto.deliverySlot.slotStart,
          slotEnd: dto.deliverySlot.slotEnd,
          priceMinor: 0,
        },
        update: {
          date: dto.deliverySlot.date,
          slotStart: dto.deliverySlot.slotStart,
          slotEnd: dto.deliverySlot.slotEnd,
        },
      });
    }

    // Update order delivery method and status
    const updatedOrder = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        deliveryMethod: dto.deliveryMethod,
        status: order.stripePaymentStatus === 'succeeded'
          ? OrderStatus.PAID
          : OrderStatus.PENDING_PAYMENT,
        paidAt: order.stripePaymentStatus === 'succeeded' ? new Date() : undefined,
      },
      include: {
        items: true,
        events: true,
        addresses: true,
        deliverySlotBooking: true,
      },
    });

    // Queue order.placed job (loyalty, notification) if paid
    if (updatedOrder.status === OrderStatus.PAID) {
      await this.ordersQueue.add(
        'order.placed',
        {
          orderId: order.id,
          userId: order.userId,
          totalMinor: order.totalMinor,
          email: order.email,
          orderNumber: order.orderNumber,
        },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      );

      // Clear the cart
      if (order.userId) {
        await this.prisma.cart.deleteMany({ where: { userId: order.userId } });
      }
    }

    return {
      order: serializeOrder(updatedOrder),
      success: updatedOrder.status === OrderStatus.PAID,
    };
  }

  // â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private async upsertOrderAddress(
    orderId: string,
    type: 'shipping' | 'billing',
    addr: AddressDto,
  ) {
    // OrderAddress has two FK relations on orderId (shipping + billing)
    // We delete and recreate to keep it simple
    const existing = await this.prisma.orderAddress.findFirst({
      where: { orderId, type },
    });

    const data = {
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
    };

    if (existing) {
      return this.prisma.orderAddress.update({
        where: { id: existing.id },
        data,
      });
    }

    return this.prisma.orderAddress.create({ data });
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

// Custom error class for stock issues
class UnprocessableEntityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnprocessableEntityError';
  }
}

