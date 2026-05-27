import React from 'react';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import Link from 'next/link';

export default async function RecipesIndexPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  const t = await getTranslations('common');

  return (
    <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 space-y-12">
      <div className="text-center space-y-4 max-w-2xl mx-auto pt-8">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Authentic African Recipes</h1>
          <p className="text-lg text-muted-foreground">Discover traditional dishes, modern twists, and the perfect ingredients to bring African flavors to your kitchen.</p>
          <div className="pt-4 max-w-md mx-auto">
              <Input placeholder="Search recipes (e.g. Jollof, Egusi, Kelewele)..." className="h-12 text-lg rounded-full px-6 shadow-sm" />
          </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide justify-center">
          {['All Recipes', 'Nigerian', 'Ghanaian', 'Quick & Easy', 'Vegan', 'Soups & Stews', 'Snacks'].map((category) => (
              <button key={category} className="px-6 py-2 rounded-full border border-border hover:border-primary hover:bg-primary/5 whitespace-nowrap font-medium transition-colors">
                  {category}
              </button>
          ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {[1, 2, 3, 4, 5, 6].map((i) => (
              <Link key={i} href={`/${locale}/recipes/classic-jollof`}>
                  <Card hoverable className="h-full overflow-hidden flex flex-col group cursor-pointer border-0 shadow-sm bg-muted/20">
                      <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                          <img src={`/images/img0${i}.jpg`} alt="Recipe" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                          <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-foreground shadow-sm">
                              45 mins
                          </div>
                      </div>
                      <CardContent className="p-6 flex-1 flex flex-col">
                          <div className="text-primary text-xs font-bold uppercase tracking-wider mb-2">Main Course</div>
                          <h2 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">Classic Party Jollof Rice</h2>
                          <p className="text-muted-foreground line-clamp-2 mb-4 flex-1">
                              The ultimate West African party dish. Smoky, spicy, and deeply flavorful rice cooked in a rich tomato and pepper stew.
                          </p>
                          <div className="flex items-center justify-between text-sm text-muted-foreground border-t border-border pt-4">
                              <span>Medium Difficulty</span>
                              <span>Serves 6-8</span>
                          </div>
                      </CardContent>
                  </Card>
              </Link>
           ))}
      </div>
    </main>
  );
}
