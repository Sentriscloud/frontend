import type { Metadata } from "next";
import type { ReactNode } from "react";

export async function generateMetadata(
  { params }: { params: Promise<{ height: string }> },
): Promise<Metadata> {
  const { height } = await params;
  return {
    title: `Block #${height}`,
    description: `View details of block ${height} on Sentrix Chain — transactions, validator, merkle root, timestamp.`,
    openGraph: {
      title: `Block #${height} | Sentrix Scan`,
      description: `Details for block ${height} on Sentrix Chain.`,
    },
  };
}

export default function BlockLayout({ children }: { children: ReactNode }) {
  return children;
}
