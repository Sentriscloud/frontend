import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Sentinel",
  description: "Operator HUD for Sentrix Chain — height, throughput, quorum, latency, validator cluster, mempool, supply, all on one screen.",
};

export default function SentinelLayout({ children }: { children: ReactNode }) {
  return children;
}
