import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../prisma/prisma.service';

const RECIPE_CACHE_TTL = 30 * 60 * 1000; // 30 minutes in ms

const RECIPE_INCLUDE = {
  ingredients: {
    orderBy: { id: 'asc' as const },
  },
  steps: {
    orderBy: { position: 'asc' as const },
  },
  relatedRecipes: {
    include: {
      related: {
        select: { slug: true },
      },
    },
  },
} as const;

function serializeRecipe(recipe: any) {
  return {
    id: recipe.id,
    slug: recipe.slug,
    title: recipe.title,
    body: recipe.body,
    heroImage: recipe.heroImage,
    cookTimeMin: recipe.cookTimeMin,
    servings: recipe.servings,
    ingredients: recipe.ingredients.map((ing: any) => ({
      variantId: ing.variantId ?? undefined,
      sku: ing.sku ?? undefined,
      name: ing.name,
      quantityText: ing.quantityText,
    })),
    steps: recipe.steps.map((s: any) => s.body as string),
    videoUrl: recipe.videoUrl ?? undefined,
    relatedRecipes:
      recipe.relatedRecipes.length > 0
        ? recipe.relatedRecipes.map((r: any) => r.related.slug as string)
        : undefined,
    createdAt: recipe.createdAt.toISOString(),
  };
}

@Injectable()
export class RecipesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async listRecipes(limit: number) {
    const take = Math.min(Math.max(limit, 1), 50);
    const cacheKey = `recipes:list:${take}`;

    const cached = await this.cache.get<string>(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const recipes = await this.prisma.recipe.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' },
      take,
      include: RECIPE_INCLUDE,
    });

    const result = recipes.map(serializeRecipe);
    await this.cache.set(cacheKey, JSON.stringify(result), RECIPE_CACHE_TTL);
    return result;
  }

  async getRecipeBySlug(slug: string) {
    const cacheKey = `recipes:slug:${slug}`;

    const cached = await this.cache.get<string>(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const recipe = await this.prisma.recipe.findUnique({
      where: { slug },
      include: RECIPE_INCLUDE,
    });

    if (!recipe) {
      throw new NotFoundException(`Recipe with slug "${slug}" not found`);
    }

    if (!recipe.isPublished) {
      throw new NotFoundException(`Recipe with slug "${slug}" not found`);
    }

    const result = serializeRecipe(recipe);
    await this.cache.set(cacheKey, JSON.stringify(result), RECIPE_CACHE_TTL);
    return result;
  }
}
