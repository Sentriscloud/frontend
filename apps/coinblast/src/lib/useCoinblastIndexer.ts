// Typed fetcher for the indexer API, accessed via the Next.js proxy at
// /api/cb/* (see apps/coinblast/src/app/api/cb/[...path]/route.ts for the
// reason — indexer is localhost-bound, can't be hit by the browser
// directly). Three surfaces today:
//
//   - listTokens(): full curve list with aggregate stats
//   - listTrades({...}): paginated trades, filterable by curve / trader / type
//   - listTradesByCurve(addr): convenience wrapper for the per-token chart
//
// Hooks are deliberately tiny — no SWR / react-query layer here. Each
// page that needs live polling owns its own setInterval; pages that
// don't poll just call once on mount. Adding SWR is a separate decision
// (cache strategy, dedupe semantics) and can land later without
// breaking these signatures.

import { useEffect, useRef, useState } from "react";

export interface IndexerToken {
  curve_address: string;
  token_address: string;
  owner_address: string;
  name: string;
  symbol: string;
  curve_supply: string;
  graduation_threshold: string;
  is_graduated: boolean;
  created_block: string;
  created_tx_hash: string;
  total_volume_srx: string;
  trade_count: number;
  last_price_srx: string;
}

export interface IndexerTrade {
  id: string;
  curve_address: string;
  token_address: string | null;
  type: "buy" | "sell" | "graduated";
  trader_address: string;
  srx_amount: string;
  token_amount: string;
  fee: string;
  block_number: string;
  tx_hash: string;
  log_index: number;
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`indexer fetch ${res.status} for ${path}`);
  return res.json();
}

export function useTokens() {
  const [tokens, setTokens] = useState<IndexerToken[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchJson<{ tokens: IndexerToken[] }>("/api/cb/tokens?limit=100")
      .then((d) => {
        if (!cancelled) setTokens(d.tokens);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { tokens, isLoading, error };
}

export interface UseTradesArgs {
  /** Poll interval in ms. Set to 0 (default) for one-shot. */
  pollMs?: number;
  curve?: string;
  trader?: string;
  type?: "buy" | "sell" | "graduated";
  limit?: number;
  /** Refetch trigger from a WS push hook. Increment to force a refetch
   *  outside the regular pollMs cadence — used to coalesce a chain-level
   *  Buy/Sell log with a fresh indexer pull within ~50-200 ms instead of
   *  waiting up to pollMs for the next tick. Pass 0 (default) when no WS
   *  layer is wired. */
  refetchTick?: number;
}

export function useTrades(args: UseTradesArgs = {}) {
  const { pollMs = 0, curve, trader, type, limit = 50, refetchTick = 0 } = args;
  const [trades, setTrades] = useState<IndexerTrade[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const argsRef = useRef({ curve, trader, type, limit });
  argsRef.current = { curve, trader, type, limit };

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const qs = new URLSearchParams();
        qs.set("limit", String(argsRef.current.limit));
        if (argsRef.current.curve) qs.set("curve", argsRef.current.curve);
        if (argsRef.current.trader) qs.set("trader", argsRef.current.trader);
        if (argsRef.current.type) qs.set("type", argsRef.current.type);
        const d = await fetchJson<{ trades: IndexerTrade[] }>(
          `/api/cb/trades?${qs.toString()}`,
        );
        if (!cancelled) {
          setTrades(d.trades);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e as Error);
      } finally {
        if (!cancelled) setLoading(false);
        if (!cancelled && pollMs > 0) {
          timer = setTimeout(tick, pollMs);
        }
      }
    };

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // refetchTick is in the dep list so a WS log push triggers a fresh
    // fetch outside the polling cadence.
  }, [pollMs, refetchTick]);

  return { trades, isLoading, error };
}

/**
 * Whale trades — buys/sells whose srx_amount crosses a threshold (default
 * 100 SRX). Backed by `/coinblast/whales` on the indexer; ordered by
 * size desc so the largest single trade in the window leads. Graduations
 * are excluded server-side (one-shot supply migrations, not user trades).
 */
export function useWhales(
  thresholdSrx = 100,
  limit = 25,
  pollMs = 0,
  refetchTick = 0,
) {
  const [trades, setTrades] = useState<IndexerTrade[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const qs = new URLSearchParams();
        qs.set("threshold", String(thresholdSrx));
        qs.set("limit", String(limit));
        const d = await fetchJson<{ trades: IndexerTrade[] }>(
          `/api/cb/whales?${qs.toString()}`,
        );
        if (!cancelled) {
          setTrades(d.trades);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e as Error);
      } finally {
        if (!cancelled) setLoading(false);
        if (!cancelled && pollMs > 0) {
          timer = setTimeout(tick, pollMs);
        }
      }
    };

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [thresholdSrx, limit, pollMs, refetchTick]);

  return { trades, isLoading, error };
}

export function useTradesByCurve(
  curve: string | undefined,
  limit = 100,
  pollMs = 0,
  refetchTick = 0,
) {
  const [trades, setTrades] = useState<IndexerTrade[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!curve) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const d = await fetchJson<{ trades: IndexerTrade[] }>(
          `/api/cb/trades/by-curve/${curve.toLowerCase()}?limit=${limit}`,
        );
        if (!cancelled) {
          setTrades(d.trades);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e as Error);
      } finally {
        if (!cancelled) setLoading(false);
        if (!cancelled && pollMs > 0) {
          timer = setTimeout(tick, pollMs);
        }
      }
    };

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // refetchTick triggers an extra refetch outside pollMs when a WS log
    // push arrives — see useEthSubscribeLogs in lib/ws.ts.
  }, [curve, limit, pollMs, refetchTick]);

  return { trades, isLoading, error };
}
