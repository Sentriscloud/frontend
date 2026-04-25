import type { Metadata } from "next";
import type { ReactNode } from "react";
import { shortenAddress } from "@/lib/format";

export async function generateMetadata(
  { params }: { params: Promise<{ addr: string }> },
): Promise<Metadata> {
  const { addr } = await params;
  const short = shortenAddress(addr);
  return {
    title: `Address ${short}`,
    description: `Balance, transaction history, and token holdings for address ${addr} on Sentrix Chain.`,
    openGraph: {
      title: `${short} | Sentrix Scan`,
      description: `Address details on Sentrix Chain.`,
    },
  };
}

export default function AddressLayout({ children }: { children: ReactNode }) {
  return children;
}
