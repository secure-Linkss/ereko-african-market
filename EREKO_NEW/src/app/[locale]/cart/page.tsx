import React from 'react';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Minus, Plus, Trash2, ArrowRight, Bookmark } from 'lucide-react';
import Link from 'next/link';

export default async function CartPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  const t = await getTranslations('common');

  return (
    <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-8">{t('cart')}</h1>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Cart Items */}
        <div className="flex-1 space-y-6">
            
            {/* Free Delivery Progress */}
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex justify-between text-sm font-medium text-emerald-800 dark:text-emerald-400">
                    <span>£15.00 away from Free Delivery!</span>
                    <span>£55.00</span>
                </div>
                <div className="w-full bg-emerald-200/50 dark:bg-emerald-900/50 rounded-full h-2.5">
                    <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: '70%' }}></div>
                </div>
            </div>

            {/* Item List */}
            <div className="space-y-4">
                {[1, 2].map((i) => (
                    <Card key={i} className="flex flex-col sm:flex-row p-4 gap-6">
                        <div className="w-24 h-24 bg-muted rounded-lg flex-shrink-0 overflow-hidden border border-border">
                             <img src={`/images/img0${i}.jpg`} alt="Product" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-lg leading-tight mb-1">Authentic Nigerian Product {i}</h3>
                                    <p className="text-sm text-muted-foreground">500g • Ships from London</p>
                                </div>
                                <span className="font-bold text-lg">£8.50</span>
                            </div>
                            
                            <div className="flex items-center justify-between mt-4">
                                <div className="flex items-center border border-border rounded-md h-9">
                                    <button className="px-3 text-muted-foreground hover:text-foreground"><Minus className="w-3 h-3" /></button>
                                    <span className="w-6 text-center text-sm font-medium">2</span>
                                    <button className="px-3 text-muted-foreground hover:text-foreground"><Plus className="w-3 h-3" /></button>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary h-9 px-3">
                                        <Bookmark className="w-4 h-4 mr-2" /> Save
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive h-9 px-3">
                                        <Trash2 className="w-4 h-4 mr-2" /> Remove
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Saved for Later */}
            <div className="pt-12">
                <h3 className="text-xl font-bold mb-4 border-b border-border pb-2">Saved for Later</h3>
                <Card className="flex flex-col sm:flex-row p-4 gap-6 opacity-70 hover:opacity-100 transition-opacity">
                    <div className="w-20 h-20 bg-muted rounded-lg flex-shrink-0 overflow-hidden border border-border">
                         <img src="/images/img03.jpg" alt="Product" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold mb-1">Olu Olu Palm Wine</h3>
                                <p className="text-sm text-muted-foreground">750ml</p>
                            </div>
                            <span className="font-bold">£4.99</span>
                        </div>
                        <div className="flex items-center justify-end mt-4 gap-2">
                             <Button variant="outline" size="sm">Move to Cart</Button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>

        {/* Order Summary */}
        <div className="w-full lg:w-96 flex-shrink-0">
            <Card className="sticky top-8 bg-muted/30">
                <CardContent className="p-6 space-y-6">
                    <h2 className="text-xl font-bold border-b border-border pb-4">Order Summary</h2>
                    
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal (2 items)</span>
                            <span className="font-medium">£17.00</span>
                        </div>
                        <div className="flex justify-between text-emerald-600">
                            <span>Discount</span>
                            <span>-£0.00</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Est. Delivery</span>
                            <span className="font-medium">£3.99</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">VAT (if applicable)</span>
                            <span className="font-medium">£0.00</span>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-border">
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-lg font-bold">Total</span>
                            <span className="text-2xl font-bold">£20.99</span>
                        </div>
                        <Link href={`/${locale}/checkout`}>
                            <Button size="lg" className="w-full text-lg h-14 shadow-lg shadow-primary/20">
                                Checkout securely <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        </Link>
                    </div>

                    <div className="pt-6 border-t border-border">
                        <p className="text-sm font-medium mb-3">Have a promo code?</p>
                        <div className="flex gap-2">
                            <Input placeholder="Enter code" className="bg-background" />
                            <Button variant="secondary">Apply</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </main>
  );
}
