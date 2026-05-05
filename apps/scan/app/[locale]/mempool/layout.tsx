import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Mempool",
  description: "Live pending transactions queued at the validator before sealing into a block.",
};

export default function MempoolLayout({ children }: { children: ReactNode }) {
  return children;
}
