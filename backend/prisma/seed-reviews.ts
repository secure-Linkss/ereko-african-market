import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../.env.local'), override: true });

const GOOGLE_REVIEWS = [
  { author_name: 'Ogunmoroti Olusola', rating: 5, comment: 'Your one stop shop for all African food stuffs and groceries in Barking. Nice and friendly staff welcomes you on entering the store.' },
  { author_name: 'Julieta Jalo', rating: 5, comment: 'Products with good quality' },
  { author_name: 'Olamide Adekoya', rating: 5, comment: 'Lovely store, great customer service. Everything you looking for you will get.' },
  { author_name: 'Olowookere Adeola', rating: 5, comment: 'I visited this African shop and they have good everything I been looking for in London… will be coming often' },
  { author_name: 'Shittu Olumide', rating: 5, comment: 'Nice staff and quality products and services.' },
  { author_name: 'Francis Anyacho', rating: 5, comment: "Truly African! There's hardly anything I've needed and not found it there. Highly recommend!" },
  { author_name: 'Adegoke Salau', rating: 5, comment: 'Good value for money and very good customer services' },
  { author_name: 'Yanju Otubu', rating: 5, comment: 'Ereko!!!!! A place to get all African food with affordable prices and good customer service.' },
  { author_name: 'Dondigidi', rating: 5, comment: 'Good service and correct products.' },
  { author_name: 'BADA ABDULL', rating: 5, comment: 'Very lovely service' },
  { author_name: 'Ade Oguns', rating: 5, comment: 'The best African shop in East London' },
  { author_name: 'Engineer Happy', rating: 5, comment: 'Adorable and good services' },
  { author_name: 'Nadiia Hurtovenko', rating: 5, comment: 'Perfect service!' },
  { author_name: 'Kolawo Odunlami', rating: 5, comment: 'Fantastic reception' },
];

async function main() {
  const prisma = new PrismaClient({ log: ['warn', 'error'] });

  console.log('Creating StoreReview table...');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "StoreReview" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      author_name TEXT NOT NULL,
      author_email TEXT,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      source TEXT NOT NULL DEFAULT 'site' CHECK (source IN ('site', 'google')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      moderated_at TIMESTAMPTZ,
      moderated_by TEXT
    )
  `);
  console.log('Table created (or already exists).');

  // Count existing Google reviews
  const existing = await prisma.$queryRawUnsafe<{ count: string }[]>(
    `SELECT COUNT(*) as count FROM "StoreReview" WHERE source = 'google'`
  );
  const existingCount = parseInt(existing[0]?.count ?? '0', 10);
  console.log(`Existing Google reviews: ${existingCount}`);

  if (existingCount === 0) {
    console.log('Seeding 14 Google reviews...');
    const now = new Date().toISOString();
    for (const r of GOOGLE_REVIEWS) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "StoreReview" (id, author_name, author_email, rating, comment, status, source, created_at, updated_at)
         VALUES ($1::uuid, $2, NULL, $3, $4, 'approved', 'google', $5::timestamptz, $5::timestamptz)`,
        uuidv4(), r.author_name, r.rating, r.comment, now,
      );
    }
    console.log(`Seeded ${GOOGLE_REVIEWS.length} reviews.`);
  } else {
    console.log('Google reviews already seeded — skipping.');
  }

  await prisma.$disconnect();
  console.log('Done.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
