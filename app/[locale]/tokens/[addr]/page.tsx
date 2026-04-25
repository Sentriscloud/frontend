"use client";

import { use, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Address } from "@/components/common/Address";
import { TxHash } from "@/components/common/TxHash";
import { Timestamp } from "@/components/common/Timestamp";
import { InfoRow } from "@/components/common/InfoRow";
import { Copyable } from "@/components/common/Copyable";
import { useNetwork } from "@/lib/network-context";
import { fetchToken, type TokenData } from "@/lib/api";
import { useTokenHolders, useTokenTrades } from "@/lib/hooks";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { formatNumber } from "@/lib/format";

export default function TokenDetailPage({ params }: { params: Promise<{ addr: string }> }) {
  const { addr } = use(params);
  const { network } = useNetwork();
  const [token, setToken] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const { data: holders, loading: holdersLoading } = useTokenHolders(network, addr, 50);
  const { data: trades, loading: tradesLoading } = useTokenTrades(network, addr, 1, 25);

  useEffect(() => {
    fetchToken(network, addr).then((t) => {
      setToken(t);
      setLoading(false);
    });
  }, [network, addr]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Token not found</p>
            <Link href="/tokens" className="text-primary hover:underline text-sm mt-2 inline-block">Back to tokens</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
      <PageHeader
        iconSlot={
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--gold-d)] flex items-center justify-center text-[var(--bk)] font-semibold">
            {token.symbol.slice(0, 2).toUpperCase()}
          </div>
        }
        eyebrow={<Address address={token.contract_address} muted className="text-[10px]" />}
        title={
          <span className="flex items-center gap-2">
            {token.name}
            <span className="text-base text-muted-foreground font-normal">({token.symbol})</span>
          </span>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Supply" value={formatNumber(token.total_supply)}                                   accent="var(--gold)" />
        <StatCard label="Holders"      value={token.holders !== undefined ? formatNumber(token.holders) : "—"}     accent="var(--cyan)" />
        <StatCard label="Transfers"    value={token.transfers !== undefined ? formatNumber(token.transfers) : "—"} accent="var(--purple)" />
        <StatCard label="Decimals"     value={String(token.decimals)}                                               accent="var(--teal)" />
      </div>

      <Tabs defaultValue="transfers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transfers">Transfers</TabsTrigger>
          <TabsTrigger value="holders">Holders</TabsTrigger>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="contract">Contract</TabsTrigger>
        </TabsList>

        <TabsContent value="transfers">
          <Card>
            <CardContent className="p-0">
              {tradesLoading && !trades ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : trades && trades.length > 0 ? (
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
                      {trades.map((t) => (
                        <tr key={t.tx_hash}>
                          <td className="px-4 py-2.5"><TxHash hash={t.tx_hash} /></td>
                          <td className="px-4 py-2.5 text-muted-foreground text-xs">
                            {t.timestamp ? <Timestamp timestamp={t.timestamp} /> : "-"}
                          </td>
                          <td className="px-4 py-2.5"><Address address={t.from} muted showCopy={false} className="text-xs" /></td>
                          <td className="px-4 py-2.5"><Address address={t.to} muted showCopy={false} className="text-xs" /></td>
                          <td className="px-4 py-2.5 text-right font-mono">{formatNumber(t.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <p className="text-sm text-muted-foreground">No transfers yet for this token.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="holders">
          <Card>
            <CardContent className="p-0">
              {holdersLoading && !holders ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : holders && holders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground bg-muted/30">
                        <th className="px-4 py-2.5 font-medium w-14">#</th>
                        <th className="px-4 py-2.5 font-medium">Address</th>
                        <th className="px-4 py-2.5 font-medium text-right">Balance</th>
                        <th className="px-4 py-2.5 font-medium text-right hidden md:table-cell">Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 row-hover">
                      {holders.map((h, i) => (
                        <tr key={h.address}>
                          <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-2.5"><Address address={h.address} className="text-xs" /></td>
                          <td className="px-4 py-2.5 text-right font-mono">{formatNumber(h.balance)}</td>
                          <td className="px-4 py-2.5 text-right font-mono hidden md:table-cell text-muted-foreground">
                            {h.share.toFixed(4)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <p className="text-sm text-muted-foreground">No holders yet for this token.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info">
          <Card>
            <CardContent className="px-6 py-0">
              <InfoRow label="Name" value={token.name} />
              <InfoRow label="Symbol" value={<span className="font-mono">{token.symbol}</span>} />
              <InfoRow label="Decimals" value={<span className="font-mono">{token.decimals}</span>} />
              <InfoRow label="Total Supply" value={<span className="font-mono">{formatNumber(token.total_supply)}</span>} />
              <InfoRow
                label="Contract"
                value={
                  <span className="inline-flex items-center gap-2 font-mono break-all">
                    <Address address={token.contract_address} truncate={false} />
                  </span>
                }
              />
              <InfoRow
                label="Owner"
                value={<Address address={token.owner} truncate={false} />}
                last
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contract">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Contract address</p>
                <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
                  <span className="text-sm font-mono break-all flex-1">{token.contract_address}</span>
                  <Copyable text={token.contract_address} bare />
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Owner</p>
                <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
                  <span className="text-sm font-mono break-all flex-1">{token.owner}</span>
                  <Copyable text={token.owner} bare />
                </div>
              </div>
              {/* TODO(api): needs GET /accounts/{address}/code — contract bytecode pending */}
              <p className="text-xs text-muted-foreground text-center pt-2">Contract bytecode viewer coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
