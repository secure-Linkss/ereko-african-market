import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wulkzddeuhkawrstbcge.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const BUCKET = 'product-images';

const IMAGES_DIR = path.resolve(__dirname, '../../product-images/edited');
const METADATA_PATH = path.join(IMAGES_DIR, 'metadata.json');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const prisma = new PrismaClient();

// Maps image filename → product slug in DB.
// IMPORTANT: each slug must match exactly what's in the products table.
const PRODUCT_SLUG_MAP: Record<string, string> = {
  // ── Flour & Swallows ────────────────────────────────────────────────────────
  'oluolu_pounded_yam.jpg':      'olu-olu-pounded-yam-flour-2kg',   // Olu Olu 2kg — primary Olu Olu pounded yam image
  // oluolu_poundo_iyan.jpg intentionally NOT mapped — same product, would overwrite correct image
  // 'oluolu_poundo_iyan.jpg': ← SKIP (was Poundo Iyan 1.2kg image, wrong for 2kg product)
  'honeywell_pounded_yam.jpg':   'honeywell-pounded-yam-flour-1-5kg', // ← MUST be Honeywell brand image, NOT Olu Olu
  'poundo_yam_generic.jpg':      'pounded-yam-flour-poundo-1kg',    // generic 1kg
  'fufu_cassava.jpg':            'olu-olu-fufu-flour-1kg',
  'amala_yam_flour.jpg':         'trocadero-amala-flour-1kg',
  'golden_penny_semovita.jpg':   'golden-penny-semovita-1kg',
  'golden_penny_semolina.jpg':   'semolina-fine-1kg',

  // ── Grains & Rice ───────────────────────────────────────────────────────────
  'basmati_rice_5kg.jpg':        'royal-umbrella-basmati-rice-5kg',
  'caprice_rice_10kg.jpg':       'caprice-parboiled-rice-10kg',

  // ── Noodles ─────────────────────────────────────────────────────────────────
  'indomie_chicken.jpg':         'indomie-noodles-chicken-5pack',
  'indomie_onion_chicken.jpg':   'indomie-onion-chicken-5pack',

  // ── Drinks & Beverages ──────────────────────────────────────────────────────
  'malta_guinness.jpg':          'malta-guinness-33cl',
  'nigerian_fanta.jpg':          'nigerian-fanta-orange-bottle-35cl',
  'nigerian_coca_cola.jpg':      'nigerian-coca-cola-bottle-35cl',
  'guinness_nigerian_33cl.jpg':  'guinness-nigerian-stout-33cl',
  'guinness_nigerian_60cl.jpg':  'guinness-nigerian-stout-60cl',
  'nkulenu_palm_wine.jpg':       'nkulenu-palm-wine',
  'milo_tin.jpg':                'milo-chocolate-malt-drink-400g',

  // ── Cooking Oils ────────────────────────────────────────────────────────────
  'palm_oil_red.jpg':            'orishirishi-red-palm-oil-1l',

  // ── Spices, Seasonings, Soups ───────────────────────────────────────────────
  'ground_egusi.jpg':            'egusi-melon-seeds-ground-500g',
  'cameroon_pepper.jpg':         'cameroon-pepper-ground-100g',
  'maggi_naija.jpg':             'maggi-naija-pot-seasoning-100g',

  // ── Fish & Seafood ──────────────────────────────────────────────────────────
  'dried_stockfish.jpg':         'stockfish-fillet-dried-500g',
  'titus_sardines.jpg':          'titus-sardines-in-oil-125g',
  'canned_snail.jpg':            'giant-african-land-snail-canned',

  // ── Grains & Rice (additional) ──────────────────────────────────────────────
  'tastic_rice_5kg.jpg':         'tastic-long-grain-rice-5kg',

  // ── Frozen & Fresh Produce ──────────────────────────────────────────────────
  'frozen_plantain.jpg':         'frozen-plantain-slices-500g',
  'fresh_plantain.jpg':          'unripe-plantain-fresh-each',

  // ── Dried & Preserved Meats ─────────────────────────────────────────────────
  'dried_ponmo.jpg':             'dried-ponmo-cow-skin',

  // ── Specialties ─────────────────────────────────────────────────────────────
  'bitter_cola.jpg':             'bitter-cola-garcinia-kola',
  'mortar_pestle.jpg':           'wooden-mortar-pestle',
};

