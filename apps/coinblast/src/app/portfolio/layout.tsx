import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Portfolio — CoinBlast",
  description: "Coins you hold across CoinBlast bonding curves.",
};

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
