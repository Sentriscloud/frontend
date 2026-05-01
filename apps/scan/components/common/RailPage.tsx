"use client";

// Shared layout for the dedicated rail pages (/evm, /native). Sentrix
// runs EVM and native side-by-side at the protocol level — newcomers
// landing on the home page see a mixed feed and get confused. These
// pages are the focused single-rail view: explainer, rail-filtered tx
// feed, and curated deep-links to the relevant sub-pages.

import { Cpu, Boxes, ArrowUpDown, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { DetailCard } from "@/components/common/DetailCard";
import { Address } from "@/components/common/Address";
import { TxHash } from "@/components/common/TxHash";
import { Timestamp } from "@/components/common/Timestamp";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useNetwork } from "@/lib/network-context";
import { useTransactions } from "@/lib/hooks";
import { classifyRail, RailBadge, type Rail } from "@/components/common/RailBadge";

interface QuickLink {
  href: "/blocks" | "/tokens" | "/contracts" | "/validators" | "/epochs" | "/supply";
  label: string;
  hint: string;
}

interface RailPageProps {
  rail: Rail;
}

const COPY: Record<
  Rail,
  {
    title: string;
    eyebrow: string;
    explainerTitle: string;
    explainer: string;
    icon: typeof Cpu;
    links: QuickLink[];
    matchHint: string;
  }
> = {
  evm: {
    title: "EVM rail",
    eyebrow: "EVM",
    icon: Cpu,
    explainerTitle: "What this is",
    explainer:
      "EVM transactions executed by the embedded revm runtime against Solidity / Vyper contracts. " +
      "Same wire format as Ethereum — eth_sendRawTransaction, EIP-1559 fees, ERC-20 / ERC-721 / ERC-1155. " +
      "Anything you'd expect to see on Etherscan lives here. Native staking, native SRC-20, and plain SRX " +
      "transfers all run on the other rail and won't appear in this feed.",
    matchHint:
      "No EVM transactions in the latest window. EVM activity ramps up as more contracts deploy — try the Contracts page below.",
    links: [
      { href: "/contracts", label: "Contracts", hint: "Verified Solidity sources via Sourcify" },
      { href: "/tokens", label: "ERC-20 tokens", hint: "Token list, holders, transfers" },
      { href: "/blocks", label: "All blocks", hint: "Block-by-block tx breakdown" },
    ],
  },
  native: {
    title: "Native rail",
    eyebrow: "NATIVE",
    icon: Boxes,
    explainerTitle: "What this is",
    explainer:
      "Native Sentrix operations applied directly at the protocol level — no contract gas, no revm. " +
      "Plain SRX transfers, validator coordination (Delegate / Undelegate / ClaimRewards / RegisterValidator / " +
      "AddSelfStake / Unjail), and SRC-20 token operations (Mint / Burn / Transfer / Approve / Deploy). " +
      "These are Sentrix-specific primitives — they won't show up under EVM-style tooling because they " +
      "never touch the EVM.",
    matchHint:
      "No native transactions in the latest window. Validators settle on the native rail every few seconds — try the Validators page below.",
    links: [
      { href: "/validators", label: "Validators", hint: "Active set, stake, commission, jail state" },
      { href: "/epochs", label: "Epochs", hint: "Reward distribution + validator rotation" },
      { href: "/supply", label: "Supply", hint: "315M cap, halving curve, premine breakdown" },
    ],
  },
  // The home filter pills also surface SRC-20 + Staking, but the dedicated
  // pages are EVM + Native only — the two that confuse users most. The
  // entries below are placeholders so the type stays exhaustive.
  token: {
    title: "SRC-20 rail",
    eyebrow: "SRC-20",
    icon: Boxes,
    explainerTitle: "",
    explainer: "",
    matchHint: "",
    links: [],
  },
  stake: {
    title: "Staking rail",
    eyebrow: "STAKING",
    icon: Boxes,
    explainerTitle: "",
    explainer: "",
    matchHint: "",
    links: [],
  },
};

export function RailPage({ rail }: RailPageProps) {
  const { network } = useNetwork();
  // Pull a wider window (40) than the home feed (10) so a slow rail
  // (e.g. EVM with limited contract activity) still surfaces something
  // meaningful after the rail filter is applied.
  const { data: txs, loading } = useTransactions(network, 40, null);
  const cfg = COPY[rail];
  const Icon = cfg.icon;

  const filtered = (txs ?? []).filter(
    (tx) => classifyRail({ to_address: tx.to, data: tx.input_data }) === rail,
  );

  return (
    <div className="space-y-6">
      <PageHeader icon={Icon} eyebrow={cfg.eyebrow} title={cfg.title} />

      <DetailCard title={cfg.explainerTitle}>
        <p className="py-2 text-sm text-muted-foreground leading-relaxed">{cfg.explainer}</p>
      </DetailCard>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-primary" />
            Latest {cfg.eyebrow} transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && !txs ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" style={{ opacity: 1 - i * 0.1 }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title={`No ${cfg.eyebrow.toLowerCase()} txs yet`}
              hint={cfg.matchHint}
            />
          ) : (
            <div className="divide-y divide-border/60">
              {filtered.slice(0, 15).map((tx) => {
                const success = tx.status !== "failed";
                return (
                  <div
                    key={tx.id}
                    className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${
                          success ? "bg-green-500/10" : "bg-red-500/10"
                        }`}
                      >
                        <ArrowUpDown
                          className={`h-3.5 w-3.5 ${success ? "text-green-500" : "text-red-500"}`}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <TxHash hash={tx.id} />
                          <RailBadge rail={rail} size="sm" />
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          <Timestamp timestamp={tx.timestamp} />
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 min-w-0">
                      <div className="text-[11px] font-mono truncate">
                        <Address address={tx.from} muted showCopy={false} />
                      </div>
                      <p className="text-xs font-semibold font-mono">{tx.amount} SRX</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Where to dig deeper</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {cfg.links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-border/60 hover:border-border hover:bg-muted/30 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{l.label}</p>
                <p className="text-xs text-muted-foreground">{l.hint}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
