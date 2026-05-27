import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SeoService {
  constructor(private readonly prisma: PrismaService) {}

  async getSeoConfig(pageKey: string) {
    return this.prisma.seoConfig.findUnique({ where: { pageKey } });
  }

  async upsertSeoConfig(pageKey: string, data: {
    metaTitle: string;
    metaDescription: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    canonicalUrl?: string;
    structuredData?: object;
  }, actorId: string) {
    return this.prisma.seoConfig.upsert({
      where: { pageKey },
      create: { pageKey, ...data, updatedBy: actorId },
      update: { ...data, updatedBy: actorId },
    });
  }

  async generateSitemap(baseUrl: string): Promise<string> {
    const [products, recipes, categories] = await Promise.all([
      this.prisma.product.findMany({
        where: { isPublished: true, deletedAt: null },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.recipe.findMany({
        where: { isPublished: true },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.category.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    const staticPages = [
      { url: '/', changefreq: 'daily', priority: '1.0', lastmod: new Date().toISOString().split('T')[0] },
      { url: '/shop', changefreq: 'daily', priority: '0.9', lastmod: new Date().toISOString().split('T')[0] },
      { url: '/recipes', changefreq: 'weekly', priority: '0.8', lastmod: new Date().toISOString().split('T')[0] },
      { url: '/cargo', changefreq: 'monthly', priority: '0.7', lastmod: new Date().toISOString().split('T')[0] },
      { url: '/about', changefreq: 'monthly', priority: '0.5', lastmod: new Date().toISOString().split('T')[0] },
      { url: '/contact', changefreq: 'monthly', priority: '0.5', lastmod: new Date().toISOString().split('T')[0] },
    ];

    const urls = [
      ...staticPages.map(p => `
  <url>
    <loc>${baseUrl}${p.url}</loc>
    <lastmod>${p.lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`),

      ...categories.map(c => `
  <url>
    <loc>${baseUrl}/shop/${c.slug}</loc>
    <lastmod>${c.updatedAt.toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`),

      ...products.map(p => `
  <url>
    <loc>${baseUrl}/products/${p.slug}</loc>
    <lastmod>${p.updatedAt.toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`),

      ...recipes.map(r => `
  <url>
    <loc>${baseUrl}/recipes/${r.slug}</loc>
    <lastmod>${r.updatedAt.toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`),
    ];

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls.join('')}
</urlset>`;
  }

  getOrganizationSchema(baseUrl: string) {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'EREKO Market',
      alternateName: 'EREKO African Food Store',
      url: baseUrl,
      logo: `${baseUrl}/logo.png`,
      description: 'The UK\'s premier African food marketplace. Shop authentic West African, East African, and Pan-African groceries online with free delivery over £55.',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'London',
        addressLocality: 'London',
        postalCode: 'N17 0QJ',
        addressCountry: 'GB',
      },
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        email: 'hello@ereko.market',
        availableLanguage: ['English', 'Yoruba', 'Igbo', 'Twi', 'Pidgin'],
      },
      sameAs: [
        'https://www.instagram.com/erekomarket',
        'https://www.facebook.com/erekomarket',
        'https://twitter.com/erekomarket',
      ],
    };
  }

  getProductSchema(product: any, baseUrl: string) {
    const variant = product.variants?.[0];
    const image = product.images?.[0];

    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      description: product.descriptionShort,
      image: image?.url,
      brand: { '@type': 'Brand', name: product.brand ?? 'EREKO' },
      offers: variant ? {
        '@type': 'Offer',
        price: (variant.priceAmountMinor / 100).toFixed(2),
        priceCurrency: variant.currency ?? 'GBP',
        availability: variant.stockOnHand > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        url: `${baseUrl}/products/${product.slug}`,
        seller: { '@type': 'Organization', name: 'EREKO Market' },
      } : undefined,
      countryOfOrigin: product.originCountry,
    };
  }

  getBreadcrumbSchema(items: { name: string; url: string }[], baseUrl: string) {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: `${baseUrl}${item.url}`,
      })),
    };
  }
}
