"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Link } from "@/i18n/navigation";
import { Blocks, ArrowUpDown, Search, Clock, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { RailBadge, classifyRail, type Rail } from "@/components/common/RailBadge";
import { FetchError } from "@/components/common/FetchError";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCardSkeleton } from "@/components/common/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { Address } from "@/components/common/Address";
import { TxHash } from "@/components/common/TxHash";
import { BlockHeight } from "@/components/common/BlockHeight";
import { Timestamp } from "@/components/common/Timestamp";
import { StatCard } from "@/components/common/StatCard";
import { LiveTicker } from "@/components/home/LiveTicker";
import { TxChart14d } from "@/components/home/TxChart14d";
import { FreshnessChip } from "@/components/common/FreshnessChip";
import { useNetwork, useNetworkFromQuery } from "@/lib/network-context";
import { useStats, useBlocks, useTransactions, useChainPerformance, useMempool, useCurrentEpoch } from "@/lib/hooks";
import { useLatestBlock, useLatestFinalized } from "@/lib/ws";
import { formatNumber, formatSRX, toMillis } from "@/lib/format";
import { validateAndResolveSearch } from "@/lib/search-validate";
import type { ChainPerformance, HomeBundle } from "@/lib/api";

// DECISION: lazy-load StatsChart to keep Home bundle below the 500 kB gzipped target.
// Chart is below the fold on most viewports — OK to defer.
const StatsChart = dynamic(() => import("@/components/home/StatsChart").then((m) => m.StatsChart), {
  ssr: false,
  loading: () => <Skeleton className="h-72 w-full" />,
});

// DECISION: API sends block_timestamp as unix seconds (10-digit number). `toMillis` normalizes
// to ms first. Average = span / (N-1) across the window — works even at second precision
// because the sum of integer-second diffs equals the true span.
const CHAIN_TARGET_BLOCK_TIME = "~0.5s";
function computeBlockTime(timestamps: Array<string | number>): string {
  if (timestamps.length < 2) return CHAIN_TARGET_BLOCK_TIME;
  const ms = timestamps.map(toMillis).sort((a, b) => b - a);
  const spanMs = ms[0] - ms[ms.length - 1];
  const avgMs = spanMs / (ms.length - 1);
  if (!isFinite(avgMs) || avgMs <= 0) return CHAIN_TARGET_BLOCK_TIME;
  if (avgMs < 1000) return `${avgMs.toFixed(0)}ms`;
  const s = avgMs / 1000;
  return s < 10 ? `${s.toFixed(1)}s` : `${Math.round(s)}s`;
}

function formatBurnedSrx(amount: number): string {
  if (!isFinite(amount)) return "— SRX";
  if (amount === 0) return "0.0000 SRX";
  if (amount < 1) return `${amount.toFixed(4)} SRX`;
  if (amount < 1000) return `${amount.toFixed(2)} SRX`;
  if (amount < 1_000_000) return `${(amount / 1000).toFixed(2)}K SRX`;
  return `${(amount / 1_000_000).toFixed(2)}M SRX`;
}

function estimateTotalTransactions(
  totalBlocks: number | undefined,
  blocks: { transactions?: unknown[]; tx_count?: number }[] | null,
): string {
  if (!totalBlocks) return "—";
  if (!blocks || blocks.length === 0) return formatNumber(totalBlocks);
  const txs = blocks.reduce((n, b) => n + (b.tx_count ?? b.transactions?.length ?? 0), 0);
  const avg = txs / blocks.length;
  if (avg <= 0) return formatNumber(totalBlocks);
  return formatNumber(Math.round(totalBlocks * avg));
}

