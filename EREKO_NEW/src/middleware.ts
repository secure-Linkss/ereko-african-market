import createMiddleware from "next-intl/middleware";

export default createMiddleware({
  // Supported locales mapping
  locales: ["en-gb"],

  // Base fallback locale if none matched
  defaultLocale: "en-gb",

  // Automatically hide or show the locale prefix in URLs (set to always to force en-gb in paths)
  localePrefix: "always",
});

export const config = {
  // Matches all routes except asset folders and next internal bundles
  matcher: ["/", "/(en-gb)/:path*", "/((?!_next|_vercel|.*\\..*).*)"],
};
