"use client";

// Per-token holder list. Reads ERC-20 Transfer events from the token
// contract, runs a balance map (balances[to] += amount,
// balances[from] -= amount), and returns the top N holders sorted by
// balance descending.
//
// Cheap version of an indexer — works fine for tokens with low
// transfer volume (newly-launched, < ~10k Transfer events). For
// high-volume tokens this will get slow; the proper fix is a
// Postgres-backed indexer (see roadmap T2-2).

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

// Bumped 5K -> 50K. Sentrix RPC `eth_getLogs` happily handles ranges
// up to ~10K-50K blocks (caps below the wider Ethereum-mainnet 50K limit
// some providers enforce). Larger chunks = 10x fewer round trips =
// 10x lower chance of cumulative chunk-burst CORS / rate-limit hits.
// Discovered 2026-05-06: with 5K chunks the holder scan was making
// ~102 sequential RPC calls per token (1.6M chain), 30% intermittent
// failure rate, single failed chunk silently aborted the entire scan
// (catch-all in load() set state to empty, "Holders —" on stats grid).
const CHUNK_SIZE = 50000n;

const TRANSFER_EVENT = {
  type: "event",
  name: "Transfer",
  inputs: [
    { name: "from", type: "address", indexed: true },
    { name: "to", type: "address", indexed: true },
    { name: "value", type: "uint256", indexed: false },
  ],
} as const;

export interface Holder {
  address: `0x${string}`;
  balance: bigint;
  percentage: number;
}

export function useTopHolders(
  tokenAddress: `0x${string}` | undefined,
  fromBlock = 1131000n,
  topN = 10,
): { holders: Holder[]; totalSupply: bigint; isLoading: boolean } {
  const [holders, setHolders] = useState<Holder[]>([]);
  const [totalSupply, setTotalSupply] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!tokenAddress) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHolders([]);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTotalSupply(0n);
      return;
    }
    let cancelled = false;
    async function load(addr: `0x${string}`) {
      setIsLoading(true);
      try {
        const latest = await client.getBlockNumber();
        if (cancelled) return;

        const balances = new Map<string, bigint>();
        let supply = 0n;

        for (let from = fromBlock; from <= latest; from += CHUNK_SIZE) {
          const to = from + CHUNK_SIZE - 1n > latest ? latest : from + CHUNK_SIZE - 1n;
          // Per-chunk try/catch with one retry. Single transient
          // failure (CORS, rate-limit, validator failover) used to
          // bail the entire load() via the outer catch and silently
          // strand "Holders —" on the stats grid even though most
          // chunks succeeded. Now we just skip the broken chunk —
          // partial holder map is way better than empty.
          let logs: Awaited<ReturnType<typeof client.getLogs>> = [];
          try {
            logs = await client.getLogs({
              address: addr,
              event: TRANSFER_EVENT,
              fromBlock: from,
              toBlock: to,
            });
          } catch {
            // One retry with a small backoff. If still fails, skip.
            try {
              await new Promise((r) => setTimeout(r, 250));
              logs = await client.getLogs({
                address: addr,
                event: TRANSFER_EVENT,
                fromBlock: from,
                toBlock: to,
              });
            } catch {
              continue;
            }
          }
          if (cancelled) return;
          for (const log of logs as Array<Log<bigint, number, false, typeof TRANSFER_EVENT>>) {
            const args = log.args;
            if (!args.from || !args.to || args.value === undefined) continue;
            const fromAddr = args.from.toLowerCase();
            const toAddr = args.to.toLowerCase();
            const value = args.value;
            // Mint (from = 0x0) bumps total supply.
            if (fromAddr === "0x0000000000000000000000000000000000000000") {
              supply += value;
            } else {
              balances.set(fromAddr, (balances.get(fromAddr) ?? 0n) - value);
            }
            // Burn (to = 0x0) reduces total supply.
            if (toAddr === "0x0000000000000000000000000000000000000000") {
              supply -= value;
            } else {
              balances.set(toAddr, (balances.get(toAddr) ?? 0n) + value);
            }
          }
        }

        if (cancelled) return;

        const sorted = Array.from(balances.entries())
          .filter(([, bal]) => bal > 0n)
          .sort((a, b) => (a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0))
          .slice(0, topN);

        const list: Holder[] = sorted.map(([addr, bal]) => ({
          address: addr as `0x${string}`,
          balance: bal,
          percentage: supply > 0n ? Number((bal * 10000n) / supply) / 100 : 0,
        }));

        setHolders(list);
        setTotalSupply(supply);
      } catch {
        /* RPC blip — leave previous state */
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load(tokenAddress);
    return () => {
      cancelled = true;
    };
  }, [tokenAddress, fromBlock, topN]);

  return { holders, totalSupply, isLoading };
}
