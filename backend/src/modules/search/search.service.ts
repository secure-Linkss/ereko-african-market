import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { serializeProduct } from '../products/products.serializer';

const PRODUCT_SELECT = `
  id, slug, title, brand, originCountry, descriptionShort, descriptionLong,
  storageType, isPublished, version, ingredients, createdAt, updatedAt, deletedAt,
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
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    seo: row.ProductSeo ?? null,
    culturalMeta: row.CulturalMeta ?? null,
    nutritionalInfo: row.NutritionalInfo ?? null,
    allergens: row.ProductAllergen ?? [],
    variants: row.ProductVariant ?? [],
    images: row.ProductImage ?? [],
    categories: (row.ProductCategory ?? []).map((c: any) => ({ categoryId: c.categoryId })),
    tags: (row.ProductTag ?? []).map((t: any) => ({ tag: t.tag })),
  };
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async search(
    q: string,
    type: 'all' | 'products' | 'recipes',
    limit: number,
    categoryId?: string,
  ) {
    const sanitised = q.replace(/[^a-zA-Z0-9\s'-]/g, '').trim();
    if (!sanitised) return { products: [], recipes: [] };

    const products: ReturnType<typeof serializeProduct>[] = [];
    const recipes: object[] = [];

    if (type === 'all' || type === 'products') {
      try {
        let query = this.supabase.db
          .from('Product')
          .select(PRODUCT_SELECT)
          .eq('isPublished', true)
          .is('deletedAt', null)
          .or(`title.ilike.%${sanitised}%,descriptionShort.ilike.%${sanitised}%,brand.ilike.%${sanitised}%`)
          .limit(limit);

        const { data, error } = await query;

        if (error) {
          this.logger.error(`Search products error: ${error.message}`);
        } else {
          let rows = data ?? [];
          if (categoryId) {
            rows = rows.filter((r: any) =>
              (r.ProductCategory ?? []).some((c: any) => c.categoryId === categoryId),
            );
          }
          products.push(...rows.map((r: any) => serializeProduct(mapRow(r))));
        }
      } catch (err: any) {
        this.logger.error(`Search products exception: ${err.message}`);
      }
    }

    return { products, recipes };
  }
}
