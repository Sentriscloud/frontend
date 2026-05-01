"use client";

// Live token registry. Reads every TokenDeployed event from
// TokenFactory v1.1.0 on Sentrix mainnet, decodes name/symbol/supply,
// and returns the merged set so the launchpad's home + explore pages
// surface every token deployed via /create automatically — no static
// seed list maintenance.
//
// Why not a client-side cache: Sentrix mainnet has ~1s blocks and a
// modest log volume per block. Each load fetches in 5000-block chunks
// (the Sentrix RPC's silent eth_getLogs ceiling — anything wider
// returns empty without erroring) and aggregates. localStorage caches
// the latest scan so repeated page loads only fetch the tail.

import { useEffect, useState } from "react";
import { createPublicClient, http, defineChain, type Log } from "viem";

const SENTRIX_MAINNET = defineChain({
  id: 7119,
  name: "Sentrix Chain",
  nativeCurrency: { name: "SRX", symbol: "SRX", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.sentrixchain.com"] } },
});

const client = createPublicClient({
  chain: SENTRIX_MAINNET,
  transport: http(),
});

// TokenFactory v1.1.0 — deployed 2026-05-01, block 0x1142da = 1131738.
// All TokenDeployed events from here forward = the universe of
// launchpad tokens. v1.0.0 (older factory at 0xc753…ee49) is excluded
// — it's been retired in favor of v1.1.0's audit hardening.
const TOKEN_FACTORY = "0x53C3838e18703c763564Bb983694CF117B33D366" as const;
const FACTORY_DEPLOY_BLOCK = 1131738n;
const CHUNK_SIZE = 5000n;

const TOKEN_DEPLOYED_EVENT = {
  type: "event",
  name: "TokenDeployed",
  inputs: [
    { name: "token", type: "address", indexed: true },
    { name: "owner", type: "address", indexed: true },
    { name: "name", type: "string", indexed: false },
    { name: "symbol", type: "string", indexed: false },
    { name: "initialSupply", type: "uint256", indexed: false },
  ],
} as const;

export interface DeployedToken {
  address: `0x${string}`;
  owner: `0x${string}`;
  name: string;
  symbol: string;
  initialSupply: bigint;
  blockNumber: bigint;
  txHash: `0x${string}`;
}

const CACHE_KEY = "coinblast:deployed-tokens:v1";
const CACHE_TTL_MS = 60_000; // 1 minute — short enough for "just-launched" UX

interface CacheShape {
  scannedToBlock: string;
  tokens: Array<{
    address: string;
    owner: string;
    name: string;
    symbol: string;
    initialSupply: string;
    blockNumber: string;
    txHash: string;
  }>;
  ts: number;
}

function loadCache(): CacheShape | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheShape;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCache(cache: CacheShape): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* quota / private mode — silent */
  }
}

/**
 * Hook: returns every token ever deployed via TokenFactory v1.1.0.
 * Newest first. Cached in localStorage (1-min TTL) to avoid re-scanning
 * the same chunks on every navigation.
 */
export function useDeployedTokens(): {
  tokens: DeployedToken[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [tokens, setTokens] = useState<DeployedToken[]>(() => {
    const cached = loadCache();
    if (!cached) return [];
    return cached.tokens.map((t) => ({
      address: t.address as `0x${string}`,
      owner: t.owner as `0x${string}`,
      name: t.name,
      symbol: t.symbol,
      initialSupply: BigInt(t.initialSupply),
      blockNumber: BigInt(t.blockNumber),
      txHash: t.txHash as `0x${string}`,
    }));
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const cached = loadCache();
        const startBlock = cached
          ? BigInt(cached.scannedToBlock) + 1n
          : FACTORY_DEPLOY_BLOCK;
        const latest = await client.getBlockNumber();
        if (cancelled) return;

        const collected: DeployedToken[] = cached
          ? cached.tokens.map((t) => ({
              address: t.address as `0x${string}`,
              owner: t.owner as `0x${string}`,
              name: t.name,
              symbol: t.symbol,
              initialSupply: BigInt(t.initialSupply),
              blockNumber: BigInt(t.blockNumber),
              txHash: t.txHash as `0x${string}`,
            }))
          : [];

        for (let from = startBlock; from <= latest; from += CHUNK_SIZE) {
          const to = from + CHUNK_SIZE - 1n > latest ? latest : from + CHUNK_SIZE - 1n;
          const logs = await client.getLogs({
            address: TOKEN_FACTORY,
            event: TOKEN_DEPLOYED_EVENT,
            fromBlock: from,
            toBlock: to,
          });
          if (cancelled) return;
          for (const log of logs as Array<Log<bigint, number, false, typeof TOKEN_DEPLOYED_EVENT>>) {
            const args = log.args;
            if (!args.token || !args.owner || args.name === undefined || args.symbol === undefined || args.initialSupply === undefined) continue;
            collected.push({
              address: args.token,
              owner: args.owner,
              name: args.name,
              symbol: args.symbol,
              initialSupply: args.initialSupply,
              blockNumber: log.blockNumber!,
              txHash: log.transactionHash!,
            });
          }
        }

        // Newest first
        collected.sort((a, b) => Number(b.blockNumber - a.blockNumber));

        if (!cancelled) {
          setTokens(collected);
          saveCache({
            scannedToBlock: latest.toString(),
            tokens: collected.map((t) => ({
              address: t.address,
              owner: t.owner,
              name: t.name,
              symbol: t.symbol,
              initialSupply: t.initialSupply.toString(),
              blockNumber: t.blockNumber.toString(),
              txHash: t.txHash,
            })),
            ts: Date.now(),
          });
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load token registry.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return {
    tokens,
    isLoading,
    error,
    refresh: () => setTick((t) => t + 1),
  };
}
