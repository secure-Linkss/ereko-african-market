import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { ConfigService } from '@nestjs/config';
import { SyncCartDto, ApplyCouponDto, RedeemLoyaltyDto } from './cart.dto';
import { serializeCart, serializeCartItem, SerializedCart, SerializedCartItem } from './cart.serializer';
import { v4 as uuidv4 } from 'uuid';

const FREE_SHIPPING_THRESHOLD = 5500;
const STANDARD_SHIPPING = 399;

const CART_SELECT = 'id, userId, anonymousToken, currency, promoCode, discountMinor, subtotalMinor, taxMinor, shippingMinor, totalMinor, loyaltyPointsRedeemed, loyaltyDiscountMinor, expiresAt, createdAt, updatedAt';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async fetchCartWithItems(cartId: string): Promise<any> {
    const { data: cart } = await this.supabase.db
      .from('Cart')
      .select(CART_SELECT)
      .eq('id', cartId)
      .single();

    if (!cart) return null;

    const { data: rawItems } = await this.supabase.db
      .from('CartItem')
      .select('id, cartId, variantId, quantity, unitPriceMinor')
      .eq('cartId', cartId);

    const items = await this.enrichItems(rawItems ?? []);
    return { ...cart, items };
  }

  private async enrichItems(rawItems: any[]): Promise<any[]> {
    if (!rawItems.length) return [];

    const variantIds = rawItems.map((i) => i.variantId);
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
      .select('id, productId, url, alt, position')
      .in('productId', productIds)
      .order('position', { ascending: true });

    const variantMap = new Map((variants ?? []).map((v: any) => [v.id, v]));
    const productMap = new Map((products ?? []).map((p: any) => [p.id, p]));
    const imagesByProduct = new Map<string, any[]>();
    for (const img of images ?? []) {
      if (!imagesByProduct.has(img.productId)) imagesByProduct.set(img.productId, []);
      imagesByProduct.get(img.productId)!.push(img);
    }

    return rawItems.map((item) => {
      const variant = variantMap.get(item.variantId) ?? {};
      const product = productMap.get(variant.productId) ?? {};
      return {
        ...item,
        variant: {
          ...variant,
          product: {
            ...product,
            images: imagesByProduct.get(product.id) ?? [],
          },
        },
      };
    });
  }

  private async resolveOrCreateCart(userId?: string, anonymousToken?: string): Promise<any> {
    const now = new Date().toISOString();

    if (userId) {
      const { data: rows } = await this.supabase.db
        .from('Cart')
        .select(CART_SELECT)
        .eq('userId', userId)
        .limit(1);

      if (rows?.[0]) return rows[0];

      const { data: cart } = await this.supabase.db
        .from('Cart')
        .insert({ id: uuidv4(), userId, currency: 'GBP', discountMinor: 0, subtotalMinor: 0, taxMinor: 0, shippingMinor: 0, totalMinor: 0, loyaltyPointsRedeemed: 0, loyaltyDiscountMinor: 0, createdAt: now, updatedAt: now })
        .select(CART_SELECT)
        .single();
      return cart;
    }

    if (anonymousToken) {
      const { data: rows } = await this.supabase.db
        .from('Cart')
        .select(CART_SELECT)
        .eq('anonymousToken', anonymousToken)
        .limit(1);

      if (rows?.[0]) return rows[0];

      const { data: cart } = await this.supabase.db
        .from('Cart')
        .insert({ id: uuidv4(), anonymousToken, currency: 'GBP', discountMinor: 0, subtotalMinor: 0, taxMinor: 0, shippingMinor: 0, totalMinor: 0, loyaltyPointsRedeemed: 0, loyaltyDiscountMinor: 0, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), createdAt: now, updatedAt: now })
        .select(CART_SELECT)
        .single();
      return cart;
    }

    const newToken = uuidv4();
    const { data: cart } = await this.supabase.db
      .from('Cart')
      .insert({ id: uuidv4(), anonymousToken: newToken, currency: 'GBP', discountMinor: 0, subtotalMinor: 0, taxMinor: 0, shippingMinor: 0, totalMinor: 0, loyaltyPointsRedeemed: 0, loyaltyDiscountMinor: 0, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), createdAt: now, updatedAt: now })
      .select(CART_SELECT)
      .single();
    return cart;
  }

  private calculateTotals(items: { quantity: number; unitPriceMinor: number; variant: { taxClassId?: string | null } }[], discountMinor: number, loyaltyDiscountMinor: number) {
    let subtotal = 0;
    let tax = 0;

    for (const item of items) {
      const lineTotal = item.quantity * item.unitPriceMinor;
      subtotal += lineTotal;
      if (item.variant.taxClassId) {
        tax += Math.round((lineTotal * 20) / 120);
      }
    }

    const effectiveDiscount = discountMinor + loyaltyDiscountMinor;
    const discountedSubtotal = Math.max(0, subtotal - effectiveDiscount);
    const shipping = discountedSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
    const total = discountedSubtotal + shipping;

    return { subtotalMinor: subtotal, taxMinor: tax, shippingMinor: shipping, totalMinor: total };
  }

  private async refreshCartTotals(cartId: string): Promise<void> {
    const { data: cart } = await this.supabase.db
      .from('Cart')
      .select('discountMinor, loyaltyDiscountMinor')
      .eq('id', cartId)
      .single();

    if (!cart) return;

    const { data: rawItems } = await this.supabase.db
      .from('CartItem')
      .select('quantity, unitPriceMinor, variantId')
      .eq('cartId', cartId);

    const variantIds = (rawItems ?? []).map((i: any) => i.variantId);
    let variantTaxMap = new Map<string, string | null>();

    if (variantIds.length) {
      const { data: variants } = await this.supabase.db
        .from('ProductVariant')
        .select('id, taxClassId')
        .in('id', variantIds);
      variantTaxMap = new Map((variants ?? []).map((v: any) => [v.id, v.taxClassId]));
    }

    const items = (rawItems ?? []).map((i: any) => ({
      quantity: i.quantity,
      unitPriceMinor: i.unitPriceMinor,
      variant: { taxClassId: variantTaxMap.get(i.variantId) ?? null },
    }));

    const totals = this.calculateTotals(items, cart.discountMinor ?? 0, cart.loyaltyDiscountMinor ?? 0);

    await this.supabase.db
      .from('Cart')
      .update({ ...totals, updatedAt: new Date().toISOString() })
      .eq('id', cartId);
  }

  // ─── Public methods ─────────────────────────────────────────────────────────

  async getCart(userId?: string, anonymousToken?: string): Promise<SerializedCart> {
    const cart = await this.resolveOrCreateCart(userId, anonymousToken);
    const full = await this.fetchCartWithItems(cart.id);
    return serializeCart(full ?? cart);
  }

  async syncCart(dto: SyncCartDto, userId?: string, anonymousToken?: string): Promise<SerializedCart> {
    const cart = await this.resolveOrCreateCart(userId, anonymousToken);

    await this.supabase.db.from('CartItem').delete().eq('cartId', cart.id);

    if (dto.items && dto.items.length > 0) {
      const variantIds = dto.items.map((i) => i.variantId);
      const { data: variants } = await this.supabase.db
        .from('ProductVariant')
        .select('id, sku, stockOnHand, stockReserved, priceAmountMinor, isActive')
        .in('id', variantIds)
        .eq('isActive', true);

      const variantMap = new Map((variants ?? []).map((v: any) => [v.id, v]));

      for (const item of dto.items) {
        const variant = variantMap.get(item.variantId);
        if (!variant) {
          throw new BadRequestException(`Product variant ${item.variantId} not found or inactive`);
        }
        const availableStock = variant.stockOnHand - variant.stockReserved;
        if (item.quantity > availableStock) {
          throw new UnprocessableEntityException(`Insufficient stock for SKU ${variant.sku}. Available: ${availableStock}`);
        }
      }

      const now = new Date().toISOString();
      await this.supabase.db.from('CartItem').insert(
        dto.items.map((item) => ({
          id: uuidv4(),
          cartId: cart.id,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPriceMinor: variantMap.get(item.variantId)!.priceAmountMinor,
          updatedAt: now,
        })),
      );
    }

    await this.refreshCartTotals(cart.id);
    const updated = await this.fetchCartWithItems(cart.id);
    return serializeCart(updated ?? cart);
  }

  async getItems(userId?: string, anonymousToken?: string): Promise<SerializedCartItem[]> {
    const cart = await this.resolveOrCreateCart(userId, anonymousToken);
    const full = await this.fetchCartWithItems(cart.id);
    return (full?.items ?? []).map(serializeCartItem);
  }

  async getItem(itemId: string, userId?: string, anonymousToken?: string): Promise<SerializedCartItem> {
    const cart = await this.resolveOrCreateCart(userId, anonymousToken);

    const { data: rows } = await this.supabase.db
      .from('CartItem')
      .select('id, cartId, variantId, quantity, unitPriceMinor')
      .eq('id', itemId)
      .eq('cartId', cart.id)
      .limit(1);

    const item = rows?.[0];
    if (!item) throw new NotFoundException(`Cart item ${itemId} not found`);

    const enriched = await this.enrichItems([item]);
    return serializeCartItem(enriched[0]);
  }

  async applyCoupon(dto: ApplyCouponDto, userId?: string, anonymousToken?: string): Promise<{ discountMinor: number; promoCode: string }> {
    const { data: promos } = await this.supabase.db
      .from('PromoCode')
      .select('*')
      .eq('code', dto.code.toUpperCase().trim())
      .limit(1);

    const promo = promos?.[0];
    if (!promo || !promo.isActive) throw new BadRequestException('Invalid or inactive promo code');

    const now = new Date();
    if (promo.startsAt && new Date(promo.startsAt) > now) throw new BadRequestException('Promo code is not yet active');
    if (promo.expiresAt && new Date(promo.expiresAt) < now) throw new BadRequestException('Promo code has expired');
    if (promo.maxUses != null && promo.usedCount >= promo.maxUses) throw new BadRequestException('Promo code usage limit reached');

    const cart = await this.resolveOrCreateCart(userId, anonymousToken);
    const { data: rawItems } = await this.supabase.db
      .from('CartItem')
      .select('quantity, unitPriceMinor, variantId')
      .eq('cartId', cart.id);

    const subtotal = (rawItems ?? []).reduce((acc: number, i: any) => acc + i.quantity * i.unitPriceMinor, 0);

    if (subtotal < promo.minimumOrderMinor) {
      throw new BadRequestException(`Minimum order of £${(promo.minimumOrderMinor / 100).toFixed(2)} required for this code`);
    }

    let discountMinor = 0;
    if (promo.discountType === 'percentage') {
      discountMinor = Math.round((subtotal * promo.discountValue) / 100);
    } else if (promo.discountType === 'fixed') {
      discountMinor = Math.min(promo.discountValue, subtotal);
    }

    await this.supabase.db
      .from('Cart')
      .update({ promoCode: promo.code, discountMinor, updatedAt: new Date().toISOString() })
      .eq('id', cart.id);

    await this.refreshCartTotals(cart.id);
    return { discountMinor, promoCode: promo.code };
  }

  async redeemLoyalty(dto: RedeemLoyaltyDto, userId?: string, anonymousToken?: string): Promise<{ loyaltyPointsRedeemed: number; loyaltyDiscountMinor: number }> {
    if (!userId) throw new BadRequestException('Must be logged in to redeem loyalty points');

    const { data: loyaltyRows } = await this.supabase.db
      .from('LoyaltyAccount')
      .select('pointsBalance')
      .eq('userId', userId)
      .limit(1);

    const loyalty = loyaltyRows?.[0];
    if (!loyalty) throw new NotFoundException('Loyalty account not found');

    if (dto.points > loyalty.pointsBalance) {
      throw new BadRequestException(`Insufficient loyalty points. Balance: ${loyalty.pointsBalance}`);
    }

    const pointValuePence = this.config.get<number>('loyalty.pointValuePence') ?? 1;
    const loyaltyDiscountMinor = dto.points * pointValuePence;

    const cart = await this.resolveOrCreateCart(userId, undefined);
    await this.supabase.db
      .from('Cart')
      .update({ loyaltyPointsRedeemed: dto.points, loyaltyDiscountMinor, updatedAt: new Date().toISOString() })
      .eq('id', cart.id);

    await this.refreshCartTotals(cart.id);
    return { loyaltyPointsRedeemed: dto.points, loyaltyDiscountMinor };
  }
}
