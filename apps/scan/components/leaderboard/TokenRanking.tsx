"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Coins } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Copyable } from "@/components/common/Copyable";
import { Pagination } from "@/components/common/Pagination";
import { useNetwork } from "@/lib/network-context";
import { useTokens } from "@/lib/hooks";
import { formatNumber, shortenAddress } from "@/lib/format";
import type { TokenData } from "@/lib/api";

type Sort = "holders" | "transfers" | "total_supply";
const PAGE_SIZE = 25;

const LABELS: Record<Sort, { metric: string }> = {
  holders: { metric: "Holders" },
  transfers: { metric: "Transfers" },
  total_supply: { metric: "Supply" },
};

export function TokenRanking({ sort }: { sort: Sort }) {
  const { network } = useNetwork();
  const { data: tokens, loading } = useTokens(network);
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    if (!tokens) return [];
    const key = sort;
    return [...tokens].sort((a, b) => ((b[key] ?? 0) as number) - ((a[key] ?? 0) as number));
  }, [tokens, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const { metric } = LABELS[sort];

  return (
    <Card>
      <CardContent className="p-0">
        {loading && !tokens ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" style={{ opacity: 1 - i * 0.08 }} />)}
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-12 text-center">
            <Coins className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No SRC-20 tokens deployed yet</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground bg-muted/30">
                    <th className="px-4 py-2.5 font-medium w-14">Rank</th>
                    <th className="px-4 py-2.5 font-medium">Token</th>
                    <th className="px-4 py-2.5 font-medium">Contract</th>
                    <th className="px-4 py-2.5 font-medium text-right">{metric}</th>
                    <th className="px-4 py-2.5 font-medium text-right hidden md:table-cell">Supply</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 row-hover">
                  {paged.map((t: TokenData, i) => {
                    const rank = (page - 1) * PAGE_SIZE + i + 1;
                    const value = (t[sort] ?? 0) as number;
                    return (
                      <tr key={t.contract_address}>
                        <td className="px-4 py-2.5 text-muted-foreground">{rank}</td>
                        <td className="px-4 py-2.5">
                          <Link href={`/tokens/${t.contract_address}`} className="inline-flex items-center gap-2">
                            <span className="h-7 w-7 rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--gold-d)] flex items-center justify-center text-white text-xs font-semibold shrink-0">
                              {t.symbol.slice(0, 2).toUpperCase()}
                            </span>
                            <span className="flex flex-col min-w-0">
                              <span className="font-medium text-sm text-primary hover:underline truncate">{t.name}</span>
                              <span className="text-muted-foreground text-xs">{t.symbol}</span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center gap-1">
                            <Link href={`/tokens/${t.contract_address}`} className="font-mono text-xs text-primary hover:underline">
                              {shortenAddress(t.contract_address)}
                            </Link>
                            <Copyable text={t.contract_address} bare />
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">{formatNumber(value)}</td>
                        <td className="px-4 py-2.5 text-right font-mono hidden md:table-cell text-muted-foreground">
                          {formatNumber(t.total_supply)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {sorted.length > PAGE_SIZE && (
              <div className="border-t border-border">
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
