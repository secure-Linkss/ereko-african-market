import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORIES: Record<string, string> = {};

async function getCategoryId(slug: string): Promise<string | null> {
  if (CATEGORIES[slug]) return CATEGORIES[slug];
  const cat = await prisma.category.findUnique({ where: { slug } });
  if (cat) { CATEGORIES[slug] = cat.id; return cat.id; }
  return null;
}

const products = [
  // ── Pounded Yam / Fufu / Swallows ─────────────────────────────────────────
  {
    slug: 'olu-olu-pounded-yam-flour-2kg',
    title: 'Olu Olu Pounded Yam Flour 2kg',
    brand: 'Olu Olu',
    originCountry: 'Nigeria',
    descriptionShort: 'Premium instant pounded yam flour — the authentic Nigerian swallow, ready in minutes.',
    descriptionLong: 'Olu Olu Pounded Yam Flour is made from high-quality white yam, carefully processed to retain the authentic taste and smooth texture of traditionally pounded yam. Perfect for serving with egusi soup, okra, or ogbono. Just add boiling water and stir to your desired consistency.',
    storageType: 'ambient',
    categorySlug: 'flour-swallows',
    sku: 'OLU-PY-2KG',
    priceAmountMinor: 799,
    stockOnHand: 80,
    weightGrams: 2000,
  },
  {
    slug: 'honeywell-pounded-yam-flour-1-5kg',
    title: 'Honeywell Pounded Yam Flour 1.5kg',
    brand: 'Honeywell',
    originCountry: 'Nigeria',
    descriptionShort: 'Smooth, authentic pounded yam flour from Nigeria\'s trusted Honeywell brand.',
    descriptionLong: 'Honeywell Pounded Yam Flour delivers the authentic taste and stretchy texture of hand-pounded yam. Made from premium white yam varieties, this flour is enriched with vitamins and minerals. Great for family meals and celebrations.',
    storageType: 'ambient',
    categorySlug: 'flour-swallows',
    sku: 'HON-PY-1.5KG',
    priceAmountMinor: 699,
    stockOnHand: 70,
    weightGrams: 1500,
  },
  {
    slug: 'olu-olu-fufu-flour-1kg',
    title: 'Olu Olu Fufu Flour 1kg',
    brand: 'Olu Olu',
    originCountry: 'Nigeria',
    descriptionShort: 'Fermented cassava fufu flour — the classic West African swallow for soups and stews.',
    descriptionLong: 'Olu Olu Fufu Flour is made from naturally fermented cassava, giving it the distinctively tangy, elastic texture that makes fufu a beloved staple across West Africa. Works beautifully with palm nut soup, egusi, or edikaikong. No need for days of fermentation — ready in minutes.',
    storageType: 'ambient',
    categorySlug: 'flour-swallows',
    sku: 'OLU-FUF-1KG',
    priceAmountMinor: 449,
    stockOnHand: 90,
    weightGrams: 1000,
  },
  {
    slug: 'trocadero-amala-flour-1kg',
    title: 'Trocadero Amala Flour 1kg',
    brand: 'Trocadero',
    originCountry: 'Nigeria',
    descriptionShort: 'Dark yam flour for making amala — a Yoruba staple served with ewedu, gbegiri, and stew.',
    descriptionLong: 'Trocadero Amala Flour is made from dried yam peel, giving it the characteristic dark colour and smooth, stretchy texture of authentic amala. Rich in dietary fibre and carbohydrates, amala is a nutritious and filling swallow typically enjoyed with ewedu soup, gbegiri (bean porridge), or buka stew. A favourite in Yoruba cuisine.',
    storageType: 'ambient',
    categorySlug: 'flour-swallows',
    sku: 'TRO-AML-1KG',
    priceAmountMinor: 499,
    stockOnHand: 65,
    weightGrams: 1000,
  },
  {
    slug: 'semolina-fine-1kg',
    title: 'Golden Penny Semolina Fine 1kg',
    brand: 'Golden Penny',
    originCountry: 'Nigeria',
    descriptionShort: 'Fine-grade semolina flour for a smooth, creamy swallow — lighter than eba, richer than semovita.',
    descriptionLong: 'Golden Penny Fine Semolina is milled from high-quality wheat to produce a light, smooth swallow that pairs perfectly with all Nigerian soups. Its neutral flavour and silky texture make it popular with families who prefer a lighter alternative to pounded yam or eba. Simply pour into boiling water and stir until smooth.',
    storageType: 'ambient',
    categorySlug: 'flour-swallows',
    sku: 'GP-SEM-1KG',
    priceAmountMinor: 449,
    stockOnHand: 75,
    weightGrams: 1000,
  },
  // ── Drinks ────────────────────────────────────────────────────────────────
  {
    slug: 'nigerian-fanta-orange-bottle-35cl',
    title: 'Nigerian Fanta Orange 35cl Glass Bottle',
    brand: 'Fanta',
    originCountry: 'Nigeria',
    descriptionShort: 'The iconic Nigerian glass bottle Fanta — sweeter, more vibrant, and far superior to the UK version.',
    descriptionLong: 'Nigerian Fanta Orange in the classic 35cl glass bottle is a cult favourite. Made with real cane sugar and a more intense orange flavour than the UK formula, this is the real deal. Perfect chilled or served with suya, fried chicken, or any Nigerian meal. A taste of home in every sip.',
    storageType: 'chilled',
    categorySlug: 'drinks-beverages',
    sku: 'FAN-ORG-35CL',
    priceAmountMinor: 149,
    stockOnHand: 200,
    weightGrams: 450,
  },
  {
    slug: 'nigerian-coca-cola-bottle-35cl',
    title: 'Nigerian Coca-Cola 35cl Glass Bottle',
    brand: 'Coca-Cola',
    originCountry: 'Nigeria',
    descriptionShort: 'Classic Nigerian Coca-Cola in the original glass bottle — cane sugar formula, ice cold.',
    descriptionLong: 'Nigerian Coca-Cola in the traditional 35cl glass bottle is made with cane sugar instead of corn syrup, giving it the authentic sweet, full-bodied taste that Nigerians grew up with. Nothing beats a cold Coke in a glass bottle. Served best with peppered chicken, suya, or jollof rice.',
    storageType: 'chilled',
    categorySlug: 'drinks-beverages',
    sku: 'CCL-35CL',
    priceAmountMinor: 149,
    stockOnHand: 180,
    weightGrams: 450,
  },
  {
    slug: 'malta-guinness-33cl',
    title: 'Malta Guinness Non-Alcoholic Malt Drink 33cl',
    brand: 'Guinness',
    originCountry: 'Nigeria',
    descriptionShort: 'The beloved West African non-alcoholic malt drink — rich, dark, and nutritious.',
    descriptionLong: 'Malta Guinness is a premium non-alcoholic malt drink made from malted barley, hops, and water. With its rich, caramel-like flavour and creamy head, it is a staple at Nigerian celebrations, parties, and family gatherings. Packed with B vitamins and energy, it is the favourite drink for those who want the taste of Guinness without the alcohol.',
    storageType: 'ambient',
    categorySlug: 'drinks-beverages',
    sku: 'MLT-GNS-33CL',
    priceAmountMinor: 169,
    stockOnHand: 150,
    weightGrams: 390,
  },
  // ── Rice ─────────────────────────────────────────────────────────────────
  {
    slug: 'royal-umbrella-basmati-rice-5kg',
    title: 'Royal Umbrella Basmati Rice 5kg',
    brand: 'Royal Umbrella',
    originCountry: 'Thailand',
    descriptionShort: 'Premium aged Thai basmati rice — long, fluffy grains perfect for jollof, fried rice, and everyday meals.',
    descriptionLong: 'Royal Umbrella Basmati Rice is grown and aged in Thailand\'s finest paddy fields for maximum fragrance and length. Each grain cooks separately, remains fluffy, and absorbs sauces beautifully. A top choice for Nigerian jollof rice, Ghanaian fried rice, and East African pilau. 5kg feeds the whole family.',
    storageType: 'ambient',
    categorySlug: 'grains-rice',
    sku: 'RU-BAS-5KG',
    priceAmountMinor: 1099,
    stockOnHand: 60,
    weightGrams: 5000,
  },
  {
    slug: 'caprice-parboiled-rice-10kg',
    title: 'Caprice Long Grain Parboiled Rice 10kg',
    brand: 'Caprice',
    originCountry: 'Thailand',
    descriptionShort: 'Bulk 10kg parboiled long grain rice — the go-to for large family jollof and party rice.',
    descriptionLong: 'Caprice Parboiled Long Grain Rice is the Nigerian party cook\'s best friend. Pre-parboiled for faster cooking and better nutrient retention, each grain stays separate and firm after cooking — no sticking, no mushiness. Perfect for cooking large pots of Nigerian jollof rice, tomato rice, or coconut rice for parties and events.',
    storageType: 'ambient',
    categorySlug: 'grains-rice',
    sku: 'CAP-LGR-10KG',
    priceAmountMinor: 1999,
    stockOnHand: 40,
    weightGrams: 10000,
  },
  // ── Noodles ───────────────────────────────────────────────────────────────
  {
    slug: 'indomie-onion-chicken-5pack',
    title: 'Indomie Onion Chicken Noodles 5-Pack',
    brand: 'Indomie',
    originCountry: 'Nigeria',
    descriptionShort: 'The iconic Nigerian Indomie noodles in the favourite onion chicken flavour — a true comfort food.',
    descriptionLong: 'Indomie Onion Chicken is the signature flavour that built the Indomie brand in Nigeria. Rich, savoury broth seasoning with real onion powder and chicken flavour. Ready in 3 minutes — perfect for a quick lunch, a midnight snack, or fried indomie topped with vegetables and egg. A pack of 5 so the whole family is covered.',
    storageType: 'ambient',
    categorySlug: 'cupboard-staples',
    sku: 'INDO-OC-5PK',
    priceAmountMinor: 399,
    stockOnHand: 120,
    weightGrams: 375,
  },
  // ── Plantain ──────────────────────────────────────────────────────────────
  {
    slug: 'unripe-plantain-fresh-each',
    title: 'Fresh Unripe Plantain (Each)',
    brand: null,
    originCountry: 'Ghana',
    descriptionShort: 'Fresh green unripe plantain — perfect for boiling, roasting, and making plantain chips (kelewele).',
    descriptionLong: 'Fresh unripe green plantains sourced from West Africa. Hard, starchy, and savoury, unripe plantain is ideal for boiling whole (served with beans or pepper sauce), slicing and roasting over charcoal (boli), or frying into crispy chips seasoned with suya spice or ginger. A versatile staple in Ghanaian and Nigerian cooking.',
    storageType: 'ambient',
    categorySlug: 'fresh-produce',
    sku: 'PLNT-UNRIPE-EA',
    priceAmountMinor: 89,
    stockOnHand: 150,
    weightGrams: 300,
  },
];

