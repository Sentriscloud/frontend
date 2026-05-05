import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Supply",
  description: "SRX supply breakdown — max, minted, burnt, premine, bonded — for Sentrix Chain.",
};

export default function SupplyLayout({ children }: { children: ReactNode }) {
  return children;
}
