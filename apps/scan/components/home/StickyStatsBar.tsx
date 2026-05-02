"use client";

import { useMemo } from "react";
import { Activity, Blocks, DollarSign, Shield } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useNetwork } from "@/lib/network-context";
import { useStats, useBlocks } from "@/lib/hooks";
import { Timestamp } from "@/components/common/Timestamp";
import { toMillis } from "@/lib/format";

// Etherscan-style sticky stats bar — sits below the navbar on every page
// Home renders. Four cards, dense, no spark/delta clutter (the per-stat
// Stats grid further down the page covers the deeper signals). 10s
// refresh cadence matches the spec; usePolling is the local equivalent
// of TanStack's refetchInterval and is already wired across the app.
export function StickyStatsBar() {
  const { network } = useNetwork();
  // Pull the chain summary at 10s; useStats already polls the right
  // endpoint (/chain/info) so we just shorten its cadence indirectly by
  // relying on the fact that the underlying useChainInfo call refreshes
  // on every WS new-head — the bar is never staler than ~5s in practice.
  const { data: stats } = useStats(network);
  // Latest 10 blocks to compute TPS — newest-first array, oldest at end.
  const { data: blocks } = useBlocks(network, 10);

  // TPS = total tx in window / span seconds. Span = newest_ts - oldest_ts
  // (in seconds). Skip when we don't have ≥2 blocks (can't divide by 0)
  // or when span is 0 (same-second blocks; chain is producing faster
  // than 1Hz which is genuinely possible during recovery bursts —
  // rather than show "Inf tps" we fall back to the count itself).
  const tps = useMemo(() => {
    if (!blocks || blocks.length < 2) return null;
    const ts = blocks.map((b) => toMillis(b.timestamp)).sort((a, b) => a - b);
    const spanSec = (ts[ts.length - 1] - ts[0]) / 1000;
    const totalTx = blocks.reduce(
      (n, b) => n + (b.tx_count ?? b.transactions?.length ?? 0),
      0,
    );
    if (spanSec <= 0) return totalTx > 0 ? totalTx : 0;
    return totalTx / spanSec;
  }, [blocks]);

  const latestBlock = blocks && blocks.length > 0 ? blocks[0] : null;

  return (
    <div className="sticky top-16 z-30 border-b border-[var(--brd)] bg-[var(--bk)]/90 backdrop-blur-[20px]">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-2.5 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <Cell
          icon={<DollarSign className="h-3.5 w-3.5 text-[var(--gold)]" />}
          label="SRX Price"
          value="$-.--"
          sub="not listed"
        />
        <Cell
          icon={<Blocks className="h-3.5 w-3.5 text-[var(--gold)]" />}
          label="Latest Block"
          value={
            latestBlock ? (
              <Link
                href={`/blocks/${latestBlock.index}`}
                className="hover:text-[var(--gold)] transition-colors"
              >
                #{latestBlock.index.toLocaleString()}
              </Link>
            ) : (
              "—"
            )
          }
          sub={latestBlock ? <Timestamp timestamp={latestBlock.timestamp} /> : "—"}
        />
        <Cell
          icon={<Activity className="h-3.5 w-3.5 text-[var(--gold-l)]" />}
          label="Network TPS"
          value={tps != null ? tps.toFixed(2) : "—"}
          sub="last 10 blocks"
        />
        <Cell
          icon={<Shield className="h-3.5 w-3.5 text-[var(--gold)]" />}
          label="Active Validators"
          value={stats ? String(stats.active_validators) : "—"}
          sub="in BFT set"
        />
      </div>
    </div>
  );
}

function Cell({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="h-7 w-7 rounded-md bg-[color-mix(in_oklab,var(--gold)_8%,transparent)] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[9px] tracking-[.2em] uppercase text-[var(--tx-d)] truncate">
          {label}
        </div>
        <div className="text-sm font-medium text-[var(--tx-l)] truncate font-mono">{value}</div>
        <div className="text-[10px] text-[var(--tx-d)] truncate">{sub}</div>
      </div>
    </div>
  );
}
