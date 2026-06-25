"use client";

import { use, useMemo, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
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
import { FetchError } from "@/components/common/FetchError";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useNetwork, useNetworkFromQuery } from "@/lib/network-context";
import { useAddress, useAddressHistory, useAccountTokens, useEventLogs } from "@/lib/hooks";
import { formatSRX, formatNumber } from "@/lib/format";
import { Link } from "@/i18n/navigation";
import { useAddressLabel, toneForKind } from "@/lib/labels";
import { AddressNote } from "@/components/common/AddressNote";
import { SourcifyBadge } from "@/components/common/SourcifyBadge";
import { InternalTxsPlaceholder } from "@/components/common/InternalTxsPlaceholder";

// Tab-only components — none of them are visible until the user clicks
// the matching tab, so eager-importing them inflated /address/[addr]
// First Load JS (409 KB) by ~50–100 KB. AddressAnalytics drags in
// recharts; SourcifyViewer + ReadContract + WriteContract drag in viem
// ABI-encoder + sourcify code-fetch. next/dynamic splits each into its
// own async chunk that downloads only when its tab is selected.
import dynamic from "next/dynamic";
const AddressAnalytics = dynamic(
  () => import("@/components/common/AddressAnalytics").then((m) => ({ default: m.AddressAnalytics })),
  { ssr: false, loading: () => <div className="h-[280px] rounded-xl bg-muted/30 animate-pulse" /> },
);
const SourcifyViewer = dynamic(
  () => import("@/components/common/SourcifyViewer").then((m) => ({ default: m.SourcifyViewer })),
  { ssr: false, loading: () => <div className="h-[200px] rounded-xl bg-muted/30 animate-pulse" /> },
);
const ReadContract = dynamic(
  () => import("@/components/common/ReadContract").then((m) => ({ default: m.ReadContract })),
  { ssr: false, loading: () => <div className="h-[200px] rounded-xl bg-muted/30 animate-pulse" /> },
);
const WriteContract = dynamic(
  () => import("@/components/common/WriteContract").then((m) => ({ default: m.WriteContract })),
  { ssr: false, loading: () => <div className="h-[200px] rounded-xl bg-muted/30 animate-pulse" /> },
);
const ApprovalsTab = dynamic(
  () => import("@/components/common/ApprovalsTab").then((m) => ({ default: m.ApprovalsTab })),
  { ssr: false, loading: () => <div className="h-[200px] rounded-xl bg-muted/30 animate-pulse" /> },
);
import { CountBadge } from "@/components/common/CountBadge";
import { WatchButton } from "@/components/common/WatchButton";
import { downloadCsv } from "@/lib/csv";
import { toMillis } from "@/lib/format";
import { classifyRail, RailBadge, type Rail } from "@/components/common/RailBadge";

type DirFilter = "all" | "in" | "out";
type RailFilter = "all" | Rail;

// 25 tx per page so the user can deep-link a specific page (?page=N) and
// the URL reflects history navigation. Was 20 before — bumped to match the
// rest of the explorer's pagination cadence.
const HISTORY_PAGE_SIZE = 25;

