"use client";

import { useMemo, useState } from "react";
import { Trophy, ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Address } from "@/components/common/Address";
import { Pagination } from "@/components/common/Pagination";
import { RankBadge } from "@/components/common/RankBadge";
import { useNetwork } from "@/lib/network-context";
import { useRichlist, useValidators } from "@/lib/hooks";
import { formatNumber } from "@/lib/format";

type SortKey = "balance" | "none";
const PAGE_SIZE = 25;

export default function TopHoldersPage() {
  const { network } = useNetwork();
  const { data: holders, loading } = useRichlist(network, 100);
  const { data: validators } = useValidators(network);
  const [sortKey, setSortKey] = useState<SortKey>("balance");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const nameByAddress = useMemo(() => {
    const map: Record<string, string> = {};
    (validators ?? []).forEach((v) => {
      if (v.name) map[v.address.toLowerCase()] = v.name;
    });
    return map;
  }, [validators]);

  const sorted = useMemo(() => {
    if (!holders || sortKey === "none") return holders ?? [];
    const dir = sortDir === "asc" ? 1 : -1;
    return [...holders].sort((a, b) => (a.balance - b.balance) * dir);
  }, [holders, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("desc"); }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-muted-foreground font-normal">
          Largest accounts on Sentrix Chain ranked by SRX balance
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" style={{ opacity: 1 - i * 0.08 }} />)}
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-12 text-center">
            <Trophy className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No balances indexed yet</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground bg-muted/30">
                    <th className="px-4 py-2.5 font-medium w-14">Rank</th>
                    <th className="px-4 py-2.5 font-medium">Account</th>
                    <th className="px-4 py-2.5 font-medium text-right">
                      <button
                        onClick={() => toggleSort("balance")}
                        className={`inline-flex items-center gap-1 text-xs font-medium justify-end w-full hover:text-foreground ${sortKey === "balance" ? "text-foreground" : "text-muted-foreground"}`}
                      >
                        Balance
                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                      </button>
                    </th>
                    <th className="px-4 py-2.5 font-medium text-right hidden md:table-cell">% of Supply</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 row-hover">
                  {paged.map((r) => {
                    const name = nameByAddress[r.address.toLowerCase()];
                    return (
                      <tr key={r.address}>
                        <td className="px-4 py-2.5"><RankBadge rank={r.rank} /></td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-col gap-0.5">
                            {name && <span className="font-medium text-sm">{name}</span>}
                            <Address address={r.address} muted className="text-xs" />
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">{formatNumber(r.balance)} SRX</td>
                        <td className="px-4 py-2.5 text-right font-mono hidden md:table-cell text-muted-foreground">
                          {r.share.toFixed(4)}%
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