async function ensureCategory(slug: string, name: string): Promise<string> {
  const cat = await prisma.category.upsert({
    where: { slug },
    create: { slug, name, isActive: true },
    update: {},
  });
  return cat.id;
}

async function main() {
  console.log('Seeding additional products...\n');

  const now = new Date();

  // Ensure all needed categories exist
  const catIds: Record<string, string> = {
    'flour-swallows': await ensureCategory('flour-swallows', 'Flour & Swallows'),
    'drinks-beverages': await ensureCategory('drinks-beverages', 'Drinks & Beverages'),
    'grains-rice': await ensureCategory('grains-rice', 'Grains & Rice'),
    'cupboard-staples': await ensureCategory('cupboard-staples', 'Cupboard Staples'),
    'fresh-produce': await ensureCategory('fresh-produce', 'Fresh Produce'),
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
        brand: p.brand,
        originCountry: p.originCountry,
        descriptionShort: p.descriptionShort,
        descriptionLong: p.descriptionLong,
        storageType: p.storageType as any,
        isPublished: true,
        createdAt: now,
        updatedAt: now,
      },
    });

    await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: p.sku,
        name: p.title,
        priceAmountMinor: p.priceAmountMinor,
        currency: 'GBP',
        stockOnHand: p.stockOnHand,
        stockReserved: 0,
        safetyStockThreshold: 10,
        isActive: true,
        weightGrams: p.weightGrams,
        createdAt: now,
        updatedAt: now,
      },
    });

    const catId = catIds[p.categorySlug];
    if (catId) {
      await prisma.productCategory.create({
        data: { productId: product.id, categoryId: catId },
      });
    }

    console.log(`  ✅ Seeded: ${p.title}`);
    seeded++;
  }

  console.log(`\nDone. Seeded: ${seeded}, Skipped: ${skipped}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
