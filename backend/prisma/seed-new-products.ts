import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATS: Record<string, string> = {};

async function catId(slug: string): Promise<string | null> {
  if (CATS[slug]) return CATS[slug];
  const cat = await prisma.category.findUnique({ where: { slug } });
  if (cat) { CATS[slug] = cat.id; return cat.id; }
  console.warn(`  ⚠  Category not found: ${slug}`);
  return null;
}

async function ensureProduct(data: {
  slug: string;
  title: string;
  brand?: string;
  originCountry?: string;
  descriptionShort: string;
  descriptionLong: string;
  storageType: string;
  categorySlug: string;
  sku: string;
  priceAmountMinor: number;
  stockOnHand: number;
  weightGrams?: number;
}) {
  const existing = await prisma.product.findUnique({ where: { slug: data.slug } });
  if (existing) {
    console.log(`  ↷  Exists: ${data.title}`);
    return existing;
  }

  const categoryId = await catId(data.categorySlug);
  const product = await prisma.product.create({
    data: {
      slug: data.slug,
      title: data.title,
      brand: data.brand ?? null,
      originCountry: data.originCountry ?? 'Nigeria',
      descriptionShort: data.descriptionShort,
      descriptionLong: data.descriptionLong,
      storageType: data.storageType as any,
      isActive: true,
      isFeatured: false,
      ...(categoryId ? { categoryId } : {}),
    },
  });

  await prisma.productVariant.create({
    data: {
      productId: product.id,
      sku: data.sku,
      name: data.title,
      priceAmountMinor: data.priceAmountMinor,
      compareAtAmountMinor: null,
      currency: 'GBP',
      stockOnHand: data.stockOnHand,
      stockReserved: 0,
      safetyStockThreshold: 5,
      weightGrams: data.weightGrams ?? 500,
      isActive: true,
    },
  });

  console.log(`  ✅  Created: ${data.title}`);
  return product;
}

