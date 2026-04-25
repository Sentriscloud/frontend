"use client";

import { useMemo, useState } from "react";
import { Fish } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Address } from "@/components/common/Address";
import { EmptyState } from "@/components/common/EmptyState";
import { RankBadge } from "@/components/common/RankBadge";
import { useNetwork } from "@/lib/network-context";
import { useRichlist, useValidators } from "@/lib/hooks";
import { formatNumber } from "@/lib/format";

const DEFAULT_THRESHOLD = 100_000; // SRX

// DECISION: derived from /richlist. Filters holders above the threshold.
// Matches Etherscan's whale-wallet convention of "large holders by absolute balance".
export default function WhaleTopWalletsPage() {
  const { network } = useNetwork();
  const { data: holders, loading } = useRichlist(network, 100);
  const { data: validators } = useValidators(network);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);

  const nameByAddress = useMemo(() => {
    const map: Record<string, string> = {};
    (validators ?? []).forEach((v) => {
      if (v.name) map[v.address.toLowerCase()] = v.name;
    });
    return map;
  }, [validators]);

  const whales = useMemo(() => {
    if (!holders) return [];
    return holders.filter((h) => h.balance >= threshold);
  }, [holders, threshold]);

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center gap-3 p-3 border-b border-border flex-wrap">
          <span className="text-xs text-muted-foreground">Min balance:</span>
          {[10_000, 100_000, 1_000_000, 10_000_000].map((v) => (
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
          <span className="ml-auto text-xs text-muted-foreground font-mono">{whales.length} whales</span>
        </div>

        {loading && !holders ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" style={{ opacity: 1 - i * 0.1 }} />)}
          </div>
        ) : whales.length === 0 ? (
          <EmptyState
            icon={Fish}
            title="No wallets above this threshold"
            hint="Try a lower minimum balance."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground bg-muted/30">
                  <th className="px-4 py-2.5 font-medium w-14">Rank</th>
                  <th className="px-4 py-2.5 font-medium">Wallet</th>
                  <th className="px-4 py-2.5 font-medium text-right">Balance</th>
                  <th className="px-4 py-2.5 font-medium text-right hidden md:table-cell">% of Supply</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 row-hover">
                {whales.map((w) => {
                  const name = nameByAddress[w.address.toLowerCase()];
                  return (
                    <tr key={w.address}>
                      <td className="px-4 py-2.5"><RankBadge rank={w.rank} /></td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-col gap-0.5">
                          {name && <span className="font-medium text-sm">{name}</span>}
                          <Address address={w.address} muted className="text-xs" />
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold">
                        {formatNumber(w.balance)} SRX
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono hidden md:table-cell text-muted-foreground">
                        {w.share.toFixed(4)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
