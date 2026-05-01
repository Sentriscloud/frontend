import type { Metadata } from "next";
import { RailPage } from "@/components/common/RailPage";

export const metadata: Metadata = {
  title: "Native — Sentrix Scan",
  description:
    "Native-rail transactions on Sentrix Chain. SRX transfers, validator coordination (Delegate / ClaimRewards / AddSelfStake / Unjail), and SRC-20 token operations.",
};

export default function NativePage() {
  return <RailPage rail="native" />;
}
