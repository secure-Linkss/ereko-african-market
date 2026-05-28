/**
 * Product seed using Supabase REST API.
 * Run: npx ts-node -e "require('./prisma/seed-products.ts')"
 * Or: npx ts-node prisma/seed-products.ts
 */
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? '';
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_KEY env vars are required');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CATS = {
  grains:    'c90e0a5a-b8a7-4737-8f4f-bfa19b9c7152',
  palmOil:   'f67808b7-4bbe-48fa-b346-01aef1540b3c',
  driedFish: 'ea8be170-36f1-4b58-be69-b8d9df2846f7',
  spices:    'a3f1f617-7733-4cee-ab15-bf55b26bda49',
  soups:     '0d82146f-e4ad-43e1-ab51-76c51b6fd962',
  snacks:    '65132166-6e81-4b64-9cec-35633dbeb964',
  beverages: '0b8b3611-165c-4b23-a3ed-08517cd52ebd',
  yam:       '471cfeba-2aab-435d-9bf5-729f1735e6f4',
  frozen:    '20221085-0edd-41dd-8626-96637e3f22ec',
};

const PRODUCTS = [
  {
    id: '00000001-0000-0000-0000-000000000001',
    slug: 'tastic-long-grain-rice-5kg',
    title: 'Tastic Long Grain Rice 5kg',
    brand: 'Tastic',
    originCountry: 'South Africa',
    descriptionShort: 'Premium long grain white rice, perfect for jollof and fried rice.',
    descriptionLong: 'Tastic Long Grain Rice is a premium quality rice that cooks perfectly every time. Its fluffy grains and clean taste make it ideal for traditional West African dishes like jollof rice, fried rice, and coconut rice.',
    storageType: 'ambient',
    isPublished: true,
    version: 1,
    categoryId: CATS.grains,
    variants: [{ sku: 'RICE-TASTIC-5KG', name: '5kg Bag', priceAmountMinor: 1299, compareAtAmountMinor: 1499, stockOnHand: 50, weightGrams: 5000 }],
    imageUrl: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&q=80',
    imageAlt: 'Tastic Long Grain Rice 5kg bag',
  },
  {
    id: '00000001-0000-0000-0000-000000000002',
    slug: 'golden-penny-semovita-1kg',
    title: 'Golden Penny Semovita 1kg',
    brand: 'Golden Penny',
    originCountry: 'Nigeria',
    descriptionShort: 'Smooth semolina flour for swallow — pairs with egusi and okra soup.',
    descriptionLong: 'Golden Penny Semovita is Nigeria\'s leading semolina-based product. It produces a smooth, stretchy swallow that is perfect for pairing with traditional Nigerian soups.',
    storageType: 'ambient',
    isPublished: true,
    version: 1,
    categoryId: CATS.grains,
    variants: [{ sku: 'SEMO-GP-1KG', name: '1kg Pack', priceAmountMinor: 349, stockOnHand: 80, weightGrams: 1000 }],
    imageUrl: 'https://images.unsplash.com/photo-1565180932296-8e0f9e60e0fa?w=600&q=80',
    imageAlt: 'Golden Penny Semovita 1kg pack',
  },
  {
    id: '00000001-0000-0000-0000-000000000003',
    slug: 'orishirishi-red-palm-oil-1l',
    title: 'Orishirishi Red Palm Oil 1L',
    brand: 'Orishirishi',
    originCountry: 'Nigeria',
    descriptionShort: 'Pure, unrefined red palm oil with rich colour and authentic flavour.',
    descriptionLong: 'Our Orishirishi Red Palm Oil is extracted from the finest palm fruits, retaining all its natural goodness. Rich in beta-carotene and Vitamin E, it adds authentic flavour to your soups and stews.',
    storageType: 'ambient',
    isPublished: true,
    version: 1,
    categoryId: CATS.palmOil,
    variants: [
      { sku: 'PALM-OIL-1L', name: '1 Litre', priceAmountMinor: 649, stockOnHand: 60, weightGrams: 900 },
      { sku: 'PALM-OIL-4L', name: '4 Litres', priceAmountMinor: 2299, compareAtAmountMinor: 2599, stockOnHand: 25, weightGrams: 3600 },
    ],
    imageUrl: 'https://images.unsplash.com/photo-1611001897292-52cf893f02bc?w=600&q=80',
    imageAlt: 'Orishirishi Red Palm Oil bottle',
  },
  {
    id: '00000001-0000-0000-0000-000000000004',
    slug: 'stockfish-fillet-dried-500g',
    title: 'Dried Stockfish Fillet 500g',
    originCountry: 'Norway',
    descriptionShort: 'Traditional dried stockfish — essential for authentic Nigerian soups.',
    descriptionLong: 'Imported from Norway, our dried stockfish fillet is a staple in Nigerian cooking. Adds a distinctive, rich umami flavour to egusi soup, ofe onugbu, and oha soup.',
    storageType: 'ambient',
    isPublished: true,
    version: 1,
    ingredients: 'Dried Atlantic Cod (Gadus morhua)',
    categoryId: CATS.driedFish,
    variants: [{ sku: 'STOCKFISH-500G', name: '500g Pack', priceAmountMinor: 1899, stockOnHand: 30, weightGrams: 500 }],
    imageUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&q=80',
    imageAlt: 'Dried stockfish fillet',
  },
  {
    id: '00000001-0000-0000-0000-000000000005',
    slug: 'cameroon-pepper-ground-100g',
    title: 'Cameroon Pepper Ground 100g',
    originCountry: 'Cameroon',
    descriptionShort: 'Intensely aromatic ground Cameroon pepper for soups and stews.',
    descriptionLong: 'Cameroon pepper (Piper guineense) is a uniquely fragrant spice that forms the backbone of many West African dishes. Freshly ground for maximum flavour.',
    storageType: 'ambient',
    isPublished: true,
    version: 1,
    ingredients: 'Ground Cameroon Pepper (Piper guineense)',
    categoryId: CATS.spices,
    variants: [{ sku: 'CAM-PEPPER-100G', name: '100g Jar', priceAmountMinor: 429, stockOnHand: 100, weightGrams: 100 }],
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
    imageAlt: 'Cameroon pepper ground spice',
  },
  {
    id: '00000001-0000-0000-0000-000000000006',
    slug: 'maggi-naija-pot-seasoning-100g',
    title: 'Maggi Naija Pot Seasoning 100g',
    brand: 'Maggi',
    originCountry: 'Nigeria',
    descriptionShort: "Nigeria's favourite all-in-one seasoning powder for soups and rice.",
    descriptionLong: "Maggi Naija Pot is specially formulated for Nigerian cooking. Its unique blend enhances the taste of jollof rice, egusi soup, pepper soup, and virtually any dish.",
    storageType: 'ambient',
    isPublished: true,
    version: 1,
    categoryId: CATS.spices,
    variants: [
      { sku: 'MAGGI-NAIJA-100G', name: '100g Box', priceAmountMinor: 249, stockOnHand: 150 },
      { sku: 'MAGGI-NAIJA-3PACK', name: '3-Pack Bundle', priceAmountMinor: 649, compareAtAmountMinor: 749, stockOnHand: 50 },
    ],
    imageUrl: 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600&q=80',
    imageAlt: 'Maggi Naija Pot seasoning',
  },
  {
    id: '00000001-0000-0000-0000-000000000007',
    slug: 'titus-sardines-in-oil-125g',
    title: 'Titus Sardines in Oil 125g',
    brand: 'Titus',
    originCountry: 'Morocco',
    descriptionShort: 'Classic Titus sardines in vegetable oil — perfect for rice and bread.',
    descriptionLong: 'Titus Sardines are a beloved staple across West Africa. Packed in pure vegetable oil, great eaten from the tin or mixed with Nigerian tomato stew over rice.',
    storageType: 'ambient',
    isPublished: true,
    version: 1,
    ingredients: 'Sardines (Sardinella), Vegetable Oil, Salt',
    categoryId: CATS.driedFish,
    variants: [{ sku: 'TITUS-SARDINE-125G', name: '125g Tin', priceAmountMinor: 189, stockOnHand: 200, weightGrams: 125 }],
    imageUrl: 'https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=600&q=80',
    imageAlt: 'Titus sardines tin',
  },
  {
    id: '00000001-0000-0000-0000-000000000008',
    slug: 'indomie-noodles-chicken-5pack',
    title: 'Indomie Noodles Chicken Variety 5-Pack',
    brand: 'Indomie',
    originCountry: 'Nigeria',
    descriptionShort: "Nigeria's most popular instant noodles — quick, tasty, and satisfying.",
    descriptionLong: "Indomie Instant Noodles are an institution in Nigerian homes. This 5-pack cooks in 3 minutes. Enjoy as a snack, full meal with eggs, or the classic Indomie with egg.",
    storageType: 'ambient',
    isPublished: true,
    version: 1,
    categoryId: CATS.snacks,
    variants: [{ sku: 'INDOMIE-CHKN-5PK', name: '5-Pack (75g each)', priceAmountMinor: 299, stockOnHand: 200, weightGrams: 375 }],
    imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&q=80',
    imageAlt: 'Indomie noodles chicken 5 pack',
  },
  {
    id: '00000001-0000-0000-0000-000000000009',
    slug: 'egusi-melon-seeds-ground-500g',
    title: 'Ground Egusi (Melon Seeds) 500g',
    originCountry: 'Nigeria',
    descriptionShort: 'Freshly ground egusi for authentic Nigerian egusi soup.',
    descriptionLong: 'Our freshly ground egusi is made from premium melon seeds sourced directly from Nigerian farms. Perfect for egusi soup — rich, nutty, and satisfying.',
    storageType: 'ambient',
    isPublished: true,
    version: 1,
    ingredients: 'Melon Seeds (Citrullus lanatus)',
    categoryId: CATS.soups,
    variants: [
      { sku: 'EGUSI-GROUND-500G', name: '500g Pack', priceAmountMinor: 799, stockOnHand: 60, weightGrams: 500 },
      { sku: 'EGUSI-GROUND-1KG', name: '1kg Pack', priceAmountMinor: 1499, compareAtAmountMinor: 1599, stockOnHand: 35, weightGrams: 1000 },
    ],
    imageUrl: 'https://images.unsplash.com/photo-1494390248081-4e521a5940db?w=600&q=80',
    imageAlt: 'Ground egusi melon seeds',
  },
  {
    id: '00000001-0000-0000-0000-000000000010',
    slug: 'milo-chocolate-malt-drink-400g',
    title: 'Milo Chocolate Malt Drink 400g',
    brand: 'Nestlé',
    originCountry: 'Nigeria',
    descriptionShort: 'Nutritious chocolate malt drink powder — a Nigerian breakfast staple.',
    descriptionLong: "Nestlé MILO is one of the most popular drinks in Nigeria. Made with cocoa, malt, and milk, packed with vitamins and minerals for sustained energy.",
    storageType: 'ambient',
    isPublished: true,
    version: 1,
    ingredients: 'Malt Extract, Cocoa Powder, Skimmed Milk Powder, Sugar, Vitamins, Minerals',
    categoryId: CATS.beverages,
    variants: [{ sku: 'MILO-400G', name: '400g Tin', priceAmountMinor: 899, stockOnHand: 80, weightGrams: 400 }],
    imageUrl: 'https://images.unsplash.com/photo-1572119865084-43c285814d63?w=600&q=80',
    imageAlt: 'Milo chocolate malt drink tin',
  },
  {
    id: '00000001-0000-0000-0000-000000000011',
    slug: 'pounded-yam-flour-poundo-1kg',
    title: 'Poundo Yam Flour 1kg',
    brand: 'Poundo',
    originCountry: 'Nigeria',
    descriptionShort: 'Instant pounded yam flour — authentic swallow in minutes.',
    descriptionLong: 'Poundo Instant Yam Flour lets you enjoy the taste of traditional pounded yam without hours of pounding. Simply add hot water and stir.',
    storageType: 'ambient',
    isPublished: true,
    version: 1,
    ingredients: 'Yam Flour',
    categoryId: CATS.yam,
    variants: [{ sku: 'POUNDO-1KG', name: '1kg Pack', priceAmountMinor: 549, stockOnHand: 90, weightGrams: 1000 }],
    imageUrl: 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=600&q=80',
    imageAlt: 'Poundo yam flour pack',
  },
  {
    id: '00000001-0000-0000-0000-000000000012',
    slug: 'frozen-plantain-slices-500g',
    title: 'Frozen Ripe Plantain Slices 500g',
    originCountry: 'Ghana',
    descriptionShort: 'Pre-sliced sweet ripe plantain, ready to fry for dodo.',
    descriptionLong: 'These pre-sliced ripe plantains from Ghana are ready to cook straight from the freezer. Perfect for making dodo (fried ripe plantain). No peeling required.',
    storageType: 'frozen',
    isPublished: true,
    version: 1,
    ingredients: 'Plantain (Musa paradisiaca)',
    categoryId: CATS.frozen,
    variants: [{ sku: 'PLANTAIN-FRZ-500G', name: '500g Bag', priceAmountMinor: 449, stockOnHand: 40, weightGrams: 500 }],
    imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&q=80',
    imageAlt: 'Frozen ripe plantain slices',
  },
] as const;

