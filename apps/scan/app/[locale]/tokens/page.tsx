"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Coins, ArrowUpDown, Search, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Copyable } from "@/components/common/Copyable";
import { Pagination } from "@/components/common/Pagination";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { useNetwork } from "@/lib/network-context";
import { useTokens } from "@/lib/hooks";
import { formatNumber, shortenAddress } from "@/lib/format";

type SortKey = "supply" | "holders" | "transfers" | "none";
type StandardFilter = "all" | "evm" | "tokenop";
const PAGE_SIZE = 25;

export default function TokensPage() {
  const t = useTranslations("tokens");
  const { network } = useNetwork();
  const searchParams = useSearchParams();
  const { data: tokens, loading } = useTokens(network);
  const [sortKey, setSortKey] = useState<SortKey>("none");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [standardFilter, setStandardFilter] = useState<StandardFilter>("all");
  const [page, setPage] = useState(1);
  // ?search= populated by the global search bar in header.tsx when the
  // query was an unknown string (not a tx/address/block). Local state so
  // the chip can be cleared without forcing a route change.
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  // Sync URL → state when the param changes (e.g. user submits another
  // query from the header without leaving /tokens).
  useEffect(() => {
    const incoming = searchParams.get("search") ?? "";
    setSearch(incoming);
    setPage(1);
  }, [searchParams]);

  // Counts before filtering — drive the pill row labels so the user sees
  // at a glance how many tokens of each rail exist on the chain.
  const counts = useMemo(() => {
    const evm = (tokens ?? []).filter((tk) => tk.standard === "evm").length;
    const tokenop = (tokens ?? []).filter((tk) => tk.standard === "tokenop").length;
    return { all: (tokens ?? []).length, evm, tokenop };
  }, [tokens]);

  const sorted = useMemo(() => {
    if (!tokens) return [];
    const railFiltered =
      standardFilter === "all" ? tokens : tokens.filter((tk) => tk.standard === standardFilter);
    const needle = search.trim().toLowerCase();
    const searched = needle
      ? railFiltered.filter(
          (tk) =>
            (tk.symbol?.toLowerCase().includes(needle) ?? false) ||
            (tk.name?.toLowerCase().includes(needle) ?? false) ||
            (tk.contract_address?.toLowerCase().includes(needle) ?? false),
        )
      : railFiltered;
    if (sortKey === "none") return searched;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...searched].sort((a, b) => {
      const av = (sortKey === "supply" ? a.total_supply : sortKey === "holders" ? a.holders : a.transfers) ?? 0;
      const bv = (sortKey === "supply" ? b.total_supply : sortKey === "holders" ? b.holders : b.transfers) ?? 0;
      return (av - bv) * dir;
    });
  }, [tokens, sortKey, sortDir, standardFilter, search]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("desc"); }
  }

  function SortHeader({ label, k }: { label: string; k: SortKey }) {
    const active = sortKey === k;
    return (
      <button
        onClick={() => toggleSort(k)}
        className={`inline-flex items-center gap-1 text-xs font-medium justify-end w-full hover:text-foreground ${active ? "text-foreground" : "text-muted-foreground"}`}
      >
        {label}
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      </button>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
      <PageHeader
        icon={Coins}
        title={t("title")}
        actions={
          tokens ? (
            <span className="text-xs px-2 py-1 rounded-md bg-muted/60 border border-border text-muted-foreground font-mono">
              {t("total", { count: tokens.length })}
            </span>
          ) : null
        }
      />

      <Card>
        <CardHeader className="pb-3 space-y-3">
          <CardTitle className="text-sm text-muted-foreground font-normal">
            {network === "mainnet" ? t("subtitle_mainnet") : t("subtitle_testnet")}
          </CardTitle>
          {/* Rail filter — Sentrix has both EVM (ERC-20) and native (SRC-20)
              tokens at the protocol level. Without this pill row, the two
              get mixed together with only a small badge to tell them apart;
              users hunting for one or the other had to eyeball the list. */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { key: "all", label: "All", n: counts.all },
                { key: "evm", label: "EVM (ERC-20)", n: counts.evm },
                { key: "tokenop", label: "Native (SRC-20)", n: counts.tokenop },
              ] as const
            ).map((p) => {
              const active = standardFilter === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => {
                    setStandardFilter(p.key);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-transparent text-muted-foreground border-border/60 hover:text-foreground hover:border-border"
                  }`}
                >
                  {p.label}
                  <span className="ml-1.5 opacity-70 font-mono">{p.n}</span>
                </button>
              );
            })}
          </div>

          {/* Inline search box — wired to the URL ?search= param so the
              global header search drops the user here pre-filtered when
              the query was a token name/symbol. The chip-style clear
              also drops the URL param so the filter doesn't quietly
              persist across rail-pill clicks. */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Filter by name, symbol, or contract address"
                className="w-full h-8 pl-9 pr-9 text-xs bg-muted/30 border border-border rounded-md focus:outline-none focus:border-primary"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            {search && (
              <span className="text-[11px] text-muted-foreground font-mono">
                {sorted.length} match{sorted.length === 1 ? "" : "es"}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading && !tokens ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : paged.length > 0 ? (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground bg-muted/30">
                      <th className="px-4 py-2.5 font-medium w-10">#</th>
                      <th className="px-4 py-2.5 font-medium">{t("token")}</th>
                      <th className="px-4 py-2.5 font-medium">{t("contract")}</th>
                      <th className="px-4 py-2.5 font-medium text-right">{t("decimals")}</th>
                      <th className="px-4 py-2.5 font-medium text-right"><SortHeader label={t("supply")} k="supply" /></th>
                      <th className="px-4 py-2.5 font-medium text-right hidden md:table-cell"><SortHeader label={t("holders")} k="holders" /></th>
                      <th className="px-4 py-2.5 font-medium text-right hidden lg:table-cell"><SortHeader label={t("transfers")} k="transfers" /></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 row-hover">
                    {paged.map((token, i) => (
                      <tr key={token.contract_address}>
                        <td className="px-4 py-2.5 text-muted-foreground">{(page - 1) * PAGE_SIZE + i + 1}</td>
                        <td className="px-4 py-2.5">
                          <Link href={`/tokens/${token.contract_address}`} className="inline-flex items-center gap-1">
                            <span className="h-7 w-7 rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--gold-d)] flex items-center justify-center text-white text-xs font-semibold shrink-0">
                              {token.symbol.slice(0, 2).toUpperCase()}
                            </span>
                            <span className="flex flex-col">
                              <span className="font-medium text-sm text-primary hover:underline">{token.name}</span>
                              <span className="text-muted-foreground text-xs flex items-center gap-1.5">
                                {token.symbol}
                                {token.standard === "evm" && (
                                  <span className="px-1 py-px rounded bg-[var(--gold)]/15 text-[10px] uppercase tracking-wide text-[var(--gold)] font-mono">EVM</span>
                                )}
                                {token.standard === "tokenop" && (
                                  <span className="px-1 py-px rounded bg-emerald-500/15 text-[10px] uppercase tracking-wide text-emerald-400 font-mono">Native</span>
                                )}
                              </span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center gap-1">
                            <Link href={`/tokens/${token.contract_address}`} className="font-mono text-xs text-primary hover:underline">
                              {shortenAddress(token.contract_address)}
                            </Link>
                            <Copyable text={token.contract_address} bare />
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">{token.decimals}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{formatNumber(token.total_supply)}</td>
                        <td className="px-4 py-2.5 text-right font-mono hidden md:table-cell">{token.holders ?? "-"}</td>
                        <td className="px-4 py-2.5 text-right font-mono hidden lg:table-cell text-muted-foreground">{token.transfers ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile stacked-card layout */}
              <ul className="md:hidden divide-y divide-border/60">
                {paged.map((token, i) => (
                  <li key={token.contract_address} className="px-4 py-3 hover:bg-muted/40 transition-colors">
                    <Link href={`/tokens/${token.contract_address}`} className="flex items-center gap-3">
                      <span className="h-9 w-9 rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--gold-d)] flex items-center justify-center text-white text-xs font-semibold shrink-0">
                        {token.symbol.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm text-primary truncate">{token.name}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">#{(page - 1) * PAGE_SIZE + i + 1}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                          <span className="font-mono uppercase">{token.symbol}</span>
                          <span className="text-[var(--tx-d)]">·</span>
                          <span>supply <span className="font-mono text-[var(--tx-m)]">{formatNumber(token.total_supply)}</span></span>
                          {token.holders !== undefined && (
                            <span>· {token.holders} holders</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>

              {sorted.length > PAGE_SIZE && (
                <div className="border-t border-border">
                  <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                </div>
              )}
            </>
          ) : (
            <EmptyState
              icon={Coins}
              tone="notice"
              title={t("empty_title")}
              hint={t("empty_hint")}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
