import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Glossary",
  description: "Plain-language explanations of BFT rounds, justification signers, rail badges, finality states, SRX vs sentri, and the rest of Sentrix Chain's vocabulary.",
};

export default function GlossaryLayout({ children }: { children: ReactNode }) {
  return children;
}
