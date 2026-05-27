import React from 'react';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

export default async function ShopPage() {
  const t = await getTranslations('nav');

  return (
    <main className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full p-4 md:p-8 gap-8">
      {/* Sidebar Filters */}
      <aside className="w-full md:w-64 flex-shrink-0 space-y-8 hidden md:block">
        <div>
          <h3 className="font-bold text-lg mb-4 border-b pb-2">Categories</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="hover:text-primary cursor-pointer">Fresh Produce</li>
            <li className="hover:text-primary cursor-pointer">Frozen Goods</li>
            <li className="hover:text-primary cursor-pointer">Meats & Poultry</li>
            <li className="hover:text-primary cursor-pointer">Spices & Seasonings</li>
            <li className="hover:text-primary cursor-pointer">Pantry Essentials</li>
          </ul>
        </div>
        
        <div>
          <h3 className="font-bold text-lg mb-4 border-b pb-2">Origin</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><label className="flex items-center gap-2"><input type="checkbox" className="rounded text-primary focus:ring-primary" /> Nigeria</label></li>
            <li><label className="flex items-center gap-2"><input type="checkbox" className="rounded text-primary focus:ring-primary" /> Ghana</label></li>
            <li><label className="flex items-center gap-2"><input type="checkbox" className="rounded text-primary focus:ring-primary" /> Cameroon</label></li>
            <li><label className="flex items-center gap-2"><input type="checkbox" className="rounded text-primary focus:ring-primary" /> Ivory Coast</label></li>
          </ul>
        </div>
        
        <div>
          <h3 className="font-bold text-lg mb-4 border-b pb-2">Storage</h3>
           <ul className="space-y-2 text-sm text-muted-foreground">
            <li><label className="flex items-center gap-2"><input type="checkbox" className="rounded text-primary focus:ring-primary" /> Ambient</label></li>
            <li><label className="flex items-center gap-2"><input type="checkbox" className="rounded text-primary focus:ring-primary" /> Chilled</label></li>
            <li><label className="flex items-center gap-2"><input type="checkbox" className="rounded text-primary focus:ring-primary" /> Frozen</label></li>
          </ul>
        </div>
      </aside>

      {/* Main Content */}
      <section className="flex-1 space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h1 className="text-3xl font-bold">{t('shop')}</h1>
            <div className="flex items-center gap-4 w-full sm:w-auto">
                <Input placeholder="Search shop..." className="max-w-xs" />
                <select className="h-11 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                    <option>Sort by: Relevance</option>
                    <option>Price: Low to High</option>
                    <option>Price: High to Low</option>
                    <option>Newest Arrivals</option>
                </select>
                <Button variant="outline" className="md:hidden">Filters</Button>
            </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
             {/* Placeholder items for now */}
             {[1, 2, 3, 4, 5, 6, 1, 2, 3].map((item, i) => (
                <Card key={i} hoverable>
                    <div className="aspect-square bg-muted rounded-t-xl overflow-hidden">
                        <img src={`/images/img0${item}.jpg`} alt={`Product ${item}`} className="object-cover w-full h-full" />
                    </div>
                    <CardContent className="p-4 space-y-2">
                        <h3 className="font-semibold text-lg line-clamp-1">African Market Product {i}</h3>
                        <p className="text-sm text-muted-foreground">500g • From Ghana</p>
                        <div className="flex items-center justify-between pt-2">
                            <span className="font-bold text-lg">£4.50</span>
                            <Button size="sm">Add</Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
        
        <div className="flex justify-center pt-8">
            <Button variant="outline" size="lg">Load More</Button>
        </div>
      </section>
    </main>
  );
}
