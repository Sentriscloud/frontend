"use client";

// Lightweight on-chain volume + trader aggregation across every
// CoinBlastCurve we know about. Scans Buy + Sell events from each
// curve in 5000-block chunks (Sentrix RPC ceiling), sums SRX values,
// and dedupes buyer/seller addresses. Cached 60s in localStorage so
// page navigation doesn't re-scan.
//
// Trade-off: O(N curves × block range / 5000) RPC calls per refresh.
// Fine for the 3 curves we have today + the modest history; gets
// painful past ~50 active curves with deep history. Real fix when
// it bites: a Postgres-backed indexer with a /stats endpoint
// (T2-2). This is the no-infra prelude.

import { useEffect, useState } from "react";
import { createPublicClient, http, defineChain, formatEther, type Log } from "viem";

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

const BUY_EVENT = {
  type: "event",
  name: "Buy",
  inputs: [
    { name: "buyer", type: "address", indexed: true },
    { name: "srxIn", type: "uint256", indexed: false },
    { name: "fee", type: "uint256", indexed: false },
    { name: "tokensOut", type: "uint256", indexed: false },
  ],
} as const;

const SELL_EVENT = {
  type: "event",
  name: "Sell",
  inputs: [
    { name: "seller", type: "address", indexed: true },
    { name: "tokensIn", type: "uint256", indexed: false },
    { name: "fee", type: "uint256", indexed: false },
    { name: "srxOut", type: "uint256", indexed: false },
  ],
} as const;

export interface CurveTradeStats {
  totalVolumeSrx: number;       // sum of srxIn (buy) + srxOut (sell) across all curves
  totalFeesSrx: number;         // sum of fee across all events
  uniqueTraders: number;        // distinct buyer + seller addresses
  buyCount: number;
  sellCount: number;
  isLoading: boolean;
  error: string | null;
}

interface CacheShape {
  totalVolumeSrx: number;
  totalFeesSrx: number;
  uniqueTraders: number;
  buyCount: number;
  sellCount: number;
  ts: number;
  curveSetHash: string;
}

const CACHE_KEY = "coinblast:trade-stats:v1";
const CACHE_TTL_MS = 60_000;

function hashCurveSet(curves: readonly { curveAddress: string; blockNumber: bigint }[]): string {
  // Cheap stable hash — addresses + their deploy block is the unique
  // shape of the input. If a new curve appears, hash differs, cache
  // is invalidated.
  return curves
    .map((c) => `${c.curveAddress.toLowerCase()}@${c.blockNumber}`)
    .sort()
    .join(",");
}

function loadCache(setHash: string): CacheShape | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheShape;
    if (parsed.curveSetHash !== setHash) return null;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCache(c: CacheShape): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    /* silent */
  }
}

export function useCurveTradeStats(
  curves: ReadonlyArray<{ curveAddress: `0x${string}`; blockNumber: bigint }>,
): CurveTradeStats {
  const [stats, setStats] = useState<CurveTradeStats>({
    totalVolumeSrx: 0,
    totalFeesSrx: 0,
    uniqueTraders: 0,
    buyCount: 0,
    sellCount: 0,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    if (curves.length === 0) {
      setStats({
        totalVolumeSrx: 0,
        totalFeesSrx: 0,
        uniqueTraders: 0,
        buyCount: 0,
        sellCount: 0,
        isLoading: false,
        error: null,
      });
      return;
    }

    let cancelled = false;
    const setHash = hashCurveSet(curves);

    // Cache hit?
    const cached = loadCache(setHash);
    if (cached) {
      setStats({
        totalVolumeSrx: cached.totalVolumeSrx,
        totalFeesSrx: cached.totalFeesSrx,
        uniqueTraders: cached.uniqueTraders,
        buyCount: cached.buyCount,
        sellCount: cached.sellCount,
        isLoading: false,
        error: null,
      });
      return;
    }

    async function load() {
      setStats((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const latest = await client.getBlockNumber();
        if (cancelled) return;

        let totalVolumeSrx = 0;
        let totalFeesSrx = 0;
        let buyCount = 0;
        let sellCount = 0;
        const traders = new Set<string>();

        // For each curve, scan from its deploy block onward.
        for (const curve of curves) {
          const fromStart = curve.blockNumber;
          for (let from = fromStart; from <= latest; from += CHUNK_SIZE) {
            const to = from + CHUNK_SIZE - 1n > latest ? latest : from + CHUNK_SIZE - 1n;

            const [buyLogs, sellLogs] = await Promise.all([
              client.getLogs({
                address: curve.curveAddress,
                event: BUY_EVENT,
                fromBlock: from,
                toBlock: to,
              }),
              client.getLogs({
                address: curve.curveAddress,
                event: SELL_EVENT,
                fromBlock: from,
                toBlock: to,
              }),
            ]);
            if (cancelled) return;

            for (const log of buyLogs as Array<Log<bigint, number, false, typeof BUY_EVENT>>) {
              const a = log.args;
              if (a.buyer && a.srxIn !== undefined) {
                totalVolumeSrx += Number(formatEther(a.srxIn));
                if (a.fee !== undefined) totalFeesSrx += Number(formatEther(a.fee));
                traders.add(a.buyer.toLowerCase());
                buyCount += 1;
              }
            }
            for (const log of sellLogs as Array<Log<bigint, number, false, typeof SELL_EVENT>>) {
              const a = log.args;
              if (a.seller && a.srxOut !== undefined) {
                totalVolumeSrx += Number(formatEther(a.srxOut));
                if (a.fee !== undefined) totalFeesSrx += Number(formatEther(a.fee));
                traders.add(a.seller.toLowerCase());
                sellCount += 1;
              }
            }
          }
        }

        if (cancelled) return;

        const result: CurveTradeStats = {
          totalVolumeSrx,
          totalFeesSrx,
          uniqueTraders: traders.size,
          buyCount,
          sellCount,
          isLoading: false,
          error: null,
        };
        setStats(result);
        saveCache({
          totalVolumeSrx,
          totalFeesSrx,
          uniqueTraders: traders.size,
          buyCount,
          sellCount,
          ts: Date.now(),
          curveSetHash: setHash,
        });
      } catch (e) {
        if (!cancelled) {
          setStats((prev) => ({
            ...prev,
            isLoading: false,
            error: e instanceof Error ? e.message : "scan failed",
          }));
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [curves]);

  return stats;
}
