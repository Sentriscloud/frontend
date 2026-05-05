import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Add Liquidity — Sentrix DEX",
  description: "Provide liquidity to a SentrixV2 pool and earn LP fees.",
};

export default function AddLayout({ children }: { children: React.ReactNode }) {
  return children;
}
