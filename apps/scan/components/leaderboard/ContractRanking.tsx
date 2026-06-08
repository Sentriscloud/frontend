"use client";

import { useMemo, useState } from "react";
import { FileCode } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Address } from "@/components/common/Address";
import { Pagination } from "@/components/common/Pagination";
import { RankBadge } from "@/components/common/RankBadge";
import { useNetwork, useNetworkFromQuery } from "@/lib/network-context";
import { useContractList } from "@/lib/hooks";

const PAGE_SIZE = 25;

const COPY = {
  recent: {
    subtitle: "Contracts ordered by most recent deployment",
    emptyTitle: "No contracts indexed yet",
  },
  pioneers: {
    subtitle: "The earliest contracts deployed on chain",
    emptyTitle: "No contracts indexed yet",
  },
} as const;

export function ContractRanking({ order }: { order: "recent" | "pioneers" }) {
  const { network } = useNetwork();
  useNetworkFromQuery();
  const { data, loading } = useContractList(network, order, 100);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil((data?.length ?? 0) / PAGE_SIZE));
  const paged = useMemo(
    () => (data ?? []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [data, page],
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-muted-foreground font-normal">
          {COPY[order].subtitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" style={{ opacity: 1 - i * 0.08 }} />
            ))}
          </div>
        ) : (data?.length ?? 0) === 0 ? (
          <div className="p-12 text-center">
            <FileCode className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{COPY[order].emptyTitle}</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Contracts appear as the indexer classifies addresses via eth_getCode.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground bg-muted/30">
                    <th className="px-4 py-2.5 font-medium w-14">Rank</th>
                    <th className="px-4 py-2.5 font-medium">Contract</th>
                    <th className="px-4 py-2.5 font-medium text-right">First seen</th>
                    <th className="px-4 py-2.5 font-medium text-right hidden md:table-cell">
                      Last seen
                    </th>
                    <th className="px-4 py-2.5 font-medium hidden lg:table-cell">Code hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 row-hover">
                  {paged.map((r) => (
                    <tr key={r.address}>
                      <td className="px-4 py-2.5">
                        <RankBadge rank={r.rank} />
                      </td>
                      <td className="px-4 py-2.5">
                        <Address address={r.address} className="text-xs" />
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                        #{r.first_seen_block.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono hidden md:table-cell text-muted-foreground">
                        #{r.last_seen_block.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground hidden lg:table-cell break-all max-w-[16rem]">
                        {r.code_hash ? `${r.code_hash.slice(0, 18)}…` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(data?.length ?? 0) > PAGE_SIZE && (
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
