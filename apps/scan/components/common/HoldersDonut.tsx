"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Address } from "./Address";
import { DetailCard } from "./DetailCard";
import type { TokenHolder } from "@/lib/api";

interface HoldersDonutProps {
  holders: TokenHolder[] | null;
  symbol?: string;
}

// Top-N holders donut + a side legend with the same colour-coded ranks.
// Top 5 are charted individually; everyone else collapses into "Others"
// so the chart stays readable even when a token has thousands of holders.
// Pattern lifted from solscan / blockscout v8 token detail.
//
// We render nothing while holders is null — caller's surrounding
// loading-state handles the skeleton — and a tiny prompt when the list is
// empty (rare on a deployed token but possible for fresh deploys).

const PALETTE = [
  "var(--gold)",
  "var(--gold-l)",
  "var(--cyan)",
  "var(--purple)",
  "var(--green)",
  "var(--tx-d)",
];

export function HoldersDonut({ holders, symbol }: HoldersDonutProps) {
  const slices = useMemo(() => {
    if (!holders || holders.length === 0) return [];
    const sorted = [...holders].sort((a, b) => b.share - a.share);
    const top = sorted.slice(0, 5);
    const restShare = sorted.slice(5).reduce((s, h) => s + h.share, 0);
    const out = top.map((h) => ({
      name: h.address,
      value: Math.max(h.share, 0.0001),
      raw: h,
    }));
    if (restShare > 0.0001 && sorted.length > 5) {
      out.push({
        name: "Others",
        value: restShare,
        raw: { address: "Others", balance: 0, share: restShare },
      });
    }
    return out;
  }, [holders]);

  if (!holders || holders.length === 0) {
    return (
      <DetailCard title="Top holders distribution">
        <p className="py-4 text-sm text-muted-foreground">
          No holders recorded yet.
        </p>
      </DetailCard>
    );
  }

  return (
    <DetailCard title="Top holders distribution">
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 py-4 items-center">
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                innerRadius="55%"
                outerRadius="95%"
                stroke="var(--brd)"
                strokeWidth={1}
                isAnimationActive={false}
              >
                {slices.map((s, i) => (
                  <Cell key={s.name} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--brd)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v) => [`${Number(v).toFixed(2)}%`, ""]}
                labelFormatter={(l) => {
                  const s = String(l ?? "");
                  return s.length > 16 ? `${s.slice(0, 8)}…${s.slice(-6)}` : s;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="space-y-1.5 text-xs">
          {slices.map((s, i) => (
            <li key={s.name} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-sm shrink-0"
                style={{ background: PALETTE[i % PALETTE.length] }}
              />
              <span className="flex-1 min-w-0">
                {s.name === "Others" ? (
                  <span className="text-muted-foreground">Others ({(holders?.length ?? 0) - 5} accounts)</span>
                ) : (
                  <Address address={s.name} muted showCopy={false} className="text-xs" />
                )}
              </span>
              <span className="font-mono text-[var(--tx-m)]">{s.value.toFixed(2)}%</span>
            </li>
          ))}
        </ul>
      </div>
      {symbol && (
        <p className="text-[10px] font-mono text-[var(--tx-d)] uppercase tracking-[.15em] pt-2 border-t border-border/40">
          Distribution of {symbol} supply across the top holders + everyone else combined.
        </p>
      )}
    </DetailCard>
  );
}
