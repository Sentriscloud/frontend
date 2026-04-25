import type { Metadata } from "next";
import type { ReactNode } from "react";
import { shortenAddress } from "@/lib/format";

export async function generateMetadata(
  { params }: { params: Promise<{ addr: string }> },
): Promise<Metadata> {
  const { addr } = await params;
  const short = shortenAddress(addr);
  return {
    title: `Token ${short}`,
    description: `Supply, holders, transfers, and contract details for SRC-20 token at ${addr}.`,
    openGraph: {
      title: `Token ${short} | Sentrix Scan`,
      description: `SRC-20 token details on Sentrix Chain.`,
    },
  };
}

export default function TokenLayout({ children }: { children: ReactNode }) {
  return children;
}
