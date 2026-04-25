import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Tokens",
  description: "All SRC-20 tokens deployed on Sentrix Chain — supply, holders, and transfers.",
};

export default function TokensLayout({ children }: { children: ReactNode }) {
  return children;
}
