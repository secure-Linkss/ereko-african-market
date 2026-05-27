import React from 'react';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

export default async function HomePage() {
  const t = await getTranslations('home');

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8 bg-background">
      <section className="w-full max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between py-12 gap-8">
        <div className="flex-1 space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
            {t('heroTitle')}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            {t('heroSubtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button size="lg" className="w-full sm:w-auto">
              {t('ctaShop')}
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              {t('ctaCargo')}
            </Button>
          </div>
        </div>
        <div className="flex-1 relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
            <img src="/images/img01.jpg" alt="African Market Groceries" className="object-cover w-full h-full" />
        </div>
      </section>

      <section className="w-full max-w-6xl mx-auto py-16 space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold">{t('bestsellers')}</h2>
          <Button variant="ghost">View All</Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {/* Placeholder items for now */}
            {[1, 2, 3, 4].map((item) => (
                <Card key={item} hoverable>
                    <div className="aspect-square bg-muted rounded-t-xl overflow-hidden">
                        <img src={`/images/img0${item + 1}.jpg`} alt={`Product ${item}`} className="object-cover w-full h-full" />
                    </div>
                    <CardContent className="p-4 space-y-2">
                        <h3 className="font-semibold text-lg">Product Name {item}</h3>
                        <p className="text-sm text-muted-foreground">From Nigeria</p>
                        <div className="flex items-center justify-between pt-2">
                            <span className="font-bold text-lg">£5.99</span>
                            <Button size="sm">Add</Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
      </section>
      
       <section className="w-full max-w-6xl mx-auto py-16 space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold">{t('festive')}</h2>
          <Button variant="ghost">View All</Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {/* Placeholder items for now */}
            {[5, 6].map((item) => (
                <Card key={item} hoverable className="border-secondary/30">
                    <div className="aspect-square bg-muted rounded-t-xl overflow-hidden">
                        <img src={`/images/img0${item}.jpg`} alt={`Product ${item}`} className="object-cover w-full h-full" />
                    </div>
                    <CardContent className="p-4 space-y-2">
                        <h3 className="font-semibold text-lg">Festive Product {item}</h3>
                        <p className="text-sm text-muted-foreground">Limited Edition</p>
                        <div className="flex items-center justify-between pt-2">
                            <span className="font-bold text-lg text-secondary">£12.99</span>
                            <Button size="sm" variant="secondary">Pre-order</Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
      </section>
    </main>
  );
}
