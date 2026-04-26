import { createPublicClient, http, type Chain } from "viem";

const MAINNET_RPC = process.env.NEXT_PUBLIC_MAINNET_RPC ?? "https://rpc.sentrixchain.com/rpc";
const MAINNET_CHAIN_ID = Number(process.env.NEXT_PUBLIC_MAINNET_CHAIN_ID ?? 7119);

export const sentrixMainnet: Chain = {
  id: MAINNET_CHAIN_ID,
  name: "Sentrix Chain",
  nativeCurrency: { name: "Sentrix", symbol: "SRX", decimals: 18 },
  rpcUrls: {
    default: { http: [MAINNET_RPC] },
  },
  blockExplorers: {
    default: { name: "SentrixScan", url: "https://scan.sentrixchain.com" },
  },
};

export const publicClient = createPublicClient({
  chain: sentrixMainnet,
  transport: http(MAINNET_RPC, { timeout: 5_000 }),
});

export type ChainSnapshot = {
  blockHeight: number;
  blockTime: number;
  validatorCount: number | null;
  status: "live" | "stale";
  fetchedAt: number;
};

export async function getChainSnapshot(): Promise<ChainSnapshot> {
  try {
    const [blockNumber, block] = await Promise.all([
      publicClient.getBlockNumber(),
      publicClient.getBlock({ blockTag: "latest" }),
    ]);

    return {
      blockHeight: Number(blockNumber),
      blockTime: Number(block.timestamp),
      validatorCount: null,
      status: "live",
      fetchedAt: Date.now(),
    };
  } catch {
    return {
      blockHeight: 0,
      blockTime: 0,
      validatorCount: null,
      status: "stale",
      fetchedAt: Date.now(),
    };
  }
}
