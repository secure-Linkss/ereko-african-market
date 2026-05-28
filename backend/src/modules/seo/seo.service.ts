import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SeoService {
  constructor(private readonly supabase: SupabaseService) {}

  async getSeoConfig(pageKey: string) {
    const { data } = await this.supabase.db
      .from('SeoConfig')
      .select('*')
      .eq('pageKey', pageKey)
      .single();
    return data;
  }

  async upsertSeoConfig(
    pageKey: string,
    data: {
      metaTitle: string;
      metaDescription: string;
      ogTitle?: string;
      ogDescription?: string;
      ogImage?: string;
      canonicalUrl?: string;
      structuredData?: object;
    },
    actorId: string,
  ) {
    const now = new Date().toISOString();
    const { data: result } = await this.supabase.db
      .from('SeoConfig')
      .upsert(
        { id: uuidv4(), pageKey, ...data, updatedBy: actorId, updatedAt: now },
        { onConflict: 'pageKey' },
      )
      .select('*')
      .single();
    return result;
  }

  async generateSitemap(baseUrl: string): Promise<string> {
    const [{ data: products }, { data: recipes }, { data: categories }] = await Promise.all([
      this.supabase.db
        .from('Product')
        .select('slug, updatedAt')
        .eq('isPublished', true)
        .is('deletedAt', null)
        .order('updatedAt', { ascending: false }),
      this.supabase.db
        .from('Recipe')
        .select('slug, updatedAt')
        .eq('isPublished', true)
        .order('updatedAt', { ascending: false }),
      this.supabase.db
        .from('Category')
        .select('slug, updatedAt')
        .eq('isActive', true),
    ]);

    const today = new Date().toISOString().split('T')[0];

    const staticPages = [
      { url: '/', changefreq: 'daily', priority: '1.0', lastmod: today },
      { url: '/shop', changefreq: 'daily', priority: '0.9', lastmod: today },
      { url: '/recipes', changefreq: 'weekly', priority: '0.8', lastmod: today },
      { url: '/cargo', changefreq: 'monthly', priority: '0.7', lastmod: today },
      { url: '/about', changefreq: 'monthly', priority: '0.5', lastmod: today },
      { url: '/contact', changefreq: 'monthly', priority: '0.5', lastmod: today },
    ];

    const toDate = (v: string) => (v ? v.split('T')[0] : today);

    const urls = [
      ...staticPages.map(
        (p) => `
  <url>
    <loc>${baseUrl}${p.url}</loc>
    <lastmod>${p.lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`,
      ),
      ...(categories ?? []).map(
        (c: any) => `
  <url>
    <loc>${baseUrl}/shop/${c.slug}</loc>
    <lastmod>${toDate(c.updatedAt)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
      ),
      ...(products ?? []).map(
        (p: any) => `
  <url>
    <loc>${baseUrl}/products/${p.slug}</loc>
    <lastmod>${toDate(p.updatedAt)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`,
      ),
      ...(recipes ?? []).map(
        (r: any) => `
  <url>
    <loc>${baseUrl}/recipes/${r.slug}</loc>
    <lastmod>${toDate(r.updatedAt)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`,
      ),
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
      description:
        "The UK's premier African food marketplace. Shop authentic West African, East African, and Pan-African groceries online with free delivery over £55.",
      address: {
        '@type': 'PostalAddress',
        streetAddress: '5 Broadway',
        addressLocality: 'Barking',
        addressRegion: 'London',
        postalCode: 'IG11 7LS',
        addressCountry: 'GB',
      },
      telephone: '+44-20-3633-7503',
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        telephone: '+44-20-3633-7503',
        email: 'hello@ereko.co.uk',
        availableLanguage: ['English', 'Yoruba', 'Igbo', 'Twi', 'Pidgin'],
      },
      sameAs: [
        'https://www.instagram.com/erekoafricanmarket',
        'https://www.facebook.com/erekoafricanmarket',
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
      offers: variant
        ? {
            '@type': 'Offer',
            price: (variant.priceAmountMinor / 100).toFixed(2),
            priceCurrency: variant.currency ?? 'GBP',
            availability:
              variant.stockOnHand > 0
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
            url: `${baseUrl}/products/${product.slug}`,
            seller: { '@type': 'Organization', name: 'EREKO Market' },
          }
        : undefined,
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
