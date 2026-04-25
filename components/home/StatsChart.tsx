"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Activity } from "lucide-react";
import type { ChainPerformance } from "@/lib/api";

type Range = "1m" | "5m" | "15m" | "1h" | "24h";

// DECISION: chart + TPS readouts consume the backend /chain/performance endpoint directly —
// no more client-side bucketing. Backend returns time-series `points[]` with tps,
// block_time_sec, block_count, tx_count per interval. We just render it.
export function StatsChart({ performance, range, onRangeChange, loading }: {
  performance: ChainPerformance | null;
  range: Range;
  onRangeChange: (r: Range) => void;
  loading?: boolean;
}) {
  const points = performance?.points ?? [];

  const data = useMemo(() => points.map((p) => ({
    t: formatBucketLabel(p.timestamp),
    tps: p.tps,
  })), [points]);

  const peak = performance?.peak_tps ?? 0;
  const avg = performance?.avg_tps ?? 0;
  const current = points.length ? points[points.length - 1].tps : 0;
  const hasSignal = points.some((p) => p.tps > 0);

  // Idle signal: if the newest bucket is older than the selected window, the chain paused.
  const lastBucketAge = useMemo(() => {
    if (points.length === 0) return null;
    const newest = points.reduce((m, p) => Math.max(m, p.timestamp), 0);
    return Math.floor(Date.now() / 1000 - newest);
  }, [points]);

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3 flex-wrap">
        <CardTitle className="flex items-center gap-3">
          <TrendingUp className="h-4 w-4 text-[var(--gold)]" />
          <span className="font-mono text-[10px] tracking-[.22em] uppercase text-[var(--tx-d)]">
            Transactions Per Second
          </span>
          <span className="hidden sm:inline text-[11px] text-muted-foreground font-mono">
            now <span className="text-[var(--gold)]">{current.toFixed(2)}</span> · peak{" "}
            <span className="text-[var(--tx-m)]">{peak.toFixed(2)}</span> · avg{" "}
            <span className="text-[var(--tx-m)]">{avg.toFixed(2)}</span>
          </span>
        </CardTitle>
        <div className="flex items-center gap-1">
          {(["1m", "5m", "15m", "1h", "24h"] as const).map((r) => (
            <button
              key={r}
              onClick={() => onRangeChange(r)}
              className={`text-[10px] px-2.5 py-1 rounded-md border transition-colors uppercase tracking-[.1em] ${
                range === r
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {loading && !performance ? (
          <div className="h-48 flex items-center justify-center">
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        ) : !hasSignal ? (
          <div className="h-48 flex flex-col items-center justify-center text-center gap-2 border border-dashed border-[var(--brd)] rounded-lg bg-[color-mix(in_oklab,var(--muted)_30%,transparent)]">
            <Activity className="h-6 w-6 text-muted-foreground/40" />
            {lastBucketAge !== null && lastBucketAge > 120 ? (
              <>
                <p className="text-sm text-[var(--orange)] font-medium">Chain appears idle</p>
                <p className="text-xs text-muted-foreground font-mono">
                  Last activity {formatAge(lastBucketAge)}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">No throughput in the last {range}</p>
                <p className="text-xs text-muted-foreground/70 font-mono">
                  Backend reported 0 tx across all buckets in this window.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height={192} minWidth={0}>
              <AreaChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id="tps-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.45} />
                    <stop offset="60%" stopColor="var(--gold)" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
                  </linearGradient>
                  <filter id="tps-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--brd)" strokeDasharray="3 6" />
                <XAxis dataKey="t" fontSize={10} stroke="var(--tx-d)" tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis
                  fontSize={10}
                  stroke="var(--tx-d)"
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  allowDecimals={peak < 2}
                  tickFormatter={(v: number) => (peak < 2 ? v.toFixed(1) : Math.round(v).toString())}
                />
                <Tooltip
                  cursor={{ stroke: "var(--gold)", strokeOpacity: 0.3, strokeWidth: 1 }}
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--brd)", borderRadius: 10, fontSize: 12 }}
                  formatter={(value) => [`${Number(value).toFixed(2)} tps`, "TPS"]}
                />
                <Area
                  type="monotone"
                  dataKey="tps"
                  stroke="var(--gold)"
                  strokeWidth={2.5}
                  fill="url(#tps-grad)"
                  filter="url(#tps-glow)"
                  dot={{ r: 2.5, fill: "var(--gold)", stroke: "var(--bk)", strokeWidth: 1.5 }}
                  activeDot={{ r: 5, fill: "var(--gold)", stroke: "var(--bk)", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatBucketLabel(unixSec: number): string {
  const d = new Date(unixSec * 1000);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatAge(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`;
  const m = seconds / 60;
  if (m < 60) return `${Math.round(m)}m ago`;
  const h = m / 60;
  if (h < 24) return `${h.toFixed(1)}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
