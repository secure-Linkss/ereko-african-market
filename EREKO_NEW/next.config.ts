import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  // ── Image optimisation ──────────────────────────────────────────────────────
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [375, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 86400, // 24 h
    remotePatterns: [
      // Cloudinary
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      // Cloudflare Images / R2
      {
        protocol: "https",
        hostname: "imagedelivery.net",
        pathname: "/**",
      },
      // Generic CDN wildcard for ereko.market assets
      {
        protocol: "https",
        hostname: "cdn.ereko.market",
        pathname: "/**",
      },
      // Imgix
      {
        protocol: "https",
        hostname: "*.imgix.net",
        pathname: "/**",
      },
      // AWS S3 / presigned
      {
        protocol: "https",
        hostname: "*.s3.amazonaws.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.s3.eu-west-2.amazonaws.com",
        pathname: "/**",
      },
    ],
  },

  // ── Security headers ────────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  // ── Misc ────────────────────────────────────────────────────────────────────
  poweredByHeader: false,
  compress: true,

  // ── Experimental ───────────────────────────────────────────────────────────
  experimental: {
    optimizePackageImports: ["framer-motion", "lucide-react"],
  },
};

export default withNextIntl(nextConfig);
