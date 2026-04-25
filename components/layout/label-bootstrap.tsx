"use client";

import type { ReactNode } from "react";
import { useNetwork } from "@/lib/network-context";
import { LabelProvider } from "@/lib/labels";

// Bridges NetworkProvider → LabelProvider. Kept as its own tiny client component so the
// server-rendered locale layout doesn't need to touch client hooks directly.
export function LabelBootstrap({ children }: { children: ReactNode }) {
  const { network } = useNetwork();
  return <LabelProvider network={network}>{children}</LabelProvider>;
}
