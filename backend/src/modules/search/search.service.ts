import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeProduct } from '../products/products.serializer';

interface RawProductRow {
  id: string;
}

interface RawRecipeRow {
  id: string;
}

// Full include reused from products serialiser
const PRODUCT_INCLUDE = {
  seo: true,
  culturalMeta: true,
  nutritionalInfo: true,
  allergens: true,
  variants: true,
  images: true,
  categories: { select: { categoryId: true } },
  tags: { select: { tag: true } },
};

const RECIPE_INCLUDE = {
  ingredients: true,
  steps: { orderBy: { position: 'asc' as const } },
};

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Full-text search using PostgreSQL tsvector.
   *
   * Products: searches title || brand || descriptionShort plus tags.
   * Recipes: searches title || body.
   *
   * We build a tsquery from the raw search term (split on whitespace,
   * joined with ' & ' — all terms must appear).  The tsvector is built
   * inline so no migration or extra column is needed.
   */
  async search(
    q: string,
    type: 'all' | 'products' | 'recipes',
    limit: number,
    categoryId?: string,
  ) {
    // Sanitise input: keep only word characters and whitespace
    const sanitised = q.replace(/[^a-zA-Z0-9\s'-]/g, '').trim();
    if (!sanitised) return { products: [], recipes: [] };

    // Build a simple prefix tsquery: each word becomes word:*
    const tsquery = sanitised
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => `${w.replace(/'/g, "''")}:*`)
      .join(' & ');

    const products: ReturnType<typeof serializeProduct>[] = [];
    const recipes: object[] = [];

    if (type === 'all' || type === 'products') {
      const matchedIds = await this.searchProducts(tsquery, limit, categoryId);
      if (matchedIds.length) {
        const rows = await this.prisma.product.findMany({
          where: { id: { in: matchedIds }, isPublished: true, deletedAt: null },
          include: PRODUCT_INCLUDE,
        });
        // Preserve relevance order from FTS
        const order = new Map(matchedIds.map((id, i) => [id, i]));
        rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
        products.push(...rows.map(serializeProduct));
      }
    }

    if (type === 'all' || type === 'recipes') {
      const matchedIds = await this.searchRecipes(tsquery, limit);
      if (matchedIds.length) {
        const rows = await this.prisma.recipe.findMany({
          where: { id: { in: matchedIds }, isPublished: true },
          include: RECIPE_INCLUDE,
        });
        const order = new Map(matchedIds.map((id, i) => [id, i]));
        rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
        recipes.push(...rows.map(serializeRecipe));
      }
    }

    return { products, recipes };
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async searchProducts(
    tsquery: string,
    limit: number,
    categoryId?: string,
  ): Promise<string[]> {
    if (categoryId) {
      const rows = await this.prisma.$queryRaw<RawProductRow[]>`
        SELECT p.id
        FROM "Product" p
        LEFT JOIN LATERAL (
          SELECT string_agg(pt.tag, ' ') AS tag_text
          FROM "ProductTag" pt
          WHERE pt."productId" = p.id
        ) tags ON true
        WHERE
          p."isPublished" = true
          AND p."deletedAt" IS NULL
          AND EXISTS (
            SELECT 1 FROM "ProductCategory" pc
            WHERE pc."productId" = p.id AND pc."categoryId" = ${categoryId}
          )
          AND to_tsvector('english',
            coalesce(p.title, '') || ' ' ||
            coalesce(p.brand, '') || ' ' ||
            coalesce(p."descriptionShort", '') || ' ' ||
            coalesce(tags.tag_text, '')
          ) @@ to_tsquery('english', ${tsquery})
        ORDER BY
          ts_rank(
            to_tsvector('english',
              coalesce(p.title, '') || ' ' ||
              coalesce(p.brand, '') || ' ' ||
              coalesce(p."descriptionShort", '') || ' ' ||
              coalesce(tags.tag_text, '')
            ),
            to_tsquery('english', ${tsquery})
          ) DESC
        LIMIT ${limit}
      `;
      return rows.map((r) => r.id);
    }

    const rows = await this.prisma.$queryRaw<RawProductRow[]>`
      SELECT p.id
      FROM "Product" p
      LEFT JOIN LATERAL (
        SELECT string_agg(pt.tag, ' ') AS tag_text
        FROM "ProductTag" pt
        WHERE pt."productId" = p.id
      ) tags ON true
      WHERE
        p."isPublished" = true
        AND p."deletedAt" IS NULL
        AND to_tsvector('english',
          coalesce(p.title, '') || ' ' ||
          coalesce(p.brand, '') || ' ' ||
          coalesce(p."descriptionShort", '') || ' ' ||
          coalesce(tags.tag_text, '')
        ) @@ to_tsquery('english', ${tsquery})
      ORDER BY
        ts_rank(
          to_tsvector('english',
            coalesce(p.title, '') || ' ' ||
            coalesce(p.brand, '') || ' ' ||
            coalesce(p."descriptionShort", '') || ' ' ||
            coalesce(tags.tag_text, '')
          ),
          to_tsquery('english', ${tsquery})
        ) DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => r.id);
  }

  private async searchRecipes(tsquery: string, limit: number): Promise<string[]> {
    const rows = await this.prisma.$queryRawUnsafe<RawRecipeRow[]>(
      `
      SELECT r.id
      FROM "Recipe" r
      WHERE
        r."isPublished" = true
        AND to_tsvector('english',
          coalesce(r.title, '') || ' ' ||
          coalesce(r.body, '')
        ) @@ to_tsquery('english', $1)
      ORDER BY
        ts_rank(
          to_tsvector('english',
            coalesce(r.title, '') || ' ' ||
            coalesce(r.body, '')
          ),
          to_tsquery('english', $1)
        ) DESC
      LIMIT $2
      `,
      tsquery,
      limit,
    );

    return rows.map((r) => r.id);
  }
}

// ─── Recipe serialiser (minimal shape for search results) ────────────────────

function serializeRecipe(r: {
  id: string;
  slug: string;
  title: string;
  body: string;
  heroImage: string;
  cookTimeMin: number;
  servings: number;
  videoUrl: string | null;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  ingredients: {
    id: string;
    recipeId: string;
    variantId: string | null;
    sku: string | null;
    name: string;
    quantityText: string;
  }[];
  steps: { id: string; recipeId: string; position: number; body: string }[];
}) {
  const out: Record<string, unknown> = {
    id: r.id,
    slug: r.slug,
    title: r.title,
    body: r.body,
    heroImage: r.heroImage,
    cookTimeMin: r.cookTimeMin,
    servings: r.servings,
    isPublished: r.isPublished,
    ingredients: r.ingredients.map((i) => ({
      id: i.id,
      recipeId: i.recipeId,
      name: i.name,
      quantityText: i.quantityText,
      ...(i.variantId != null && { variantId: i.variantId }),
      ...(i.sku != null && { sku: i.sku }),
    })),
    steps: r.steps.map((s) => ({
      id: s.id,
      recipeId: s.recipeId,
      position: s.position,
      body: s.body,
    })),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
  if (r.videoUrl != null) out.videoUrl = r.videoUrl;
  return out;
}
