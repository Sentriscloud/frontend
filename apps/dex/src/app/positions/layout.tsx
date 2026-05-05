import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Positions — Sentrix DEX",
  description: "LP positions you hold across SentrixV2 pools.",
};

export default function PositionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
