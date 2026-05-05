import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pools — Sentrix DEX",
  description: "All SentrixV2 liquidity pools. Add liquidity to earn 0.3% of trading fees pro-rata.",
};

export default function PoolsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
