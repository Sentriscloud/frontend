import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { SmoothScroll } from "@/components/ui/smooth-scroll";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sentrix Chain — Layer-1 Blockchain | EVM Compatible",
  description: "Sentrix Chain (SRX) — High-performance Layer-1 blockchain built in Rust. 1-second blocks, instant BFT finality, EVM compatible via revm, MetaMask ready. Chain ID 7119.",
  keywords: ["sentrix", "sentrix chain", "blockchain", "layer-1", "L1", "EVM", "MetaMask", "SRX", "DPoS", "BFT", "rust blockchain", "chain id 7119", "indonesia blockchain"],
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
    title: "Sentrix Chain — Layer-1 Blockchain | EVM Compatible",
    description: "High-performance Layer-1 blockchain built from scratch in Rust. 1-second blocks, instant BFT finality, deflationary single-token economy, Ethereum-compatible.",
    url: "https://sentrixchain.com",
    images: [{ url: "/brand/og-image.png", width: 1200, height: 630, alt: "Sentrix Chain" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sentrix Chain — Layer-1 Blockchain",
    description: "Built in Rust. 1s blocks, instant BFT finality. EVM compatible. Chain ID 7119.",
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
