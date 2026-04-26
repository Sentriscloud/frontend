/**
 * Products shown in the products grid.
 * Edit copy / add new products here — components re-render automatically.
 */
import type { LucideIcon } from "lucide-react";
import { Search, Wallet, Droplets, TrendingUp } from "lucide-react";

export type ProductStatus = "live" | "beta" | "in-development" | "planned";

export type Product = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  href: string;
  status: ProductStatus;
  icon: LucideIcon;
  /** External — opens in new tab. */
  external?: boolean;
};

export const products = [
  {
    slug: "scan",
    name: "SentrixScan",
    tagline: "Block explorer for Sentrix Chain",
    description:
      "Browse blocks, transactions, addresses, validators, and SRC-20 tokens. Real-time stats, smart search, mainnet + testnet.",
    href: "https://scan.sentrixchain.com",
    status: "live",
    icon: Search,
    external: true,
  },
  {
    slug: "solux",
    name: "Solux",
    tagline: "Self-custody wallet for SRX",
    description:
      "Send, receive, and manage SRX and SRC-20 tokens. Web today, mobile (Flutter) in development. Same brand, same keys, two surfaces.",
    href: "https://solux.sentriscloud.com",
    status: "in-development",
    icon: Wallet,
    external: true,
  },
  {
    slug: "faucet",
    name: "Sentrix Faucet",
    tagline: "Testnet token tap for builders",
    description:
      "Request testnet SRX in seconds. Rate-limited, no signup, ready for CI and integration testing.",
    href: "https://faucet.sentrixchain.com",
    status: "live",
    icon: Droplets,
    external: true,
  },
  {
    slug: "coinblast",
    name: "CoinBlast",
    tagline: "DEX + token launchpad",
    description:
      "Fair-launch tooling, bonding curves, and an integrated DEX for the Sentrix ecosystem. Coming soon.",
    href: "#",
    status: "planned",
    icon: TrendingUp,
  },
] as const satisfies readonly Product[];

export const statusLabels: Record<ProductStatus, string> = {
  live: "Live",
  beta: "Beta",
  "in-development": "In development",
  planned: "Planned",
};
