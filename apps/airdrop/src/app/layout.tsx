import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sentrix Airdrop — Phase 1: Testnet Heroes",
  description:
    "Sentrix Phase 1 airdrop claim page. Eligible testnet heroes claim mainnet SRX via on-chain Merkle proof.",
  keywords: ["Sentrix", "airdrop", "SRX", "Phase 1", "testnet heroes", "claim"],
  metadataBase: new URL("https://airdrop.sentrixchain.com"),
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Sentrix Airdrop — Phase 1",
    description: "Claim your Phase 1 testnet-heroes allocation.",
    siteName: "Sentrix Airdrop",
    type: "website",
    url: "https://airdrop.sentrixchain.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sentrix Airdrop — Phase 1",
    description: "Claim your Phase 1 testnet-heroes allocation.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-[var(--bk)] text-[var(--tx)]">
        {children}
      </body>
    </html>
  );
}
