// Shared Strongly-Typed Schemas & Interfaces for Ereko Market

export type CustomerTier = "Member" | "Family" | "Elder" | "Royalty";
export type StorageType = "ambient" | "chilled" | "frozen";
export type AddressType = "shipping" | "billing" | "both";

// RFC 7807 Problem Details Standard Error Format
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  trace_id?: string;
  errors?: Record<string, string[]>;
}

export interface UserProfile {
  id: string;
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  isAdmin?: boolean;
  isActive?: boolean;
  preferredLocale: string;
  marketingEmailOptIn: boolean;
  marketingSmsOptIn: boolean;
  loyaltyTier: CustomerTier;
  loyaltyPointsBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  id: string;
  userId: string;
  type: AddressType;
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postcode: string;
  countryCode: string;
  isDefault: boolean;
  validated: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  parentId?: string;
  slug: string;
  name: string;
  position: number;
  description?: string;
  image?: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  ean?: string;
  weightGrams?: number;
  priceAmountMinor: number; // in pence (e.g. 599 = £5.99)
  currency: string;        // default 'GBP'
  compareAtAmountMinor?: number;
  taxClassId?: string;
  stockOnHand: number;
  stockReserved: number;
  safetyStockThreshold: number;
  isActive: boolean;
  name: string; // e.g. "1kg" or "500ml"
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  alt: string;
  position: number;
}

export interface ProductCulturalMeta {
  regionalCuisine?: string[]; // e.g. ["Nigerian", "Ghanaian"]
  localNames?: string[];      // e.g. ["crayfish", "ede", "dried shrimp"]
  traditionalUses?: string;   // e.g. "Used in soups, stews, and jollof rice"
  pairings?: string[];        // linked product IDs/slugs
}

export interface ProductAllergen {
  allergen: string;
  isStructured: boolean;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  brand?: string;
  originCountry: string;
  descriptionShort: string;
  descriptionLong: string;
  storageType: StorageType;
  isPublished: boolean;
  version: number;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    canonicalUrl?: string;
    ogImage?: string;
  };
  culturalMeta?: ProductCulturalMeta;
  ingredients?: string;
  allergens?: ProductAllergen[];
  nutritionalInfo?: {
    calories?: number;
    fat?: number;
    saturatedFat?: number;
    carbohydrates?: number;
    sugar?: number;
    protein?: number;
    salt?: number;
  };
  variants: ProductVariant[];
  images: ProductImage[];
  categories: string[]; // Category IDs
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  id: string;
  variantId: string;
  quantity: number;
  unitPriceMinor: number;
  // Denormalized details for UI performance
  sku: string;
  title: string;
  variantName: string;
  productSlug: string;
  productImage: string;
  storageType: StorageType;
  availableStock: number;
}

export interface Cart {
  id: string;
  userId?: string;
  anonymousToken?: string;
  items: CartItem[];
  currency: string;
  promoCode?: string;
  discountMinor: number;
  subtotalMinor: number;
  taxMinor: number;
  shippingMinor: number;
  totalMinor: number;
  loyaltyPointsRedeemed?: number;
  loyaltyDiscountsMinor?: number;
  expiresAt?: string;
}

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "ALLOCATED"
  | "PICKING"
  | "PACKED"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "RETURN_REQUESTED"
  | "RETURNED"
  | "REFUNDED"
  | "ON_HOLD"
  | "CANCELLED"
  | "PARTIALLY_SHIPPED"
  | "PARTIALLY_REFUNDED"
  | "DISPUTED";

export interface DeliverySlot {
  date: string; // YYYY-MM-DD
  slotStart: string; // HH:MM
  slotEnd: string; // HH:MM
  priceMinor: number;
}

export interface OrderItem {
  id: string;
  orderId: string;
  variantId: string;
  sku: string;
  title: string;
  variantName: string;
  quantity: number;
  priceAmountMinor: number;
  productSlug: string;
  productImage: string;
  substitutionStatus?: "original" | "substituted" | "removed";
  substitutedWithSku?: string;
}

export interface OrderEvent {
  id: string;
  orderId: string;
  eventType: string;
  payload: Record<string, unknown>;
  actorId?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId?: string;
  email: string;
  phone?: string;
  status: OrderStatus;
  currency: string;
  subtotalMinor: number;
  discountMinor: number;
  shippingMinor: number;
  taxMinor: number;
  totalMinor: number;
  shippingAddress: Address;
  billingAddress: Address;
  deliverySlot?: DeliverySlot;
  deliveryMethod: string; // standard, express, click-and-collect
  notesCustomer?: string;
  loyaltyPointsEarned: number;
  loyaltyPointsRedeemed: number;
  placedAt: string;
  paidAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  trackingNumber?: string;
  carrierName?: string;
  events: OrderEvent[];
  items: OrderItem[];
}

export interface RecipeIngredient {
  variantId: string;
  sku: string;
  name: string;
  quantityText: string; // e.g. "2 tablespoons", "500g"
}

export interface Recipe {
  id: string;
  slug: string;
  title: string;
  body: string; // Markdown/RichText
  heroImage: string;
  cookTimeMin: number;
  servings: number;
  ingredients: RecipeIngredient[];
  steps: string[];
  videoUrl?: string;
  relatedRecipes?: string[]; // Recipe IDs/slugs
  createdAt: string;
}

export type CargoStatus =
  | "INQUIRY"
  | "QUOTED"
  | "BOOKED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CLOSED";

export interface CargoInquiry {
  id: string;
  trackingNumber?: string; // Generated on book
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientCity: string;
  recipientCountry: string; // e.g. Nigeria, Ghana
  weightEstKg: number;
  volumeEstCbm?: number;
  itemDescription: string;
  urgency: "standard" | "express" | "super-express";
  status: CargoStatus;
  quoteAmountMinor?: number;
  bookingDate?: string;
  shipmentDate?: string;
  estimatedDeliveryDate?: string;
  statusHistory: { status: CargoStatus; note?: string; updatedAt: string }[];
  createdAt: string;
}
