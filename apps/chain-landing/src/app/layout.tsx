import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { SmoothScroll } from "@/components/ui/smooth-scroll";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sentrix Chain — Where real assets live",
  description: "Financial infrastructure for the real economy — Indonesia first, then the world. Layer-1 settlement built in Rust: 1-second blocks, instant BFT finality, EVM-compatible. Chain ID 7119.",
  keywords: ["sentrix", "sentrix chain", "real world assets", "RWA", "financial infrastructure", "blockchain", "layer-1", "L1", "EVM", "SRX", "DPoS", "BFT", "rust blockchain", "chain id 7119"],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/brand/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/brand/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: "/brand/apple-touch-icon.png",
    shortcut: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    siteName: "Sentrix Chain",
    title: "Sentrix Chain — Where real assets live",
    description: "Financial infrastructure for the real economy. Indonesia first, then the world. Layer-1 settlement built in Rust — 1-second blocks, instant BFT finality, EVM-compatible.",
    url: "https://sentrixchain.com",
    images: [{ url: "/brand/og-image.png", width: 1200, height: 630, alt: "Sentrix Chain — Where real assets live" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sentrix Chain — Where real assets live",
    description: "Financial infrastructure for the real economy. Indonesia first, then the world. Built in Rust on Chain ID 7119.",
    images: ["/brand/og-image.png"],
  },
  metadataBase: new URL("https://sentrixchain.com"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <ThemeProvider>
          <SmoothScroll />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
