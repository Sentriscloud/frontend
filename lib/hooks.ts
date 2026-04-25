"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { NetworkId } from "./chain";
import { FetchStatus } from "./fetch-status";
import {
  fetchChainInfo, fetchLatestBlocks, fetchLatestTransactions,
  fetchBlock, fetchTransaction, fetchAccountBalance,
  fetchAccountHistory, fetchValidators, fetchTokens,
  fetchRichlist, fetchTokenHolders, fetchTokenTrades,
  fetchChainPerformance,
  fetchAccountTokens, fetchValidatorRewards, fetchValidatorBlocksOverTime,
  fetchValidatorDelegators, fetchMempool, fetchCurrentEpoch, fetchChainStatus,
  fetchEventLogs,
  type ChainInfo, type BlockData, type TransactionData,
  type ValidatorData, type AccountBalance, type TokenData,
  type TopHolder, type TokenHolder, type TokenTransfer,
  type ChainPerformance,
  type AccountTokenHolding, type ValidatorReward, type ValidatorBlocksPoint,
  type ValidatorDelegator, type MempoolSnapshot, type EpochInfo, type ChainStatus,
  type EventLog,
} from "./api";

interface UsePollingReturn<T> {
  data: T | null;
  loading: boolean;
  error: boolean;
  status: FetchStatus;
  lastUpdated: number | null;
  refetch: () => Promise<void>;
  retry: () => Promise<void>;
}

