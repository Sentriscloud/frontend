import type { Metadata, Viewport } from "next";

// DECISION: root layout must exist in Next App Router, but actual UI lives in
// `app/[locale]/layout.tsx`. This file is intentionally minimal — locale-aware html tag,
// providers, and chrome are set in the locale layout.
export const metadata: Metadata = {
  title: {
    default: "Sentrix Scan — Block Explorer",
    template: "%s | Sentrix Scan",
  },
  description:
    "Block explorer for Sentrix Chain (SRX). Browse blocks, transactions, addresses, validators, and SRC-20 tokens on Chain ID 7119.",
  keywords: ["sentrix", "block explorer", "blockchain", "SRX", "chain id 7119", "EVM", "sentrix scan"],
  applicationName: "Sentrix Scan",
  authors: [{ name: "Sentrix Labs" }],
  creator: "Sentrix Labs",
  publisher: "Sentrix Labs",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://sentrixscan.sentriscloud.com"),
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0C" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
