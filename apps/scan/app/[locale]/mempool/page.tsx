"use client";

import { Inbox } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/common/PageHeader";
import { DetailCard } from "@/components/common/DetailCard";
import { Address } from "@/components/common/Address";
import { TxHash } from "@/components/common/TxHash";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useNetwork, useNetworkFromQuery } from "@/lib/network-context";
import { useMempool } from "@/lib/hooks";
import { formatSRX, timeAgo } from "@/lib/format";
import { classifyRail, RailBadge } from "@/components/common/RailBadge";

// DECISION: render whatever the existing `useMempool` hook returns. The
// hook polls `/mempool` and surfaces `{ size, transactions }`. We don't
// add per-row WebSocket subscriptions (`newPendingTransactions` channel
// is available, but at 1s blocks the mempool churns fast enough that
// poll + 5s tick is plenty for an at-a-glance view; pushing every tx
// would just noise the table).

export default function MempoolPage() {
  const { network } = useNetwork();
  useNetworkFromQuery();
  const { data, loading } = useMempool(network);

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      <PageHeader
        icon={Inbox}
        eyebrow="MEMPOOL"
        title={
          data
            ? `${data.size.toLocaleString()} pending transaction${data.size === 1 ? "" : "s"}`
            : "Mempool"
        }
      />

      <DetailCard title="What this is">
        <p className="py-2 text-sm text-muted-foreground leading-relaxed">
          Transactions admitted to the validator&apos;s mempool but not yet sealed in a block.
          At Sentrix&apos;s 1-second block time most txs land in the next 1-2 blocks; anything
          sitting here longer than 10 seconds typically means a fee below the validator&apos;s
          accept threshold or a duplicate nonce being held until predecessors clear.
        </p>
      </DetailCard>

      <DetailCard title="Pending">
        {loading && !data ? (
          <div className="py-4 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : !data || data.transactions.length === 0 ? (
          <EmptyState title="Mempool empty" hint="No pending transactions right now." />
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
                  <th className="px-6 py-2 font-medium">Tx</th>
                  <th className="px-6 py-2 font-medium hidden md:table-cell">Rail</th>
                  <th className="px-6 py-2 font-medium">From</th>
                  <th className="px-6 py-2 font-medium">To</th>
                  <th className="px-6 py-2 font-medium text-right">Value</th>
                  <th className="px-6 py-2 font-medium text-right">Fee</th>
                  <th className="px-6 py-2 font-medium text-right hidden lg:table-cell">Age</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((tx, i) => {
                  const txid = tx.txid ?? "";
                  const from = tx.from_address ?? "";
                  const to = tx.to_address ?? "";
                  const amt = tx.amount ?? 0;
                  const fee = tx.fee ?? 0;
                  const rail = classifyRail({ to_address: to, data: null });
                  return (
                    <tr key={txid || i} className="border-b border-border/30 last:border-0 hover:bg-muted/30">
                      <td className="px-6 py-3">
                        {txid ? <TxHash hash={txid} /> : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="px-6 py-3 hidden md:table-cell">
                        <RailBadge rail={rail} />
                      </td>
                      <td className="px-6 py-3">
                        {from ? <Address address={from} /> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-6 py-3">
                        {to ? <Address address={to} /> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-xs">{formatSRX(amt)}</td>
                      <td className="px-6 py-3 text-right font-mono text-xs text-muted-foreground">{formatSRX(fee)}</td>
                      <td className="px-6 py-3 text-right text-xs text-muted-foreground hidden lg:table-cell">
                        {tx.timestamp ? timeAgo(tx.timestamp) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DetailCard>

      {data && data.size > data.transactions.length && (
        <p className="text-xs text-muted-foreground text-center">
          Showing {data.transactions.length} of {data.size.toLocaleString()} pending — backend
          caps the per-call return; the rest land in the next block.{" "}
          <Link href="/blocks" className="text-[var(--gold)] hover:underline">
            Watch the next block →
          </Link>
        </p>
      )}
    </div>
  );
}
