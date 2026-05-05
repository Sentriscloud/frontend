import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Wallet — Solux",
  description: "Send, receive, and manage your Sentrix Chain assets in Solux.",
};

export default function WalletLayout({ children }: { children: React.ReactNode }) {
  return children;
}
