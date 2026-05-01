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
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useNetwork } from "@/lib/network-context";
import { useAddress, useAddressHistory, useAccountTokens, useEventLogs } from "@/lib/hooks";
import { formatSRX, formatNumber } from "@/lib/format";
import { Link } from "@/i18n/navigation";
import { useAddressLabel, toneForKind } from "@/lib/labels";
import { AddressNote } from "@/components/common/AddressNote";
import { SourcifyBadge } from "@/components/common/SourcifyBadge";
import { SourcifyViewer } from "@/components/common/SourcifyViewer";
import { ReadContract } from "@/components/common/ReadContract";
import { WriteContract } from "@/components/common/WriteContract";
import { ApprovalsTab } from "@/components/common/ApprovalsTab";
import { InternalTxsPlaceholder } from "@/components/common/InternalTxsPlaceholder";
import { CountBadge } from "@/components/common/CountBadge";
import { WatchButton } from "@/components/common/WatchButton";
import { downloadCsv } from "@/lib/csv";
import { toMillis } from "@/lib/format";
import { classifyRail, RailBadge, type Rail } from "@/components/common/RailBadge";

type DirFilter = "all" | "in" | "out";
type RailFilter = "all" | Rail;

export default function AddressDetailPage({ params }: { params: Promise<{ addr: string }> }) {
  const { addr } = use(params);
  const { network } = useNetwork();
  const [page, setPage] = useState(1);
  const [dirFilter, setDirFilter] = useState<DirFilter>("all");
  // Rail filter sits next to direction so a user can ask things like
  // "show me only this address's EVM activity" or "only its staking ops"
  // — both common asks on a mixed-rail chain.
  const [railFilter, setRailFilter] = useState<RailFilter>("all");
  const { data: account, loading: accountLoading } = useAddress(network, addr);
  const { data: history, loading: historyLoading } = useAddressHistory(network, addr, page);
  const { data: tokens, loading: tokensLoading } = useAccountTokens(network, addr);
  const { data: eventLogs, loading: eventLogsLoading } = useEventLogs(network, addr);
  const label = useAddressLabel(addr);

  const filtered = (history ?? []).filter((tx) => {
    if (dirFilter !== "all") {
      const isIn = tx.to.toLowerCase() === addr.toLowerCase();
      if ((dirFilter === "in") !== isIn) return false;
    }
    if (railFilter !== "all") {
      const rail = classifyRail({ to_address: tx.to, data: tx.input_data });
      if (rail !== railFilter) return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
      <PageHeader
        icon={Wallet}
        eyebrow="Address"
        title={label?.name ?? "Account"}
        actions={
          <div className="flex items-center gap-2">
            {label && (() => {
              const tone = toneForKind(label.kind);
              return (
                <span className={`inline-flex items-center text-[10px] font-mono uppercase tracking-[.12em] rounded-md px-2 py-1 border ${tone.bg} ${tone.fg} ${tone.border}`}>
                  {label.kind}
                </span>
              );
            })()}
            {/* Sourcify verification badge — only meaningful for contract addresses, but harmless on EOAs (returns "unverified" badge) */}
            <SourcifyBadge network={network} address={addr} />
            <WatchButton address={addr} kind="address" label={label?.name} />
          </div>
        }
      />

      {/* Address bar */}
      <div className="flex items-center gap-2 bg-muted/40 rounded-lg p-3 border border-border/60">
        <span className="text-sm font-mono break-all flex-1" data-address={addr}>{addr}</span>
        <Copyable text={addr} bare label="Address" />
      </div>

      {/* Private note (localStorage, stays in-browser) */}
      <AddressNote address={addr} />

      {/* Balance hero — DeBank-inspired single big number with the secondary
          metrics demoted to one chip-row beneath. Reads as "this is the
          headline; nonce/tx-count are footnotes" instead of three equal
          stat cards competing for attention. */}
      <Card>
        <CardContent className="p-6 md:p-8">
          <div className="space-y-2 min-w-0">
            <p className="font-mono text-[10px] tracking-[.22em] uppercase text-[var(--tx-d)]">Balance</p>
            <div className="font-serif font-light leading-none truncate" style={{ fontSize: "clamp(34px, 5.5vw, 64px)" }}>
              {accountLoading && !account ? (
                <Skeleton className="h-12 w-64" />
              ) : (
                <>
                  <span>{account ? formatSRX(account.balance).replace(/\s*SRX$/i, "") : "0"}</span>
                  <em className="not-italic ml-2 text-[0.45em] text-[var(--gold)]">SRX</em>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 pt-3 text-[11px] font-mono uppercase tracking-[.1em] text-[var(--tx-d)]">
              <span>
                Nonce <span className="text-[var(--tx-m)] normal-case font-mono">{account ? account.nonce : "—"}</span>
              </span>
              <span>
                Tx count <span className="text-[var(--tx-m)] normal-case font-mono">{account?.tx_count !== undefined ? formatNumber(account.tx_count) : "—"}</span>
              </span>
              {tokens && tokens.length > 0 && (
                <span>
                  Tokens <span className="text-[var(--tx-m)] normal-case font-mono">{tokens.length}</span>
                </span>
              )}
              <span className="ml-auto text-[10px] tracking-[.15em]">
                Network: <span className="text-[var(--gold)] uppercase">{network}</span>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs — `line` variant for the gold-underline active state that
          reads as "tool, not card." Counts inline so the user can scan
          where the data is (Etherscan/Blockscout pattern). */}
      <Tabs defaultValue="history" className="space-y-4">
        <TabsList variant="line">
          <TabsTrigger value="history">
            Transactions <CountBadge count={history?.length ?? null} />
          </TabsTrigger>
          <TabsTrigger value="internal">Internal</TabsTrigger>
          <TabsTrigger value="tokens">
            Tokens <CountBadge count={tokens?.length ?? null} />
          </TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="events">
            Events <CountBadge count={eventLogs?.length ?? null} />
          </TabsTrigger>
          <TabsTrigger value="contract">Contract</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <Card>
            <CardContent className="p-0">
              {/* Filter bar + CSV export. Two pill rows: direction and rail.
                  Both apply simultaneously — e.g. "Outbound + EVM" shows
                  only EVM contracts this address called. */}
              <div className="flex items-center gap-2 p-3 border-b border-border flex-wrap">
                <span className="text-xs text-muted-foreground mr-2">Direction:</span>
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
                <span className="text-xs text-muted-foreground ml-3 mr-2">Rail:</span>
                {(
                  [
                    { key: "all", label: "All" },
                    { key: "evm", label: "EVM" },
                    { key: "native", label: "Native" },
                    { key: "token", label: "SRC-20" },
                    { key: "stake", label: "Staking" },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setRailFilter(p.key)}
                    className={`text-xs px-3 py-1 rounded-md border transition-colors ${
                      railFilter === p.key
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "border-border text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {p.label}
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
                  {/* Desktop table — single column hidden md+ on narrow viewports.
                      Below md the same data renders as a stacked card list so
                      mobile users don't have to scroll-pan a 6-column table. */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs text-muted-foreground bg-muted/30">
                          <th className="px-3 py-2.5 font-medium w-7"></th>
                          <th className="px-4 py-2.5 font-medium">Tx Hash</th>
                          <th className="px-4 py-2.5 font-medium">Age</th>
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
                          const peerAddr = isSelf ? tx.from : isIn ? tx.from : tx.to;
                          return (
                            <tr key={tx.id}>
                              <td className="px-3 py-2.5">{dirIcon}</td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <TxHash hash={tx.id} />
                                  <RailBadge rail={classifyRail({ to_address: tx.to, data: tx.input_data })} size="sm" />
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-muted-foreground text-xs">
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

                  {/* Mobile stacked-card layout (<md). Each tx becomes a card
                      with the direction icon + amount on the right and tx-hash
                      + peer + age stacked on the left. Avoids horizontal scroll
                      which feels broken on phones. */}
                  <ul className="md:hidden divide-y divide-border/60">
                    {filtered.map((tx) => {
                      const isIn = tx.to.toLowerCase() === addr.toLowerCase();
                      const isSelf = isIn && tx.from.toLowerCase() === addr.toLowerCase();
                      const success = tx.status !== "failed";
                      const peerAddr = isSelf ? tx.from : isIn ? tx.from : tx.to;
                      return (
                        <li key={tx.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors">
                          <div className={`mt-0.5 h-7 w-7 rounded-md flex items-center justify-center shrink-0 ${
                            isSelf ? "bg-muted" : isIn ? "bg-green-500/10" : "bg-red-500/10"
                          }`}>
                            {isSelf ? <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" /> : isIn ? <ArrowDown className="h-3.5 w-3.5 text-green-500" /> : <ArrowUp className="h-3.5 w-3.5 text-red-500" />}
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <TxHash hash={tx.id} />
                              <RailBadge rail={classifyRail({ to_address: tx.to, data: tx.input_data })} size="sm" />
                              {!success && <StatusBadge status="failed" size="sm" />}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                              <span>{isIn ? "from" : "to"}</span>
                              {peerAddr === "COINBASE" || peerAddr.toUpperCase() === "COINBASE" ? (
                                <span className="font-mono text-[var(--tx-d)]">COINBASE</span>
                              ) : (
                                <Address address={peerAddr} showCopy={false} className="text-[11px]" />
                              )}
                              <span className="text-[var(--tx-d)]">·</span>
                              <Timestamp timestamp={tx.timestamp} />
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`font-mono text-sm ${isSelf ? "text-muted-foreground" : isIn ? "text-green-500" : "text-red-500"}`}>
                              {isSelf ? "" : isIn ? "+" : "-"}{tx.amount}
                            </span>
                            <div className="text-[10px] text-muted-foreground font-mono">SRX</div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

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

        <TabsContent value="internal">
          <InternalTxsPlaceholder />
        </TabsContent>

        <TabsContent value="approvals">
          <Card>
            <CardContent className="p-0">
              <ApprovalsTab network={network} address={addr} />
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

        <TabsContent value="contract" className="space-y-4">
          <SourcifyViewer network={network} address={addr} />
          <ReadContract network={network} address={addr} />
          <WriteContract network={network} address={addr} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
