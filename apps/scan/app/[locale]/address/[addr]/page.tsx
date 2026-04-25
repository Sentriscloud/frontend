"use client";

import { use, useState } from "react";
import { Wallet, ArrowDown, ArrowUp, ArrowLeftRight, FileCode, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Address } from "@/components/common/Address";
import { TxHash } from "@/components/common/TxHash";
import { Timestamp } from "@/components/common/Timestamp";
import { Copyable } from "@/components/common/Copyable";
import { Pagination } from "@/components/common/Pagination";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useNetwork } from "@/lib/network-context";
import { useAddress, useAddressHistory, useAccountTokens, useEventLogs } from "@/lib/hooks";
import { formatSRX, formatNumber } from "@/lib/format";
import { Link } from "@/i18n/navigation";
import { useAddressLabel, toneForKind } from "@/lib/labels";
import { AddressNote } from "@/components/common/AddressNote";
import { downloadCsv } from "@/lib/csv";
import { toMillis } from "@/lib/format";

type DirFilter = "all" | "in" | "out";

export default function AddressDetailPage({ params }: { params: Promise<{ addr: string }> }) {
  const { addr } = use(params);
  const { network } = useNetwork();
  const [page, setPage] = useState(1);
  const [dirFilter, setDirFilter] = useState<DirFilter>("all");
  const { data: account, loading: accountLoading } = useAddress(network, addr);
  const { data: history, loading: historyLoading } = useAddressHistory(network, addr, page);
  const { data: tokens, loading: tokensLoading } = useAccountTokens(network, addr);
  const { data: eventLogs, loading: eventLogsLoading } = useEventLogs(network, addr);
  const label = useAddressLabel(addr);

  const filtered = (history ?? []).filter((tx) => {
    if (dirFilter === "all") return true;
    const isIn = tx.to.toLowerCase() === addr.toLowerCase();
    return dirFilter === "in" ? isIn : !isIn;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
      <PageHeader
        icon={Wallet}
        eyebrow="Address"
        title={label?.name ?? "Account"}
        actions={label ? (() => {
          const tone = toneForKind(label.kind);
          return (
            <span className={`inline-flex items-center text-[10px] font-mono uppercase tracking-[.12em] rounded-md px-2 py-1 border ${tone.bg} ${tone.fg} ${tone.border}`}>
              {label.kind}
            </span>
          );
        })() : undefined}
      />

      {/* Address bar */}
      <div className="flex items-center gap-2 bg-muted/40 rounded-lg p-3 border border-border/60">
        <span className="text-sm font-mono break-all flex-1" data-address={addr}>{addr}</span>
        <Copyable text={addr} bare label="Address" />
      </div>

      {/* Private note (localStorage, stays in-browser) */}
      <AddressNote address={addr} />

      {/* Balance card */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          label="Balance"
          value={account ? formatSRX(account.balance) : "0 SRX"}
          loading={accountLoading}
          accent="var(--gold)"
        />
        <StatCard
          label="Nonce"
          value={account ? String(account.nonce) : "0"}
          loading={accountLoading}
          accent="var(--cyan)"
        />
        <StatCard
          label="Tx Count"
          value={account?.tx_count !== undefined ? formatNumber(account.tx_count) : "—"}
          loading={accountLoading}
          accent="var(--purple)"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="history" className="space-y-4">
        <TabsList>
          <TabsTrigger value="history">Transactions</TabsTrigger>
          <TabsTrigger value="tokens">Tokens</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <Card>
            <CardContent className="p-0">
              {/* Filter bar + CSV export */}
              <div className="flex items-center gap-2 p-3 border-b border-border flex-wrap">
                <span className="text-xs text-muted-foreground mr-2">Filter:</span>
                {(["all", "in", "out"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setDirFilter(f)}
                    className={`text-xs px-3 py-1 rounded-md border transition-colors ${
                      dirFilter === f
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "border-border text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {f === "all" ? "All" : f === "in" ? "Inbound" : "Outbound"}
                  </button>
                ))}
                <div className="ml-auto">
                  <button
                    type="button"
                    disabled={!filtered.length}
                    onClick={() => {
                      const rows = filtered.map((tx) => ({
                        tx_hash: tx.id,
                        direction: tx.to.toLowerCase() === addr.toLowerCase() ? "in" : "out",
                        from: tx.from,
                        to: tx.to,
                        amount_srx: tx.amount,
                        fee_srx: tx.fee,
                        block_height: tx.block_height ?? "",
                        timestamp: new Date(toMillis(tx.timestamp)).toISOString(),
                      }));
                      downloadCsv(`sentrix-${addr.slice(0, 10)}-page${page}.csv`, rows, [
                        "tx_hash", "direction", "from", "to", "amount_srx", "fee_srx", "block_height", "timestamp",
                      ]);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-[var(--gold)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Download visible transactions as CSV"
                  >
                    <Download className="h-3 w-3" />
                    Export CSV
                  </button>
                </div>
              </div>
              {historyLoading && !history ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : filtered.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs text-muted-foreground bg-muted/30">
                          <th className="px-3 py-2.5 font-medium w-7"></th>
                          <th className="px-4 py-2.5 font-medium">Tx Hash</th>
                          <th className="px-4 py-2.5 font-medium hidden md:table-cell">Age</th>
                          <th className="px-4 py-2.5 font-medium">Peer</th>
                          <th className="px-4 py-2.5 font-medium hidden lg:table-cell">Status</th>
                          <th className="px-4 py-2.5 font-medium text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60 row-hover">
                        {filtered.map((tx) => {
                          const isIn = tx.to.toLowerCase() === addr.toLowerCase();
                          const isSelf = isIn && tx.from.toLowerCase() === addr.toLowerCase();
                          const dirIcon = isSelf ? <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" /> : isIn ? <ArrowDown className="h-3.5 w-3.5 text-green-500" /> : <ArrowUp className="h-3.5 w-3.5 text-red-500" />;
                          const success = tx.status !== "failed";
                          // "Peer" = the counterparty. If we sent, show `to`. If we received, show `from`.
                          const peerAddr = isSelf ? tx.from : isIn ? tx.from : tx.to;
                          return (
                            <tr key={tx.id}>
                              <td className="px-3 py-2.5">{dirIcon}</td>
                              <td className="px-4 py-2.5"><TxHash hash={tx.id} /></td>
                              <td className="px-4 py-2.5 text-muted-foreground text-xs hidden md:table-cell">
                                <Timestamp timestamp={tx.timestamp} />
                              </td>
                              <td className="px-4 py-2.5">
                                {peerAddr === "COINBASE" || peerAddr.toUpperCase() === "COINBASE" ? (
                                  <span className="text-xs font-mono text-[var(--tx-d)]">COINBASE</span>
                                ) : (
                                  <Address address={peerAddr} showCopy={false} className="text-xs" />
                                )}
                              </td>
                              <td className="px-4 py-2.5 hidden lg:table-cell">
                                <StatusBadge status={success ? "success" : "failed"} />
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <span className={isSelf ? "font-mono text-muted-foreground" : isIn ? "text-green-500 font-mono" : "text-red-500 font-mono"}>
                                  {isSelf ? "" : isIn ? "+" : "-"}{tx.amount} SRX
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="border-t border-border">
                    <Pagination
                      page={page}
                      hasMore={history ? history.length >= 20 : false}
                      onPageChange={setPage}
                    />
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={ArrowDown}
                  title="No transactions for this address"
                  hint="Inbound and outbound transfers will appear here once recorded on chain."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tokens">
          <Card>
            <CardContent className="p-0">
              {tokensLoading && !tokens ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : tokens && tokens.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground bg-muted/30">
                        <th className="px-4 py-2.5 font-medium">Token</th>
                        <th className="px-4 py-2.5 font-medium">Contract</th>
                        <th className="px-4 py-2.5 font-medium text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 row-hover">
                      {tokens.map((tk) => (
                        <tr key={tk.contract_address}>
                          <td className="px-4 py-2.5">
                            <Link href={`/tokens/${tk.contract_address}`} className="inline-flex items-center gap-2 hover:underline">
                              <span className="h-7 w-7 rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--gold-d)] flex items-center justify-center text-white text-[11px] font-semibold shrink-0">
                                {tk.symbol.slice(0, 2).toUpperCase() || "??"}
                              </span>
                              <span className="flex flex-col">
                                <span className="font-medium text-sm text-primary">{tk.name || tk.symbol}</span>
                                <span className="text-muted-foreground text-xs">{tk.symbol}</span>
                              </span>
                            </Link>
                          </td>
                          <td className="px-4 py-2.5"><Address address={tk.contract_address} muted /></td>
                          <td className="px-4 py-2.5 text-right font-mono">
                            {(tk.balance / Math.pow(10, tk.decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 })}{" "}
                            <span className="text-muted-foreground">{tk.symbol}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  icon={ArrowLeftRight}
                  title="No SRC-20 token holdings"
                  hint="This address doesn't hold any deployed SRC-20 tokens."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardContent className="p-0">
              {eventLogsLoading && !eventLogs ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : eventLogs && eventLogs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground bg-muted/30">
                        <th className="px-4 py-2.5 font-medium">Block</th>
                        <th className="px-4 py-2.5 font-medium">Tx</th>
                        <th className="px-4 py-2.5 font-medium">Topic0</th>
                        <th className="px-4 py-2.5 font-medium">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 row-hover">
                      {eventLogs.map((l, i) => (
                        <tr key={`${l.transactionHash}-${l.logIndex}-${i}`}>
                          <td className="px-4 py-2.5 font-mono text-xs">#{l.blockNumber.toLocaleString()}</td>
                          <td className="px-4 py-2.5">
                            <TxHash hash={l.transactionHash} />
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-[var(--gold)]" title={l.topics[0]}>
                            {l.topics[0] ? `${l.topics[0].slice(0, 10)}…${l.topics[0].slice(-4)}` : "—"}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground" title={l.data}>
                            {l.data && l.data !== "0x" ? `${l.data.slice(0, 18)}…` : "0x"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  icon={FileCode}
                  title="No event logs"
                  hint="EVM contracts emit events that are indexed here via eth_getLogs. Currently no logs for this address."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
