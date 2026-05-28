'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ShoppingCart, Truck, ShieldCheck, Star, ArrowRight } from 'lucide-react';
import { useProducts } from '@/services/products';
import { useCartStore } from '@/store/cart';

export default function HomePage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en-gb';

  const { data: productsData, isLoading } = useProducts({ limit: 8, sortBy: 'relevance', filter: { onlyInStock: true } });
  const addItem = useCartStore((s) => s.addItem);

  const products = (productsData as any)?.products ?? [];

  function handleAddToCart(product: any) {
    const variant = product.variants?.[0];
    if (!variant) return;
    addItem({
      variantId: variant.id,
      productId: product.id,
      title: product.title,
      variantName: variant.name,
      slug: product.slug,
      image: product.images?.[0]?.url ?? product.images?.[0] ?? '',
      unitPriceMinor: variant.priceAmountMinor,
      quantity: 1,
      availableStock: variant.stockOnHand - variant.stockReserved,
      storageType: product.storageType,
    });
  }

  return (
    <main className="flex-1 flex flex-col bg-background">

      {/* Hero */}
      <section className="w-full max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-20 flex flex-col md:flex-row items-center gap-10">
        <div className="flex-1 space-y-6">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-semibold">
            <Star className="w-4 h-4 fill-current" /> Africa's finest foods, delivered
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground leading-tight">
            Authentic African<br />
            <span className="text-primary">Groceries Online</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
            Shop the largest UK selection of African foods — from fresh plantain and suya spice to frozen egusi and crayfish. Next-day delivery available.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <Link href={`/${locale}/shop`}>
              <Button size="lg" className="w-full sm:w-auto gap-2">
                Shop All Products <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href={`/${locale}/cargo`}>
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Cargo Services
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-6 pt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Truck className="w-4 h-4 text-primary" /> Free delivery over £55</div>
            <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> Cold chain secured</div>
          </div>
        </div>
        <div className="flex-1 w-full max-w-lg">
          <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl bg-muted">
            <img src="/logo.jpeg" alt="EREKO African Market" className="object-cover w-full h-full" />
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="w-full max-w-7xl mx-auto px-4 md:px-8 py-12 space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold">Popular Right Now</h2>
          <Link href={`/${locale}/shop`}>
            <Button variant="ghost" className="gap-1">View All <ArrowRight className="w-4 h-4" /></Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i}>
                <div className="aspect-square bg-muted rounded-t-xl animate-pulse" />
                <CardContent className="p-3 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
                  <div className="h-8 bg-muted rounded animate-pulse mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="mb-4">Products coming soon!</p>
            <Link href={`/${locale}/shop`}><Button>Browse the shop</Button></Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
            {products.map((product: any) => {
              const variant = product.variants?.[0];
              const available = variant ? variant.stockOnHand - variant.stockReserved > 0 : false;
              return (
                <Card key={product.id} hoverable className="flex flex-col">
                  <Link href={`/${locale}/product/${product.slug}`} className="block">
                    <div className="aspect-square bg-muted rounded-t-xl overflow-hidden">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]?.url ?? product.images[0]}
                          alt={product.title}
                          className="object-cover w-full h-full hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">🥬</div>
                      )}
                    </div>
                  </Link>
                  <CardContent className="p-3 space-y-2 flex flex-col flex-1">
                    <div className="flex-1">
                      <Link href={`/${locale}/product/${product.slug}`}>
                        <h3 className="font-semibold text-sm leading-tight hover:text-primary transition-colors line-clamp-2">{product.title}</h3>
                      </Link>
                      {product.originCountry && <p className="text-xs text-muted-foreground mt-0.5">From {product.originCountry}</p>}
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-bold">{variant ? `£${(variant.priceAmountMinor / 100).toFixed(2)}` : 'TBC'}</span>
                      <Button
                        size="sm"
                        onClick={() => handleAddToCart(product)}
                        disabled={!available || !variant}
                        className="h-7 text-xs px-2"
                      >
                        <ShoppingCart className="w-3 h-3 mr-1" /> Add
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Value props */}
      <section className="w-full bg-muted/30 border-y border-border mt-8">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            { icon: Truck, title: 'Free Delivery', desc: 'On orders over £55. Next-day delivery available.' },
            { icon: ShieldCheck, title: 'Cold Chain Secured', desc: 'Chilled and frozen items delivered with care.' },
            { icon: Star, title: 'Authentic Products', desc: 'Sourced directly from trusted African suppliers.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="w-full max-w-7xl mx-auto px-4 md:px-8 py-16 text-center">
        <h2 className="text-3xl md:text-4xl font-black mb-4">Need to send goods to Africa?</h2>
        <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">EREKO Cargo ships packages across West and East Africa. Get a quote today.</p>
        <Link href={`/${locale}/cargo`}>
          <Button size="lg" variant="outline" className="gap-2">
            Get a Cargo Quote <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </section>
    </main>
  );
}
