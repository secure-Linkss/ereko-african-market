import {
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductsQueryDto, SortBy } from './products.dto';
import { serializeProduct } from './products.serializer';
import { encodeCursor, decodeCursor } from '../../common/utils/pagination.util';
import { Prisma } from '@prisma/client';

// ─── Cache TTLs (milliseconds) ────────────────────────────────────────────────
const TTL_PRODUCTS_LIST = 5 * 60 * 1000;   // 5 min
const TTL_PRODUCT_SINGLE = 10 * 60 * 1000; // 10 min

// ─── Full include used for every product query ────────────────────────────────
const PRODUCT_INCLUDE = {
  seo: true,
  culturalMeta: true,
  nutritionalInfo: true,
  allergens: true,
  variants: true,
  images: true,
  categories: { select: { categoryId: true } },
  tags: { select: { tag: true } },
} satisfies Prisma.ProductInclude;

type PrismaProduct = Prisma.ProductGetPayload<{ include: typeof PRODUCT_INCLUDE }>;

// ─── Sort mappings ────────────────────────────────────────────────────────────
function buildOrderBy(sortBy: SortBy | undefined): Prisma.ProductOrderByWithRelationInput[] {
  switch (sortBy) {
    case 'newest':
      return [{ createdAt: 'desc' }];
    // price_asc/desc: we do in-memory sort after fetch (see below)
    case 'price_asc':
    case 'price_desc':
      return [{ id: 'asc' }]; // stable fetch order; sorted in memory
    case 'discount':
    case 'popularity':
    case 'bestsellers':
      return [{ createdAt: 'desc' }];
    case 'relevance':
    default:
      return [{ createdAt: 'desc' }];
  }
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  // ─── List products with filters / sort / cursor pagination ─────────────────

  async listProducts(query: ProductsQueryDto) {
    const cacheKey = `products:list:${JSON.stringify(query)}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const { limit, cursor, sortBy, filter } = query;

    // Decode cursor to an id
    const cursorId = cursor ? decodeCursor(cursor) : undefined;

    // ── Build where clause ──────────────────────────────────────────────────
    const where: Prisma.ProductWhereInput = { isPublished: true, deletedAt: null };

    if (filter?.category) {
      where.categories = { some: { categoryId: filter.category } };
    }

    if (filter?.origins) {
      const origins = filter.origins.split(',').map((s) => s.trim()).filter(Boolean);
      if (origins.length) where.originCountry = { in: origins };
    }

    if (filter?.storage_types) {
      const storageTypes = filter.storage_types
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean) as ('ambient' | 'chilled' | 'frozen')[];
      if (storageTypes.length) where.storageType = { in: storageTypes };
    }

    if (filter?.brands) {
      const brands = filter.brands.split(',').map((s) => s.trim()).filter(Boolean);
      if (brands.length) where.brand = { in: brands };
    }

    // Build variants filter — price range and in_stock can combine
    const variantFilter: Prisma.ProductVariantWhereInput = { isActive: true };
    let hasVariantFilter = false;

    if (filter?.price_min !== undefined) {
      variantFilter.priceAmountMinor = {
        ...(variantFilter.priceAmountMinor as object | undefined),
        gte: filter.price_min,
      };
      hasVariantFilter = true;
    }

    if (filter?.price_max !== undefined) {
      variantFilter.priceAmountMinor = {
        ...(variantFilter.priceAmountMinor as object | undefined),
        lte: filter.price_max,
      };
      hasVariantFilter = true;
    }

    if (filter?.in_stock === 'true') {
      variantFilter.stockOnHand = { gt: 0 };
      hasVariantFilter = true;
    }

    if (hasVariantFilter) {
      where.variants = { some: variantFilter };
    }

    // ── Count total matching records (before cursor pagination) ─────────────
    const totalCount = await this.prisma.product.count({ where });

    // ── Fetch page ──────────────────────────────────────────────────────────
    const paginationArgs: Prisma.ProductFindManyArgs = {
      where,
      orderBy: buildOrderBy(sortBy),
      take: limit + 1, // fetch one extra to determine whether there is a next page
      ...(cursorId && {
        cursor: { id: cursorId },
        skip: 1, // skip the cursor record itself
      }),
      include: PRODUCT_INCLUDE,
    };

    const rows = await this.prisma.product.findMany(paginationArgs) as PrismaProduct[];

    // Determine nextCursor before trimming rows
    let nextCursor: string | null = null;
    if (rows.length > limit) {
      const nextPage = rows.pop()!; // remove the extra record
      nextCursor = encodeCursor(nextPage.id);
    }

    // ── Price sort in memory ────────────────────────────────────────────────
    // Prisma cannot sort by relation aggregate (min variant price) in a
    // single query without a raw SQL approach; in-memory sort is acceptable
    // for typical catalogue sizes (≤ limit rows already fetched).
    let products = rows;
    if (sortBy === 'price_asc' || sortBy === 'price_desc') {
      products = [...rows].sort((a, b) => {
        const activeVariants = (v: typeof rows[0]) =>
          v.variants.filter((x) => x.isActive).map((x) => x.priceAmountMinor);

        const aVals = activeVariants(a);
        const bVals = activeVariants(b);
        const aMin = aVals.length ? Math.min(...aVals) : Infinity;
        const bMin = bVals.length ? Math.min(...bVals) : Infinity;

        return sortBy === 'price_asc' ? aMin - bMin : bMin - aMin;
      });
    }

    const result = {
      products: products.map(serializeProduct),
      nextCursor,
      totalCount,
    };

    await this.cache.set(cacheKey, result, TTL_PRODUCTS_LIST);
    return result;
  }

  // ─── Single product by slug ─────────────────────────────────────────────────

  async getProductBySlug(slug: string) {
    const cacheKey = `products:slug:${slug}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const product = await this.prisma.product.findFirst({
      where: { slug, isPublished: true, deletedAt: null },
      include: PRODUCT_INCLUDE,
    });

    if (!product) throw new NotFoundException(`Product "${slug}" not found`);

    const result = serializeProduct(product);
    await this.cache.set(cacheKey, result, TTL_PRODUCT_SINGLE);
    return result;
  }
}
