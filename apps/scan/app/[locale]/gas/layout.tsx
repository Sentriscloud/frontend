import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Gas Tracker",
  description: "Network gas + fee status — native flat fee, EVM EIP-1559 base fee, mempool pressure.",
};

export default function GasLayout({ children }: { children: ReactNode }) {
  return children;
}
