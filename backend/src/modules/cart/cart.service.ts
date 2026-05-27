import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  SyncCartDto,
  ApplyCouponDto,
  RedeemLoyaltyDto,
} from './cart.dto';
import {
  serializeCart,
  serializeCartItem,
  SerializedCart,
  SerializedCartItem,
} from './cart.serializer';
import { Cart, CartItem, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const CART_INCLUDE = {
  items: {
    include: {
      variant: {
        include: {
          product: {
            include: {
              images: {
                orderBy: { position: 'asc' as const },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

const FREE_SHIPPING_THRESHOLD = 5500; // pence
const STANDARD_SHIPPING = 399; // pence

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ─── Cart resolution ────────────────────────────────────────────────────────

  private async resolveOrCreateCart(
    userId?: string,
    anonymousToken?: string,
  ): Promise<Cart & { items: any[] }> {
    if (userId) {
      let cart = await this.prisma.cart.findUnique({
        where: { userId },
        include: CART_INCLUDE,
      });
      if (!cart) {
        cart = await this.prisma.cart.create({
          data: {
            userId,
            currency: 'GBP',
          },
          include: CART_INCLUDE,
        });
      }
      return cart;
    }

    if (anonymousToken) {
      let cart = await this.prisma.cart.findUnique({
        where: { anonymousToken },
        include: CART_INCLUDE,
      });
      if (!cart) {
        cart = await this.prisma.cart.create({
          data: {
            anonymousToken,
            currency: 'GBP',
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          },
          include: CART_INCLUDE,
        });
      }
      return cart;
    }

    // No identity — create ephemeral anonymous cart with a new token
    const newToken = uuidv4();
    return this.prisma.cart.create({
      data: {
        anonymousToken: newToken,
        currency: 'GBP',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      include: CART_INCLUDE,
    });
  }

  // ─── Totals recalculation ───────────────────────────────────────────────────

  private calculateTotals(
    items: { quantity: number; unitPriceMinor: number; variant: { taxClassId: string | null } }[],
    discountMinor: number,
    loyaltyDiscountMinor: number,
  ) {
    // Tax: 0% on food (no taxClassId), 20% VAT on taxClassId-tagged items
    let subtotal = 0;
    let tax = 0;

    for (const item of items) {
      const lineTotal = item.quantity * item.unitPriceMinor;
      subtotal += lineTotal;
      // If item has taxClassId it's taxable at 20% VAT (tax-inclusive pricing)
      if (item.variant.taxClassId) {
        tax += Math.round((lineTotal * 20) / 120);
      }
    }

    const effectiveDiscount = discountMinor + loyaltyDiscountMinor;
    const discountedSubtotal = Math.max(0, subtotal - effectiveDiscount);
    const shipping = discountedSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
    const total = discountedSubtotal + shipping;

    return {
      subtotalMinor: subtotal,
      taxMinor: tax,
      shippingMinor: shipping,
      totalMinor: total,
    };
  }

  private async refreshCartTotals(cartId: string): Promise<void> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: { variant: { select: { taxClassId: true } } },
        },
      },
    });
    if (!cart) return;

    const totals = this.calculateTotals(
      cart.items,
      cart.discountMinor,
      cart.loyaltyDiscountMinor,
    );

    await this.prisma.cart.update({
      where: { id: cartId },
      data: totals,
    });
  }

  // ─── Public methods ─────────────────────────────────────────────────────────

  async getCart(userId?: string, anonymousToken?: string): Promise<SerializedCart> {
    const cart = await this.resolveOrCreateCart(userId, anonymousToken);
    return serializeCart(cart as any);
  }

  async syncCart(
    dto: SyncCartDto,
    userId?: string,
    anonymousToken?: string,
  ): Promise<SerializedCart> {
    const cart = await this.resolveOrCreateCart(userId, anonymousToken);

    // Delete all existing items and rebuild from the provided list
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    if (dto.items && dto.items.length > 0) {
      // Validate variants exist
      const variantIds = dto.items.map((i) => i.variantId);
      const variants = await this.prisma.productVariant.findMany({
        where: { id: { in: variantIds }, isActive: true },
      });
      const variantMap = new Map(variants.map((v) => [v.id, v]));

      for (const item of dto.items) {
        const variant = variantMap.get(item.variantId);
        if (!variant) {
          throw new BadRequestException(
            `Product variant ${item.variantId} not found or inactive`,
          );
        }
        const availableStock = variant.stockOnHand - variant.stockReserved;
        if (item.quantity > availableStock) {
          throw new UnprocessableEntityException(
            `Insufficient stock for SKU ${variant.sku}. Available: ${availableStock}`,
          );
        }
      }

      await this.prisma.cartItem.createMany({
        data: dto.items.map((item) => ({
          cartId: cart.id,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPriceMinor: variantMap.get(item.variantId)!.priceAmountMinor,
        })),
      });
    }

    // Recalculate totals
    await this.refreshCartTotals(cart.id);

    const updated = await this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: CART_INCLUDE,
    });

    return serializeCart(updated as any);
  }

  async getItems(userId?: string, anonymousToken?: string): Promise<SerializedCartItem[]> {
    const cart = await this.resolveOrCreateCart(userId, anonymousToken);
    const full = await this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: CART_INCLUDE,
    });
    return (full?.items ?? []).map((item) => serializeCartItem(item as any));
  }

  async getItem(
    itemId: string,
    userId?: string,
    anonymousToken?: string,
  ): Promise<SerializedCartItem> {
    const cart = await this.resolveOrCreateCart(userId, anonymousToken);
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
      include: {
        variant: {
          include: {
            product: { include: { images: { orderBy: { position: 'asc' } } } },
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Cart item ${itemId} not found`);
    }

    return serializeCartItem(item as any);
  }

  async applyCoupon(
    dto: ApplyCouponDto,
    userId?: string,
    anonymousToken?: string,
  ): Promise<{ discountMinor: number; promoCode: string }> {
    const promo = await this.prisma.promoCode.findUnique({
      where: { code: dto.code.toUpperCase().trim() },
    });

    if (!promo || !promo.isActive) {
      throw new BadRequestException('Invalid or inactive promo code');
    }

    const now = new Date();
    if (promo.startsAt && promo.startsAt > now) {
      throw new BadRequestException('Promo code is not yet active');
    }
    if (promo.expiresAt && promo.expiresAt < now) {
      throw new BadRequestException('Promo code has expired');
    }
    if (promo.maxUses != null && promo.usedCount >= promo.maxUses) {
      throw new BadRequestException('Promo code usage limit reached');
    }

    // Get cart to check minimum order
    const cart = await this.resolveOrCreateCart(userId, anonymousToken);
    const full = await this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: { variant: { select: { taxClassId: true } } },
        },
      },
    });

    const subtotal = full?.items.reduce(
      (acc, i) => acc + i.quantity * i.unitPriceMinor,
      0,
    ) ?? 0;

    if (subtotal < promo.minimumOrderMinor) {
      throw new BadRequestException(
        `Minimum order of £${(promo.minimumOrderMinor / 100).toFixed(2)} required for this code`,
      );
    }

    let discountMinor = 0;
    if (promo.discountType === 'percentage') {
      discountMinor = Math.round((subtotal * promo.discountValue) / 100);
    } else if (promo.discountType === 'fixed') {
      discountMinor = Math.min(promo.discountValue, subtotal);
    } else if (promo.discountType === 'free_shipping') {
      // We'll encode free shipping as a discount equal to the shipping cost
      discountMinor = 0; // handled separately via shippingMinor = 0
    }

    // Persist on the cart
    const totals = this.calculateTotals(
      full?.items.map((i) => ({
        quantity: i.quantity,
        unitPriceMinor: i.unitPriceMinor,
        variant: { taxClassId: i.variant.taxClassId },
      })) ?? [],
      discountMinor,
      full?.loyaltyDiscountMinor ?? 0,
    );

    await this.prisma.cart.update({
      where: { id: cart.id },
      data: {
        promoCode: promo.code,
        discountMinor,
        ...totals,
      },
    });

    return { discountMinor, promoCode: promo.code };
  }

  async redeemLoyalty(
    dto: RedeemLoyaltyDto,
    userId?: string,
    anonymousToken?: string,
  ): Promise<{ loyaltyPointsRedeemed: number; loyaltyDiscountMinor: number }> {
    if (!userId) {
      throw new BadRequestException('Must be logged in to redeem loyalty points');
    }

    const loyaltyAccount = await this.prisma.loyaltyAccount.findUnique({
      where: { userId },
    });

    if (!loyaltyAccount) {
      throw new NotFoundException('Loyalty account not found');
    }

    if (dto.points > loyaltyAccount.pointsBalance) {
      throw new BadRequestException(
        `Insufficient loyalty points. Balance: ${loyaltyAccount.pointsBalance}`,
      );
    }

    // 1 point = 1 pence discount (configurable via config)
    const pointValuePence = this.config.get<number>('loyalty.pointValuePence') ?? 1;
    const loyaltyDiscountMinor = dto.points * pointValuePence;

    const cart = await this.resolveOrCreateCart(userId, undefined);
    const full = await this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: { variant: { select: { taxClassId: true } } },
        },
      },
    });

    const totals = this.calculateTotals(
      full?.items.map((i) => ({
        quantity: i.quantity,
        unitPriceMinor: i.unitPriceMinor,
        variant: { taxClassId: i.variant.taxClassId },
      })) ?? [],
      full?.discountMinor ?? 0,
      loyaltyDiscountMinor,
    );

    await this.prisma.cart.update({
      where: { id: cart.id },
      data: {
        loyaltyPointsRedeemed: dto.points,
        loyaltyDiscountMinor,
        ...totals,
      },
    });

    return { loyaltyPointsRedeemed: dto.points, loyaltyDiscountMinor };
  }
}