export default function AddressDetailPage({ params }: { params: Promise<{ addr: string }> }) {
  const { addr } = use(params);
  const { network } = useNetwork();
  // `?network=mainnet|testnet` deeplink (faucet, wallet notifications).
  // Address `?page=N` pagination state is independent and stays untouched.
  useNetworkFromQuery();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  // Read page from URL so the user can deep-link / share a specific page.
  // Falls back to 1 for missing or malformed param.
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
  const [dirFilter, setDirFilter] = useState<DirFilter>("all");
  // railFilter is now driven by the active tab — All Txns ↔ "all", EVM
  // tab ↔ "evm", etc. Kept as a separate state because the table render
  // already reads from it; the Tabs onValueChange just forwards.
  const [railFilter, setRailFilter] = useState<RailFilter>("all");
  const [activeTab, setActiveTab] = useState("history");
  const { data: account, loading: accountLoading } = useAddress(network, addr);
  const { data: history, loading: historyLoading, error: historyError, retry: retryHistory } = useAddressHistory(network, addr, page, HISTORY_PAGE_SIZE);
  const { data: tokens, loading: tokensLoading, error: tokensError, retry: retryTokens } = useAccountTokens(network, addr);
  const { data: eventLogs, loading: eventLogsLoading } = useEventLogs(network, addr);
  const label = useAddressLabel(addr);

  // Per-rail counts on the current page of history — feed the inline
  // badges next to each tab trigger so a user lands and sees "EVM 12"
  // without having to click through.
  const historyRailCounts = useMemo(() => {
    const counts: Record<Rail, number> = { evm: 0, native: 0, token: 0, stake: 0 };
    for (const tx of history ?? []) {
      counts[classifyRail({ to_address: tx.to, data: tx.input_data })] += 1;
    }
    return counts;
  }, [history]);

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
          reads as "tool, not card." All / EVM / Native / SRC-20 / Staking
          are sibling rail tabs Etherscan-style; clicking one swaps the
          railFilter that the shared history table reads from. Counts
          shown inline use the per-rail tally so the user can see at a
          glance which rail this address is active on. */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v);
          // Keep railFilter in sync with the active tab so the shared
          // history-table render produces the right slice without each
          // TabsContent block needing its own filter state.
          if (v === "history") setRailFilter("all");
          else if (v === "evm" || v === "native" || v === "token" || v === "stake") setRailFilter(v);
          // Other tabs (internal, tokens, approvals, events, contract) leave
          // railFilter alone — they don't render the history table.
        }}
        className="space-y-4"
      >
        <TabsList variant="line">
          <TabsTrigger value="history">
            All Txns <CountBadge count={history?.length ?? null} />
          </TabsTrigger>
          <TabsTrigger value="evm">
            EVM <CountBadge count={historyRailCounts.evm} />
          </TabsTrigger>
          <TabsTrigger value="native">
            Native <CountBadge count={historyRailCounts.native} />
          </TabsTrigger>
          <TabsTrigger value="token">
            SRC-20 <CountBadge count={historyRailCounts.token} />
          </TabsTrigger>
          <TabsTrigger value="stake">
            Staking <CountBadge count={historyRailCounts.stake} />
          </TabsTrigger>
          <TabsTrigger value="internal">Internal</TabsTrigger>
          <TabsTrigger value="tokens">
            Tokens <CountBadge count={tokens?.length ?? null} />
          </TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="events">
            Events <CountBadge count={eventLogs?.length ?? null} />
          </TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="contract">Contract</TabsTrigger>
        </TabsList>

        {/* All / EVM / Native / SRC-20 / Staking each render the same
            history-table block — railFilter is driven by the active tab,
            so the filter wired into `filtered` produces the right slice
            for each. The Direction filter (in/out) stays inline because
            it composes with whichever rail tab is selected. */}
        {(["history", "evm", "native", "token", "stake"] as const).map((tabValue) => (
        <TabsContent key={tabValue} value={tabValue}>
          <Card>
            <CardContent className="p-0">
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
              ) : historyError ? (
                <FetchError onRetry={retryHistory} />
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
                      // tx_count comes back window-scoped (last ~1000 blocks);
                      // good enough to drive numbered buttons. If unknown,
                      // fall back to the legacy hasMore heuristic so very
                      // active addresses still get a Next button until the
                      // server-side history runs out.
                      totalPages={
                        account?.tx_count != null
                          ? Math.max(1, Math.ceil(account.tx_count / HISTORY_PAGE_SIZE))
                          : undefined
                      }
                      hasMore={history ? history.length >= HISTORY_PAGE_SIZE : false}
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
        ))}

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
              ) : tokensError ? (
                <FetchError onRetry={retryTokens} />
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

        <TabsContent value="analytics">
          <AddressAnalytics history={history ?? null} address={addr} />
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
