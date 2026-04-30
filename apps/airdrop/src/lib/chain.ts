// Sentrix Mainnet chain config — used by viem for read calls and by the
// browser wallet for the wallet_addEthereumChain prompt.

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
} as const satisfies Chain;

// MerkleAirdrop deployment address on chain 7119. Set via env at build time
// (NEXT_PUBLIC_ so it ships to the browser); empty until Phase 1 deploys.
export const AIRDROP_CONTRACT_ADDRESS = (process.env
  .NEXT_PUBLIC_AIRDROP_CONTRACT_ADDRESS ?? "") as `0x${string}` | "";

// Window of time the claim is open. Surfaced from the contract at runtime,
// but the server-rendered page falls back to this if the on-chain read
// fails. Set to 0 to display "deploy pending" copy.
export const FALLBACK_CLAIM_DEADLINE_UNIX = parseInt(
  process.env.NEXT_PUBLIC_FALLBACK_CLAIM_DEADLINE_UNIX ?? "0",
  10,
);
