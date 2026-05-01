// Sentrix Chain definitions for viem / wagmi / RainbowKit. Single source
// of truth — every Sentrix frontend (airdrop, coinblast, dex, faucet, etc.)
// imports from here so chain config never drifts between apps.
//
// IDs:
//   7119 = mainnet
//   7120 = testnet
//
// RPC endpoints are public Caddy LBs over the validator fleet. Wallets
// add Sentrix to their network list via wallet_addEthereumChain using
// the JSON returned from RainbowKit, which reads these chain objects.

import type { Chain } from "viem";

export const SENTRIX_MAINNET = {
  id: 7119,
  name: "Sentrix",
  nativeCurrency: { name: "Sentrix", symbol: "SRX", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.sentrixchain.com"] },
    public: { http: ["https://rpc.sentrixchain.com"] },
  },
  blockExplorers: {
    default: { name: "Sentrix Scan", url: "https://scan.sentrixchain.com" },
  },
  testnet: false,
} as const satisfies Chain;

export const SENTRIX_TESTNET = {
  id: 7120,
  name: "Sentrix Testnet",
  nativeCurrency: { name: "Sentrix", symbol: "SRX", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.sentrixchain.com"] },
    public: { http: ["https://testnet-rpc.sentrixchain.com"] },
  },
  blockExplorers: {
    default: { name: "Sentrix Scan", url: "https://scan.sentrixchain.com" },
  },
  testnet: true,
} as const satisfies Chain;

// Default chain set: mainnet first (so RainbowKit defaults to it), then
// testnet for power users. Any app that needs to restrict to one chain
// passes a single-element array to getDefaultConfig.
export const SENTRIX_CHAINS = [SENTRIX_MAINNET, SENTRIX_TESTNET] as const;
