"use client";

import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils";
import type { Product, StorageType } from "@/types";

// ─── Storage badge config ─────────────────────────────────────────────────────
const STORAGE_CONFIG: Record<
  StorageType,
  { label: string; dot: string; badge: string }
> = {
  ambient: {
    label: "Ambient",
    dot: "bg-[#F4A261]",
    badge: "bg-[#F4A261]/15 text-[#9C3506] border-[#F4A261]/40",
  },
  chilled: {
    label: "Chilled",
    dot: "bg-sky-400",
    badge: "bg-sky-50 text-sky-700 border-sky-200",
  },
  frozen: {
    label: "Frozen",
    dot: "bg-blue-500",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
  },
};

// ─── Origin flag helper ───────────────────────────────────────────────────────
// Maps ISO 3166-1 alpha-2 or country name to flag emoji
function getFlag(originCountry: string): string {
  const map: Record<string, string> = {
    NG: "🇳🇬",
    Nigeria: "🇳🇬",
    GH: "🇬🇭",
    Ghana: "🇬🇭",
    SN: "🇸🇳",
    Senegal: "🇸🇳",
    CM: "🇨🇲",
    Cameroon: "🇨🇲",
    CI: "🇨🇮",
    "Ivory Coast": "🇨🇮",
    KE: "🇰🇪",
    Kenya: "🇰🇪",
    ET: "🇪🇹",
    Ethiopia: "🇪🇹",
    TZ: "🇹🇿",
    Tanzania: "🇹🇿",
    ZA: "🇿🇦",
    "South Africa": "🇿🇦",
    UK: "🇬🇧",
    GB: "🇬🇧",
  };
  return map[originCountry] ?? "🌍";
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product, variantIndex?: number) => void | Promise<void>;
  className?: string;
}

export function ProductCard({
  product,
  onAddToCart,
  className,
}: ProductCardProps) {
  const [added, setAdded] = useState(false);
  const [adding, setAdding] = useState(false);

  // Use the first active variant as the display variant
  const variant =
    product.variants.find((v) => v.isActive) ?? product.variants[0];

  const primaryImage = product.images.find((img) => img.position === 0) ?? product.images[0];
  const isOutOfStock =
    !variant || variant.stockOnHand - variant.stockReserved <= 0;

  const storage = STORAGE_CONFIG[product.storageType];
  const flag = getFlag(product.originCountry);

  const handleAddToCart = useCallback(async () => {
    if (isOutOfStock || adding || !onAddToCart) return;
    setAdding(true);
    try {
      await onAddToCart(product, 0);
    } finally {
      setAdding(false);
      setAdded(true);
      setTimeout(() => setAdded(false), 500);
    }
  }, [isOutOfStock, adding, onAddToCart, product]);

  return (
    <motion.article
      className={cn(
        "group relative rounded-2xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden flex flex-col",
        className
      )}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      {/* ── Image container ── */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {primaryImage ? (
          <img
            src={primaryImage.url}
            alt={primaryImage.alt || product.title}
            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          /* Placeholder when no image */
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#E85D04]/10 to-[#F4A261]/10">
            <span className="text-5xl" role="img" aria-label="Product">
              🛒
            </span>
          </div>
        )}

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
            <span className="text-white font-bold text-sm tracking-wider uppercase px-3 py-1 rounded-full border border-white/40">
              Out of Stock
            </span>
          </div>
        )}

        {/* Storage badge — top-left */}
        <div className="absolute top-2.5 left-2.5">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border",
              storage.badge
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full", storage.dot)} />
            {storage.label}
          </span>
        </div>

        {/* Origin flag — top-right */}
        <div className="absolute top-2.5 right-2.5">
          <span
            className="flex items-center justify-center w-7 h-7 rounded-full bg-black/30 backdrop-blur-sm text-sm"
            title={product.originCountry}
            role="img"
            aria-label={`Origin: ${product.originCountry}`}
          >
            {flag}
          </span>
        </div>

        {/* Compare-at discount badge */}
        {variant?.compareAtAmountMinor &&
          variant.compareAtAmountMinor > variant.priceAmountMinor && (
            <div className="absolute bottom-2.5 left-2.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-[#E85D04] text-white">
                SAVE{" "}
                {Math.round(
                  ((variant.compareAtAmountMinor - variant.priceAmountMinor) /
                    variant.compareAtAmountMinor) *
                    100
                )}
                %
              </span>
            </div>
          )}
      </div>

      {/* ── Card body ── */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Brand */}
        {product.brand && (
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {product.brand}
          </p>
        )}

        {/* Title */}
        <h3 className="font-bold text-base text-foreground leading-snug line-clamp-2 flex-1">
          {product.title}
        </h3>

        {/* Variant label (e.g. "1kg", "500ml") */}
        {variant?.name && (
          <p className="text-xs text-muted-foreground">{variant.name}</p>
        )}

        {/* Price row */}
        <div className="flex items-baseline gap-2">
          {variant ? (
            <>
              <span className="text-xl font-extrabold text-foreground">
                {formatPrice(variant.priceAmountMinor, variant.currency || "GBP")}
              </span>
              {variant.compareAtAmountMinor &&
                variant.compareAtAmountMinor > variant.priceAmountMinor && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatPrice(variant.compareAtAmountMinor, variant.currency || "GBP")}
                  </span>
                )}
            </>
          ) : (
            <span className="text-sm text-muted-foreground">Price unavailable</span>
          )}
        </div>

        {/* Add to cart button */}
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isOutOfStock || adding}
          aria-label={
            isOutOfStock
              ? "Out of stock"
              : added
              ? "Added to cart"
              : `Add ${product.title} to cart`
          }
          className={cn(
            "mt-auto w-full py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            isOutOfStock
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : added
              ? "bg-green-600 text-white scale-[0.98]"
              : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97]",
            adding && "opacity-80 cursor-wait"
          )}
        >
          {isOutOfStock ? "Out of Stock" : added ? "✓ Added" : "Add to Cart"}
        </button>
      </div>
    </motion.article>
  );
}

export default ProductCard;
