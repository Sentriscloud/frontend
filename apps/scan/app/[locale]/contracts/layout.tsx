import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Verified Contracts",
  description: "Canonical EVM contracts on Sentrix Chain — WSRX, Multicall3, factories, multisig.",
};

export default function ContractsLayout({ children }: { children: ReactNode }) {
  return children;
}
