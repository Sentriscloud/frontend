"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Users, CheckCircle, XCircle, AlertTriangle, ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Address } from "@/components/common/Address";
import { Pagination } from "@/components/common/Pagination";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { useNetwork } from "@/lib/network-context";
import { useValidators } from "@/lib/hooks";
import { formatNumber } from "@/lib/format";

type SortKey = "blocks" | "stake" | "uptime" | "none";
type StatusFilter = "all" | "active" | "inactive" | "jailed";

const PAGE_SIZE = 25;

function StatusIcon({ status }: { status?: string }) {
  if (status === "jailed") return <AlertTriangle className="h-4 w-4 text-orange-500" />;
  if (status === "inactive") return <XCircle className="h-4 w-4 text-red-500" />;
  return <CheckCircle className="h-4 w-4 text-green-500" />;
}

export default function ValidatorsPage() {
  const t = useTranslations("validators");
  const { network } = useNetwork();
  const { data: validators, loading } = useValidators(network);
  const [sortKey, setSortKey] = useState<SortKey>("none");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);

  // Summary stats
  const summary = useMemo(() => {
    if (!validators) return { active: 0, inactive: 0, jailed: 0, totalStake: 0 };
    return validators.reduce(
      (acc, v) => {
        const s = v.status ?? "active";
        if (s === "active") acc.active += 1;
        else if (s === "inactive") acc.inactive += 1;
        else if (s === "jailed") acc.jailed += 1;
        acc.totalStake += v.stake ?? 0;
        return acc;
      },
      { active: 0, inactive: 0, jailed: 0, totalStake: 0 },
    );
  }, [validators]);

  const filtered = useMemo(() => {
    if (!validators) return [];
    const f = statusFilter === "all"
      ? validators
      : validators.filter((v) => (v.status ?? "active") === statusFilter);
    if (sortKey === "none") return f;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...f].sort((a, b) => {
      const av = (sortKey === "blocks" ? a.blocks_produced : sortKey === "stake" ? a.stake : a.uptime) ?? 0;
      const bv = (sortKey === "blocks" ? b.blocks_produced : sortKey === "stake" ? b.stake : b.uptime) ?? 0;
      return (av - bv) * dir;
    });
  }, [validators, sortKey, sortDir, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function SortHeader({ label, k, align = "right" }: { label: string; k: SortKey; align?: "left" | "right" }) {
    const active = sortKey === k;
    return (
      <button
        onClick={() => toggleSort(k)}
        className={`inline-flex items-center gap-1 text-xs font-medium hover:text-foreground ${active ? "text-foreground" : "text-muted-foreground"} ${align === "right" ? "justify-end w-full" : ""}`}
      >
        {label}
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      </button>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
      <PageHeader
        icon={Users}
        title={t("title")}
        actions={
          validators ? (
            <span className="text-xs px-2 py-1 rounded-md bg-muted/60 border border-border text-muted-foreground font-mono">
              {t("total", { count: validators.length })}
            </span>
          ) : null
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label={t("total_staked")} value={`${formatNumber(summary.totalStake)} SRX`} accent="var(--gold)" />
        <StatCard label={t("active")}       value={String(summary.active)}                   accent="var(--green)" />
        <StatCard label={t("inactive")}     value={String(summary.inactive)}                 accent="var(--red)" />
        <StatCard label={t("jailed")}       value={String(summary.jailed)}                   accent="var(--orange)" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-sm text-muted-foreground font-normal">
              {network === "mainnet" ? "Chain ID 7119 (Mainnet)" : "Chain ID 7120 (Testnet)"}
            </CardTitle>
            <div className="flex items-center gap-1">
              {(["all", "active", "inactive", "jailed"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={`text-xs px-2.5 py-1 rounded-md border capitalize transition-colors ${
                    statusFilter === s
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading && !validators ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : paged.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground bg-muted/30">
                      <th className="px-4 py-2.5 font-medium w-10">#</th>
                      <th className="px-4 py-2.5 font-medium">{t("validator")}</th>
                      <th className="px-4 py-2.5 font-medium">{t("status")}</th>
                      <th className="px-4 py-2.5 font-medium text-right"><SortHeader label={t("blocks")} k="blocks" /></th>
                      <th className="px-4 py-2.5 font-medium text-right hidden md:table-cell"><SortHeader label={t("stake")} k="stake" /></th>
                      <th className="px-4 py-2.5 font-medium text-right hidden md:table-cell">{t("commission")}</th>
                      <th className="px-4 py-2.5 font-medium text-right hidden lg:table-cell"><SortHeader label={t("uptime")} k="uptime" /></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 row-hover">
                    {paged.map((v, i) => (
                      <tr key={v.address}>
                        <td className="px-4 py-2.5 text-muted-foreground">{(page - 1) * PAGE_SIZE + i + 1}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-col gap-0.5">
                            {v.name && (
                              <Link href={`/validators/${v.address}`} className="font-medium text-sm text-primary hover:underline">
                                {v.name}
                              </Link>
                            )}
                            <Address address={v.address} muted className="text-xs" />
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <StatusIcon status={v.status} />
                            <span className="text-xs capitalize">{v.status || "active"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">
                          {v.blocks_produced !== undefined ? formatNumber(v.blocks_produced) : "-"}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono hidden md:table-cell">
                          {v.stake !== undefined ? `${formatNumber(v.stake)} SRX` : "-"}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono hidden md:table-cell text-muted-foreground">
                          {v.commission !== undefined ? `${v.commission}%` : "-"}
                        </td>
                        <td className="px-4 py-2.5 text-right hidden lg:table-cell">
                          {v.uptime !== undefined ? (
                            <span className={`font-mono ${v.uptime >= 99 ? "text-green-500" : v.uptime >= 95 ? "text-yellow-500" : "text-red-500"}`}>
                              {v.uptime.toFixed(1)}%
                            </span>
                          ) : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered.length > PAGE_SIZE && (
                <div className="border-t border-border">
                  <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {t("no_validators")}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
