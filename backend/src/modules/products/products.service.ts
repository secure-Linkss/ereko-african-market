import { Injectable, NotFoundException, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { SupabaseService } from '../../supabase/supabase.service';
import { ProductsQueryDto } from './products.dto';
import { serializeProduct } from './products.serializer';
import { encodeCursor, decodeCursor } from '../../common/utils/pagination.util';

const TTL_PRODUCTS_LIST = 5 * 60 * 1000;
const TTL_PRODUCT_SINGLE = 10 * 60 * 1000;

// Full select string for Supabase product queries
const PRODUCT_SELECT = `
  id, slug, title, brand, originCountry, descriptionShort, descriptionLong,
  storageType, isPublished, version, ingredients, createdAt, updatedAt, deletedAt,
  discountEnabled, discountPercent, discountBadge,
  ProductVariant(id, productId, sku, ean, name, weightGrams, priceAmountMinor, currency, compareAtAmountMinor, taxClassId, stockOnHand, stockReserved, safetyStockThreshold, isActive),
  ProductImage(id, productId, url, alt, position),
  ProductCategory(categoryId),
  ProductSeo(metaTitle, metaDescription, canonicalUrl, ogImage),
  CulturalMeta(regionalCuisine, localNames, traditionalUses, pairings),
  NutritionalInfo(calories, fat, saturatedFat, carbohydrates, sugar, protein, salt),
  ProductAllergen(allergen, isStructured),
  ProductTag(tag)
`.trim();

function mapRow(row: any) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    brand: row.brand,
    originCountry: row.originCountry,
    descriptionShort: row.descriptionShort,
    descriptionLong: row.descriptionLong,
    storageType: row.storageType,
    isPublished: row.isPublished,
    version: row.version,
    ingredients: row.ingredients,
    discountEnabled: row.discountEnabled ?? false,
    discountPercent: row.discountPercent ?? null,
    discountBadge: row.discountBadge ?? null,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    seo: row.ProductSeo ?? null,
    culturalMeta: row.CulturalMeta ?? null,
    nutritionalInfo: row.NutritionalInfo ?? null,
    allergens: row.ProductAllergen ?? [],
    variants: (row.ProductVariant ?? []).map((v: any) => ({
      ...v,
      priceMinor: v.priceAmountMinor,
    })),
    images: row.ProductImage ?? [],
    categories: (row.ProductCategory ?? []).map((c: any) => ({ categoryId: c.categoryId })),
    tags: (row.ProductTag ?? []).map((t: any) => ({ tag: t.tag })),
  };
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async listProducts(query: ProductsQueryDto) {
    const cacheKey = `products:list:${JSON.stringify(query)}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const { limit = 20, cursor, sortBy, filter } = query;

    let q = this.supabase.db
      .from('Product')
      .select(PRODUCT_SELECT, { count: 'exact' })
      .eq('isPublished', true)
      .is('deletedAt', null);

    if (filter?.category) {
      // Filter products that have this category via ProductCategory join table
      // We fetch all and filter in memory since PostgREST nested filter is complex
    }

    if (filter?.storage_types) {
      const types = filter.storage_types.split(',').map((s: string) => s.trim()).filter(Boolean);
      if (types.length === 1) {
        q = q.eq('storageType', types[0]);
      } else if (types.length > 1) {
        q = q.in('storageType', types);
      }
    }

    if (filter?.origins) {
      const origins = filter.origins.split(',').map((s: string) => s.trim()).filter(Boolean);
      if (origins.length === 1) {
        q = q.eq('originCountry', origins[0]);
      } else if (origins.length > 1) {
        q = q.in('originCountry', origins);
      }
    }

    // Sorting
    switch (sortBy) {
      case 'newest':
        q = q.order('createdAt', { ascending: false });
        break;
      default:
        q = q.order('createdAt', { ascending: false });
    }

    // Cursor pagination: cursor stores the createdAt of the last row
    if (cursor) {
      const decodedTs = decodeCursor(cursor);
      q = q.lt('createdAt', decodedTs);
    }

    const pageSize = limit + 1;
    q = q.limit(pageSize);

    const { data, error, count } = await q;

    if (error) {
      this.logger.error(`listProducts error: ${error.message}`);
      return { products: [], nextCursor: null, totalCount: 0 };
    }

    const rows = data ?? [];

    // Filter by category slug — resolve slug to categoryId first
    let filtered = rows;
    if (filter?.category) {
      const { data: cat } = await this.supabase.db
        .from('Category')
        .select('id')
        .eq('slug', filter.category)
        .single();

      if (cat) {
        filtered = rows.filter((r: any) =>
          (r.ProductCategory ?? []).some((c: any) => c.categoryId === cat.id),
        );
      } else {
        filtered = [];
      }
    }

    // In-stock filter
    if (filter?.in_stock === 'true') {
      filtered = filtered.filter((r: any) =>
        (r.ProductVariant ?? []).some((v: any) => v.isActive && v.stockOnHand > 0),
      );
    }

    let nextCursor: string | null = null;
    if (filtered.length > limit) {
      const next = filtered.pop() as any;
      nextCursor = encodeCursor(next.createdAt); // encode createdAt for cursor-based pagination
    }

    // Price sort in memory
    if (sortBy === 'price_asc' || sortBy === 'price_desc') {
      filtered = [...filtered].sort((a: any, b: any) => {
        const minPrice = (r: any) => {
          const prices = (r.ProductVariant ?? [])
            .filter((v: any) => v.isActive)
            .map((v: any) => v.priceAmountMinor);
          return prices.length ? Math.min(...prices) : Infinity;
        };
        return sortBy === 'price_asc' ? minPrice(a) - minPrice(b) : minPrice(b) - minPrice(a);
      });
    }

    const result = {
      products: filtered.map((r: any) => serializeProduct(mapRow(r))),
      nextCursor,
      totalCount: count ?? filtered.length,
    };

    await this.cache.set(cacheKey, result, TTL_PRODUCTS_LIST);
    return result;
  }

  async getProductBySlug(slug: string) {
    const cacheKey = `products:slug:${slug}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const { data, error } = await this.supabase.db
      .from('Product')
      .select(PRODUCT_SELECT)
      .eq('slug', slug)
      .eq('isPublished', true)
      .is('deletedAt', null)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Product "${slug}" not found`);
    }

    const result = serializeProduct(mapRow(data));
    await this.cache.set(cacheKey, result, TTL_PRODUCT_SINGLE);
    return result;
  }
}