async function ensureBucket(): Promise<void> {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = (buckets ?? []).some((b: any) => b.name === BUCKET);
  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (error) throw new Error(`Failed to create bucket: ${error.message}`);
    console.log(`  ✅ Created Supabase Storage bucket: ${BUCKET}`);
  } else {
    console.log(`  ✓ Bucket exists: ${BUCKET}`);
  }
}

async function uploadImage(filename: string): Promise<string> {
  const filePath = path.join(IMAGES_DIR, filename);
  const fileBuffer = fs.readFileSync(filePath);
  const storagePath = `products/${filename}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
      cacheControl: '31536000', // 1 year CDN cache
    });

  if (error) throw new Error(`Upload failed for ${filename}: ${error.message}`);

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return urlData.publicUrl;
}

async function upsertProductImage(
  productId: string,
  url: string,
  alt: string,
): Promise<void> {
  // Check for existing position-0 image for this product
  const existing = await prisma.productImage.findFirst({
    where: { productId, position: 0 },
  });

  if (existing) {
    await prisma.productImage.update({
      where: { id: existing.id },
      data: { url, alt },
    });
    console.log(`    ↻ Updated existing ProductImage for product ${productId}`);
  } else {
    await prisma.productImage.create({
      data: { productId, url, alt, position: 0 },
    });
    console.log(`    ➕ Created new ProductImage for product ${productId}`);
  }
}

async function main() {
  console.log('\n🚀 EREKO Product Image Upload Pipeline\n');

  // 1. Read metadata
  const metadata = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf-8'));
  const images: any[] = metadata.images;
  console.log(`📋 ${images.length} images in metadata\n`);

  // 2. Ensure bucket
  console.log('── Step 1: Supabase Storage Bucket ─────────────');
  await ensureBucket();

  // 3. Upload each image + update DB
  const results: { filename: string; url: string; status: string }[] = [];

  console.log('\n── Step 2: Upload & DB Update ──────────────────');
  for (const img of images) {
    const { filename, alt_text } = img;

    if (!fs.existsSync(path.join(IMAGES_DIR, filename))) {
      console.log(`  ⚠  SKIP (file missing): ${filename}`);
      results.push({ filename, url: '', status: 'MISSING' });
      continue;
    }

    const productSlug = PRODUCT_SLUG_MAP[filename];
    if (!productSlug) {
      console.log(`  ⚠  SKIP (no slug mapping): ${filename}`);
      results.push({ filename, url: '', status: 'NO_MAPPING' });
      continue;
    }

    console.log(`  ⬆  Uploading: ${filename}`);

    // Upload to Supabase Storage
    const cdnUrl = await uploadImage(filename);
    console.log(`     CDN: ${cdnUrl}`);

    // Find product in DB
    const product = await prisma.product.findUnique({ where: { slug: productSlug } });
    if (!product) {
      console.log(`     ⚠  Product not found in DB for slug: ${productSlug}`);
      results.push({ filename, url: cdnUrl, status: 'PRODUCT_NOT_FOUND' });
      continue;
    }

    // Upsert ProductImage
    await upsertProductImage(product.id, cdnUrl, alt_text);
    results.push({ filename, url: cdnUrl, status: 'OK' });
    console.log(`     ✅ Done: ${product.title}`);
  }

  // 4. Summary
  console.log('\n── Step 3: Summary ─────────────────────────────');
  const ok = results.filter((r) => r.status === 'OK');
  const failed = results.filter((r) => r.status !== 'OK');
  console.log(`  ✅ Successful: ${ok.length}`);
  console.log(`  ❌ Failed/Skipped: ${failed.length}`);
  if (failed.length) {
    failed.forEach((f) => console.log(`     - ${f.filename}: ${f.status}`));
  }

  // 5. Write results manifest
  const resultsPath = path.join(IMAGES_DIR, 'upload-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2));
  console.log(`\n  📄 Results written to: upload-results.json`);
}

main()
  .catch((e) => { console.error('Fatal:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
