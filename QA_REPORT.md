# EREKO Production QA Report
**Date:** 2026-05-29  
**URL:** https://ereko-african-market.vercel.app  
**Tester:** Claude Code (agent-browser)  

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL  | 0 |
| HIGH      | 1 (FIXED) |
| MEDIUM    | 0 |
| LOW       | 2 |
| INFO      | 1 |
| **Total** | **4** |

---

## FIXED — HIGH: Shop page product images not rendering

**URL:** `/en-gb/shop`  
**File:** `EREKO_NEW/src/app/[locale]/shop/page.tsx` line 231  
**Commit:** `a15e8e0`

**Root cause:** `src={product.images[0]}` passed the entire `ProductImage` object as the img src, rendering as `[object Object]`. ProductCard component already used `primaryImage.url` correctly.

**Fix applied:**
```diff
- {product.images?.[0] ? (
-   <img src={product.images[0]} alt={product.title} .../>
+ {product.images?.[0]?.url ? (
+   <img src={product.images[0].url} alt={product.images[0].alt || product.title} .../>
```

**Verified:** Deploy `READY` on Vercel. Shop now shows 24 products with correct images.

---

## LOW: 6-7 products have no uploaded images — show 🥬 emoji fallback

**Affected products:** Nigerian Coca-Cola, Fresh Unripe Plantain, Caprice Long Grain Rice, Frozen Ripe Plantain, Pounded Yam Flour 1kg, Orshiola Red Palm Oil, Golden Penny Semolina 1kg  
**Note:** Fallback renders correctly (no broken images). Content issue only — need product images uploaded to Supabase CDN for these SKUs.

---

## LOW: Global search bar does not filter shop page inline

**URL:** `/en-gb/shop`  
Typing in the top nav search bar does not filter the product grid on the shop page. Pressing Enter navigates to a search results page (correct behaviour for a global search), but users may expect inline filtering.

---

## INFO: Recipes page shows "coming soon" empty state

**URL:** `/en-gb/recipes`  
No recipes are seeded yet. Empty state message displays correctly. Expected.

---

## Pages Verified — All PASS ✅

| Page | Status | Notes |
|------|--------|-------|
| Homepage `/en-gb` | ✅ | Hero, product grid, features, CTA all render |
| Shop `/en-gb/shop` | ✅ FIXED | 24 products, images render, filters work |
| Product detail `/en-gb/product/[slug]` | ✅ | Image, price, variants, Add to Cart, description |
| Cart `/en-gb/cart` | ✅ | Items, order summary, pricing, Remove/Save |
| Cargo `/en-gb/cargo` | ✅ | Tracking form, Sea/Air freight, quote form |
| Login `/en-gb/login` | ✅ | Form, error handling ("Unauthorized" on bad creds) |
| Signup `/en-gb/signup` | ✅ | Form, validation hints, culturally correct placeholders |
| Recipes `/en-gb/recipes` | ✅ | "Coming soon" empty state |
| Navigation | ✅ | All nav links work |
| Free delivery bar | ✅ | Calculates correctly (£53.31 away from £55) |
| Annual pricing toggle | ✅ | Prices update on /pricing |
| Category filters | ✅ | Drinks & Beverages correctly shows 3 products |
| Cart badge | ✅ | Updates on add-to-cart |

---

## Deployment Info
- Frontend: https://ereko-african-market.vercel.app
- Backend API: https://api-ereko-market.vercel.app
- Latest deploy: `READY` (commit `a15e8e0`)
