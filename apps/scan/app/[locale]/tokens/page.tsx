"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Coins, ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Copyable } from "@/components/common/Copyable";
import { Pagination } from "@/components/common/Pagination";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { useNetwork } from "@/lib/network-context";
import { useTokens } from "@/lib/hooks";
import { formatNumber, shortenAddress } from "@/lib/format";

type SortKey = "supply" | "holders" | "transfers" | "none";
const PAGE_SIZE = 25;

export default function TokensPage() {
  const t = useTranslations("tokens");
  const { network } = useNetwork();
  const { data: tokens, loading } = useTokens(network);
  const [sortKey, setSortKey] = useState<SortKey>("none");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    if (!tokens) return [];
    if (sortKey === "none") return tokens;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...tokens].sort((a, b) => {
      const av = (sortKey === "supply" ? a.total_supply : sortKey === "holders" ? a.holders : a.transfers) ?? 0;
      const bv = (sortKey === "supply" ? b.total_supply : sortKey === "holders" ? b.holders : b.transfers) ?? 0;
      return (av - bv) * dir;
    });
  }, [tokens, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("desc"); }
  }

  function SortHeader({ label, k }: { label: string; k: SortKey }) {
    const active = sortKey === k;
    return (
      <button
        onClick={() => toggleSort(k)}
        className={`inline-flex items-center gap-1 text-xs font-medium justify-end w-full hover:text-foreground ${active ? "text-foreground" : "text-muted-foreground"}`}
      >
        {label}
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      </button>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
      <PageHeader
        icon={Coins}
        title={t("title")}
        actions={
          tokens ? (
            <span className="text-xs px-2 py-1 rounded-md bg-muted/60 border border-border text-muted-foreground font-mono">
              {t("total", { count: tokens.length })}
            </span>
          ) : null
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground font-normal">
            {network === "mainnet" ? t("subtitle_mainnet") : t("subtitle_testnet")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && !tokens ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : paged.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground bg-muted/30">
                      <th className="px-4 py-2.5 font-medium w-10">#</th>
                      <th className="px-4 py-2.5 font-medium">{t("token")}</th>
                      <th className="px-4 py-2.5 font-medium">{t("contract")}</th>
                      <th className="px-4 py-2.5 font-medium text-right">{t("decimals")}</th>
                      <th className="px-4 py-2.5 font-medium text-right"><SortHeader label={t("supply")} k="supply" /></th>
                      <th className="px-4 py-2.5 font-medium text-right hidden md:table-cell"><SortHeader label={t("holders")} k="holders" /></th>
                      <th className="px-4 py-2.5 font-medium text-right hidden lg:table-cell"><SortHeader label={t("transfers")} k="transfers" /></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 row-hover">
                    {paged.map((token, i) => (
                      <tr key={token.contract_address}>
                        <td className="px-4 py-2.5 text-muted-foreground">{(page - 1) * PAGE_SIZE + i + 1}</td>
                        <td className="px-4 py-2.5">
                          <Link href={`/tokens/${token.contract_address}`} className="inline-flex items-center gap-1">
                            <span className="h-7 w-7 rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--gold-d)] flex items-center justify-center text-white text-xs font-semibold shrink-0">
                              {token.symbol.slice(0, 2).toUpperCase()}
                            </span>
                            <span className="flex flex-col">
                              <span className="font-medium text-sm text-primary hover:underline">{token.name}</span>
                              <span className="text-muted-foreground text-xs">{token.symbol}</span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center gap-1">
                            <Link href={`/tokens/${token.contract_address}`} className="font-mono text-xs text-primary hover:underline">
                              {shortenAddress(token.contract_address)}
                            </Link>
                            <Copyable text={token.contract_address} bare />
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">{token.decimals}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{formatNumber(token.total_supply)}</td>
                        <td className="px-4 py-2.5 text-right font-mono hidden md:table-cell">{token.holders ?? "-"}</td>
                        <td className="px-4 py-2.5 text-right font-mono hidden lg:table-cell text-muted-foreground">{token.transfers ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {sorted.length > PAGE_SIZE && (
                <div className="border-t border-border">
                  <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                </div>
              )}
            </>
          ) : (
            <EmptyState
              icon={Coins}
              tone="notice"
              title={t("empty_title")}
              hint={t("empty_hint")}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
