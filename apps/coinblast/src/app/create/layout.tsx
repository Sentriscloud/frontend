import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Launch a Coin — CoinBlast",
  description: "Launch your own SRC-20 token on Sentrix Chain in seconds. Fair-launch bonding curve, no pre-sale.",
};

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
