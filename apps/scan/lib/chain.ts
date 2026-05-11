import { defineChain, createPublicClient, http } from "viem";

export const sentrixMainnet = defineChain({
  id: Number(process.env.NEXT_PUBLIC_MAINNET_CHAIN_ID) || 7119,
  name: "Sentrix Chain",
  // 18 decimals — Sentrix EVM (post-Voyager) follows the standard wei
  // convention. The 8-decimal "sentri" sub-unit only applies at the REST
  // API layer (api.ts converts at the edge); EVM RPC + wallet integrations
  // use full 1e18 like every other EVM chain.
  nativeCurrency: { name: "Sentrix", symbol: "SRX", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_MAINNET_RPC || "https://rpc.sentrixchain.com"],
    },
  },
  blockExplorers: {
    default: { name: "Sentrix Scan", url: "https://scan.sentrixchain.com" },
  },
});

export const sentrixTestnet = defineChain({
  id: Number(process.env.NEXT_PUBLIC_TESTNET_CHAIN_ID) || 7120,
  name: "Sentrix Testnet",
  // 18 decimals — Sentrix EVM (post-Voyager) follows the standard wei
  // convention. The 8-decimal "sentri" sub-unit only applies at the REST
  // API layer (api.ts converts at the edge); EVM RPC + wallet integrations
  // use full 1e18 like every other EVM chain.
  nativeCurrency: { name: "Sentrix", symbol: "SRX", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_TESTNET_RPC || "https://testnet-rpc.sentrixchain.com"],
    },
  },
  blockExplorers: {
    default: { name: "Sentrix Scan Testnet", url: "https://scan-testnet.sentrixchain.com" },
  },
  testnet: true,
});

export type NetworkId = "mainnet" | "testnet";

export function getChain(network: NetworkId) {
  return network === "testnet" ? sentrixTestnet : sentrixMainnet;
}

export function getApiUrl(network: NetworkId) {
  return network === "testnet"
    ? (process.env.NEXT_PUBLIC_TESTNET_API || "https://testnet-api.sentrixchain.com")
    : (process.env.NEXT_PUBLIC_MAINNET_API || "https://api.sentrixchain.com");
}

// Canonical JSON-RPC endpoint. Use this — never compose `${apiUrl}/rpc`,
// which lands on a CORS-stripped Caddy passthrough that's both wrong
// architecturally and silently breaks browser fetches on testnet (the
// audit on 2026-05-11 caught 100+ requests/page going to the wrong host).
export function getRpcUrl(network: NetworkId) {
  return network === "testnet"
    ? (process.env.NEXT_PUBLIC_TESTNET_RPC || "https://testnet-rpc.sentrixchain.com")
    : (process.env.NEXT_PUBLIC_MAINNET_RPC || "https://rpc.sentrixchain.com");
}

export function getWsUrl(network: NetworkId) {
  return network === "testnet"
    ? (process.env.NEXT_PUBLIC_TESTNET_WS || "wss://testnet-rpc.sentrixchain.com/ws")
    : (process.env.NEXT_PUBLIC_MAINNET_WS || "wss://rpc.sentrixchain.com/ws");
}

export function createClient(network: NetworkId) {
  const chain = getChain(network);
  return createPublicClient({
    chain,
    transport: http(),
  });
}
