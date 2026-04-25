import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Blocks",
  description: "Browse the latest blocks produced on Sentrix Chain in real time.",
};

export default function BlocksLayout({ children }: { children: ReactNode }) {
  return children;
}
