'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { ShoppingCart, Search, SlidersHorizontal, X } from 'lucide-react';
import { useProducts, useCategories } from '@/services/products';
import { useCartStore } from '@/store/cart';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_TYPES = ['ambient', 'chilled', 'frozen'];
const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest Arrivals' },
];

export default function ShopPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = (params?.locale as string) ?? 'en-gb';

  const [selectedCategory, setSelectedCategory] = useState(searchParams?.get('category') ?? '');
  const [selectedStorage, setSelectedStorage] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('relevance');
  const [searchQuery, setSearchQuery] = useState(searchParams?.get('q') ?? '');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: categoriesData } = useCategories();
  const { data, isLoading } = useProducts({
    filter: {
      categorySlug: selectedCategory || undefined,
      storageTypes: selectedStorage.length ? selectedStorage : undefined,
      onlyInStock: true,
    },
    sortBy: sortBy as any,
    limit: 24,
  } as any);

  const addItem = useCartStore((s) => s.addItem);

  const products = (data as any)?.products ?? [];

  function handleAddToCart(product: any) {
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
      availableStock: variant.stockOnHand - variant.stockReserved,
      storageType: product.storageType,
    });
  }

  function toggleStorage(type: string) {
    setSelectedStorage((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  function clearFilters() {
    setSelectedCategory('');
    setSelectedStorage([]);
    setSortBy('relevance');
  }

  const hasFilters = selectedCategory || selectedStorage.length > 0;

  return (
    <main className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full p-4 md:p-8 gap-8">
      {/* Sidebar Filters - Desktop */}
      <aside className="w-full md:w-64 flex-shrink-0 space-y-8 hidden md:block">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Filters</h3>
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-primary hover:underline">Clear all</button>
          )}
        </div>

        <div>
          <h4 className="font-semibold mb-3 border-b border-border pb-2 text-sm uppercase tracking-wider text-muted-foreground">Categories</h4>
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => setSelectedCategory('')}
                className={`w-full text-left text-sm px-2 py-1.5 rounded-lg transition-colors ${!selectedCategory ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
              >
                All Products
              </button>
            </li>
            {(categoriesData as any)?.map((cat: any) => (
              <li key={cat.id}>
                <button
                  onClick={() => setSelectedCategory(cat.slug === selectedCategory ? '' : cat.slug)}
                  className={`w-full text-left text-sm px-2 py-1.5 rounded-lg transition-colors ${selectedCategory === cat.slug ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                >
                  {cat.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-3 border-b border-border pb-2 text-sm uppercase tracking-wider text-muted-foreground">Storage Type</h4>
          <ul className="space-y-2">
            {STORAGE_TYPES.map((type) => (
              <li key={type}>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  <input
                    type="checkbox"
                    checked={selectedStorage.includes(type)}
                    onChange={() => toggleStorage(type)}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="capitalize">{type}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Main Content */}
      <section className="flex-1 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Shop</h1>
            {!isLoading && (
              <p className="text-sm text-muted-foreground mt-1">
                {products.length} product{products.length !== 1 ? 's' : ''}
                {selectedCategory ? ` in "${selectedCategory}"` : ''}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <Button
              variant="outline"
              className="md:hidden"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filters
              {hasFilters && (
                <span className="ml-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                  {(selectedCategory ? 1 : 0) + selectedStorage.length}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Filters */}
        {filtersOpen && (
          <div className="md:hidden bg-background border border-border rounded-xl p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold">Filters</h3>
              <button onClick={() => setFiltersOpen(false)}><X className="w-4 h-4" /></button>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Categories</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setSelectedCategory('')} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${!selectedCategory ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}>
                  All
                </button>
                {(categoriesData as any)?.map((cat: any) => (
                  <button key={cat.id} onClick={() => setSelectedCategory(cat.slug === selectedCategory ? '' : cat.slug)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selectedCategory === cat.slug ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}>
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <Skeleton className="aspect-square rounded-t-xl" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-9 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold">No products found</h3>
            <p className="text-muted-foreground">Try adjusting your filters or browse all categories</p>
            <Button variant="outline" onClick={clearFilters}>Clear filters</Button>
          </div>
        ) : (
          <motion.div 
            layout 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
            }}
          >
            <AnimatePresence>
            {products.map((product: any) => {
              const variant = product.variants?.[0];
              const available = variant ? (variant.stockOnHand - variant.stockReserved) > 0 : false;

              return (
                <motion.div 
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                <Card hoverable className="flex flex-col h-full border-border/50 shadow-sm hover:shadow-md transition-all">
                  <Link href={`/${locale}/product/${product.slug}`} className="block">
                    <div className="aspect-square bg-white rounded-t-xl overflow-hidden relative group">
                      {product.images?.[0]?.url ? (
                        <img
                          src={product.images[0].url}
                          alt={product.images[0].alt || product.title}
                          className="object-cover w-full h-full mix-blend-multiply group-hover:scale-105 transition-transform duration-500 ease-out p-4"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-4xl">
                          🥬
                        </div>
                      )}
                    </div>
                  </Link>
                  <CardContent className="p-4 space-y-3 flex flex-col flex-1">
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <Link href={`/${locale}/product/${product.slug}`}>
                          <h3 className="font-semibold leading-tight hover:text-primary transition-colors line-clamp-2">
                            {product.title}
                          </h3>
                        </Link>
                      </div>
                      {product.origin && (
                        <p className="text-xs text-muted-foreground">From {product.origin}</p>
                      )}
                      {product.storageType && (
                        <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-muted font-medium capitalize">
                          {product.storageType}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <div>
                        <span className="font-bold text-lg">
                          {variant ? `£${(variant.priceMinor / 100).toFixed(2)}` : 'TBC'}
                        </span>
                        {!available && (
                          <span className="ml-2 text-xs text-destructive font-medium">Out of stock</span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddToCart(product)}
                        disabled={!available || !variant}
                        className="flex-shrink-0"
                      >
                        <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
                        Add
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                </motion.div>
              );
            })}
            </AnimatePresence>
          </motion.div>
        )}

        {(data as any)?.nextCursor && (
          <div className="flex justify-center pt-8">
            <Link href={`/${locale}/shop`}>
              <Button variant="outline" size="lg">Load more products</Button>
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
