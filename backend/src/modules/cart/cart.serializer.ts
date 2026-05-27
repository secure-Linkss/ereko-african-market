import { Cart, CartItem, ProductVariant, Product, ProductImage } from '@prisma/client';

type CartItemWithVariant = CartItem & {
  variant: ProductVariant & {
    product: Product & {
      images: ProductImage[];
    };
  };
};

type CartWithItems = Cart & {
  items: CartItemWithVariant[];
};

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
  expiresAt: Date | null;
}

export function serializeCartItem(item: CartItemWithVariant): SerializedCartItem {
  const { variant } = item;
  const product = variant.product;
  const primaryImage = product.images
    .sort((a, b) => a.position - b.position)
    .find(() => true);

  const availableStock = Math.max(
    0,
    variant.stockOnHand - variant.stockReserved,
  );

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
    availableStock,
  };
}

export function serializeCart(cart: CartWithItems): SerializedCart {
  return {
    id: cart.id,
    userId: cart.userId,
    anonymousToken: cart.anonymousToken,
    items: cart.items.map(serializeCartItem),
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
  };
}
