import type { Metadata } from "next";

// ─── Site-level constants ─────────────────────────────────────────────────────
export const SITE_NAME = "EREKO Market";
export const SITE_URL = "https://ereko.market";
export const SITE_LOCALE = "en_GB";

export const DEFAULT_TITLE = "EREKO Market | African Food Store UK";
export const TITLE_TEMPLATE = "%s | EREKO Market";

export const DEFAULT_DESCRIPTION =
  "EREKO Market is the UK's most authentic African food store. Shop premium West African, East African & Pan-African groceries online — fresh, frozen, and ambient — with next-day UK delivery.";

export const DEFAULT_KEYWORDS = [
  "african food uk",
  "west african groceries",
  "nigerian food online",
  "ghanaian food uk",
  "african food delivery",
  "buy nigerian food uk",
  "african supermarket online",
  "jollof rice ingredients uk",
  "palm oil uk",
  "dried fish uk",
  "egusi uk",
  "afang soup ingredients",
  "african spices uk",
  "plantain uk",
  "african market london",
  "east african groceries",
  "kenyan food uk",
  "ethiopian food uk",
  "african food store",
  "ereko market",
  "authentic african food",
  "frozen african food uk",
  "african cooking ingredients",
  "suya spice uk",
  "ogbono uk",
];

export const DEFAULT_OG_IMAGE = {
  url: `${SITE_URL}/images/og-image.jpg`,
  width: 1200,
  height: 630,
  alt: "EREKO Market — Authentic African Food Store UK",
};

// ─── Metadata options ─────────────────────────────────────────────────────────
export interface GenerateMetadataOptions {
  title?: string;
  description?: string;
  keywords?: string[];
  /** Absolute canonical URL, e.g. "https://ereko.market/en-gb/shop" */
  canonicalUrl?: string;
  /** Relative or absolute OG image URL */
  ogImage?: string;
  ogType?: "website" | "article";
  /** Set to false for noindex pages (e.g. admin, checkout) */
  index?: boolean;
  /** Extra openGraph fields */
  ogTitle?: string;
  ogDescription?: string;
}

// ─── Factory ──────────────────────────────────────────────────────────────────
export function generateMetadata(options: GenerateMetadataOptions = {}): Metadata {
  const {
    title,
    description = DEFAULT_DESCRIPTION,
    keywords = DEFAULT_KEYWORDS,
    canonicalUrl,
    ogImage = DEFAULT_OG_IMAGE.url,
    ogType = "website",
    index = true,
    ogTitle,
    ogDescription,
  } = options;

  const resolvedOgImage = ogImage.startsWith("http") ? ogImage : `${SITE_URL}${ogImage}`;
  const resolvedTitle = title ?? DEFAULT_TITLE;
  const resolvedOgTitle = ogTitle ?? resolvedTitle;
  const resolvedOgDescription = ogDescription ?? description;

  const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),

    title: title
      ? { default: title, template: TITLE_TEMPLATE }
      : { default: DEFAULT_TITLE, template: TITLE_TEMPLATE },

    description,

    keywords: keywords.join(", "),

    authors: [{ name: "EREKO Market", url: SITE_URL }],

    creator: "EREKO Market",
    publisher: "EREKO Market",

    robots: index
      ? { index: true, follow: true, googleBot: { index: true, follow: true } }
      : { index: false, follow: false },

    openGraph: {
      title: resolvedOgTitle,
      description: resolvedOgDescription,
      url: canonicalUrl ?? SITE_URL,
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      type: ogType,
      images: [
        {
          url: resolvedOgImage,
          width: DEFAULT_OG_IMAGE.width,
          height: DEFAULT_OG_IMAGE.height,
          alt: DEFAULT_OG_IMAGE.alt,
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title: resolvedOgTitle,
      description: resolvedOgDescription,
      images: [resolvedOgImage],
      site: "@ErekoMarket",
      creator: "@ErekoMarket",
    },

    ...(canonicalUrl && {
      alternates: {
        canonical: canonicalUrl,
        languages: {
          "en-GB": canonicalUrl,
        },
      },
    }),
  };

  return metadata;
}

// ─── Page-specific helpers ────────────────────────────────────────────────────

/** Metadata for the Shop/product listing page */
export function shopMetadata(params?: { category?: string }): Metadata {
  const categoryLabel = params?.category
    ? ` — ${params.category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}`
    : "";

  return generateMetadata({
    title: `Shop African Groceries${categoryLabel}`,
    description: `Browse our full range of authentic African groceries${
      params?.category ? ` in ${params.category.replace(/-/g, " ")}` : ""
    }. Fresh, frozen & ambient products delivered across the UK.`,
    canonicalUrl: `${SITE_URL}/en-gb/shop${params?.category ? `/${params.category}` : ""}`,
  });
}

/** Metadata for a product detail page */
export function productMetadata(params: {
  title: string;
  description: string;
  slug: string;
  ogImage?: string;
  brand?: string;
}): Metadata {
  return generateMetadata({
    title: params.brand ? `${params.title} by ${params.brand}` : params.title,
    description: params.description,
    canonicalUrl: `${SITE_URL}/en-gb/product/${params.slug}`,
    ogImage: params.ogImage,
    ogType: "website",
  });
}

/** Metadata for a recipe page */
export function recipeMetadata(params: {
  title: string;
  description: string;
  slug: string;
  heroImage?: string;
}): Metadata {
  return generateMetadata({
    title: params.title,
    description: params.description,
    canonicalUrl: `${SITE_URL}/en-gb/recipes/${params.slug}`,
    ogImage: params.heroImage,
    ogType: "article",
    keywords: [
      ...DEFAULT_KEYWORDS,
      "african recipe",
      "nigerian recipe",
      "african cooking",
      params.title.toLowerCase(),
    ],
  });
}
