"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { BarChart3, Activity, Users, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { useNetwork } from "@/lib/network-context";
import { useStats, useChainPerformance, useValidators } from "@/lib/hooks";
import { formatNumber, formatSRX } from "@/lib/format";
import { fetchDailyStats } from "@/lib/api";
import { useEffect, useState } from "react";

// Lazy-load Recharts to keep initial bundle small. Analytics page pulls several charts.
const AnalyticsCharts = dynamic(() => import("./charts").then((m) => m.AnalyticsCharts), {
  ssr: false,
  loading: () => <Skeleton className="h-80 w-full" />,
});

// DECISION: Analytics lives on its own route so home stays tight and this page owns the
// "dashboard view" — a Solscan-style surface with day/week charts, validator distribution,
// and supply flow. Backend already ships /stats/daily + /chain/performance + /validators,
// so no new API work is needed to light this up.
export default function AnalyticsPage() {
  const { network } = useNetwork();
  const { data: stats, loading: statsLoading } = useStats(network);
  const { data: perf } = useChainPerformance(network, "24h");
  const { data: validators } = useValidators(network);
  const [daily, setDaily] = useState<Array<{ date: string; blocks: number; transactions: number }> | null>(null);

  useEffect(() => {
    fetchDailyStats(network).then(setDaily);
  }, [network]);

  const totalValidators = validators?.length ?? 0;
  const activeValidators = validators?.filter((v) => v.is_active !== false).length ?? 0;

  const last7 = useMemo(() => (daily ?? []).slice(-7), [daily]);
  const txWeek = last7.reduce((s, d) => s + d.transactions, 0);
  const blocksWeek = last7.reduce((s, d) => s + d.blocks, 0);

  // Validator share = each validator's blocks_produced / total. Used for the distribution chart.
  const validatorShare = useMemo(() => {
    if (!validators || validators.length === 0) return [];
    const total = validators.reduce((s, v) => s + (v.blocks_produced ?? 0), 0) || 1;
    return validators
      .map((v) => ({
        name: v.name || v.address.slice(0, 8),
        blocks: v.blocks_produced ?? 0,
        share: ((v.blocks_produced ?? 0) / total) * 100,
      }))
      .sort((a, b) => b.blocks - a.blocks);
  }, [validators]);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 space-y-6 animate-fade-in">
      <PageHeader icon={BarChart3} eyebrow="Analytics" title="Network Analytics" />

      {/* Headline stats — one row showing chain health at a glance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
        <StatCard
          label="Blocks (7d)"
          value={daily ? formatNumber(blocksWeek) : "—"}
          loading={!daily}
          accent="var(--cyan)"
        />
        <StatCard
          label="Transactions (7d)"
          value={daily ? formatNumber(txWeek) : "—"}
          loading={!daily}
          accent="var(--blue)"
        />
        <StatCard
          label="Active Validators"
          value={validators ? `${activeValidators} / ${totalValidators}` : "—"}
          accent="var(--purple)"
        />
        <StatCard
          label="Total Burned"
          value={stats ? formatSRX(stats.total_burned_srx) : "—"}
          loading={statsLoading}
          accent="var(--red)"
        />
      </div>

      {/* Charts */}
      {!perf && !daily ? (
        <Card>
          <CardContent>
            <EmptyState icon={Activity} title="Loading analytics…" hint="Gathering daily activity and performance data." />
          </CardContent>
        </Card>
      ) : (
        <AnalyticsCharts perf={perf} daily={daily} validatorShare={validatorShare} />
      )}

      {/* Validator distribution detail */}
      {validatorShare.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="eyebrow">Validator Block Distribution</CardTitle></CardHeader>
          <CardContent className="px-6 py-0">
            {validatorShare.map((v) => (
              <div key={v.name} className="flex items-center gap-4 py-3 border-b border-border/60 last:border-b-0">
                <div className="flex items-center gap-2 w-48 shrink-0">
                  <Users className="h-3.5 w-3.5 text-[var(--purple)]" />
                  <span className="text-sm font-medium truncate">{v.name}</span>
                </div>
                <div className="flex-1 h-2 rounded-full bg-[color-mix(in_oklab,var(--foreground)_5%,transparent)] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[var(--gold)] to-[var(--gold-l)] rounded-full"
                    style={{ width: `${Math.min(100, v.share)}%` }}
                  />
                </div>
                <div className="w-28 text-right font-mono tabular-nums text-xs text-muted-foreground">
                  {formatNumber(v.blocks)} · <span className="text-[var(--gold)]">{v.share.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Supply flow footer card */}
      {stats && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="eyebrow">Supply Flow</CardTitle></CardHeader>
          <CardContent className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <SupplyStat label="Minted" value={formatSRX(stats.total_minted_srx)} icon={Flame} color="var(--green)" />
            <SupplyStat label="Burned" value={formatSRX(stats.total_burned_srx)} icon={Flame} color="var(--red)" />
            <SupplyStat label="Circulating" value={formatSRX(stats.total_minted_srx - stats.total_burned_srx)} icon={Activity} color="var(--gold)" />
            <SupplyStat label="Supply Cap" value={`${formatNumber(210_000_000)} SRX`} icon={Users} color="var(--tx-d)" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SupplyStat({ label, value, icon: Icon, color }: { label: string; value: string; icon: typeof Flame; color: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3" style={{ color }} />
        <span className="eyebrow">{label}</span>
      </div>
      <div className="font-serif text-2xl leading-none" style={{ color }}>{value}</div>
    </div>
  );
}
