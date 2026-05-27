import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ─── Categories ──────────────────────────────────────────────────────────────
  const categories = [
    { slug: 'grains-rice', name: 'Grains & Rice', position: 1 },
    { slug: 'palm-oil-cooking-oils', name: 'Palm Oil & Cooking Oils', position: 2 },
    { slug: 'dried-fish-seafood', name: 'Dried Fish & Seafood', position: 3 },
    { slug: 'spices-seasonings', name: 'Spices & Seasonings', position: 4 },
    { slug: 'soups-sauces', name: 'Soups & Sauces', position: 5 },
    { slug: 'snacks-biscuits', name: 'Snacks & Biscuits', position: 6 },
    { slug: 'beverages-drinks', name: 'Beverages & Drinks', position: 7 },
    { slug: 'yam-cassava', name: 'Yam & Cassava', position: 8 },
    { slug: 'frozen-foods', name: 'Frozen Foods', position: 9 },
    { slug: 'fresh-produce', name: 'Fresh Produce', position: 10 },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  // ─── Warehouses ──────────────────────────────────────────────────────────────
  await prisma.warehouse.upsert({
    where: { code: 'LDN-01' },
    update: {},
    create: {
      name: 'London Main Warehouse',
      code: 'LDN-01',
      address: 'Unit 5, Tottenham Industrial Estate, London N17 0QJ',
      isActive: true,
    },
  });

  await prisma.warehouse.upsert({
    where: { code: 'MCR-01' },
    update: {},
    create: {
      name: 'Manchester Fulfilment Centre',
      code: 'MCR-01',
      address: 'Unit 12, Trafford Park, Manchester M17 1DD',
      isActive: true,
    },
  });

  // ─── Delivery Slot Templates ──────────────────────────────────────────────────
  const slots = [
    { dayOfWeek: 1, slotStart: '09:00', slotEnd: '13:00', priceMinor: 399 },
    { dayOfWeek: 1, slotStart: '13:00', slotEnd: '17:00', priceMinor: 399 },
    { dayOfWeek: 2, slotStart: '09:00', slotEnd: '13:00', priceMinor: 399 },
    { dayOfWeek: 2, slotStart: '13:00', slotEnd: '17:00', priceMinor: 399 },
    { dayOfWeek: 3, slotStart: '09:00', slotEnd: '13:00', priceMinor: 399 },
    { dayOfWeek: 3, slotStart: '13:00', slotEnd: '17:00', priceMinor: 399 },
    { dayOfWeek: 4, slotStart: '09:00', slotEnd: '13:00', priceMinor: 399 },
    { dayOfWeek: 4, slotStart: '13:00', slotEnd: '17:00', priceMinor: 399 },
    { dayOfWeek: 5, slotStart: '09:00', slotEnd: '13:00', priceMinor: 499 },
    { dayOfWeek: 5, slotStart: '13:00', slotEnd: '17:00', priceMinor: 499 },
    { dayOfWeek: 6, slotStart: '10:00', slotEnd: '14:00', priceMinor: 599 },
  ];

  for (const slot of slots) {
    await prisma.deliverySlotTemplate.create({ data: slot });
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
