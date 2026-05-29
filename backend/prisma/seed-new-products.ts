import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function ensureCategory(slug: string, name: string): Promise<string> {
  const cat = await prisma.category.upsert({
    where: { slug },
    create: { slug, name, isActive: true },
    update: {},
  });
  return cat.id;
}

const products = [
  // ── Drinks & Beverages ───────────────────────────────────────────────────
  {
    slug: 'guinness-nigerian-stout-33cl',
    title: 'Guinness Nigeria Stout 33cl',
    brand: 'Guinness Nigeria',
    originCountry: 'Nigeria',
    descriptionShort: 'The iconic Nigerian Guinness stout — rich, dark, and full-bodied in a 33cl bottle.',
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
    descriptionShort: 'The full-size Nigerian Guinness 60cl — for celebrations and sharing.',
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
    descriptionShort: "Nkulenu's authentic Ghanaian palm wine — naturally sweet and traditionally tapped.",
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
    title: 'Dried Ponmo (Cow Skin)',
    brand: '',
    originCountry: 'Nigeria',
    descriptionShort: 'Authentic dried Nigerian ponmo — hard cow skin for soups, sold by weight or per box.',
    descriptionLong: "Ponmo (also known as kanda or cow skin) is a beloved Nigerian delicacy. This is the hard, dried version — ideal for adding to egusi soup, ogbono, or pepper soup. It has a firm, chewy texture that becomes tender after cooking and absorbs the flavours of your pot beautifully. Available per KG or as a full box. A staple in any Nigerian kitchen.",
    storageType: 'ambient',
    categorySlug: 'dried-fish-seafood',
    sku: 'DRY-PONMO-KG',
    priceAmountMinor: 1499,
    stockOnHand: 50,
    weightGrams: 1000,
    extraVariants: [
      { sku: 'DRY-PONMO-BOX', name: 'Per Box (~5kg)', priceAmountMinor: 5999, weightGrams: 5000 },
    ],
  },

  // ── Fish & Seafood ───────────────────────────────────────────────────────
  {
    slug: 'giant-african-land-snail-canned',
    title: 'Giant African Land Snail (Canned) 400g',
    brand: '',
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

  // ── Specialties ─────────────────────────────────────────────────────────
  {
    slug: 'bitter-cola-garcinia-kola',
    title: 'Bitter Cola (Garcinia Kola) 100g',
    brand: '',
    originCountry: 'Nigeria',
    descriptionShort: 'Traditional West African bitter kola — a cherished cultural gift and natural remedy.',
    descriptionLong: "Bitter cola (Garcinia kola), known as obi in Yoruba and oji in Igbo, holds deep cultural significance across West Africa — offered to guests as a welcome gesture and used in traditional ceremonies. Beyond culture, it's prized for its powerful natural properties including immune support and anti-inflammatory benefits.",
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
    brand: '',
    originCountry: 'Nigeria',
    descriptionShort: 'Traditional hand-carved African wooden mortar and pestle — for pounding yam and grinding spices.',
    descriptionLong: "The traditional wooden mortar and pestle is the heart of many African kitchens. Hand-carved from hardwood, this set is used to pound yam into smooth, stretchy swallow, grind fresh peppers and spices, and crush garlic and ginger. Durable, natural, and culturally authentic.",
    storageType: 'ambient',
    categorySlug: 'cupboard-staples',
    sku: 'WD-MORT-PEST',
    priceAmountMinor: 2499,
    stockOnHand: 20,
    weightGrams: 2500,
  },
] as const;

async function main() {
  console.log('\n🌍 EREKO — New Products Seed\n');

  const now = new Date();

  const catIds: Record<string, string> = {
    'drinks-beverages': await ensureCategory('drinks-beverages', 'Drinks & Beverages'),
    'dried-fish-seafood': await ensureCategory('dried-fish-seafood', 'Dried Fish & Seafood'),
    'snacks-biscuits': await ensureCategory('snacks-biscuits', 'Snacks & Biscuits'),
    'cupboard-staples': await ensureCategory('cupboard-staples', 'Cupboard Staples'),
  };

  let seeded = 0;
  let skipped = 0;

  for (const p of products) {
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (existing) { console.log(`  SKIP (exists): ${p.title}`); skipped++; continue; }

    const product = await prisma.product.create({
      data: {
        slug: p.slug,
        title: p.title,
        brand: p.brand || undefined,
        originCountry: p.originCountry,
        descriptionShort: p.descriptionShort,
        descriptionLong: p.descriptionLong,
        storageType: p.storageType as any,
        isPublished: true,
        createdAt: now,
        updatedAt: now,
      },
    });

    // Primary variant
    await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: p.sku,
        name: p.title,
        priceAmountMinor: p.priceAmountMinor,
        currency: 'GBP',
        stockOnHand: p.stockOnHand,
        stockReserved: 0,
        safetyStockThreshold: 5,
        isActive: true,
        weightGrams: p.weightGrams,
        createdAt: now,
        updatedAt: now,
      },
    });

    // Extra variants (e.g. ponmo per box)
    if ((p as any).extraVariants) {
      for (const v of (p as any).extraVariants) {
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            sku: v.sku,
            name: v.name,
            priceAmountMinor: v.priceAmountMinor,
            currency: 'GBP',
            stockOnHand: 10,
            stockReserved: 0,
            safetyStockThreshold: 2,
            isActive: true,
            weightGrams: v.weightGrams,
            createdAt: now,
            updatedAt: now,
          },
        });
      }
    }

    const catId = catIds[p.categorySlug];
    if (catId) {
      await prisma.productCategory.create({
        data: { productId: product.id, categoryId: catId },
      });
    }

    console.log(`  ✅  Seeded: ${p.title}`);
    seeded++;
  }

  console.log(`\nDone. Seeded: ${seeded}, Skipped: ${skipped}\n`);
}

main()
  .catch((e) => { console.error('Fatal:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
