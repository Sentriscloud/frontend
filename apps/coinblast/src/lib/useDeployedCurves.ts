"use client";

// Cross-device discovery for CoinBlastFactory launches. Every curve
// deployed via factory.createCurve fires a CurveCreated event; this
// hook scans them all and returns a structured list every frontend
// (home, explore, detail) can consume. Replaces the per-browser
// localStorage shortcut for any visitor that doesn't own the launch.

import { useEffect, useState } from "react";
import { createPublicClient, http, defineChain, type Log } from "viem";
import {
  COINBLAST_FACTORY_ADDRESSES,
  COINBLAST_FACTORY_DEPLOY_BLOCK,
} from "./coinblast-factory";

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

const CHUNK_SIZE = 5000n;

const CURVE_CREATED_EVENT = {
  type: "event",
  name: "CurveCreated",
  inputs: [
    { name: "curve", type: "address", indexed: true },
    { name: "token", type: "address", indexed: true },
    { name: "owner", type: "address", indexed: true },
    { name: "name", type: "string", indexed: false },
    { name: "symbol", type: "string", indexed: false },
    { name: "curveSupply", type: "uint256", indexed: false },
    { name: "graduationSrxThreshold", type: "uint256", indexed: false },
  ],
} as const;

export interface DeployedCurve {
  curveAddress: `0x${string}`;
  tokenAddress: `0x${string}`;
  owner: `0x${string}`;
  name: string;
  symbol: string;
  curveSupply: bigint;
  graduationSrxThreshold: bigint;
  blockNumber: bigint;
  txHash: `0x${string}`;
}

const CACHE_KEY = "coinblast:deployed-curves:v1";
const CACHE_TTL_MS = 60_000;

interface CacheShape {
  scannedToBlock: string;
  curves: Array<{
    curveAddress: string;
    tokenAddress: string;
    owner: string;
    name: string;
    symbol: string;
    curveSupply: string;
    graduationSrxThreshold: string;
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
    /* silent */
  }
}

function cacheToCurves(cache: CacheShape): DeployedCurve[] {
  return cache.curves.map((c) => ({
    curveAddress: c.curveAddress as `0x${string}`,
    tokenAddress: c.tokenAddress as `0x${string}`,
    owner: c.owner as `0x${string}`,
    name: c.name,
    symbol: c.symbol,
    curveSupply: BigInt(c.curveSupply),
    graduationSrxThreshold: BigInt(c.graduationSrxThreshold),
    blockNumber: BigInt(c.blockNumber),
    txHash: c.txHash as `0x${string}`,
  }));
}

/**
 * Hook: every CoinBlastCurve deployed via the canonical factory.
 * Newest first. Cached in localStorage so navigation stays snappy.
 */
export function useDeployedCurves(): {
  curves: DeployedCurve[];
  isLoading: boolean;
  error: string | null;
} {
  const [curves, setCurves] = useState<DeployedCurve[]>(() => {
    const cached = loadCache();
    return cached ? cacheToCurves(cached) : [];
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const factoryAddr = COINBLAST_FACTORY_ADDRESSES[7119];
        if (!factoryAddr) {
          if (!cancelled) setIsLoading(false);
          return;
        }

        const cached = loadCache();
        const startBlock = cached
          ? BigInt(cached.scannedToBlock) + 1n
          : COINBLAST_FACTORY_DEPLOY_BLOCK[7119];
        const latest = await client.getBlockNumber();
        if (cancelled) return;

        const collected: DeployedCurve[] = cached ? cacheToCurves(cached) : [];

        for (let from = startBlock; from <= latest; from += CHUNK_SIZE) {
          const to = from + CHUNK_SIZE - 1n > latest ? latest : from + CHUNK_SIZE - 1n;
          const logs = await client.getLogs({
            address: factoryAddr,
            event: CURVE_CREATED_EVENT,
            fromBlock: from,
            toBlock: to,
          });
          if (cancelled) return;
          for (const log of logs as Array<Log<bigint, number, false, typeof CURVE_CREATED_EVENT>>) {
            const args = log.args;
            if (
              !args.curve ||
              !args.token ||
              !args.owner ||
              args.name === undefined ||
              args.symbol === undefined ||
              args.curveSupply === undefined ||
              args.graduationSrxThreshold === undefined
            ) {
              continue;
            }
            collected.push({
              curveAddress: args.curve,
              tokenAddress: args.token,
              owner: args.owner,
              name: args.name,
              symbol: args.symbol,
              curveSupply: args.curveSupply,
              graduationSrxThreshold: args.graduationSrxThreshold,
              blockNumber: log.blockNumber!,
              txHash: log.transactionHash!,
            });
          }
        }

        collected.sort((a, b) => Number(b.blockNumber - a.blockNumber));

        if (!cancelled) {
          setCurves(collected);
          saveCache({
            scannedToBlock: latest.toString(),
            curves: collected.map((c) => ({
              curveAddress: c.curveAddress,
              tokenAddress: c.tokenAddress,
              owner: c.owner,
              name: c.name,
              symbol: c.symbol,
              curveSupply: c.curveSupply.toString(),
              graduationSrxThreshold: c.graduationSrxThreshold.toString(),
              blockNumber: c.blockNumber.toString(),
              txHash: c.txHash,
            })),
            ts: Date.now(),
          });
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "scan failed");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { curves, isLoading, error };
}
