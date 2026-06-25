"use client";

import type { ChainInfo, EpochInfo, ChainStatus } from "@/lib/api";
import { formatSRX } from "@/lib/format";

interface LiveTickerProps {
  stats: ChainInfo | null;
  blockTime: string;
  network: "mainnet" | "testnet";
  epoch?: EpochInfo | null;
  status?: ChainStatus | null;
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const m = seconds / 60;
  if (m < 60) return `${Math.floor(m)}m`;
  const h = m / 60;
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

// DECISION: Etherscan/Solscan keep a thin "live" strip above the hero showing the numbers
// that matter most — block height, tx pulse, gas/block time. One horizontal scroll-safe
// rail of mono key/value pairs. Draws the eye before the big serif title.
export function LiveTicker({ stats, blockTime, network, epoch, status }: LiveTickerProps) {
  const epochProgress = epoch && epoch.end_height > epoch.start_height && stats
    ? Math.min(100, Math.max(0, ((stats.height - epoch.start_height) / (epoch.end_height - epoch.start_height)) * 100))
    : null;

  const items = [
    { label: "Chain", value: network === "mainnet" ? "MAINNET" : "TESTNET", color: network === "mainnet" ? "text-[var(--green)]" : "text-[var(--orange)]" },
    { label: "Block", value: stats ? `#${stats.height.toLocaleString()}` : "—" },
    { label: "Block Time", value: blockTime },
    { label: "Epoch", value: epoch ? `${epoch.epoch_number}${epochProgress !== null ? ` · ${epochProgress.toFixed(0)}%` : ""}` : "—" },
    { label: "Validators", value: stats ? String(stats.active_validators) : "—" },
    { label: "Mempool", value: stats ? `${stats.mempool_size} tx` : "—" },
    { label: "Circulating", value: stats ? formatSRX(stats.total_minted_srx) : "—" },
    { label: "Tokens", value: stats ? String(stats.deployed_tokens) : "—" },
    { label: "Reward", value: stats ? `${stats.next_block_reward_srx} SRX` : "—" },
    { label: "Node uptime", value: status ? formatUptime(status.uptime_seconds) : "—" },
  ];

  // Single static rail. Used to be a marquee with two duplicated copies for
  // a seamless scroll, but on viewports wider than the row's natural width
  // — and for users with `prefers-reduced-motion: reduce` — both copies
  // showed at once and read as a literal duplicate. Static + horizontal
  // scroll on overflow is fine; the values themselves are live (5s poll).
  return (
    <div className="border-b border-[var(--brd)] bg-[color-mix(in_oklab,var(--card)_40%,transparent)] backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-2.5 overflow-x-auto">
        <div className="flex items-center gap-5 text-[11px] whitespace-nowrap min-w-fit">
          <span className="inline-flex items-center gap-1.5 shrink-0">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                network === "mainnet" ? "bg-[var(--green)]" : "bg-[var(--orange)]"
              } animate-pulse-live`}
            />
            <span className="font-mono uppercase tracking-[.15em] text-[var(--tx-d)]">Live</span>
          </span>
          {items.map((it, i) => (
            <div key={`${it.label}-${i}`} className="flex items-center gap-1.5 shrink-0">
              {i > 0 && <span className="w-px h-3 bg-[var(--brd)]" />}
              <span className="font-mono uppercase tracking-[.12em] text-[var(--tx-d)] text-[10px]">
                {it.label}
              </span>
              <span
                className={`font-mono font-medium tabular-nums ${it.color ?? "text-[var(--tx-m)]"}`}
              >
                {it.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
