export interface SerializedCartItem {
  id: string;
  variantId: string;
  quantity: number;
  unitPriceMinor: number;
  sku: string;
  title: string;
  variantName: string;
  productSlug: string;
  productImage: string;
  storageType: string;
  availableStock: number;
}

export interface SerializedCart {
  id: string;
  userId: string | null;
  anonymousToken: string | null;
  items: SerializedCartItem[];
  currency: string;
  promoCode: string | null;
  discountMinor: number;
  subtotalMinor: number;
  taxMinor: number;
  shippingMinor: number;
  totalMinor: number;
  loyaltyPointsRedeemed: number;
  loyaltyDiscountMinor: number;
  expiresAt: string | null;
}

export function serializeCartItem(item: any): SerializedCartItem {
  const variant = item.variant ?? {};
  const product = variant.product ?? {};
  const images: any[] = product.images ?? [];
  const primaryImage = images.sort((a: any, b: any) => a.position - b.position)[0];
  const availableStock = Math.max(0, (variant.stockOnHand ?? 0) - (variant.stockReserved ?? 0));

  return {
    id: item.id,
    variantId: item.variantId,
    quantity: item.quantity,
    unitPriceMinor: item.unitPriceMinor,
    sku: variant.sku ?? '',
    title: product.title ?? '',
    variantName: variant.name ?? '',
    productSlug: product.slug ?? '',
    productImage: primaryImage?.url ?? '',
    storageType: product.storageType ?? 'ambient',
    availableStock,
  };
}

export function serializeCart(cart: any): SerializedCart {
  return {
    id: cart.id,
    userId: cart.userId ?? null,
    anonymousToken: cart.anonymousToken ?? null,
    items: (cart.items ?? []).map(serializeCartItem),
    currency: cart.currency ?? 'GBP',
    promoCode: cart.promoCode ?? null,
    discountMinor: cart.discountMinor ?? 0,
    subtotalMinor: cart.subtotalMinor ?? 0,
    taxMinor: cart.taxMinor ?? 0,
    shippingMinor: cart.shippingMinor ?? 0,
    totalMinor: cart.totalMinor ?? 0,
    loyaltyPointsRedeemed: cart.loyaltyPointsRedeemed ?? 0,
    loyaltyDiscountMinor: cart.loyaltyDiscountMinor ?? 0,
    expiresAt: cart.expiresAt ?? null,
  };
}
