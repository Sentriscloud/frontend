import type { Metadata } from "next";
import type { ReactNode } from "react";
import { shortenHash } from "@/lib/format";

export async function generateMetadata(
  { params }: { params: Promise<{ hash: string }> },
): Promise<Metadata> {
  const { hash } = await params;
  const short = shortenHash(hash, 8);
  return {
    title: `Tx ${short}`,
    description: `Transaction ${hash} on Sentrix Chain — from, to, value, fee, and status.`,
    openGraph: {
      title: `Transaction ${short} | Sentrix Scan`,
      description: `View transaction details on Sentrix Chain.`,
    },
  };
}

export default function TxLayout({ children }: { children: ReactNode }) {
  return children;
}
