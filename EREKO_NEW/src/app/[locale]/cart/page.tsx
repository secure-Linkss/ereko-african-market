'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Minus, Plus, Trash2, ArrowRight, Bookmark, ShoppingBag, Loader2 } from 'lucide-react';
import { useCartStore } from '@/store/cart';

export default function CartPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en-gb';

  const {
    items,
    savedForLater,
    promoCode,
    getSubtotalMinor,
    getTotalMinor,
    getFreeShippingProgress,
    shippingMinor,
    discountMinor,
    loyaltyDiscountMinor,
    removeItem,
    updateQuantity,
    saveForLater,
    moveToCart,
    removeSavedItem,
    applyPromo,
    removePromo,
    clearCart,
  } = useCartStore();

  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');

  const subtotal = getSubtotalMinor();
  const total = getTotalMinor();
  const { progress, remainingMinor } = getFreeShippingProgress();
  const activeShipping = subtotal >= 5500 ? 0 : shippingMinor;

  function formatGBP(minor: number) {
    return `£${(minor / 100).toFixed(2)}`;
  }

  function handlePromo() {
    // In production this would call the backend coupon endpoint
    if (promoInput.toUpperCase() === 'EREKO10') {
      applyPromo(promoInput.toUpperCase(), Math.round(subtotal * 0.1));
      setPromoError('');
    } else {
      setPromoError('Invalid promo code');
    }
  }

  if (items.length === 0 && savedForLater.length === 0) {
    return (
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-8">
        <div className="text-center py-20 space-y-6">
          <div className="h-24 w-24 bg-muted rounded-full flex items-center justify-center mx-auto">
            <ShoppingBag className="h-12 w-12 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground">Add some delicious African foods to get started</p>
          </div>
          <Link href={`/${locale}/shop`}>
            <Button size="lg">Browse the shop</Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-8">Your Cart ({items.length} item{items.length !== 1 ? 's' : ''})</h1>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Cart Items */}
        <div className="flex-1 space-y-6">

          {/* Free Delivery Progress */}
          {remainingMinor > 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex justify-between text-sm font-medium text-emerald-800 dark:text-emerald-400">
                <span>{formatGBP(remainingMinor)} away from Free Delivery!</span>
                <span>£55.00</span>
              </div>
              <div className="w-full bg-emerald-200/50 dark:bg-emerald-900/50 rounded-full h-2.5">
                <div className="bg-emerald-500 h-2.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {remainingMinor === 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-emerald-700">You've qualified for free delivery!</p>
            </div>
          )}

          {/* Item List */}
          <div className="space-y-4">
            {items.map((item) => (
              <Card key={item.variantId} className="flex flex-col sm:flex-row p-4 gap-6">
                <div className="w-24 h-24 bg-muted rounded-lg flex-shrink-0 overflow-hidden border border-border">
                  {item.image ? (
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-2xl">🛒</div>
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg leading-tight mb-1">{item.title}</h3>
                      {item.variantName && <p className="text-sm text-muted-foreground">{item.variantName}</p>}
                      {item.storageType && (
                        <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-muted font-medium capitalize">
                          {item.storageType}
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-lg">{formatGBP(item.unitPriceMinor * item.quantity)}</span>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center border border-border rounded-md h-9">
                      <button
                        onClick={() => updateQuantity(item.variantId, Math.max(1, item.quantity - 1))}
                        className="px-3 text-muted-foreground hover:text-foreground"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.variantId, Math.min(item.availableStock, item.quantity + 1))}
                        className="px-3 text-muted-foreground hover:text-foreground"
                        disabled={item.quantity >= item.availableStock}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-primary h-9 px-3"
                        onClick={() => saveForLater(item.variantId)}
                      >
                        <Bookmark className="w-4 h-4 mr-2" /> Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive h-9 px-3"
                        onClick={() => removeItem(item.variantId)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Remove
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Saved for Later */}
          {savedForLater.length > 0 && (
            <div className="pt-8">
              <h3 className="text-xl font-bold mb-4 border-b border-border pb-2">
                Saved for Later ({savedForLater.length})
              </h3>
              <div className="space-y-3">
                {savedForLater.map((item) => (
                  <Card key={item.variantId} className="flex flex-col sm:flex-row p-4 gap-4 opacity-75 hover:opacity-100 transition-opacity">
                    <div className="w-16 h-16 bg-muted rounded-lg flex-shrink-0 overflow-hidden border border-border">
                      {item.image ? (
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">🛒</div>
                      )}
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{item.title}</h3>
                        <span className="font-bold text-sm">{formatGBP(item.unitPriceMinor)}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => moveToCart(item.variantId)}>
                          Move to Cart
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => removeSavedItem(item.variantId)}>
                          <Trash2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="w-full lg:w-96 flex-shrink-0">
          <Card className="sticky top-24 bg-muted/30">
            <CardContent className="p-6 space-y-6">
              <h2 className="text-xl font-bold border-b border-border pb-4">Order Summary</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
                  <span className="font-medium">{formatGBP(subtotal)}</span>
                </div>
                {discountMinor > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Promo ({promoCode})</span>
                    <span>-{formatGBP(discountMinor)}</span>
                  </div>
                )}
                {loyaltyDiscountMinor > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Loyalty Points</span>
                    <span>-{formatGBP(loyaltyDiscountMinor)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className={activeShipping === 0 ? 'font-medium text-emerald-600' : 'font-medium'}>
                    {activeShipping === 0 ? 'FREE' : formatGBP(activeShipping)}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-lg font-bold">Total</span>
                  <span className="text-2xl font-bold">{formatGBP(total)}</span>
                </div>
                <Link href={`/${locale}/checkout`}>
                  <Button size="lg" className="w-full text-lg h-14 shadow-lg shadow-primary/20">
                    Checkout securely <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-sm font-medium mb-3">Have a promo code?</p>
                {promoCode ? (
                  <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200">
                    <span className="text-sm font-semibold text-emerald-700">{promoCode} applied!</span>
                    <button onClick={removePromo} className="text-xs text-muted-foreground hover:text-foreground">Remove</button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter code"
                        className="bg-background"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handlePromo()}
                      />
                      <Button variant="secondary" onClick={handlePromo}>Apply</Button>
                    </div>
                    {promoError && <p className="mt-1 text-xs text-destructive">{promoError}</p>}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
