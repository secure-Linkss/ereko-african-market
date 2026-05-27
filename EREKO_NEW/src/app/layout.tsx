import React from "react";

interface RootLayoutProps {
  children: React.ReactNode;
}

// Next.js App Router requires a root layout in the app folder.
// We delegate HTML and body tags to /[locale]/layout.tsx so they are locale-aware.
export default function RootLayout({ children }: RootLayoutProps) {
  return children;
}
