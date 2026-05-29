'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Clock, Users, ChefHat } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient, API_ENDPOINTS } from '@/lib/api/client';
import { motion, AnimatePresence } from 'framer-motion';

function useRecipes(limit = 12) {
  return useQuery({
    queryKey: ['recipes', limit],
    queryFn: async () => {
      const res = await apiClient.get<any[]>(API_ENDPOINTS.RECIPES.LIST, { params: { limit } });
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

const CATEGORIES = ['All Recipes', 'Nigerian', 'Ghanaian', 'Quick & Easy', 'Vegan', 'Soups & Stews', 'Snacks'];

export default function RecipesIndexPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en-gb';
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Recipes');

  const { data: recipes, isLoading } = useRecipes(50); // Get enough for all 20

  const filtered = (recipes ?? []).filter((r: any) => {
    const matchesSearch = !search || r.title?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All Recipes' || r.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fadeUp: any = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 space-y-12">

      <div className="text-center space-y-4 max-w-2xl mx-auto pt-8">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Authentic African Recipes</h1>
        <p className="text-lg text-muted-foreground">
          Discover traditional dishes, modern twists, and the perfect ingredients to bring African flavours to your kitchen.
        </p>
        <div className="pt-4 max-w-md mx-auto">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recipes (e.g. Jollof, Egusi, Kelewele)..."
            className="h-12 text-lg rounded-full px-6 shadow-sm"
          />
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide justify-center flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-5 py-2 rounded-full border whitespace-nowrap font-medium transition-colors text-sm ${
              selectedCategory === cat 
                ? 'bg-primary text-primary-foreground border-primary shadow-md' 
                : 'border-border hover:border-primary hover:bg-primary/5 text-muted-foreground hover:text-foreground'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-[4/3] rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <ChefHat className="w-16 h-16 mx-auto text-muted-foreground/30" />
          <h3 className="text-xl font-semibold">
            {search ? 'No recipes found for your search' : 'Recipes coming soon'}
          </h3>
          <p className="text-muted-foreground">
            {search
              ? 'Try a different search term'
              : 'Our chefs are crafting authentic African recipes. Check back soon!'}
          </p>
        </div>
      ) : (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
          }}
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((recipe: any) => (
              <motion.div key={recipe.id} variants={fadeUp} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3 }}>
                <Link href={`/${locale}/recipes/${recipe.slug}`}>
                  <Card hoverable className="h-full overflow-hidden flex flex-col group cursor-pointer border-0 shadow-sm bg-muted/20">
                    <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                      {recipe.heroImage ? (
                        <img
                          src={recipe.heroImage}
                          alt={recipe.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                          <ChefHat className="w-16 h-16 text-primary/30" />
                        </div>
                      )}
                      {recipe.cookTimeMin && (
                        <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-foreground shadow-sm flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {recipe.cookTimeMin} mins
                        </div>
                      )}
                    </div>
                    <CardContent className="p-6 flex-1 flex flex-col">
                      <div className="text-primary text-xs font-bold uppercase tracking-wider mb-2">
                        {recipe.category || 'Main Course'}
                      </div>
                      <h2 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {recipe.title}
                      </h2>
                      <p className="text-muted-foreground line-clamp-2 mb-4 flex-1 text-sm">
                        {recipe.body?.replace(/<[^>]*>/g, '').substring(0, 120)}...
                      </p>
                      <div className="flex items-center justify-between text-sm text-muted-foreground border-t border-border pt-4">
                        <span className="flex items-center gap-1">
                          <ChefHat className="w-3.5 h-3.5" /> {recipe.difficulty || 'Medium'}
                        </span>
                        {recipe.servings && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" /> Serves {recipe.servings}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </main>
  );
}
