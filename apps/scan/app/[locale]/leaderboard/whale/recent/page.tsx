"use client";

import { useMemo, useState } from "react";
import { Fish } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Address } from "@/components/common/Address";
import { TxHash } from "@/components/common/TxHash";
import { Timestamp } from "@/components/common/Timestamp";
import { EmptyState } from "@/components/common/EmptyState";
import { useNetwork } from "@/lib/network-context";
import { useBlocks } from "@/lib/hooks";
import { formatNumber } from "@/lib/format";

const DEFAULT_THRESHOLD = 10_000; // SRX

// DECISION: No dedicated /whale/tx endpoint. We harvest the last 100 blocks we already poll and
// filter txs above the threshold slider. Polling is inherited from useBlocks (5s) so the list
// auto-refreshes with the chain tip.
// TODO(api): needs GET /whale/tx?threshold=X — currently computed client-side from recent blocks.
export default function WhaleRecentPage() {
  const { network } = useNetwork();
  const { data: blocks, loading } = useBlocks(network, 100);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);

  const large = useMemo(() => {
    if (!blocks) return [];
    const out: { tx_id: string; from: string; to: string; amount: number; timestamp: string; block: number }[] = [];
    for (const b of blocks) {
      for (const tx of b.transactions ?? []) {
        if (tx.amount >= threshold) {
          out.push({
            tx_id: tx.id,
            from: tx.from,
            to: tx.to,
            amount: tx.amount,
            timestamp: tx.timestamp ?? b.timestamp,
            block: b.index,
          });
        }
      }
    }
    return out.sort((a, b) => b.block - a.block).slice(0, 100);
  }, [blocks, threshold]);

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center gap-3 p-3 border-b border-border">
          <span className="text-xs text-muted-foreground">Threshold:</span>
          {[1_000, 10_000, 100_000, 1_000_000].map((v) => (
            <button
              key={v}
              onClick={() => setThreshold(v)}
              className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                threshold === v
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              {formatNumber(v)} SRX
            </button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground font-mono">{large.length} hits</span>
        </div>

        {loading && !blocks ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" style={{ opacity: 1 - i * 0.1 }} />)}
          </div>
        ) : large.length === 0 ? (
          <EmptyState
            icon={Fish}
            title="No whale-sized transactions in the last 100 blocks"
            hint="Try a lower threshold."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground bg-muted/30">
                  <th className="px-4 py-2.5 font-medium">Tx</th>
                  <th className="px-4 py-2.5 font-medium">Age</th>
                  <th className="px-4 py-2.5 font-medium">From</th>
                  <th className="px-4 py-2.5 font-medium">To</th>
                  <th className="px-4 py-2.5 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 row-hover">
                {large.map((t) => (
                  <tr key={t.tx_id}>
                    <td className="px-4 py-2.5"><TxHash hash={t.tx_id} /></td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">
                      <Timestamp timestamp={t.timestamp} />
                    </td>
                    <td className="px-4 py-2.5"><Address address={t.from} muted showCopy={false} className="text-xs" /></td>
                    <td className="px-4 py-2.5"><Address address={t.to} muted showCopy={false} className="text-xs" /></td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-primary">
                      {formatNumber(t.amount)} SRX
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
