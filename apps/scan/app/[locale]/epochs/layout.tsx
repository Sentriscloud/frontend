import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Epochs",
  description: "Epoch view for Sentrix Chain — current epoch, block range, rewards, staking boundary.",
};

export default function EpochsLayout({ children }: { children: ReactNode }) {
  return children;
}
