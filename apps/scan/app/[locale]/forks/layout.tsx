import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Fork History",
  description: "Hard-fork timeline for Sentrix Chain — every consensus-affecting change with activation height.",
};

export default function ForksLayout({ children }: { children: ReactNode }) {
  return children;
}