// DECISION: `initial` carries the SSR-fetched bundle so the first render shows real numbers
// instead of skeletons. Polling hooks pick it up via their `initial` arg, then keep refreshing
// at their normal cadence. Anything missing from the bundle (timeout / null) falls back to
// the regular skeleton-then-data path.
export function HomeContent({ initial }: { initial: HomeBundle }) {
  const t = useTranslations("home");
  const { network } = useNetwork();
  // Honour `?network=mainnet|testnet` deeplinks on the home page too —
  // without this, https://scan.sentrixchain.com/?network=testnet would
  // render mainnet because the cookie never flips.
  useNetworkFromQuery();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [perfRange, setPerfRange] = useState<"1m" | "5m" | "15m" | "1h" | "24h">("1h");
  // Rail filter for the Latest Transactions card. "all" shows everything;
  // every other value runs the row through classifyRail() and only renders
  // matching txs. EVM and Native are the two an end-user gets confused by
  // most often (sent SRX → didn't show up under EVM scan, etc.) so they
  // get top billing in the pill row.
  const [railFilter, setRailFilter] = useState<"all" | Rail>("all");
  const { data: stats, loading: statsLoading, error: statsError, refetch: refetchStats, retry: retryStats } = useStats(network, initial.stats);
  const { data: blocks, loading: blocksLoading, refetch: refetchBlocks } = useBlocks(network, 10, initial.blocks);
  const { data: txs, loading: txsLoading, error: txsError, refetch: refetchTxs, retry: retryTxs } = useTransactions(network, 10, initial.txs);
  // Live block height via WebSocket. newHeads (proposed) + sentrix_finalized
  // (BFT-supermajority sealed) — both fed in so the UI can show the proposer
  // tip + the canonical finality cursor as separate values. Each new head
  // also nudges the REST hooks to refetch immediately so the list views
  // stay fresh without waiting for the 5s poll cycle.
  const wsHead = useLatestBlock(network);
  const wsFinalized = useLatestFinalized(network);
  useEffect(() => {
    if (!wsHead) return;
    refetchStats();
    refetchBlocks();
    refetchTxs();
    // Intentionally tracking only wsHead.number, not the wsHead object —
    // the WS hook returns a fresh object reference per block but we
    // only want to refetch when the block height changes. Adding the
    // whole wsHead object would refetch on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsHead?.number, refetchStats, refetchBlocks, refetchTxs]);
  const liveHeight = Math.max(stats?.height ?? 0, wsHead?.number ?? 0);
  // Lag between proposer tip and BFT-finalized cursor. 0 = chain is finalising
  // every block as it lands; > 0 = BFT is several blocks behind production
  // (typical during round-skip livelock recovery).
  const finalityLag =
    wsFinalized != null && liveHeight > 0
      ? Math.max(0, liveHeight - wsFinalized)
      : null;
  const { data: performance, loading: perfLoading } = useChainPerformance(network, perfRange, initial.performance);
  const { data: mempool } = useMempool(network, initial.mempool);
  const { data: epoch } = useCurrentEpoch(network, initial.epoch);

  const latestPerf = performance?.points?.[performance.points.length - 1];
  // Show the actual recent block cadence from the latest blocks. The
  // chain-performance bucket average is windowed (range-dependent) and gets
  // inflated by past stalls: it read ~1.8s on a 1h bucket while testnet was
  // genuinely producing ~0.5s blocks. Fall back to the perf value, then the
  // target, only when we don't have enough blocks to measure.
  const blockTime = blocks && blocks.length >= 2
    ? computeBlockTime(blocks.map((b) => b.timestamp as unknown as number | string))
    : latestPerf?.block_time_sec
      ? `${latestPerf.block_time_sec.toFixed(1)}s`
      : CHAIN_TARGET_BLOCK_TIME;
  const totalTxValue = stats?.total_transactions != null
    ? formatNumber(stats.total_transactions)
    : estimateTotalTransactions(stats?.total_blocks, blocks);

  const tpsSpark = performance?.points?.map((p) => p.tps) ?? [];
  const blockTimeSpark = performance?.points?.map((p) => p.block_time_sec) ?? [];
  const txCountSpark = performance?.points?.map((p) => p.tx_count) ?? [];

  // Etherscan-style delta % computed across the spark window (first vs last
  // point). We only show it when the window is statistically honest:
  //   - need ≥ 6 samples (anything shorter shows wild jumps on a single block)
  //   - both endpoints non-zero (avoid divide-by-near-zero amplification)
  //   - |delta| ≤ 200% (above that the denominator was tiny — noise, not signal,
  //     e.g. TPS rising from 0.05 → 0.4 reports +700% which reads as catastrophic
  //     even though the chain just woke up from idle)
  // Returns null when any guard trips → StatCard hides the chip cleanly.
  function pctDelta(arr: number[], minBase = 0): number | null {
    if (arr.length < 6) return null;
    const a = arr[0];
    const b = arr[arr.length - 1];
    if (!Number.isFinite(a) || !Number.isFinite(b) || a === 0 || b === 0) return null;
    if (Math.abs(a) < minBase) return null;
    const pct = ((b - a) / Math.abs(a)) * 100;
    if (Math.abs(pct) > 200) return null;
    return pct;
  }
  // Minimum base 0.5 tps for TPS — below that the percent swings on noise,
  // not a real load shift.
  const tpsDelta = pctDelta(tpsSpark, 0.5);
  // Block time delta is hidden: StatCard colours negative red / positive
  // green, but block-time getting smaller is *good* (closer to the 1s
  // target). The earlier `-blockTimeDelta` workaround flipped the sign
  // so the colour read right, but the rendered percent was then
  // mathematically nonsense ("-450%" on a value going up). Cleanest
  // answer is to hide the chip until StatCard learns an inverse-delta
  // mode; the "target 1s" subline gives users the context they need.
  const blockTimeDelta: number | null = null;
  void blockTimeSpark;
  // Total Transactions card shows a cumulative counter — a window-relative
  // percent on cumulative data reads as if the chain "lost" txs. Hide it.
  // Re-enable once we wire a tx-per-window metric (different field).
  const txCountDelta: number | null = null;
  void txCountSpark;

  // Freshness — every successful poll bumps `lastFetched`. The chip ticks
  // every second, so users can watch the data age.
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  useEffect(() => {
    if (stats || blocks || txs) setLastFetched(Date.now());
  }, [stats, blocks, txs]);

  // DECISION: Date.now() drifts between SSR and CSR; computing this on the server triggers
  // React hydration error #418. Idle detection runs client-side only — null on first render,
  // then a useEffect recomputes after mount and every 5s.
  const [latestBlockAgeSec, setLatestBlockAgeSec] = useState<number | null>(null);
  useEffect(() => {
    function recompute() {
      if (!blocks || blocks.length === 0) return setLatestBlockAgeSec(null);
      const newest = Math.max(...blocks.map((b) => toMillis(b.timestamp)));
      setLatestBlockAgeSec(Math.floor((Date.now() - newest) / 1000));
    }
    recompute();
    const id = setInterval(recompute, 5_000);
    return () => clearInterval(id);
  }, [blocks]);
  const isChainIdle = latestBlockAgeSec !== null && latestBlockAgeSec > 120;

  // 2026-05-03 incident: when the upstream RPC is fully down (Caddy returns 503
  // because no validator is healthy), the data hooks never resolve so `blocks`
  // stays empty and `latestBlockAgeSec` stays null forever. The "chain paused"
  // banner only fires when we *know* the age, so the desktop home rendered all
  // dashes silently — users couldn't tell whether the explorer was broken or
  // the chain was down. This grace-period flag flips on after 10s of mount with
  // no data of any shape, and shows an explicit "unreachable" banner instead.
  const [chainUnreachable, setChainUnreachable] = useState(false);
  useEffect(() => {
    const haveAnyData = !!stats || (!!blocks && blocks.length > 0) || (!!txs && txs.length > 0);
    if (haveAnyData) {
      setChainUnreachable(false);
      return;
    }
    const id = setTimeout(() => setChainUnreachable(true), 10_000);
    return () => clearTimeout(id);
  }, [stats, blocks, txs]);
  const liveTps = isChainIdle
    ? "Idle"
    : latestPerf
      ? `${latestPerf.tps.toFixed(2)} tps`
      : "—";
  const tpsAccent = isChainIdle ? "var(--orange)" : "var(--gold)";

  // Hero search now goes through validateAndResolveSearch — same path as
  // the global header form. Without this, pasting a testnet tx hash on
  // a mainnet-cookie browser routed to /tx/<hash> with no ?network= and
  // forced the user to click the cross-probe "Switch to Testnet" button
  // on the detail page. Now the resolver runs the cross-network probe
  // upfront, the URL carries ?network= when the hit is on the other
  // chain, and the toast tells the user what just happened.
  const [searching, setSearching] = useState(false);
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q || searching) return;
    setSearching(true);
    try {
      const result = await validateAndResolveSearch(network, q);
      if (result.kind === "not_found") {
        toast.error(result.reason);
        return;
      }
      if (result.onNetwork !== network) {
        toast.success(
          `Found on ${result.onNetwork === "mainnet" ? "Mainnet" : "Testnet"} — switching network.`,
        );
      }
      router.push(result.href as Parameters<typeof router.push>[0]);
      setQuery("");
    } catch (err) {
      toast.error("Search failed — try again");
      console.error("home search failure", err);
    } finally {
      setSearching(false);
    }
  }

  return (
    <>
      <LiveTicker stats={stats} blockTime={blockTime} network={network} epoch={epoch} />
      {(isChainIdle || chainUnreachable) && (
        <div role="alert" className="border-y-2 border-[var(--orange)]/60 bg-[color-mix(in_oklab,var(--orange)_16%,transparent)]">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-3 flex items-center gap-3 text-[13px]">
            <AlertTriangle className="h-4 w-4 text-[var(--orange)] shrink-0" />
            <span className="font-mono uppercase tracking-[.15em] text-[var(--orange)] font-semibold shrink-0">
              {chainUnreachable ? "RPC offline" : `${network === "testnet" ? "Testnet" : "Chain"} paused`}
            </span>
            <span className="font-mono text-[var(--foreground)]">
              {chainUnreachable
                ? "Couldn't reach the chain RPC — retrying. Operators are aware."
                : latestBlockAgeSec !== null
                  ? `Last block ${latestBlockAgeSec < 3600 ? `${Math.round(latestBlockAgeSec / 60)} minutes` : `${(latestBlockAgeSec / 3600).toFixed(1)} hours`} ago — validator may be offline.`
                  : "Validator may be offline."}
            </span>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-10 animate-fade-in">
      {/* Title rail — flush-left wordmark + status eyebrow on the left, search rail on the
          right. Per sentris-design: explorer is dense, not sparse — the prior centered
          72px hero pushed live data below the fold and read as a marketing site instead of
          a tool. Editorial Playfair voice retained at a tool-appropriate scale. */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-6 lg:gap-12 items-end">
        <div className="anim-hero-1 opacity-0 space-y-2.5 min-w-0">
          <div className="flex items-center gap-2.5">
            <span className={`w-1.5 h-1.5 rounded-full ${network === "mainnet" ? "bg-[var(--green)]" : "bg-[var(--orange)]"} animate-pulse-live`} />
            <span className="eyebrow">
              {network === "mainnet" ? "Mainnet" : "Testnet"} · Chain ID {network === "mainnet" ? "7119" : "7120"}
            </span>
          </div>
          <h1 className="font-serif text-[clamp(32px,4.2vw,52px)] font-light leading-[.92] tracking-[.04em] text-[var(--gold)]">
            {t("title_prefix").toUpperCase()}
            <span className="text-[var(--gold-l)] font-normal"> {t("title_suffix").toUpperCase()}</span>
          </h1>
        </div>

        <form onSubmit={handleSearch} className="anim-hero-2 opacity-0 w-full lg:ml-auto lg:max-w-xl">
          <div className="relative">
            {searching ? (
              <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--gold)] animate-spin" />
            ) : (
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--tx-d)]" />
            )}
            <input
              type="text"
              placeholder={t("search_placeholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={searching}
              className="w-full h-12 pl-11 pr-24 text-[13px] tracking-[.02em] bg-[color-mix(in_oklab,var(--foreground)_3%,transparent)] border border-[var(--brd)] rounded-full focus:outline-none focus:border-[var(--gold)] focus:bg-[color-mix(in_oklab,var(--gold)_3%,transparent)] transition-all placeholder:text-[var(--tx-d)] disabled:opacity-60"
            />
            <kbd className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[var(--tx-d)] border border-[var(--brd)] rounded px-1.5 py-0.5">
              ⌘K
            </kbd>
          </div>
        </form>
      </div>

      {/* Stats — 2×4 editorial grid. Row 1 = performance / live signals; Row 2 = chain state. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
        {statsLoading && !stats ? (
          Array.from({ length: 8 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            {/* Row 1 — live performance. Delta % is computed over the
                selected perf range so the chip changes meaning when the user
                flips between 1m/5m/15m/1h/24h. */}
            <StatCard
              label={t("stats.tps")}
              value={liveTps}
              loading={!blocks}
              accent={tpsAccent}
              spark={isChainIdle ? undefined : tpsSpark}
              delta={isChainIdle ? null : tpsDelta}
              subline={isChainIdle ? undefined : t("stats.subline_window", { range: perfRange })}
              title={isChainIdle && latestBlockAgeSec !== null ? `Chain paused — last block ${latestBlockAgeSec < 3600 ? `${Math.round(latestBlockAgeSec / 60)}m` : `${(latestBlockAgeSec / 3600).toFixed(1)}h`} ago` : undefined}
            />
            <StatCard
              label={t("stats.block_height")}
              value={liveHeight > 0 ? liveHeight.toLocaleString() : "—"}
              loading={statsLoading && liveHeight === 0}
              accent="var(--gold)"
              subline={
                finalityLag === 0
                  ? t("stats.subline_bft_live")
                  : finalityLag != null
                    ? t("stats.subline_bft_lag", { lag: finalityLag })
                    : (stats ? t("stats.subline_epoch", { n: epoch?.epoch_number ?? "—" }) : undefined)
              }
              title={
                wsFinalized != null
                  ? `Tip ${liveHeight.toLocaleString()} / Finalized ${wsFinalized.toLocaleString()}`
                  : undefined
              }
            />
            <StatCard
              label={t("stats.block_time")}
              value={isChainIdle ? "—" : blockTime}
              loading={!blocks}
              accent={isChainIdle ? "var(--orange)" : "var(--gold-l)"}
              spark={isChainIdle ? undefined : blockTimeSpark}
              // No sign flip — `+15%` on block time is just "blocks took 15%
              // longer over the window." Reading negative-as-bad on a
              // strictly positive duration metric was confusing users.
              delta={isChainIdle ? null : blockTimeDelta}
              subline={t("stats.subline_target_1s")}
              title={isChainIdle ? "Chain paused — block time stale" : undefined}
            />
            <StatCard
              label={t("stats.total_transactions")}
              value={totalTxValue}
              loading={statsLoading && !blocks}
              accent="var(--gold-d)"
              spark={isChainIdle ? undefined : txCountSpark}
              delta={isChainIdle ? null : txCountDelta}
            />
            {/* Row 2 — chain state. Sublines teach what each number means
                (Solana foundation explorer pattern: "92.1% is circulating"). */}
            <StatCard
              label={t("stats.active_validators")}
              value={stats ? String(stats.active_validators) : "—"}
              loading={statsLoading}
              error={statsError}
              onRetry={retryStats}
              accent="var(--gold)"
              subline={t("stats.subline_active_bft")}
            />
            <StatCard
              label={t("stats.tokens_deployed")}
              value={stats ? String(stats.deployed_tokens) : "—"}
              loading={statsLoading}
              error={statsError}
              onRetry={retryStats}
              accent="var(--gold-l)"
              subline={t("stats.subline_src20_contracts")}
            />
            <StatCard
              label={t("stats.total_burned")}
              value={stats ? formatBurnedSrx(stats.total_burned_srx) : "—"}
              title={stats ? `${stats.total_burned_srx.toLocaleString(undefined, { maximumFractionDigits: 8 })} SRX` : undefined}
              loading={statsLoading}
              error={statsError}
              onRetry={retryStats}
              accent="var(--red)"
              subline={t("stats.subline_fee_burn")}
            />
            <StatCard
              label={t("stats.block_reward")}
              value={stats ? `${stats.next_block_reward_srx} SRX` : "—"}
              loading={statsLoading}
              error={statsError}
              onRetry={retryStats}
              accent="var(--gold)"
              subline={t("stats.subline_claimable")}
            />
          </>
        )}
      </div>

      {/* Latest blocks + transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Blocks */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2">
                <Blocks className="h-4 w-4 text-primary" />
                {t("latest_blocks")}
              </CardTitle>
              <div className="flex items-center gap-3">
                <FreshnessChip updatedAt={lastFetched} />
                <Link href="/blocks" className="text-xs text-primary hover:underline">{t("view_all")}</Link>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-0 p-0">
            {blocksLoading && !blocks ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" style={{ opacity: 1 - i * 0.08 }} />)}
              </div>
            ) : blocks && blocks.length > 0 ? (
              <div className="divide-y divide-border/60">
                {blocks.slice(0, 10).map((block) => (
                  <div key={block.index} className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <Blocks className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <BlockHeight height={block.index} prefix="#" className="text-sm" />
                        <p className="text-[11px] text-muted-foreground">
                          <Timestamp timestamp={block.timestamp} />
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 min-w-0">
                      <p className="text-[11px] text-muted-foreground">{block.tx_count ?? block.transactions?.length ?? 0} txs</p>
                      <div className="text-[11px] font-mono truncate">
                        {block.validator_name ? (
                          <Address address={block.validator} label={block.validator_name} muted showCopy={false} />
                        ) : (
                          <Address address={block.validator} muted showCopy={false} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <Blocks className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t("no_blocks")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Latest Transactions */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-primary" />
                {t("latest_transactions")}
              </CardTitle>
              <div className="flex items-center gap-3">
                <FreshnessChip updatedAt={lastFetched} />
                <Link href="/blocks" className="text-xs text-primary hover:underline">{t("view_all")}</Link>
              </div>
            </div>
            {/* Rail filter pills — Sentrix runs EVM + native side-by-side, so a
                user looking at the feed needs to know which rail each tx is on
                AND be able to narrow to one. EVM and Native get pole position
                because they're the two that confuse newcomers most. */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 -mb-1">
              {(
                [
                  { key: "all", label: "All" },
                  { key: "evm", label: "EVM" },
                  { key: "native", label: "Native" },
                  { key: "token", label: "SRC-20" },
                  { key: "stake", label: "Staking" },
                ] as const
              ).map((p) => {
                const active = railFilter === p.key;
                return (
                  <button
                    key={p.key}
                    onClick={() => setRailFilter(p.key)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-transparent text-muted-foreground border-border/60 hover:text-foreground hover:border-border"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </CardHeader>
          <CardContent className="space-y-0 p-0">
            {txsLoading && !txs ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" style={{ opacity: 1 - i * 0.08 }} />)}
              </div>
            ) : txsError ? (
              <FetchError onRetry={retryTxs} />
            ) : txs && txs.length > 0 ? (
              (() => {
                // Apply rail filter. classifyRail wants {to_address, data}, our
                // TransactionData has {to, input_data} — adapt at the call site.
                const filtered =
                  railFilter === "all"
                    ? txs
                    : txs.filter(
                        (tx) =>
                          classifyRail({ to_address: tx.to, data: tx.input_data }) === railFilter,
                      );
                if (filtered.length === 0) {
                  return (
                    <div className="p-12 text-center">
                      <ArrowUpDown className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No {railFilter} transactions in the latest {txs.length}.
                      </p>
                    </div>
                  );
                }
                return (
                  <div className="divide-y divide-border/60">
                    {filtered.map((tx) => {
                      const success = tx.status !== "failed";
                      const rail = classifyRail({ to_address: tx.to, data: tx.input_data });
                      return (
                        <div key={tx.id} className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${success ? "bg-green-500/10" : "bg-red-500/10"}`}>
                              <ArrowUpDown className={`h-3.5 w-3.5 ${success ? "text-green-500" : "text-red-500"}`} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <TxHash hash={tx.id} />
                                <RailBadge rail={rail} size="sm" />
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                <Timestamp timestamp={tx.timestamp} />
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0 min-w-0">
                            <div className="text-[11px] font-mono truncate">
                              <Address address={tx.from} muted showCopy={false} />
                            </div>
                            <p className="text-xs font-semibold font-mono">{tx.amount} SRX</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            ) : (
              <div className="p-12 text-center">
                <ArrowUpDown className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t("no_transactions")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SRX Supply progress — shows circulating / max with Playfair percent + thin bar */}
      {stats && (
        <Card>
          <CardContent className="p-6 md:p-8">
            <div className="flex items-end justify-between gap-4 mb-4 flex-wrap">
              <div className="min-w-0">
                <p className="eyebrow mb-2">Supply in Circulation</p>
                <div className="flex items-baseline gap-3">
                  <span className="font-serif font-light leading-none" style={{ fontSize: "clamp(30px, 4vw, 52px)" }}>
                    {((stats.total_minted_srx / stats.max_supply_srx) * 100).toFixed(2)}
                    <em className="not-italic text-[0.6em] ml-1 text-[var(--gold)]">%</em>
                  </span>
                  <span className="font-mono text-xs text-[var(--tx-m)]">
                    {formatSRX(stats.total_minted_srx)} of {formatNumber(stats.max_supply_srx)} SRX
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-[11px] font-mono text-[var(--tx-d)] uppercase tracking-[.15em]">
                <span>Burned <span className="text-[var(--red)]">{stats.total_burned_srx.toFixed(4)}</span></span>
                <span>Next Reward <span className="text-[var(--gold)]">{stats.next_block_reward_srx} SRX</span></span>
              </div>
            </div>
            <div className="relative h-1.5 w-full rounded-full bg-[color-mix(in_oklab,var(--foreground)_6%,transparent)] overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-[var(--gold)] to-[var(--gold-l)] rounded-full"
                style={{ width: `${Math.min(100, (stats.total_minted_srx / stats.max_supply_srx) * 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* TPS chart — fed by backend /chain/performance */}
      <StatsChart
        performance={performance as ChainPerformance | null}
        range={perfRange}
        onRangeChange={setPerfRange}
        loading={perfLoading}
      />

      {/* Mempool — one-line pulse card, matches the editorial rhythm without stealing the eye */}
      <Card>
        <CardContent className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`w-2 h-2 rounded-full shrink-0 ${mempool && mempool.size > 0 ? "bg-[var(--orange)] animate-pulse-live" : "bg-[var(--green)]"}`} />
            <Clock className="h-4 w-4 text-[var(--tx-d)] shrink-0" />
            <span className="font-mono text-[10px] tracking-[.22em] uppercase text-[var(--tx-d)] shrink-0">Mempool</span>
            <span className="font-serif text-lg leading-none">
              {mempool ? mempool.size : "—"}
            </span>
            <span className="font-mono text-[11px] text-[var(--tx-m)]">
              {mempool && mempool.size === 1 ? "pending tx" : "pending txs"}
            </span>
          </div>
          <span className="font-mono text-[10px] text-[var(--tx-d)] tracking-[.12em] uppercase">
            {mempool && mempool.size === 0 ? "clear" : "awaiting inclusion"}
          </span>
        </CardContent>
      </Card>

      {/* TX-per-day, last 14 days. Backed by `/stats/daily` (5-min
          server cache, so the 5-min poll cadence on the hook is the
          right alignment). Emerald accent per spec — distinct from the
          gold/orange palette the rest of the home page uses. */}
      <TxChart14d />

      </div>
    </>
  );
}
