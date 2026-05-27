import React from 'react';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { ArrowLeft, Minus, Plus, Truck, ShieldCheck, Heart } from 'lucide-react';
import Link from 'next/link';

export default async function ProductDetailPage({
  params
}: {
  params: Promise<{ slug: string; locale: string }>
}) {
  const { slug, locale } = await params;
  const t = await getTranslations('common');

  return (
    <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
      <Link href={`/${locale}/shop`} className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Shop
      </Link>
      
      <div className="flex flex-col lg:flex-row gap-12">
        {/* Image Gallery */}
        <div className="w-full lg:w-1/2 space-y-4">
            <div className="aspect-square bg-muted rounded-2xl overflow-hidden border border-border">
                <img src="/images/img03.jpg" alt="Product Image" className="w-full h-full object-cover" />
            </div>
            <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="aspect-square bg-muted rounded-lg overflow-hidden border border-border cursor-pointer hover:ring-2 hover:ring-primary">
                         <img src={`/images/img0${i}.jpg`} alt={`Thumbnail ${i}`} className="w-full h-full object-cover" />
                    </div>
                ))}
            </div>
        </div>

        {/* Product Info */}
        <div className="w-full lg:w-1/2 flex flex-col">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">Premium Egusi Seeds</h1>
                    <p className="text-lg text-muted-foreground">Olu Olu • 500g</p>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full">
                    <Heart className="w-6 h-6 text-muted-foreground hover:text-destructive transition-colors" />
                </Button>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-4">
                <Badge variant="outline">🇳🇬 Origin: Nigeria</Badge>
                <Badge variant="ambient">Ambient</Badge>
                <Badge variant="outline">Vegan</Badge>
                <Badge variant="outline">Gluten-Free</Badge>
            </div>

            <div className="mt-8 pb-8 border-b border-border">
                <div className="flex items-end gap-4 mb-6">
                    <span className="text-4xl font-bold text-foreground">£8.50</span>
                    <span className="text-lg text-muted-foreground line-through mb-1">£10.00</span>
                    <Badge variant="secondary" className="mb-2">Save 15%</Badge>
                </div>

                <div className="space-y-4">
                    <h4 className="font-semibold text-sm">Select Size</h4>
                    <div className="flex gap-3">
                        <Button variant="outline" className="border-primary ring-1 ring-primary">500g</Button>
                        <Button variant="outline">1kg (+£7.00)</Button>
                        <Button variant="outline">5kg (+£35.00)</Button>
                    </div>
                </div>

                <div className="flex items-center gap-4 mt-8">
                    <div className="flex items-center border border-border rounded-lg h-12">
                        <button className="px-4 text-muted-foreground hover:text-foreground"><Minus className="w-4 h-4" /></button>
                        <span className="w-8 text-center font-medium">1</span>
                        <button className="px-4 text-muted-foreground hover:text-foreground"><Plus className="w-4 h-4" /></button>
                    </div>
                    <Button size="lg" className="flex-1 h-12 text-lg">Add to Cart</Button>
                </div>
            </div>

            <div className="py-6 space-y-4 border-b border-border">
                <div className="flex items-center gap-3 text-sm">
                    <Truck className="w-5 h-5 text-primary" />
                    <div>
                        <p className="font-semibold">Next Day Delivery Available</p>
                        <p className="text-muted-foreground">Order before 2PM</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                    <div>
                        <p className="font-semibold">Secure Cold Chain</p>
                        <p className="text-muted-foreground">Guaranteed freshness upon arrival</p>
                    </div>
                </div>
            </div>

            <div className="mt-8 space-y-6">
                <div>
                    <h3 className="text-lg font-bold mb-2">Description</h3>
                    <p className="text-muted-foreground leading-relaxed">
                        Hand-selected premium melon seeds, peeled and ready to blend. Essential for authentic Nigerian Egusi soup. Sourced directly from local farmers in Enugu State to guarantee the highest quality and rich flavor.
                    </p>
                </div>
                
                <div>
                     <h3 className="text-lg font-bold mb-2">Allergens</h3>
                     <p className="text-muted-foreground text-sm bg-muted/50 p-3 rounded-lg border border-border/50">
                         Prepared in a facility that also processes peanuts, tree nuts, and soy.
                     </p>
                </div>
            </div>
        </div>
      </div>
      
      {/* Recipe Pairings */}
      <section className="mt-24">
        <h2 className="text-2xl font-bold mb-6">Perfect Recipe Pairings</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {[1, 2, 3].map((i) => (
                <Card key={i} hoverable className="overflow-hidden">
                    <div className="h-48 bg-muted">
                        <img src={`/images/img0${i + 3}.jpg`} alt="Recipe" className="w-full h-full object-cover" />
                    </div>
                    <CardContent className="p-4">
                        <h3 className="font-bold text-lg mb-1">Classic Egusi Soup</h3>
                        <p className="text-sm text-muted-foreground mb-4">45 mins • Serves 6</p>
                        <Link href={`/${locale}/recipes/classic-egusi`} className="text-primary font-medium text-sm hover:underline">
                            View Recipe →
                        </Link>
                    </CardContent>
                </Card>
             ))}
        </div>
      </section>
    </main>
  );
}
