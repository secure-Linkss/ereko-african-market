import type { Product, Recipe } from "@/types";
import { SITE_URL, SITE_NAME } from "./metadata";

// ─── Base types ───────────────────────────────────────────────────────────────
export type JsonLdObject = Record<string, unknown>;

// ─── Organization ─────────────────────────────────────────────────────────────
export function organizationJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    alternateName: "Ereko African Market",
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/images/logo.png`,
      width: 200,
      height: 60,
    },
    sameAs: [
      "https://www.instagram.com/ErekoMarket",
      "https://www.facebook.com/ErekoMarket",
      "https://twitter.com/ErekoMarket",
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        availableLanguage: ["English"],
        areaServed: "GB",
        email: "hello@ereko.market",
      },
    ],
    address: {
      "@type": "PostalAddress",
      addressCountry: "GB",
      addressRegion: "England",
    },
    description:
      "The UK's most authentic African food market. Premium West African, East African and Pan-African groceries delivered across the United Kingdom.",
  };
}

// ─── WebSite (enables sitelinks searchbox) ────────────────────────────────────
export function websiteJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    publisher: { "@id": `${SITE_URL}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/en-gb/shop?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

// ─── Product ──────────────────────────────────────────────────────────────────
export function productJsonLd(product: Product): JsonLdObject {
  const primaryVariant =
    product.variants.find((v) => v.isActive) ?? product.variants[0];
  const primaryImage = product.images.find((img) => img.position === 0) ?? product.images[0];

  const availability =
    primaryVariant && primaryVariant.stockOnHand - primaryVariant.stockReserved > 0
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock";

  const jsonLd: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${SITE_URL}/en-gb/product/${product.slug}`,
    name: product.title,
    description: product.descriptionShort,
    url: `${SITE_URL}/en-gb/product/${product.slug}`,
    sku: primaryVariant?.sku,
    brand: product.brand
      ? { "@type": "Brand", name: product.brand }
      : undefined,
    countryOfOrigin: product.originCountry,
    image: primaryImage?.url,
    offers: primaryVariant
      ? {
          "@type": "Offer",
          priceCurrency: primaryVariant.currency || "GBP",
          price: (primaryVariant.priceAmountMinor / 100).toFixed(2),
          availability,
          itemCondition: "https://schema.org/NewCondition",
          seller: { "@id": `${SITE_URL}/#organization` },
          url: `${SITE_URL}/en-gb/product/${product.slug}`,
          priceValidUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000)
            .toISOString()
            .split("T")[0],
        }
      : undefined,
  };

  // Remove undefined keys
  return Object.fromEntries(
    Object.entries(jsonLd).filter(([, v]) => v !== undefined)
  );
}

// ─── BreadcrumbList ───────────────────────────────────────────────────────────
export interface BreadcrumbItem {
  name: string;
  /** Relative or absolute URL */
  url: string;
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
}

// ─── Recipe ───────────────────────────────────────────────────────────────────
export function recipeJsonLd(recipe: Recipe): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    "@id": `${SITE_URL}/en-gb/recipes/${recipe.slug}`,
    name: recipe.title,
    image: recipe.heroImage,
    url: `${SITE_URL}/en-gb/recipes/${recipe.slug}`,
    cookTime: `PT${recipe.cookTimeMin}M`,
    recipeYield: `${recipe.servings} servings`,
    recipeIngredient: recipe.ingredients.map(
      (ing) => `${ing.quantityText} ${ing.name}`
    ),
    recipeInstructions: recipe.steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      text: step,
    })),
    author: { "@id": `${SITE_URL}/#organization` },
    publisher: { "@id": `${SITE_URL}/#organization` },
    video: recipe.videoUrl
      ? { "@type": "VideoObject", contentUrl: recipe.videoUrl }
      : undefined,
    datePublished: recipe.createdAt.split("T")[0],
  };
}

// ─── Inline script helper (for use in Next.js layouts) ───────────────────────
/**
 * Returns a <script> tag string safe for dangerouslySetInnerHTML.
 * Usage: <script dangerouslySetInnerHTML={{ __html: jsonLdScript(data) }} />
 */
export function jsonLdScript(data: JsonLdObject | JsonLdObject[]): string {
  return JSON.stringify(Array.isArray(data) ? data : data);
}
