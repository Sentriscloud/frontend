import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explore Coins — CoinBlast",
  description: "Browse every coin launched on CoinBlast. Search by name, ticker, or creator.",
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
