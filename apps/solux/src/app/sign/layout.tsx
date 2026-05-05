import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Transaction — Solux",
  description: "Review and sign a Sentrix Chain transaction from your Solux wallet.",
};

export default function SignLayout({ children }: { children: React.ReactNode }) {
  return children;
}
