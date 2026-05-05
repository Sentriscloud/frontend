import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Trades — CoinBlast",
  description: "Real-time feed of every buy and sell happening on CoinBlast bonding curves.",
};

export default function LiveLayout({ children }: { children: React.ReactNode }) {
  return children;
}
