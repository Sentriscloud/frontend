"use client";

import { use, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Address } from "@/components/common/Address";
import { FetchError } from "@/components/common/FetchError";
import { TxHash } from "@/components/common/TxHash";
import { Timestamp } from "@/components/common/Timestamp";
import { InfoRow } from "@/components/common/InfoRow";
import { Copyable } from "@/components/common/Copyable";
import { useNetwork, useNetworkFromQuery } from "@/lib/network-context";
import { fetchToken, type TokenData } from "@/lib/api";
import { useTokenHolders, useTokenTrades } from "@/lib/hooks";
import { PageHeader } from "@/components/common/PageHeader";
import { WatchButton } from "@/components/common/WatchButton";
import { HoldersDonut } from "@/components/common/HoldersDonut";
import { StatCard } from "@/components/common/StatCard";
import { SourcifyViewer } from "@/components/common/SourcifyViewer";
import { ReadContract } from "@/components/common/ReadContract";
import { WriteContract } from "@/components/common/WriteContract";
import { formatNumber } from "@/lib/format";

export default function TokenDetailPage({ params }: { params: Promise<{ addr: string }> }) {
  const { addr } = use(params);
  const { network, setNetwork } = useNetwork();
  // `?network=mainnet|testnet` deeplink (faucet, wallet notifications).
  useNetworkFromQuery();
  const [token, setToken] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  // Cross-network probe — token contracts are address-specific and a
  // bytecode hit on the other network is a strong signal the user is
  // on the wrong side. Same UX as /tx/[hash]: hold the not-found wall
  // until the other-network probe also resolves, then offer a switch.
  const otherNetwork = network === "mainnet" ? "testnet" : "mainnet";
  const [tokenOther, setTokenOther] = useState<TokenData | null>(null);
  const [loadingOther, setLoadingOther] = useState(true);
  const { data: holders, loading: holdersLoading, error: holdersError, retry: retryHolders } = useTokenHolders(network, addr, 50);
  const { data: trades, loading: tradesLoading, error: tradesError, retry: retryTrades } = useTokenTrades(network, addr, 1, 25);

  useEffect(() => {
    setLoading(true);
    fetchToken(network, addr).then((t) => {
      setToken(t);
      setLoading(false);
    });
  }, [network, addr]);

  useEffect(() => {
    setLoadingOther(true);
    // Tight 2.5s timeout: cross-network side-probe shouldn't block the
    // primary render past a couple of seconds even if the peer is slow.
    fetchToken(otherNetwork, addr, 2500).then((t) => {
      setTokenOther(t);
      setLoadingOther(false);
    });
  }, [otherNetwork, addr]);

  // Auto-switch when the contract lives on the other network. Same pattern
  // as /tx and /blocks — toast + setNetwork instead of asking the user to
  // click a button. Fire once per page lifetime.
  const autoSwitched = useRef(false);
  useEffect(() => {
    if (autoSwitched.current) return;
    if (loading || loadingOther) return;
    if (token) return;
    if (!tokenOther) return;
    autoSwitched.current = true;
    toast.success(
      `Found on ${otherNetwork === "mainnet" ? "Mainnet" : "Testnet"} — switching network.`,
    );
    setNetwork(otherNetwork);
  }, [loading, loadingOther, token, tokenOther, otherNetwork, setNetwork]);

  if (loading || (!token && loadingOther)) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!token) {
    if (tokenOther) {
      // Auto-switch effect above already in flight; transient placeholder.
      return (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <Skeleton className="h-4 w-56 mx-auto" />
              <p className="text-xs font-mono text-muted-foreground break-all">{addr}</p>
              <p className="text-xs text-muted-foreground">
                Switching to {otherNetwork === "mainnet" ? "Mainnet" : "Testnet"}…
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }
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
        actions={<WatchButton address={token.contract_address} kind="token" label={token.symbol} />}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Supply" value={formatNumber(token.total_supply)}                                   accent="var(--gold)" />
        <StatCard label="Holders"      value={token.holders !== undefined ? formatNumber(token.holders) : "—"}     accent="var(--cyan)" />
        <StatCard label="Transfers"    value={token.transfers !== undefined ? formatNumber(token.transfers) : "—"} accent="var(--purple)" />
        <StatCard label="Decimals"     value={String(token.decimals)}                                               accent="var(--teal)" />
      </div>

      <Tabs defaultValue="transfers" className="space-y-4">
        <TabsList variant="line">
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
              ) : tradesError ? (
                <FetchError onRetry={retryTrades} />
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

        <TabsContent value="holders" className="space-y-4">
          {/* Distribution donut — Etherscan/Solscan/Blockscout all surface the
              top-N concentration as a chart so users can spot whether a token
              is whale-heavy at a glance. Below it, the long-form holders
              table for the full enumerable list. */}
          <HoldersDonut holders={holders ?? null} symbol={token.symbol} />
          <Card>
            <CardContent className="p-0">
              {holdersLoading && !holders ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : holdersError ? (
                <FetchError onRetry={retryHolders} />
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

        <TabsContent value="contract" className="space-y-4">
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
            </CardContent>
          </Card>
          <SourcifyViewer network={network} address={token.contract_address} />
          <ReadContract network={network} address={token.contract_address} />
          <WriteContract network={network} address={token.contract_address} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
