"use client";

import { useMemo, useState } from "react";
import { Blocks } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Address } from "@/components/common/Address";
import { BlockHeight } from "@/components/common/BlockHeight";
import { Timestamp } from "@/components/common/Timestamp";
import { Copyable } from "@/components/common/Copyable";
import { Pagination } from "@/components/common/Pagination";
import { PageHeader } from "@/components/common/PageHeader";
import { useNetwork } from "@/lib/network-context";
import { useBlocks } from "@/lib/hooks";
import { shortenHash } from "@/lib/format";

const PAGE_SIZE = 25;
const BATCH = 100;

export default function BlocksPage() {
  const t = useTranslations("blocks");
  const { network } = useNetwork();
  // DECISION: fetch a rolling batch (100) and paginate client-side — backend has no pagination endpoint yet.
  // TODO(api): needs GET /chain/blocks?page=N&limit=M — using client-side slice for now
  const { data: blocks, loading } = useBlocks(network, BATCH);
  const [page, setPage] = useState(1);

  const totalPages = blocks ? Math.max(1, Math.ceil(blocks.length / PAGE_SIZE)) : 1;
  const paged = useMemo(() => {
    if (!blocks) return [];
    const start = (page - 1) * PAGE_SIZE;
    return blocks.slice(start, start + PAGE_SIZE);
  }, [blocks, page]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
      <PageHeader
        icon={Blocks}
        title={t("title")}
        actions={
          blocks ? (
            <span className="text-xs px-2 py-1 rounded-md bg-muted/60 border border-border text-muted-foreground font-mono">
              {t("most_recent", { count: blocks.length })}
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
          {loading && !blocks ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground bg-muted/30">
                      <th className="px-4 py-2.5 font-medium" title={t("block_hint")}>
                        <span className="inline-flex items-center gap-1 cursor-help decoration-dotted underline-offset-2 underline">
                          {t("block")}
                        </span>
                      </th>
                      <th className="px-4 py-2.5 font-medium">{t("age")}</th>
                      <th className="px-4 py-2.5 font-medium text-center">{t("txs")}</th>
                      <th className="px-4 py-2.5 font-medium hidden md:table-cell">{t("hash")}</th>
                      <th className="px-4 py-2.5 font-medium">{t("validator")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 row-hover">
                    {paged.map((block) => (
                      <tr key={block.index}>
                        <td className="px-4 py-2.5">
                          <BlockHeight height={block.index} className="text-sm" />
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs">
                          <Timestamp timestamp={block.timestamp} />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {(() => {
                            const n = block.tx_count ?? block.transactions?.length ?? 0;
                            return (
                              <span className={`inline-flex items-center justify-center min-w-7 h-6 px-2 rounded-md text-[11px] font-mono tabular-nums ${
                                n === 0
                                  ? "text-[var(--tx-d)]"
                                  : n === 1
                                    ? "bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20"
                                    : "bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20"
                              }`}>
                                {n}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-2.5 hidden md:table-cell">
                          <span className="inline-flex items-center gap-1">
                            <span className="font-mono text-xs text-muted-foreground">{shortenHash(block.hash)}</span>
                            <Copyable text={block.hash} bare />
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {block.validator_name ? (
                            <Address address={block.validator} label={block.validator_name} muted showCopy={false} className="text-xs" />
                          ) : (
                            <Address address={block.validator} muted showCopy={false} className="text-xs" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!blocks || blocks.length === 0) && (
                  <div className="p-8 text-center text-sm text-muted-foreground">{t("no_blocks")}</div>
                )}
              </div>
              {blocks && blocks.length > PAGE_SIZE && (
                <div className="border-t border-border">
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
