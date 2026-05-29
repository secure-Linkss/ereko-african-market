'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { ArrowLeft, Minus, Plus, Truck, ShieldCheck, Heart, ShoppingCart, Star } from 'lucide-react';
import Link from 'next/link';
import { useProductDetails } from '@/services/products';
import { useCartStore } from '@/store/cart';
import { useWishlistStore } from '@/store/wishlist';
import { motion } from 'framer-motion';

const STORAGE_BADGE: Record<string, { label: string; variant: any }> = {
  ambient: { label: 'Ambient', variant: 'ambient' },
  chilled: { label: 'Chilled', variant: 'chilled' },
  frozen: { label: 'Frozen', variant: 'frozen' },
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) ?? 'en-gb';
  const slug = params?.slug as string;

  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);

  const { data: product, isLoading, isError } = useProductDetails(slug);
  const addItem = useCartStore((s) => s.addItem);
  const { toggleWishlist, isInWishlist } = useWishlistStore();

  const variant = product?.variants?.[selectedVariantIndex];
  const available = variant ? variant.stockOnHand - variant.stockReserved > 0 : false;
  const maxQty = variant ? Math.max(0, variant.stockOnHand - variant.stockReserved) : 0;
  const isWishlisted = product ? isInWishlist(product.id) : false;
  const storageBadge = product?.storageType ? STORAGE_BADGE[product.storageType] : null;

  function handleAddToCart() {
    if (!product || !variant) return;
    addItem({
      variantId: variant.id,
      productId: product.id,
      title: product.title,
      variantName: variant.name,
      slug: product.slug,
      image: product.images?.[0]?.url ?? product.images?.[0] ?? '',
      unitPriceMinor: variant.priceAmountMinor,
      quantity,
      availableStock: maxQty,
      storageType: product.storageType,
    });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  }

  function handleToggleWishlist() {
    if (!product) return;
    toggleWishlist(product.id);
  }

  if (isLoading) {
    return (
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
        <Skeleton className="h-4 w-32 mb-6" />
        <div className="flex flex-col lg:flex-row gap-12">
          <div className="w-full lg:w-1/2 space-y-4">
            <Skeleton className="aspect-square rounded-2xl" />
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
            </div>
          </div>
          <div className="w-full lg:w-1/2 space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-12 w-1/3" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </main>
    );
  }

  if (isError || !product) {
    return (
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 text-center py-20">
        <h2 className="text-2xl font-bold mb-4">Product not found</h2>
        <p className="text-muted-foreground mb-6">This product may be unavailable or the link is incorrect.</p>
        <Link href={`/${locale}/shop`}><Button>Browse the shop</Button></Link>
      </main>
    );
  }

  const images = product.images?.length ? product.images : [{ url: '', alt: product.title, id: '0', productId: product.id, position: 0 }];

  const fadeUp: any = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  return (
    <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 overflow-hidden">
      <Link href={`/${locale}/shop`} className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Shop
      </Link>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Image Gallery */}
        <motion.div 
           className="w-full lg:w-1/2 space-y-4"
           initial={{ opacity: 0, x: -30 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="aspect-square bg-white rounded-2xl overflow-hidden border border-border shadow-sm p-8 flex items-center justify-center">
            {images[selectedImage]?.url ? (
              <motion.img
                key={images[selectedImage].url}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                src={images[selectedImage].url}
                alt={images[selectedImage].alt ?? product.title}
                className="w-full h-full object-contain mix-blend-multiply drop-shadow-md"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-8xl">🥬</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-4">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(i)}
                  className={`aspect-square bg-white p-2 rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${i === selectedImage ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}
                >
                  {img.url ? (
                    <img src={img.url} alt={img.alt} className="w-full h-full object-contain mix-blend-multiply" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🥬</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Product Info */}
        <motion.div 
           className="w-full lg:w-1/2 flex flex-col"
           initial="hidden"
           animate="visible"
           variants={staggerContainer}
        >
          <motion.div variants={fadeUp} className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground mb-2 leading-tight">{product.title}</h1>
              {product.brand && <p className="text-lg text-primary font-medium tracking-wide uppercase">{product.brand}</p>}
            </div>
            <Button variant="ghost" size="icon" className="rounded-full flex-shrink-0 bg-muted/50 hover:bg-muted" onClick={handleToggleWishlist}>
              <Heart className={`w-6 h-6 transition-colors ${isWishlisted ? 'fill-destructive text-destructive' : 'text-muted-foreground hover:text-destructive'}`} />
            </Button>
          </motion.div>

          <div className="flex flex-wrap gap-2 mt-4">
            {product.originCountry && (
              <Badge variant="outline">Origin: {product.originCountry}</Badge>
            )}
            {storageBadge && <Badge variant={storageBadge.variant}>{storageBadge.label}</Badge>}
            {product.tags?.map((tag) => (
              <Badge key={tag} variant="outline" className="capitalize">{tag}</Badge>
            ))}
          </div>

          <div className="mt-8 pb-8 border-b border-border">
            <div className="flex items-end gap-4 mb-6">
              <span className="text-4xl font-bold text-foreground">
                {variant ? `£${(variant.priceAmountMinor / 100).toFixed(2)}` : 'TBC'}
              </span>
              {variant?.compareAtAmountMinor && variant.compareAtAmountMinor > variant.priceAmountMinor && (
                <>
                  <span className="text-lg text-muted-foreground line-through mb-1">
                    £{(variant.compareAtAmountMinor / 100).toFixed(2)}
                  </span>
                  <Badge variant="secondary" className="mb-2">
                    Save {Math.round((1 - variant.priceAmountMinor / variant.compareAtAmountMinor) * 100)}%
                  </Badge>
                </>
              )}
            </div>

            {/* Variant selector */}
            {product.variants.length > 1 && (
              <div className="space-y-3 mb-6">
                <h4 className="font-semibold text-sm">Select Size</h4>
                <div className="flex flex-wrap gap-3">
                  {product.variants.map((v, i) => {
                    const variantAvailable = v.stockOnHand - v.stockReserved > 0;
                    return (
                      <Button
                        key={v.id}
                        variant="outline"
                        size="sm"
                        disabled={!variantAvailable}
                        onClick={() => { setSelectedVariantIndex(i); setQuantity(1); }}
                        className={`${i === selectedVariantIndex ? 'border-primary ring-1 ring-primary bg-primary/5' : ''} ${!variantAvailable ? 'opacity-40' : ''}`}
                      >
                        {v.name}
                        {!variantAvailable && ' (OOS)'}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stock warning */}
            {available && maxQty <= 5 && (
              <p className="text-sm text-amber-600 font-medium mb-4">Only {maxQty} left in stock!</p>
            )}
            {!available && (
              <p className="text-sm text-destructive font-medium mb-4">Currently out of stock</p>
            )}

            <div className="flex items-center gap-4 mt-6">
              <div className="flex items-center border border-border rounded-lg h-12">
                <button
                  className="px-4 text-muted-foreground hover:text-foreground disabled:opacity-40"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center font-medium">{quantity}</span>
                <button
                  className="px-4 text-muted-foreground hover:text-foreground disabled:opacity-40"
                  onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                  disabled={quantity >= maxQty || !available}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <Button
                size="lg"
                className="flex-1 h-12 text-base"
                onClick={handleAddToCart}
                disabled={!available || !variant}
              >
                {addedToCart ? (
                  <><span className="text-emerald-300">✓</span> Added to cart!</>
                ) : (
                  <><ShoppingCart className="w-5 h-5 mr-2" /> Add to Cart</>
                )}
              </Button>
            </div>
          </div>

          {/* Delivery info */}
          <div className="py-6 space-y-4 border-b border-border">
            <div className="flex items-center gap-3 text-sm">
              <Truck className="w-5 h-5 text-primary flex-shrink-0" />
              <div>
                <p className="font-semibold">Next Day Delivery Available</p>
                <p className="text-muted-foreground">Order before 2PM for next-day delivery</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0" />
              <div>
                <p className="font-semibold">Secure Cold Chain</p>
                <p className="text-muted-foreground">Guaranteed freshness upon arrival</p>
              </div>
            </div>
          </div>

          {/* Description & Nutritional */}
          <div className="mt-8 space-y-6">
            {product.descriptionShort && (
              <div>
                <h3 className="text-lg font-bold mb-2">Description</h3>
                <p className="text-muted-foreground leading-relaxed">{product.descriptionShort}</p>
              </div>
            )}
            {product.descriptionLong && product.descriptionLong !== product.descriptionShort && (
              <p className="text-muted-foreground leading-relaxed text-sm">{product.descriptionLong}</p>
            )}
            {product.ingredients && (
              <div>
                <h3 className="text-lg font-bold mb-2">Ingredients</h3>
                <p className="text-muted-foreground text-sm bg-muted/50 p-3 rounded-lg border border-border/50">{product.ingredients}</p>
              </div>
            )}
            {product.allergens && product.allergens.length > 0 && (
              <div>
                <h3 className="text-lg font-bold mb-2">Allergens</h3>
                <p className="text-muted-foreground text-sm bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800/30">
                  Contains: {product.allergens.map((a) => a.allergen).join(', ')}
                </p>
              </div>
            )}
            {product.culturalMeta?.traditionalUses && (
              <div>
                <h3 className="text-lg font-bold mb-2">Traditional Uses</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">{product.culturalMeta.traditionalUses}</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </main>
  );
}
