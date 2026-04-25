"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChainPerformance } from "@/lib/api";

interface Props {
  perf: ChainPerformance | null;
  daily: Array<{ date: string; blocks: number; transactions: number }> | null;
  validatorShare: Array<{ name: string; blocks: number; share: number }>;
}

// DECISION: all area charts share the same visual style — 2.5px stroke, filled gradient (25%→0%),
// visible dots at each data point (2.5r), soft glow on hover dot, dashed horizontal grid.
// Makes the line feel confident without looking like noise.
export function AnalyticsCharts({ perf, daily }: Props) {
  const tpsSeries = (perf?.points ?? []).map((p) => ({
    t: formatTime(p.timestamp),
    tps: p.tps,
    blockTime: p.block_time_sec,
  }));

  const dailySeries = (daily ?? []).map((d) => ({
    date: d.date,
    blocks: d.blocks,
    transactions: d.transactions,
  }));
  // Backend /stats/daily currently only returns today's bucket (historical = 0). Rather than
  // rendering 13 empty bars and one spike, flag whether we have meaningful multi-day coverage.
  const hasMultiDayData = dailySeries.filter((d) => d.blocks > 0 || d.transactions > 0).length >= 2;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="eyebrow">TPS · last 24h</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0 h-64">
          {tpsSeries.length === 0 ? (
            <EmptyChart text="No throughput data in the selected window." />
          ) : (
            <ResponsiveContainer width="100%" height={240} minWidth={0}>
              <AreaChart data={tpsSeries} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id="a-tps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.45} />
                    <stop offset="60%" stopColor="var(--gold)" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
                  </linearGradient>
                  <filter id="a-glow-gold" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--brd)" strokeDasharray="3 6" />
                <XAxis dataKey="t" fontSize={10} stroke="var(--tx-d)" tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis fontSize={10} stroke="var(--tx-d)" tickLine={false} axisLine={false} width={36} />
                <Tooltip
                  cursor={{ stroke: "var(--gold)", strokeOpacity: 0.3, strokeWidth: 1 }}
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--brd)", borderRadius: 10, fontSize: 12, backdropFilter: "blur(8px)" }}
                  formatter={(value) => [`${Number(value).toFixed(2)} tps`, "TPS"]}
                />
                <Area
                  type="monotone"
                  dataKey="tps"
                  stroke="var(--gold)"
                  strokeWidth={2.5}
                  fill="url(#a-tps)"
                  filter="url(#a-glow-gold)"
                  dot={{ r: 2.5, fill: "var(--gold)", stroke: "var(--bk)", strokeWidth: 1.5 }}
                  activeDot={{ r: 5, fill: "var(--gold)", stroke: "var(--bk)", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="eyebrow">Block Time · last 24h</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0 h-64">
          {tpsSeries.length === 0 ? (
            <EmptyChart text="No block time data available." />
          ) : (
            <ResponsiveContainer width="100%" height={240} minWidth={0}>
              <AreaChart data={tpsSeries} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id="a-bt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--cyan)" stopOpacity={0.45} />
                    <stop offset="60%" stopColor="var(--cyan)" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="var(--cyan)" stopOpacity={0} />
                  </linearGradient>
                  <filter id="a-glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--brd)" strokeDasharray="3 6" />
                <XAxis dataKey="t" fontSize={10} stroke="var(--tx-d)" tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis fontSize={10} stroke="var(--tx-d)" tickLine={false} axisLine={false} width={36} />
                <Tooltip
                  cursor={{ stroke: "var(--cyan)", strokeOpacity: 0.3, strokeWidth: 1 }}
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--brd)", borderRadius: 10, fontSize: 12 }}
                  formatter={(value) => [`${Number(value).toFixed(2)}s`, "Block Time"]}
                />
                <Area
                  type="monotone"
                  dataKey="blockTime"
                  stroke="var(--cyan)"
                  strokeWidth={2.5}
                  fill="url(#a-bt)"
                  filter="url(#a-glow-cyan)"
                  dot={{ r: 2.5, fill: "var(--cyan)", stroke: "var(--bk)", strokeWidth: 1.5 }}
                  activeDot={{ r: 5, fill: "var(--cyan)", stroke: "var(--bk)", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="pb-2"><CardTitle className="eyebrow">Blocks & Transactions · last 14 days</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0 h-72">
          {dailySeries.length === 0 ? (
            <EmptyChart text="No daily data available yet." />
          ) : !hasMultiDayData ? (
            <EmptyChart text="Historical daily aggregates pending — only today's bucket is populated on the backend right now." />
          ) : (
            <ResponsiveContainer width="100%" height={272} minWidth={0}>
              <BarChart data={dailySeries} margin={{ top: 12, right: 12, left: 0, bottom: 4 }} barGap={4}>
                <defs>
                  <linearGradient id="a-bar-blocks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--gold)" stopOpacity={1} />
                    <stop offset="100%" stopColor="var(--gold)" stopOpacity={0.5} />
                  </linearGradient>
                  <linearGradient id="a-bar-tx" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--purple)" stopOpacity={1} />
                    <stop offset="100%" stopColor="var(--purple)" stopOpacity={0.5} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--brd)" strokeDasharray="3 6" />
                <XAxis dataKey="date" fontSize={10} stroke="var(--tx-d)" tickLine={false} axisLine={false} />
                <YAxis fontSize={10} stroke="var(--tx-d)" tickLine={false} axisLine={false} width={40} />
                <Tooltip
                  cursor={{ fill: "var(--gold)", fillOpacity: 0.05 }}
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--brd)", borderRadius: 10, fontSize: 12 }}
                />
                <Bar dataKey="blocks" fill="url(#a-bar-blocks)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="transactions" fill="url(#a-bar-tx)" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatTime(unixSec: number): string {
  const d = new Date(unixSec * 1000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="h-full flex items-center justify-center border border-dashed border-[var(--brd)] rounded-lg bg-[color-mix(in_oklab,var(--muted)_30%,transparent)]">
      <p className="text-xs text-muted-foreground font-mono">{text}</p>
    </div>
  );
}