async function main() {
  console.log('\n🌍 EREKO — New Products Seed\n');

  const newProducts = [
    // ── Drinks & Beverages ───────────────────────────────────────────────────
    {
      slug: 'guinness-nigerian-stout-33cl',
      title: 'Guinness Nigeria Stout 33cl',
      brand: 'Guinness Nigeria',
      originCountry: 'Nigeria',
      descriptionShort: 'The iconic Nigerian Guinness stout — rich, dark, and full-bodied.',
      descriptionLong: "Guinness Nigeria is brewed locally for the Nigerian market and has a distinct taste that differs from the Irish original. Darker, sweeter, and higher in strength, it's a staple at Nigerian celebrations and a favourite across West Africa. Best enjoyed chilled.",
      storageType: 'chilled',
      categorySlug: 'drinks-beverages',
      sku: 'GUIN-NG-33CL',
      priceAmountMinor: 189,
      stockOnHand: 100,
      weightGrams: 400,
    },
    {
      slug: 'guinness-nigerian-stout-60cl',
      title: 'Guinness Nigeria Stout 60cl',
      brand: 'Guinness Nigeria',
      originCountry: 'Nigeria',
      descriptionShort: 'The full-size Nigerian Guinness — the big bottle for sharing or celebrating.',
      descriptionLong: "The large format Nigerian Guinness Stout. Same rich, dark flavour of the iconic Nigerian Guinness but in a generous 60cl bottle — perfect for parties, events, and Nigerian occasions where only the big bottle will do.",
      storageType: 'chilled',
      categorySlug: 'drinks-beverages',
      sku: 'GUIN-NG-60CL',
      priceAmountMinor: 299,
      stockOnHand: 80,
      weightGrams: 750,
    },
    {
      slug: 'nkulenu-palm-wine',
      title: "Nkulenu's Palm Wine 75cl",
      brand: "Nkulenu's",
      originCountry: 'Ghana',
      descriptionShort: "Nkulenu's sweet, natural Ghanaian palm wine — bottled fresh from the palm tree.",
      descriptionLong: "Nkulenu's Palm Wine is one of West Africa's most beloved traditional drinks, tapped directly from oil palm or raphia palms. This Ghanaian brand bottles a lightly fermented, naturally sweet palm wine that pairs beautifully with spicy food and brings the authentic West African drinking experience to your home.",
      storageType: 'chilled',
      categorySlug: 'drinks-beverages',
      sku: 'NKU-PW-75CL',
      priceAmountMinor: 399,
      stockOnHand: 60,
      weightGrams: 900,
    },

    // ── Dried & Preserved Meats ──────────────────────────────────────────────
    {
      slug: 'dried-ponmo-cow-skin',
      title: 'Dried Ponmo (Cow Skin) 200g',
      brand: null,
      originCountry: 'Nigeria',
      descriptionShort: 'Authentic dried Nigerian ponmo — hard cow skin for soups and stews.',
      descriptionLong: "Ponmo (also known as kanda or cow skin) is a beloved Nigerian delicacy. This is the hard, dried version — ideal for adding to egusi soup, ogbono, or pepper soup. It has a firm, chewy texture that becomes tender after cooking and absorbs the flavours of your pot beautifully. A staple in any Nigerian kitchen.",
      storageType: 'ambient',
      categorySlug: 'dried-fish-seafood',
      sku: 'DRY-PONMO-200G',
      priceAmountMinor: 449,
      stockOnHand: 50,
      weightGrams: 200,
    },

    // ── Fish & Seafood ───────────────────────────────────────────────────────
    {
      slug: 'giant-african-land-snail-canned',
      title: 'Giant African Land Snail (Canned) 400g',
      brand: null,
      originCountry: 'Nigeria',
      descriptionShort: 'Pre-cooked giant African land snails — ready for soups and pepper soup.',
      descriptionLong: "Giant African land snails (igbin in Yoruba) are a prized delicacy across West Africa, especially in pepper soup, egusi, and ila alasepo. This canned version is pre-cooked and ready to add to your pot — saving you the lengthy preparation time while retaining the authentic taste.",
      storageType: 'ambient',
      categorySlug: 'dried-fish-seafood',
      sku: 'SNAIL-CAN-400G',
      priceAmountMinor: 349,
      stockOnHand: 40,
      weightGrams: 400,
    },

    // ── Specialties / African Superfoods ─────────────────────────────────────
    {
      slug: 'bitter-cola-garcinia-kola',
      title: 'Bitter Cola (Garcinia Kola) 100g',
      brand: null,
      originCountry: 'Nigeria',
      descriptionShort: 'Traditional West African bitter kola — a cherished cultural gift and natural remedy.',
      descriptionLong: "Bitter cola (Garcinia kola), known as obi in Yoruba and oji in Igbo, holds deep cultural significance across West Africa — offered to guests as a welcome gesture and used in traditional ceremonies. Beyond culture, it's prized for its powerful natural properties including immune support and anti-inflammatory benefits. Enjoy as a traditional chew.",
      storageType: 'ambient',
      categorySlug: 'snacks-biscuits',
      sku: 'BIT-COLA-100G',
      priceAmountMinor: 299,
      stockOnHand: 60,
      weightGrams: 100,
    },

    // ── Kitchen Essentials ───────────────────────────────────────────────────
    {
      slug: 'wooden-mortar-pestle',
      title: 'Wooden Mortar & Pestle Set',
      brand: null,
      originCountry: 'Nigeria',
      descriptionShort: 'Traditional hand-carved African wooden mortar and pestle — for pounding yam and spices.',
      descriptionLong: "The traditional wooden mortar and pestle is the heart of many African kitchens. Hand-carved from hardwood, this set is used to pound yam into smooth, stretchy eba, grind fresh peppers and spices, and crush garlic and ginger. Durable, natural, and culturally authentic — a must-have for any African home cook.",
      storageType: 'ambient',
      categorySlug: 'cupboard-staples',
      sku: 'WD-MORT-PEST',
      priceAmountMinor: 2499,
      stockOnHand: 20,
      weightGrams: 2500,
    },
  ];

  for (const p of newProducts) {
    await ensureProduct(p);
  }

  console.log('\n✅ New products seed complete\n');
}

main()
  .catch((e) => { console.error('Fatal:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
