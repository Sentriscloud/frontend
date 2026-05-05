"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNetwork } from "@/lib/network-context";
import { useDailyStats } from "@/lib/hooks";

// All-time TX-per-day line chart. Used to read the chain's `/stats/daily`
// which capped at 14 days; after 2026-05-05 the endpoint moved onto the
// Postgres indexer and now returns the full chain history. We render it
// as-is — no client-side window cap — so the chart grows with the chain.
// As coverage gets long the X-axis density gets dense; recharts handles
// label collision, but we may want to add a range toggle (7d/30d/all)
// once the chain has months of history.
const ACCENT = "#10B981"; // emerald-500

interface DataPoint {
  date: string;       // raw ISO date (e.g. "2026-04-29")
  short: string;      // "29 Apr"
  transactions: number;
}

function shortDate(iso: string): string {
  // The backend hands ISO `YYYY-MM-DD`. Render as "29 Apr" — keep two
  // digits for the day so the x-axis lines up across months. Fallback
  // to the raw string on parse failure (defensive — backend is
  // authoritative, but the chart should never crash on bad data).
  const d = new Date(`${iso}T00:00:00Z`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function TxChart14d() {
  const { network } = useNetwork();
  const { data, loading } = useDailyStats(network);

  const points: DataPoint[] = useMemo(() => {
    if (!data) return [];
    // Sort ascending by date — backend already returns ordered, but defensive
    // since the chart's X-axis assumes left-to-right oldest-to-newest.
    return [...data]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        date: d.date,
        short: shortDate(d.date),
        transactions: d.transactions,
      }));
  }, [data]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Transactions per day</CardTitle>
      </CardHeader>
      <CardContent className="p-2 md:p-4">
        {loading && !data ? (
          <Skeleton className="h-64 w-full" />
        ) : points.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
            No data yet — chain may still be priming.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--brd)" vertical={false} />
              <XAxis
                dataKey="short"
                stroke="var(--tx-d)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--tx-m)" }}
              />
              <YAxis
                stroke="var(--tx-d)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--tx-m)" }}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--bk)",
                  border: "1px solid var(--brd)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "var(--tx-m)" }}
                itemStyle={{ color: ACCENT }}
                formatter={(value) => {
                  const n = typeof value === "number" ? value : Number(value);
                  return [
                    `${Number.isFinite(n) ? n.toLocaleString() : "—"} transactions`,
                    "",
                  ];
                }}
                labelFormatter={(_label, payload) => {
                  const iso = payload?.[0]?.payload?.date as string | undefined;
                  return iso ?? String(_label ?? "");
                }}
              />
              <Line
                type="monotone"
                dataKey="transactions"
                stroke={ACCENT}
                strokeWidth={2}
                dot={{ fill: ACCENT, r: 3 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