async function seed() {
  console.log('Seeding products...\n');

  for (const product of PRODUCTS) {
    const { variants, categoryId, imageUrl, imageAlt, ...productData } = product;

    const now = new Date().toISOString();
    // Upsert Product
    const { data: prod, error: prodErr } = await supabase
      .from('Product')
      .upsert({ ...productData, createdAt: now, updatedAt: now } as any, { onConflict: 'id' })
      .select('id')
      .single();

    if (prodErr) {
      console.error(`FAIL ${product.slug}: ${prodErr.message}`);
      continue;
    }

    const productId = prod.id;

    // Upsert ProductImage
    const { error: imgErr } = await supabase.from('ProductImage').upsert({
      id: `00000099-${productId.substring(9)}`,
      productId,
      url: imageUrl,
      alt: imageAlt,
      position: 0,
    } as any, { onConflict: 'id' });
    if (imgErr) console.error(`  Image fail: ${imgErr.message}`);

    // Upsert ProductCategory
    const { error: catErr } = await supabase.from('ProductCategory').upsert({
      productId,
      categoryId,
    } as any, { onConflict: 'productId,categoryId' });
    if (catErr) console.error(`  Category fail: ${catErr.message}`);

    // Upsert Variants
    for (const variant of variants) {
      const { error: varErr } = await supabase.from('ProductVariant').upsert({
        id: randomUUID(),
        productId,
        currency: 'GBP',
        stockReserved: 0,
        safetyStockThreshold: 5,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        ...variant,
      } as any, { onConflict: 'sku', ignoreDuplicates: false });
      if (varErr) console.error(`  Variant fail (${variant.sku}): ${varErr.message}`);
    }

    console.log(`OK: ${product.title}`);
  }

  console.log('\nDone!');
}

seed().catch(console.error);
