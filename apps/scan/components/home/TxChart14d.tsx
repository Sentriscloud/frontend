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

// 14-day TX-per-day line chart. Used to read straight from the chain's
// `/stats/daily` (which always returned 14 entries, zero-padded). After
// 2026-05-05 we moved the endpoint onto the Postgres indexer — the
// indexer returns ALL days that exist in its DB (ranges from 1 row on
// a fresh deploy to all-time once backfill catches up). Pad client-side
// to a fixed 14-day window ending today so the chart shape stays stable
// regardless of how much history the indexer has materialised yet.
const ACCENT = "#10B981"; // emerald-500
const WINDOW_DAYS = 14;

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
    // Index whatever the indexer gave us by ISO date string.
    const byDate = new Map((data ?? []).map((d) => [d.date, d]));
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const out: DataPoint[] = [];
    for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setUTCDate(today.getUTCDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const row = byDate.get(iso);
      out.push({
        date: iso,
        short: shortDate(iso),
        transactions: row?.transactions ?? 0,
      });
    }
    return out;
  }, [data]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Transactions — last 14 days</CardTitle>
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
