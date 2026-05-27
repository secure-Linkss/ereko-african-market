import { stripNulls } from '../../common/utils/serializer.util';

// ─── Local type helpers (matching Prisma return shapes) ───────────────────────

type PrismaVariant = {
  id: string;
  productId: string;
  sku: string;
  ean: string | null;
  name: string;
  weightGrams: number | null;
  priceAmountMinor: number;
  currency: string;
  compareAtAmountMinor: number | null;
  taxClassId: string | null;
  stockOnHand: number;
  stockReserved: number;
  safetyStockThreshold: number;
  isActive: boolean;
};

type PrismaImage = {
  id: string;
  productId: string;
  url: string;
  alt: string;
  position: number;
};

type PrismaAllergen = {
  allergen: string;
  isStructured: boolean;
};

type PrismaSeo = {
  metaTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  ogImage: string | null;
} | null;

type PrismaCulturalMeta = {
  regionalCuisine: string[];
  localNames: string[];
  traditionalUses: string | null;
  pairings: string[];
} | null;

type PrismaNutritionalInfo = {
  calories: number | null;
  fat: number | null;
  saturatedFat: number | null;
  carbohydrates: number | null;
  sugar: number | null;
  protein: number | null;
  salt: number | null;
} | null;

type PrismaProduct = {
  id: string;
  slug: string;
  title: string;
  brand: string | null;
  originCountry: string;
  descriptionShort: string;
  descriptionLong: string;
  storageType: 'ambient' | 'chilled' | 'frozen';
  isPublished: boolean;
  version: number;
  ingredients: string | null;
  createdAt: Date;
  updatedAt: Date;
  seo: PrismaSeo;
  culturalMeta: PrismaCulturalMeta;
  nutritionalInfo: PrismaNutritionalInfo;
  allergens: PrismaAllergen[];
  variants: PrismaVariant[];
  images: PrismaImage[];
  categories: { categoryId: string }[];
  tags: { tag: string }[];
};

// ─── Serializers ──────────────────────────────────────────────────────────────

function serializeVariant(v: PrismaVariant) {
  return stripNulls({
    id: v.id,
    productId: v.productId,
    sku: v.sku,
    ean: v.ean,
    name: v.name,
    weightGrams: v.weightGrams,
    priceAmountMinor: v.priceAmountMinor,
    currency: v.currency,
    compareAtAmountMinor: v.compareAtAmountMinor,
    taxClassId: v.taxClassId,
    stockOnHand: v.stockOnHand,
    stockReserved: v.stockReserved,
    safetyStockThreshold: v.safetyStockThreshold,
    isActive: v.isActive,
  });
}

function serializeImage(img: PrismaImage) {
  return {
    id: img.id,
    productId: img.productId,
    url: img.url,
    alt: img.alt,
    position: img.position,
  };
}

function serializeSeo(seo: PrismaSeo) {
  if (!seo) return undefined;
  const out = stripNulls({
    metaTitle: seo.metaTitle,
    metaDescription: seo.metaDescription,
    canonicalUrl: seo.canonicalUrl,
    ogImage: seo.ogImage,
  });
  return Object.keys(out).length ? out : undefined;
}

function serializeCulturalMeta(cm: PrismaCulturalMeta) {
  if (!cm) return undefined;
  const out: Record<string, unknown> = {};
  if (cm.regionalCuisine?.length) out.regionalCuisine = cm.regionalCuisine;
  if (cm.localNames?.length) out.localNames = cm.localNames;
  if (cm.traditionalUses != null) out.traditionalUses = cm.traditionalUses;
  if (cm.pairings?.length) out.pairings = cm.pairings;
  return Object.keys(out).length ? out : undefined;
}

function serializeNutritionalInfo(ni: PrismaNutritionalInfo) {
  if (!ni) return undefined;
  const out = stripNulls({
    calories: ni.calories,
    fat: ni.fat,
    saturatedFat: ni.saturatedFat,
    carbohydrates: ni.carbohydrates,
    sugar: ni.sugar,
    protein: ni.protein,
    salt: ni.salt,
  });
  return Object.keys(out).length ? out : undefined;
}

export function serializeProduct(p: PrismaProduct) {
  const base: Record<string, unknown> = {
    id: p.id,
    slug: p.slug,
    title: p.title,
    originCountry: p.originCountry,
    descriptionShort: p.descriptionShort,
    descriptionLong: p.descriptionLong,
    storageType: p.storageType,
    isPublished: p.isPublished,
    version: p.version,
    variants: p.variants.map(serializeVariant),
    images: p.images
      .sort((a, b) => a.position - b.position)
      .map(serializeImage),
    categories: p.categories.map((c) => c.categoryId),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };

  // Optional fields — only include when non-null/non-empty
  if (p.brand != null) base.brand = p.brand;
  if (p.ingredients != null) base.ingredients = p.ingredients;
  if (p.tags?.length) base.tags = p.tags.map((t) => t.tag);

  const seo = serializeSeo(p.seo);
  if (seo) base.seo = seo;

  const culturalMeta = serializeCulturalMeta(p.culturalMeta);
  if (culturalMeta) base.culturalMeta = culturalMeta;

  const nutritionalInfo = serializeNutritionalInfo(p.nutritionalInfo);
  if (nutritionalInfo) base.nutritionalInfo = nutritionalInfo;

  if (p.allergens?.length) {
    base.allergens = p.allergens.map((a) => ({
      allergen: a.allergen,
      isStructured: a.isStructured,
    }));
  }

  return base;
}
