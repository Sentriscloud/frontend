/**
 * "Why SentrisCloud" value props. Edit copy here.
 */
import type { LucideIcon } from "lucide-react";
import { Layers, ShieldCheck, Users } from "lucide-react";

export type Value = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export const values: Value[] = [
  {
    title: "One ecosystem, four surfaces",
    description:
      "Every product shares chain primitives — wallet, explorer, faucet, exchange — so the developer story stays coherent and the user experience stays familiar across them.",
    icon: Layers,
  },
  {
    title: "Built on Sentrix Chain",
    description:
      "Native Layer 1 with sub-second blocks and instant finality. We don't ride someone else's settlement layer — we operate the protocol our products depend on.",
    icon: ShieldCheck,
  },
  {
    title: "Open to validators and builders",
    description:
      "External validators onboarding in 2026. SDKs, brand assets, and tooling are public. We grow the network, not just the product.",
    icon: Users,
  },
];
