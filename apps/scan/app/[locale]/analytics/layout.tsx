import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Analytics",
  description: "TPS, block time, and daily throughput trends for Sentrix Chain.",
};

export default function AnalyticsLayout({ children }: { children: ReactNode }) {
  return children;
}
