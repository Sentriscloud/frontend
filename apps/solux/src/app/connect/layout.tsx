import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connect — Solux",
  description: "Approve a Sentrix dapp connection from your Solux wallet.",
};

export default function ConnectLayout({ children }: { children: React.ReactNode }) {
  return children;
}
