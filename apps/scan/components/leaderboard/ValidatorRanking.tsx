"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Address } from "@/components/common/Address";
import { Pagination } from "@/components/common/Pagination";
import { useNetwork } from "@/lib/network-context";
import { useValidators } from "@/lib/hooks";
import { formatNumber } from "@/lib/format";

type Sort = "stake" | "uptime" | "blocks_produced";
const PAGE_SIZE = 25;

const LABELS: Record<Sort, { metric: string; fmt: (n: number) => string }> = {
  stake:           { metric: "Stake",   fmt: (n) => `${formatNumber(n)} SRX` },
  uptime:          { metric: "Uptime",  fmt: (n) => `${n.toFixed(2)}%` },
  blocks_produced: { metric: "Blocks",  fmt: (n) => formatNumber(n) },
};

export function ValidatorRanking({ sort }: { sort: Sort }) {
  const { network } = useNetwork();
  const { data: validators, loading } = useValidators(network);
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    if (!validators) return [];
    return [...validators].sort((a, b) => ((b[sort] ?? 0) as number) - ((a[sort] ?? 0) as number));
  }, [validators, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const { metric, fmt } = LABELS[sort];

  return (
    <Card>
      <CardContent className="p-0">
        {loading && !validators ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" style={{ opacity: 1 - i * 0.08 }} />)}
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No validators found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground bg-muted/30">
                    <th className="px-4 py-2.5 font-medium w-14">Rank</th>
                    <th className="px-4 py-2.5 font-medium">Validator</th>
                    <th className="px-4 py-2.5 font-medium text-right">{metric}</th>
                    <th className="px-4 py-2.5 font-medium text-right hidden md:table-cell">Blocks</th>
                    <th className="px-4 py-2.5 font-medium text-right hidden lg:table-cell">Commission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 row-hover">
                  {paged.map((v, i) => {
                    const rank = (page - 1) * PAGE_SIZE + i + 1;
                    return (
                      <tr key={v.address}>
                        <td className="px-4 py-2.5 text-muted-foreground">{rank}</td>
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
                        <td className="px-4 py-2.5 text-right font-mono">
                          {(v[sort] ?? 0) === 0 ? "-" : fmt((v[sort] ?? 0) as number)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono hidden md:table-cell text-muted-foreground">
                          {v.blocks_produced !== undefined ? formatNumber(v.blocks_produced) : "-"}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono hidden lg:table-cell text-muted-foreground">
                          {v.commission !== undefined ? `${v.commission}%` : "-"}
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