// DECISION: Enhanced usePolling with FetchStatus state machine, request deduplication via in-flight ref,
// and exponential backoff on consecutive failures (base interval × 2^failures, capped at 60s).
function usePolling<T>(
  fetcher: () => Promise<T | null>,
  interval: number,
  deps: unknown[] = [],
  initialData: T | null = null,
): UsePollingReturn<T> {
  const [data, setData] = useState<T | null>(initialData);
  const [status, setStatus] = useState<FetchStatus>(initialData != null ? FetchStatus.Fetched : FetchStatus.Idle);
  const [lastUpdated, setLastUpdated] = useState<number | null>(initialData != null ? Date.now() : null);
  const inFlight = useRef(false);
  const failures = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // DECISION: track whether the initial render already consumed `initialData`. On the first
  // mount we want to skip the immediate refetch (the server-rendered values are fresh), but
  // any subsequent dep change (e.g. user toggles network) must clear and refetch.
  const skipFirstRefetch = useRef(initialData != null);

  const refetch = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setStatus((prev) => (prev === FetchStatus.Fetched ? FetchStatus.Fetched : FetchStatus.Fetching));
    try {
      const result = await fetcher();
      if (result !== null) {
        setData(result);
        setStatus(FetchStatus.Fetched);
        setLastUpdated(Date.now());
        failures.current = 0;
      } else {
        failures.current += 1;
        setStatus(FetchStatus.FetchFailed);
      }
    } catch {
      failures.current += 1;
      setStatus(FetchStatus.FetchFailed);
    } finally {
      inFlight.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const retry = useCallback(async () => {
    failures.current = 0;
    await refetch();
  }, [refetch]);

  useEffect(() => {
    // DECISION: when deps (e.g. network) change, clear stale data so the UI shows skeletons
    // instead of last-network values while the new fetch is in flight. On the very first mount
    // with SSR-provided initialData we keep the data and skip the immediate refetch — the
    // server values are fresh enough; the first poll fires after the normal interval.
    if (skipFirstRefetch.current) {
      skipFirstRefetch.current = false;
    } else {
      setData(null);
      setStatus(FetchStatus.Fetching);
    }
    failures.current = 0;
    // DECISION: small 0-80ms jitter on initial fetch. Enough to desync mount bursts across
    // ~10 hooks (avoids identical request timestamps) without visibly delaying first paint.
    // Prior value of 0-400ms was insurance for the backend rate-limit flood; that flood was
    // resolved server-side and the initial burst now fits well under the 60 req/min cap.
    const initialJitter = Math.floor(Math.random() * 80);
    const jitterTimer = data != null && status === FetchStatus.Fetched
      ? null
      : setTimeout(() => { refetch(); }, initialJitter);

    function reschedule() {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (interval <= 0) return;
      const backoff = Math.min(60_000, interval * Math.pow(2, failures.current));
      timerRef.current = setTimeout(async () => {
        await refetch();
        reschedule();
      }, backoff);
    }
    reschedule();

    // DECISION: Chrome aggressively throttles setTimeout in hidden tabs (down to ~1 fire/min).
    // After switching back, the next poll can be many seconds behind. On visibility change to
    // "visible", refetch immediately and reset the schedule so the user sees fresh data without
    // having to hit reload — was a real symptom (UI "frozen" until refresh).
    function onVisibility() {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        refetch();
        reschedule();
      }
    }
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      if (jitterTimer) clearTimeout(jitterTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetch, interval]);

  return {
    data,
    loading: status === FetchStatus.Idle || (status === FetchStatus.Fetching && data === null),
    error: status === FetchStatus.FetchFailed && data === null,
    status,
    lastUpdated,
    refetch,
    retry,
  };
}

// DECISION: backend rate-limit = 60 req/min per IP. Hot home hooks (stats, blocks, txs) poll
// every 5 s — at 0.5 s testnet block time the previous 10 s cadence felt frozen ("harus
// refresh baru angkanya berubah"). 4 hot hooks × 12/min = 48 req/min, plus mempool@10 s,
// perf@10 s, epoch@30 s, status@30 s ≈ 56 req/min total — fits the bucket with headroom.
// Anything cooler stays at 15-30 s.
export function useStats(network: NetworkId, initial: ChainInfo | null = null) {
  return usePolling<ChainInfo>(
    () => fetchChainInfo(network),
    5000,
    [network],
    initial,
  );
}

export function useBlocks(network: NetworkId, count = 10, initial: BlockData[] | null = null) {
  return usePolling<BlockData[]>(
    () => fetchLatestBlocks(network, count),
    5000,
    [network, count],
    initial,
  );
}

export function useBlock(network: NetworkId, height: number) {
  return usePolling<BlockData>(
    () => fetchBlock(network, height),
    0,
    [network, height]
  );
}

export function useTransactions(network: NetworkId, count = 10, initial: TransactionData[] | null = null) {
  return usePolling<TransactionData[]>(
    () => fetchLatestTransactions(network, count),
    5000,
    [network, count],
    initial,
  );
}

export function useTransaction(network: NetworkId, hash: string) {
  return usePolling<TransactionData>(
    () => fetchTransaction(network, hash),
    0,
    [network, hash]
  );
}

export function useAddress(network: NetworkId, address: string) {
  return usePolling<AccountBalance>(
    () => fetchAccountBalance(network, address),
    10000,
    [network, address]
  );
}

export function useAddressHistory(network: NetworkId, address: string, page = 1) {
  return usePolling<TransactionData[]>(
    () => fetchAccountHistory(network, address, page),
    0,
    [network, address, page]
  );
}

export function useValidators(network: NetworkId) {
  return usePolling<ValidatorData[]>(
    () => fetchValidators(network),
    15000,
    [network]
  );
}

export function useTokens(network: NetworkId) {
  return usePolling<TokenData[]>(
    () => fetchTokens(network),
    30000,
    [network]
  );
}

export function useRichlist(network: NetworkId, limit = 100) {
  return usePolling<TopHolder[]>(
    () => fetchRichlist(network, limit),
    30000,
    [network, limit],
  );
}

export function useTokenHolders(network: NetworkId, contract: string, limit = 50) {
  return usePolling<TokenHolder[]>(
    () => fetchTokenHolders(network, contract, limit),
    30000,
    [network, contract, limit],
  );
}

export function useChainPerformance(
  network: NetworkId,
  range: "1m" | "5m" | "15m" | "1h" | "24h" = "1h",
  initial: ChainPerformance | null = null,
) {
  return usePolling<ChainPerformance>(
    () => fetchChainPerformance(network, range),
    10000,
    [network, range],
    initial,
  );
}

export function useAccountTokens(network: NetworkId, address: string) {
  return usePolling<AccountTokenHolding[]>(
    () => fetchAccountTokens(network, address),
    30000,
    [network, address],
  );
}

export function useValidatorRewards(network: NetworkId, address: string, page = 1) {
  return usePolling<{ rewards: ValidatorReward[]; hasMore: boolean }>(
    () => fetchValidatorRewards(network, address, page),
    15000,
    [network, address, page],
  );
}

export function useValidatorBlocksOverTime(network: NetworkId, address: string, range: "1h" | "24h" | "7d" = "1h") {
  return usePolling<ValidatorBlocksPoint[]>(
    () => fetchValidatorBlocksOverTime(network, address, range),
    15000,
    [network, address, range],
  );
}

export function useValidatorDelegators(network: NetworkId, address: string) {
  return usePolling<{ delegators: ValidatorDelegator[]; total: number; total_srx: number }>(
    () => fetchValidatorDelegators(network, address),
    30000,
    [network, address],
  );
}

export function useMempool(network: NetworkId, initial: MempoolSnapshot | null = null) {
  return usePolling<MempoolSnapshot>(
    () => fetchMempool(network),
    5000,
    [network],
    initial,
  );
}

export function useCurrentEpoch(network: NetworkId, initial: EpochInfo | null = null) {
  return usePolling<EpochInfo>(
    () => fetchCurrentEpoch(network),
    30000,
    [network],
    initial,
  );
}

export function useChainStatus(network: NetworkId, initial: ChainStatus | null = null) {
  return usePolling<ChainStatus>(
    () => fetchChainStatus(network),
    30000,
    [network],
    initial,
  );
}

export function useEventLogs(network: NetworkId, address: string, enabled = true) {
  return usePolling<EventLog[]>(
    () => (enabled ? fetchEventLogs(network, address) : Promise.resolve([])),
    30000,
    [network, address, enabled],
  );
}

export function useTokenTrades(network: NetworkId, contract: string, page = 1, limit = 20) {
  return usePolling<TokenTransfer[]>(
    () => fetchTokenTrades(network, contract, page, limit),
    15000,
    [network, contract, page, limit],
  );
}
