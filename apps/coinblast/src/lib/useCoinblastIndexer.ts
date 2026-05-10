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
  // Mirror latest args into the ref via effect (not during render) so the
  // long-lived poller closure inside the next useEffect can read them
  // without triggering a poll restart on every prop change.
  useEffect(() => {
    argsRef.current = { curve, trader, type, limit };
  });

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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

/**
 * Per-curve indexer metadata (image_url, description, socials). Reads
 * the same /coinblast/tokens/{curve} endpoint as the launch list but
 * returns just the rich-metadata fields the launch detail page needs.
 *
 * Returns null fields until the lookup resolves OR if the curve has no
 * metadata posted yet (frontend then falls back to MOCK_TOKENS / the
 * static seed). Polls every 30 s — metadata is operator-pushed, not
 * trade-driven, so a slower cadence is fine.
 */
export interface IndexerTokenMeta {
  imageUrl: string | null;
  description: string | null;
  twitterUrl: string | null;
  telegramUrl: string | null;
  websiteUrl: string | null;
}

export function useIndexerTokenMeta(
  curveAddress: string | undefined,
): { meta: IndexerTokenMeta | null; isLoading: boolean } {
  const [meta, setMeta] = useState<IndexerTokenMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!curveAddress) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMeta(null);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    const tick = async () => {
      try {
        const d = await fetchJson<{
          token: {
            image_url: string | null;
            description: string | null;
            twitter_url: string | null;
            telegram_url: string | null;
            website_url: string | null;
          };
        }>(`/api/cb/tokens/${curveAddress.toLowerCase()}`);
        if (cancelled) return;
        setMeta({
          imageUrl: d.token.image_url,
          description: d.token.description,
          twitterUrl: d.token.twitter_url,
          telegramUrl: d.token.telegram_url,
          websiteUrl: d.token.website_url,
        });
      } catch {
        if (!cancelled) setMeta(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [curveAddress]);

  return { meta, isLoading };
}

/**
 * Bulk indexer metadata for the launchpad list views (/explore + home).
 * Single fetch of /coinblast/tokens?limit=100 returning a Map<curveAddr,
 * { imageUrl, description }> so list pages can patch their token rows
 * without one fetch per card. Polls every 30 s.
 *
 * The token detail page uses useIndexerTokenMeta (one curve at a time);
 * this is its plural sibling.
 */
export interface IndexerTokensMetaMap {
  byCurve: Map<string, { imageUrl: string | null; description: string | null }>;
  isLoading: boolean;
}

export function useIndexerTokensMeta(): IndexerTokensMetaMap {
  const [byCurve, setByCurve] = useState<Map<string, { imageUrl: string | null; description: string | null }>>(
    () => new Map(),
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const d = await fetchJson<{
          tokens: Array<{
            curve_address: string;
            image_url: string | null;
            description: string | null;
          }>;
        }>(`/api/cb/tokens?limit=100`);
        if (cancelled) return;
        const m = new Map<string, { imageUrl: string | null; description: string | null }>();
        for (const t of d.tokens ?? []) {
          m.set(t.curve_address.toLowerCase(), {
            imageUrl: t.image_url,
            description: t.description,
          });
        }
        setByCurve(m);
      } catch {
        /* keep stale */
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { byCurve, isLoading };
}

/**
 * Indexer-sourced curves list — fast path for /explore + home that
 * bypasses the per-browser eth_getLogs chain scan (which takes 30-60 s
 * to walk from the factory deploy block to current tip on a fresh
 * browser session). Indexer already has every CurveCreated event
 * processed; one fetch returns the same shape useDeployedCurves
 * provides plus the metadata fields.
 *
 * Returned shape mirrors DeployedCurve from useDeployedCurves so the
 * merge function can swap sources transparently. Polls every 30 s.
 */
export interface IndexerCurve {
  curveAddress: `0x${string}`;
  tokenAddress: `0x${string}`;
  owner: `0x${string}`;
  name: string;
  symbol: string;
  curveSupply: bigint;
  graduationSrxThreshold: bigint;
  blockNumber: bigint;
  txHash: `0x${string}`;
  isGraduated: boolean;
  imageUrl: string | null;
  description: string | null;
}

export function useIndexerCurves(): {
  curves: IndexerCurve[];
  isLoading: boolean;
} {
  const [curves, setCurves] = useState<IndexerCurve[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const d = await fetchJson<{
          tokens: Array<{
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
            image_url: string | null;
            description: string | null;
          }>;
        }>(`/api/cb/tokens?limit=100`);
        if (cancelled) return;
        setCurves(
          (d.tokens ?? []).map((t) => ({
            curveAddress: t.curve_address as `0x${string}`,
            tokenAddress: t.token_address as `0x${string}`,
            owner: t.owner_address as `0x${string}`,
            name: t.name,
            symbol: t.symbol,
            curveSupply: BigInt(t.curve_supply),
            graduationSrxThreshold: BigInt(t.graduation_threshold),
            blockNumber: BigInt(t.created_block),
            txHash: t.created_tx_hash as `0x${string}`,
            isGraduated: t.is_graduated,
            imageUrl: t.image_url,
            description: t.description,
          })),
        );
      } catch {
        /* keep stale */
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { curves, isLoading };
}
