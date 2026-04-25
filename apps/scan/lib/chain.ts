import { defineChain, createPublicClient, http } from "viem";

export const sentrixMainnet = defineChain({
  id: Number(process.env.NEXT_PUBLIC_MAINNET_CHAIN_ID) || 7119,
  name: "Sentrix Mainnet",
  nativeCurrency: { name: "Sentrix", symbol: "SRX", decimals: 8 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_MAINNET_RPC || "https://sentrix-rpc.sentriscloud.com/rpc"],
    },
  },
  blockExplorers: {
    default: { name: "Sentrix Scan", url: "https://sentrixscan.sentriscloud.com" },
  },
});

export const sentrixTestnet = defineChain({
  id: Number(process.env.NEXT_PUBLIC_TESTNET_CHAIN_ID) || 7120,
  name: "Sentrix Testnet",
  nativeCurrency: { name: "Sentrix", symbol: "SRX", decimals: 8 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_TESTNET_RPC || "https://testnet-rpc.sentriscloud.com/rpc"],
    },
  },
  blockExplorers: {
    default: { name: "Sentrix Scan Testnet", url: "https://testnet-rpc.sentriscloud.com/explorer" },
  },
  testnet: true,
});

export type NetworkId = "mainnet" | "testnet";

export function getChain(network: NetworkId) {
  return network === "testnet" ? sentrixTestnet : sentrixMainnet;
}

export function getApiUrl(network: NetworkId) {
  return network === "testnet"
    ? (process.env.NEXT_PUBLIC_TESTNET_API || "https://testnet-api.sentriscloud.com")
    : (process.env.NEXT_PUBLIC_MAINNET_API || "https://sentrix-api.sentriscloud.com");
}

export function createClient(network: NetworkId) {
  const chain = getChain(network);
  return createPublicClient({
    chain,
    transport: http(),
  });
}
