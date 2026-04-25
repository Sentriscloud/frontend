import type { Metadata } from "next";
import type { ReactNode } from "react";
import { shortenAddress } from "@/lib/format";

export async function generateMetadata(
  { params }: { params: Promise<{ address: string }> },
): Promise<Metadata> {
  const { address } = await params;
  return {
    title: `Validator ${shortenAddress(address)}`,
    description: `Validator stats, produced blocks, delegators, and rewards for ${address} on Sentrix Chain.`,
  };
}

export default function ValidatorDetailLayout({ children }: { children: ReactNode }) {
  return children;
}
