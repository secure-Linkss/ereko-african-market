import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { SupabaseService } from '../../supabase/supabase.service';

const RECIPE_CACHE_TTL = 30 * 60 * 1000;

function serializeRecipe(recipe: any, ingredients: any[], steps: any[], relatedSlugs: string[]) {
  return {
    id: recipe.id,
    slug: recipe.slug,
    title: recipe.title,
    body: recipe.body,
    heroImage: recipe.heroImage,
    cookTimeMin: recipe.cookTimeMin,
    servings: recipe.servings,
    ingredients: ingredients.map((ing: any) => ({
      variantId: ing.variantId ?? undefined,
      sku: ing.sku ?? undefined,
      name: ing.name,
      quantityText: ing.quantityText,
    })),
    steps: steps.map((s: any) => s.body as string),
    videoUrl: recipe.videoUrl ?? undefined,
    relatedRecipes: relatedSlugs.length > 0 ? relatedSlugs : undefined,
    createdAt: recipe.createdAt,
  };
}

@Injectable()
export class RecipesService {
  constructor(
    private readonly supabase: SupabaseService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async listRecipes(limit: number) {
    const take = Math.min(Math.max(limit, 1), 50);
    const cacheKey = `recipes:list:${take}`;

    const cached = await this.cache.get<string>(cacheKey);
    if (cached) return JSON.parse(cached);

    const { data: recipes } = await this.supabase.db
      .from('Recipe')
      .select('*')
      .eq('isPublished', true)
      .order('createdAt', { ascending: false })
      .limit(take);

    if (!recipes?.length) return [];

    const recipeIds = recipes.map((r: any) => r.id);

    const [{ data: ingredients }, { data: steps }, { data: relations }] = await Promise.all([
      this.supabase.db.from('RecipeIngredient').select('*').in('recipeId', recipeIds).order('id', { ascending: true }),
      this.supabase.db.from('RecipeStep').select('*').in('recipeId', recipeIds).order('position', { ascending: true }),
      this.supabase.db.from('RecipeRelation').select('sourceId, relatedId').in('sourceId', recipeIds),
    ]);

    // Get slugs for related recipes
    const relatedIds = [...new Set((relations ?? []).map((r: any) => r.relatedId))];
    let relatedSlugMap = new Map<string, string>();
    if (relatedIds.length) {
      const { data: relatedRecipes } = await this.supabase.db
        .from('Recipe')
        .select('id, slug')
        .in('id', relatedIds);
      relatedSlugMap = new Map((relatedRecipes ?? []).map((r: any) => [r.id, r.slug]));
    }

    const ingsByRecipe = new Map<string, any[]>();
    const stepsByRecipe = new Map<string, any[]>();
    const relsByRecipe = new Map<string, string[]>();

    for (const ing of ingredients ?? []) {
      if (!ingsByRecipe.has(ing.recipeId)) ingsByRecipe.set(ing.recipeId, []);
      ingsByRecipe.get(ing.recipeId)!.push(ing);
    }
    for (const step of steps ?? []) {
      if (!stepsByRecipe.has(step.recipeId)) stepsByRecipe.set(step.recipeId, []);
      stepsByRecipe.get(step.recipeId)!.push(step);
    }
    for (const rel of relations ?? []) {
      if (!relsByRecipe.has(rel.sourceId)) relsByRecipe.set(rel.sourceId, []);
      const slug = relatedSlugMap.get(rel.relatedId);
      if (slug) relsByRecipe.get(rel.sourceId)!.push(slug);
    }

    const result = recipes.map((r: any) =>
      serializeRecipe(
        r,
        ingsByRecipe.get(r.id) ?? [],
        stepsByRecipe.get(r.id) ?? [],
        relsByRecipe.get(r.id) ?? [],
      ),
    );

    await this.cache.set(cacheKey, JSON.stringify(result), RECIPE_CACHE_TTL);
    return result;
  }

  async getRecipeBySlug(slug: string) {
    const cacheKey = `recipes:slug:${slug}`;

    const cached = await this.cache.get<string>(cacheKey);
    if (cached) return JSON.parse(cached);

    const { data: rows } = await this.supabase.db
      .from('Recipe')
      .select('*')
      .eq('slug', slug)
      .eq('isPublished', true)
      .limit(1);

    const recipe = rows?.[0];
    if (!recipe) throw new NotFoundException(`Recipe with slug "${slug}" not found`);

    const [{ data: ingredients }, { data: steps }, { data: relations }] = await Promise.all([
      this.supabase.db.from('RecipeIngredient').select('*').eq('recipeId', recipe.id).order('id', { ascending: true }),
      this.supabase.db.from('RecipeStep').select('*').eq('recipeId', recipe.id).order('position', { ascending: true }),
      this.supabase.db.from('RecipeRelation').select('relatedId').eq('sourceId', recipe.id),
    ]);

    let relatedSlugs: string[] = [];
    const relatedIds = (relations ?? []).map((r: any) => r.relatedId);
    if (relatedIds.length) {
      const { data: relatedRecipes } = await this.supabase.db
        .from('Recipe')
        .select('id, slug')
        .in('id', relatedIds);
      relatedSlugs = (relatedRecipes ?? []).map((r: any) => r.slug);
    }

    const result = serializeRecipe(recipe, ingredients ?? [], steps ?? [], relatedSlugs);
    await this.cache.set(cacheKey, JSON.stringify(result), RECIPE_CACHE_TTL);
    return result;
  }
}
