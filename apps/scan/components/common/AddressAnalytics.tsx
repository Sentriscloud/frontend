"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/EmptyState";
import { BarChart3 } from "lucide-react";
import type { TransactionData } from "@/lib/api";

interface AddressAnalyticsProps {
  /** Address transaction history. Already-paginated data is fine — we
   *  bucket whatever's loaded. The histogram density follows the loaded
   *  page; deeper history paginates as the user scrolls the All-Txns
   *  tab and lands here. */
  history: TransactionData[] | null;
  /** Used to label charts contextually. Not embedded into URLs. */
  address: string;
}

interface DayBucket {
  day: string;
  inbound: number;
  outbound: number;
  total: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Etherscan address Analytics tab is two charts: tx-count-over-time + balance-
// over-time. Balance-over-time needs `eth_getBalance` at historical block
// heights — Sentrix node binary doesn't yet expose that depth, so we ship
// just the histogram for now. When archive RPC lands, swap the placeholder
// out for a real balance chart in the same tab without UX disruption.
export function AddressAnalytics({ history, address }: AddressAnalyticsProps) {
  const buckets: DayBucket[] = useMemo(() => {
    if (!history || history.length === 0) return [];
    const byDay = new Map<string, DayBucket>();
    const lowAddr = address.toLowerCase();
    for (const tx of history) {
      const ts = typeof tx.timestamp === "string" ? Number(tx.timestamp) : Number(tx.timestamp);
      if (!Number.isFinite(ts)) continue;
      // Sentrix timestamps are seconds. Anything past 2_000_000_000_000 is
      // already millis (older indexer field shape) — branch defensively.
      const ms = ts > 2_000_000_000_000 ? ts : ts * 1000;
      const day = new Date(ms).toISOString().slice(0, 10);
      const isOutbound = tx.from?.toLowerCase() === lowAddr;
      const cur = byDay.get(day) ?? { day, inbound: 0, outbound: 0, total: 0 };
      if (isOutbound) cur.outbound += 1;
      else cur.inbound += 1;
      cur.total += 1;
      byDay.set(day, cur);
    }
    // Sort ascending by day so the chart reads left=old, right=new.
    return Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day));
  }, [history, address]);

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={BarChart3}
            title="No activity to chart yet"
            hint="Transactions will populate this view once the address has any inbound or outbound activity."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Transactions per day
            <span className="ml-auto text-[10px] font-mono text-muted-foreground tracking-[.15em] uppercase">
              {buckets.length} day{buckets.length === 1 ? "" : "s"} loaded
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pt-0 pb-4">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={buckets} barCategoryGap={6}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="day"
                stroke="var(--tx-d)"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                tickFormatter={(d: string) => d.slice(5)}
              />
              <YAxis
                stroke="var(--tx-d)"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                allowDecimals={false}
                width={28}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--bg)",
                  border: "1px solid var(--brd)",
                  borderRadius: 6,
                  fontSize: 12,
                }}
                cursor={{ fill: "rgba(200,168,74,0.05)" }}
                labelFormatter={(label) => String(label)}
                formatter={(value, name) => [
                  value as number,
                  name === "inbound" ? "Inbound" : name === "outbound" ? "Outbound" : "Total",
                ]}
              />
              <Bar dataKey="inbound" stackId="x" fill="rgba(46,196,182,0.65)" />
              <Bar dataKey="outbound" stackId="x" fill="rgba(200,168,74,0.65)" />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 px-3 pt-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-sm" style={{ background: "rgba(46,196,182,0.65)" }} />
              Inbound
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-sm" style={{ background: "rgba(200,168,74,0.65)" }} />
              Outbound
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-2">
          <p className="text-[11px] font-mono uppercase tracking-[.18em] text-muted-foreground">
            Balance over time
          </p>
          <p className="text-sm text-muted-foreground">
            Sentrix node binary doesn&apos;t yet expose archival{" "}
            <code className="font-mono text-xs">eth_getBalance</code> at historical block
            heights. When that RPC lands, this card will populate with a balance-history
            line chart automatically.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
