import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import QueryProvider from "@/components/shared/QueryProvider";
import { ToastContainer } from "@/components/ui/Toast";
import { generateMetadata as buildMetadata } from "@/lib/seo/metadata";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/structured-data";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ── Default layout metadata ────────────────────────────────────────────────────
export const metadata: Metadata = {
  ...buildMetadata({
    canonicalUrl: "https://ereko.market/en-gb",
  }),
  verification: {
    google: "REPLACE_WITH_GSC_VERIFICATION_TOKEN",
  },
  manifest: "/manifest.json",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#E85D04" },
    { media: "(prefers-color-scheme: dark)", color: "#1A0A00" },
  ],
  title: {
    default: "EREKO Market | Authentic African Food Store UK",
    template: "%s | EREKO Market",
  },
  icons: {
    icon: [
      { url: "/logo.jpeg", type: "image/jpeg", sizes: "any" },
    ],
    apple: [
      { url: "/logo.jpeg", type: "image/jpeg" },
    ],
    shortcut: "/logo.jpeg",
  },
};

// ── JSON-LD data (serialised once at build time) ───────────────────────────────
const orgJsonLd = organizationJsonLd();
const siteJsonLd = websiteJsonLd();

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

import { ClientLayoutWrapper } from "@/components/layout/LayoutWrapper";

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const resolvedParams = await params;
  const { locale } = resolvedParams;

  // Validate that the incoming locale parameter matches our supported list
  if (locale !== "en-gb") {
    notFound();
  }

  // Retrieve localization keys
  const messages = await getMessages();

  return (
    <html
      lang="en-GB"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Organisation structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        {/* WebSite structured data (enables sitelinks searchbox) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        {/* Preconnect to key third-party origins */}
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://wulkzddeuhkawrstbcge.supabase.co" />
      </head>
      <body className="min-h-full bg-background text-foreground flex flex-col font-sans">
        <NextIntlClientProvider messages={messages} locale={locale}>
          <QueryProvider>
            {/* Global notification alerts toasts */}
            <ToastContainer />
            <ClientLayoutWrapper>
              {children}
            </ClientLayoutWrapper>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
