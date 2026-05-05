import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Remove Liquidity — Sentrix DEX",
  description: "Burn LP tokens to withdraw your share of a SentrixV2 pool.",
};

export default function RemoveLayout({ children }: { children: React.ReactNode }) {
  return children;
}
