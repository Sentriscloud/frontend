import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Watchlist",
  description: "Per-browser starred addresses, validators, and tokens.",
};

export default function WatchlistLayout({ children }: { children: ReactNode }) {
  return children;
}
