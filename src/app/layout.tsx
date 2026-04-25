import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { SmoothScroll } from "@/components/ui/smooth-scroll";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sentrix — Layer-1 Blockchain | EVM Compatible",
  description: "Sentrix Chain (SRX) — High-performance Layer-1 blockchain built in Rust. 3-second finality, BFT consensus, EVM compatible via revm, MetaMask ready. Chain ID 7119.",
  keywords: ["sentrix", "blockchain", "layer-1", "EVM", "MetaMask", "SRX", "proof of authority", "rust blockchain", "chain id 7119"],
  icons: {
    icon: "/sentrix-coin-logo.png",
    apple: "/sentrix-coin-logo.png",
  },
  openGraph: {
    type: "website",
    siteName: "Sentrix",
    title: "Sentrix — Layer-1 Blockchain | EVM Compatible",
    description: "High-performance Layer-1 blockchain built from scratch in Rust. 3-second finality, BFT consensus, deflationary tokenomics, Ethereum compatible.",
    url: "https://sentrix.sentriscloud.com",
    images: [{ url: "/sentrix-coin-og.png", width: 1024, height: 1024, alt: "Sentrix Chain" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sentrix — Layer-1 Blockchain",
    description: "Built in Rust. 3s finality. EVM compatible. Chain ID 7119.",
    images: ["/sentrix-coin-og.png"],
  },
  metadataBase: new URL("https://sentrix.sentriscloud.com"),
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
