import type { Metadata } from "next";
import { SentrixPrivyProvider } from "@sentriscloud/wallet-config";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sentrix DEX — native swap on Sentrix Chain",
  description:
    "Sentrix V2 — native AMM for SRX. Swap WSRX, stables, and SRC-20s on chain 7119 with 0.30% LP fee.",
  keywords: ["Sentrix", "DEX", "SRX", "AMM", "swap", "WSRX", "Sentrix V2"],
  metadataBase: new URL("https://dex.sentrixchain.com"),
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Sentrix DEX",
    description: "Native AMM for Sentrix Chain.",
    siteName: "Sentrix DEX",
    type: "website",
    url: "https://dex.sentrixchain.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sentrix DEX",
    description: "Native AMM for Sentrix Chain.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-[var(--bk)] text-[var(--tx)]">
        <SentrixPrivyProvider mainnetOnly>
          {children}
        </SentrixPrivyProvider>
      </body>
    </html>
  );
}
