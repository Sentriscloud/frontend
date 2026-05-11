"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Address } from "@/components/common/Address";
import { PageHeader } from "@/components/common/PageHeader";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { useNetwork, useNetworkFromQuery } from "@/lib/network-context";
import { useAccountsTop } from "@/lib/hooks";
import { formatNumber, formatSRX } from "@/lib/format";

const PAGE_SIZE = 25;

// Top Accounts (richlist). Pulls /accounts/top (up to 100 entries),
// pages locally at 25/row. Address labels come through the global
// registry (`lib/labels.tsx`) so premine wallets, validator hosts, and
// SentrixSafe surface their human names automatically.
export default function AccountsPage() {
  const { network } = useNetwork();
  useNetworkFromQuery();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const urlPage = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const [page, setPageState] = useState(urlPage);
  const setPage = (p: number) => {
    setPageState(p);
    const params = new URLSearchParams(searchParams.toString());
    if (p === 1) params.delete("page");
    else params.set("page", String(p));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  // Sync if the URL param changes externally (browser back/forward).
  useEffect(() => {
    const fresh = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    setPageState(fresh);
  }, [searchParams]);

  const { data, loading } = useAccountsTop(network, 100);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((data?.length ?? 0) / PAGE_SIZE)),
    [data],
  );
  const paged = useMemo(() => {
    if (!data) return [];
    return data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [data, page]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
      <PageHeader
        icon={Users}
        title="Top Accounts"
        actions={
          data ? (
            <span className="text-xs px-2 py-1 rounded-md bg-muted/60 border border-border text-muted-foreground font-mono">
              Top {data.length}
            </span>
          ) : null
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground font-normal">
            {network === "mainnet"
              ? "Largest SRX holders on mainnet, ranked by balance"
              : "Largest SRX holders on testnet, ranked by balance"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && !data ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : paged.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground bg-muted/30">
                      <th className="px-4 py-2.5 font-medium w-14">Rank</th>
                      <th className="px-4 py-2.5 font-medium">Address</th>
                      <th className="px-4 py-2.5 font-medium text-right">Balance (SRX)</th>
                      <th className="px-4 py-2.5 font-medium text-right">% of Supply</th>
                      <th className="px-4 py-2.5 font-medium text-right">Tx Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {paged.map((acct) => (
                      <tr key={acct.address} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                          #{acct.rank}
                        </td>
                        <td className="px-4 py-2.5">
                          <Address
                            address={acct.address}
                            label={acct.label}
                            truncate
                          />
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">
                          {formatSRX(acct.balance)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                          {acct.share.toFixed(4)}%
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                          {acct.tx_count != null ? formatNumber(acct.tx_count) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-border">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            </>
          ) : (
            <EmptyState
              icon={Users}
              title="No accounts yet"
              hint="The richlist will populate once the chain has activity."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
