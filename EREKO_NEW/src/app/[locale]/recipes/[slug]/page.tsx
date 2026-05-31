"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Clock, Users, ChefHat, ShoppingCart, CheckCircle2, ArrowLeft, Flame, ShoppingBag, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient, API_ENDPOINTS } from '@/lib/api/client';
import { useCartStore } from '@/store/cart';
import { motion } from 'framer-motion';

interface RecipeIngredient {
  variantId?: string;
  sku?: string;
  name: string;
  quantityText: string;
}

interface RecipeDetail {
  id: string;
  slug: string;
  title: string;
  body: string;
  heroImage: string;
  cookTimeMin: number;
  servings: number;
  ingredients: RecipeIngredient[];
  steps: string[];
  videoUrl?: string;
  createdAt: string;
}

function useRecipeDetail(slug: string) {
  return useQuery<RecipeDetail>({
    queryKey: ['recipe', slug],
    queryFn: async () => {
      const res = await apiClient.get<RecipeDetail>(API_ENDPOINTS.RECIPES.DETAILS(slug));
      return res.data;
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 10,
  });
}

function useProductsBySkus(skus: string[]) {
  return useQuery({
    queryKey: ['products-by-skus', skus],
    queryFn: async () => {
      if (!skus.length) return {};
      // Load all published products and match variants by SKU client-side.
      // This is more reliable than per-SKU search which depends on title matching.
      const res = await apiClient.get('/api/v1/products', { params: { limit: 100 } });
      const allProducts: any[] = (res.data as any)?.products ?? [];
      const results: Record<string, any> = {};
      for (const product of allProducts) {
        for (const variant of product.variants ?? []) {
          if (variant.sku && skus.includes(variant.sku)) {
            results[variant.sku] = product;
          }
        }
      }
      return results;
    },
    enabled: skus.length > 0,
    staleTime: 1000 * 60 * 5,
  });
}

const DIFFICULTY_MAP: Record<string, { label: string; color: string }> = {
  Easy: { label: 'Easy', color: 'text-emerald-600 bg-emerald-50' },
  Medium: { label: 'Medium', color: 'text-amber-600 bg-amber-50' },
  Advanced: { label: 'Advanced', color: 'text-red-600 bg-red-50' },
};

export default function RecipeDetailPage() {
  const params = useParams();
  const locale = params.locale as string;
  const slug = params.slug as string;

  const { data: recipe, isLoading, error } = useRecipeDetail(slug);
  const skus = (recipe?.ingredients ?? []).filter((i) => i.sku).map((i) => i.sku!);
  const { data: productsBySku = {} } = useProductsBySkus(skus);

  const addItem = useCartStore((s) => s.addItem);

  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [addedToCart, setAddedToCart] = useState(false);

  const toggleCheck = (idx: number) => {
    setChecked((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const checkedCount = Object.values(checked).filter(Boolean).length;
  const allChecked = recipe ? checkedCount === recipe.ingredients.length : false;

  function toggleAll() {
    if (!recipe) return;
    if (allChecked) {
      setChecked({});
    } else {
      const all: Record<number, boolean> = {};
      recipe.ingredients.forEach((_, i) => { all[i] = true; });
      setChecked(all);
    }
  }

  function handleAddToBasket() {
    if (!recipe) return;
    // If no shoppable items, redirect to shop
    if (shoppableCount === 0) {
      window.location.href = `/${locale}/shop`;
      return;
    }
    let added = 0;
    recipe.ingredients.forEach((ing, idx) => {
      if (!checked[idx]) return;
      const product = ing.sku ? productsBySku[ing.sku] : null;
      if (!product) return;
      const variant = product.variants?.[0];
      if (!variant) return;
      addItem({
        variantId: variant.id,
        productId: product.id,
        title: product.title,
        variantName: variant.name,
        slug: product.slug,
        image: product.images?.[0]?.url ?? '',
        unitPriceMinor: variant.priceAmountMinor,
        quantity: 1,
        availableStock: variant.stockOnHand - (variant.stockReserved ?? 0),
        storageType: product.storageType ?? 'ambient',
      });
      added++;
    });

    if (added > 0) {
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 3000);
    }
  }

  const shoppableCount = recipe?.ingredients.filter((ing, idx) =>
    checked[idx] && ing.sku && productsBySku[ing.sku]
  ).length ?? 0;

  if (isLoading) return <RecipeSkeleton locale={locale} />;

  if (error || !recipe) {
    return (
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8">
        <Link href={`/${locale}/recipes`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Recipes
        </Link>
        <div className="text-center py-24 space-y-4">
          <ChefHat className="w-16 h-16 mx-auto text-muted-foreground/30" />
          <h2 className="text-2xl font-bold">Recipe not found</h2>
          <p className="text-muted-foreground">This recipe may have been removed or the link is incorrect.</p>
          <Link href={`/${locale}/recipes`}><Button>Browse all recipes</Button></Link>
        </div>
      </main>
    );
  }

  const difficultyData = DIFFICULTY_MAP.Medium;

  return (
    <main className="flex-1 bg-background">
      {/* Hero image */}
      <div className="w-full h-[45vh] md:h-[55vh] relative overflow-hidden bg-muted">
        <img
          src={recipe.heroImage}
          alt={recipe.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute bottom-0 left-0 right-0 p-6 md:p-12 max-w-5xl mx-auto"
        >
          <Link href={`/${locale}/recipes`} className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> All Recipes
          </Link>
          <div className="text-primary font-bold uppercase tracking-widest text-xs mb-3">
            {recipe.cookTimeMin <= 20 ? 'Quick & Easy' : recipe.cookTimeMin <= 45 ? 'Main Course' : 'Centrepiece'} · West African
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white leading-tight max-w-3xl">
            {recipe.title}
          </h1>
        </motion.div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-10 space-y-12">
        {/* Meta bar */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="flex flex-wrap items-center gap-6 py-6 border-b border-border"
        >
          <div className="flex flex-col items-center gap-1 text-center">
            <Clock className="w-6 h-6 text-primary" />
            <span className="font-bold text-sm">{recipe.cookTimeMin} min</span>
            <span className="text-xs text-muted-foreground">Total time</span>
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <Users className="w-6 h-6 text-primary" />
            <span className="font-bold text-sm">Serves {recipe.servings}</span>
            <span className="text-xs text-muted-foreground">Portions</span>
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <Flame className="w-6 h-6 text-primary" />
            <span className={`font-bold text-sm px-2 py-0.5 rounded-full text-xs ${difficultyData.color}`}>{difficultyData.label}</span>
            <span className="text-xs text-muted-foreground">Difficulty</span>
          </div>
          <div className="ml-auto">
            <p className="text-sm text-muted-foreground italic max-w-md leading-relaxed">{recipe.body}</p>
          </div>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-12">
          {/* Ingredients sidebar — sticky */}
          <div className="w-full lg:w-80 flex-shrink-0">
            <div className="lg:sticky lg:top-8 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Ingredients</h2>
                <span className="text-sm text-muted-foreground">{recipe.ingredients.length} items</span>
              </div>

              <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-transparent">
                <CardContent className="p-5 space-y-5">
                  {/* Select all */}
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded accent-primary cursor-pointer"
                    />
                    <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                      {allChecked ? 'Deselect all' : 'Select all'}
                    </span>
                  </label>

                  <div className="h-px bg-border" />

                  {/* Ingredient list */}
                  <ul className="space-y-3">
                    {recipe.ingredients.map((ing, idx) => {
                      const inStock = ing.sku && productsBySku[ing.sku];
                      return (
                        <motion.li
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="flex items-start gap-3"
                        >
                          <input
                            type="checkbox"
                            checked={!!checked[idx]}
                            onChange={() => toggleCheck(idx)}
                            className="mt-0.5 w-4 h-4 rounded accent-primary cursor-pointer flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <span className={`text-sm leading-snug ${checked[idx] ? 'line-through text-muted-foreground' : ''}`}>
                              <span className="font-medium">{ing.quantityText}</span> {ing.name}
                            </span>
                            {inStock && (
                              <span className="ml-1.5 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                                In stock
                              </span>
                            )}
                          </div>
                        </motion.li>
                      );
                    })}
                  </ul>

                  <div className="pt-3 border-t border-primary/20 space-y-3">
                    {checkedCount > 0 && (
                      <p className="text-xs text-center text-muted-foreground">
                        {checkedCount} of {recipe.ingredients.length} ingredients selected
                        {shoppableCount > 0 && ` · ${shoppableCount} available on EREKO`}
                      </p>
                    )}

                    {recipe.ingredients.length > 0 && shoppableCount < recipe.ingredients.length && (
                      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 rounded-xl p-4 flex gap-3 text-amber-800 dark:text-amber-400/90 shadow-sm">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold mb-1">Availability Notice</p>
                          <p className="text-xs leading-relaxed opacity-90">
                            Some ingredients are currently out of stock or unavailable at EREKO. You may need to source items without the <span className="font-bold text-primary bg-primary/10 px-1 rounded-sm uppercase tracking-wider text-[9px]">In stock</span> badge locally.
                          </p>
                        </div>
                      </div>
                    )}

                    <Button
                      size="lg"
                      className="w-full shadow-lg gap-2"
                      onClick={handleAddToBasket}
                      disabled={addedToCart || shoppableCount === 0}
                    >
                      {addedToCart ? (
                        <><CheckCircle2 className="w-5 h-5" /> Added to Basket!</>
                      ) : shoppableCount > 0 ? (
                        <><ShoppingCart className="w-5 h-5" /> Add {shoppableCount} available item{shoppableCount !== 1 ? 's' : ''} to Basket</>
                      ) : (
                        <><ShoppingBag className="w-5 h-5" /> Browse Shop for Ingredients</>
                      )}
                    </Button>

                    {shoppableCount === 0 && checkedCount > 0 && (
                      <p className="text-xs text-center text-muted-foreground">
                        None of the selected ingredients are currently stocked on EREKO. Browse our shop below to find alternatives.
                      </p>
                    )}

                    <Link href={`/${locale}/shop`} className="block">
                      <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
                        <ShoppingBag className="w-3.5 h-3.5" /> Shop All Ingredients
                      </Button>
                    </Link>

                    <p className="text-[11px] text-center text-muted-foreground">
                      Tick ingredients you need. Items with a stock badge can be added to your EREKO basket in one click.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Method */}
          <div className="flex-1 space-y-10 min-w-0">
            <h2 className="text-2xl font-bold">Method</h2>
            <ol className="space-y-8">
              {recipe.steps.map((step, idx) => (
                <motion.li
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                  className="flex gap-5"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black text-base shadow-sm">
                    {idx + 1}
                  </div>
                  <div className="flex-1 pt-1.5">
                    <p className="text-base text-foreground leading-relaxed">{step}</p>
                  </div>
                </motion.li>
              ))}
            </ol>

            {/* Related recipes CTA */}
            <div className="mt-12 pt-8 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold">Continue cooking</h3>
              </div>
              <Link href={`/${locale}/recipes`}>
                <Button variant="outline" className="gap-2">
                  <ChefHat className="w-4 h-4" /> Browse all 20 recipes
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function RecipeSkeleton({ locale }: { locale: string }) {
  return (
    <main className="flex-1 bg-background">
      <Skeleton className="w-full h-[45vh] md:h-[55vh]" />
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-10 space-y-8">
        <div className="flex gap-8 py-6 border-b border-border">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-20" />)}
        </div>
        <div className="flex gap-12">
          <div className="w-80 space-y-3">
            <Skeleton className="h-8 w-32" />
            {[1,2,3,4,5,6,7,8].map((i) => <Skeleton key={i} className="h-6 w-full" />)}
          </div>
          <div className="flex-1 space-y-6">
            <Skeleton className="h-8 w-24" />
            {[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        </div>
      </div>
    </main>
  );
}
