"use client";

import { GitFork, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DetailCard } from "@/components/common/DetailCard";
import { useNetwork } from "@/lib/network-context";
import { useStats } from "@/lib/hooks";
import { FORKS, forkStateAt, type ForkEntry } from "@/lib/forks/registry";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

// DECISION: a fork-history page that listing teams, security reviewers, and
// curious users can read top-to-bottom and understand "what changed when".
// Two viewing modes share one source of truth (`lib/forks/registry.ts`):
//
//   - Top section: a per-fork card on the active network with current status
//     (active vs scheduled vs dormant) and the activation height.
//   - Bottom section: cross-network comparison table so Satya can spot drift
//     between mainnet and testnet at a glance.
//
// Source of truth lives in the internal Sentrix Labs fork-gates reference.
// The registry below is hand-synced any time we ship a new fork.

export default function ForksPage() {
  const { network } = useNetwork();
  const { data: stats } = useStats(network);
  const height = stats?.height ?? 0;

  const sorted = [...FORKS].sort((a, b) => {
    const ah = a.heights[network];
    const bh = b.heights[network];
    if (ah == null && bh == null) return 0;
    if (ah == null) return 1;
    if (bh == null) return -1;
    return ah - bh;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        icon={GitFork}
        eyebrow="HARD-FORK HISTORY"
        title={`Fork timeline — ${network === "mainnet" ? "Mainnet" : "Testnet"} (h=${formatNumber(height)})`}
      />

      <DetailCard title="What this is">
        <p className="text-sm leading-relaxed text-muted-foreground py-1">
          Sentrix ships protocol changes through height-gated forks: every consensus-affecting
          change has an activation height, and nodes that reach that height switch to the new
          rules. This page lists every fork that has been defined for the chain — when it
          activates, what it changes, and whether it&apos;s currently dormant.
        </p>
      </DetailCard>

      {/* ── Per-fork cards (chronological on this network) ── */}
      <div className="grid gap-4">
        {sorted.map((f) => {
          const state = forkStateAt(f, network, height);
          return <ForkCard key={f.id} fork={f} state={state} network={network} />;
        })}
      </div>

      {/* ── Cross-network comparison ────────────────── */}
      <DetailCard title="Cross-network comparison">
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
                <th className="px-6 py-2 font-medium">Fork</th>
                <th className="px-6 py-2 font-medium text-right">Mainnet</th>
                <th className="px-6 py-2 font-medium text-right">Testnet</th>
              </tr>
            </thead>
            <tbody>
              {FORKS.map((f) => (
                <tr key={f.id} className="border-b border-border/30 last:border-0">
                  <td className="px-6 py-3 font-mono text-xs">{f.title}</td>
                  <td className="px-6 py-3 text-right font-mono text-xs">
                    {f.heights.mainnet == null
                      ? <span className="text-muted-foreground">dormant</span>
                      : formatNumber(f.heights.mainnet)}
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-xs">
                    {f.heights.testnet == null
                      ? <span className="text-muted-foreground">dormant</span>
                      : formatNumber(f.heights.testnet)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DetailCard>
    </div>
  );
}

function ForkCard({
  fork,
  state,
  network,
}: {
  fork: ForkEntry;
  state: "active" | "scheduled" | "dormant";
  network: "mainnet" | "testnet";
}) {
  const fh = fork.heights[network];
  const Icon =
    state === "active" ? CheckCircle2
      : state === "scheduled" ? Clock
        : AlertTriangle;
  const tone =
    state === "active" ? "text-green-500"
      : state === "scheduled" ? "text-yellow-500"
        : fork.state === "danger" ? "text-red-500" : "text-muted-foreground";
  const stateLabel =
    state === "active" ? "Active"
      : state === "scheduled" ? `Scheduled @ h=${fh!.toLocaleString()}`
        : fork.state === "danger" ? "Dormant — DO NOT activate"
          : "Dormant";

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="font-mono text-sm font-semibold">{fork.title}</div>
          <div className="text-sm text-muted-foreground mt-0.5">{fork.summary}</div>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium",
            "border-border bg-muted/40",
            tone,
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {stateLabel}
        </span>
      </div>
      <p className="text-sm leading-relaxed">{fork.description}</p>
      {fh != null && (
        <div className="text-xs text-muted-foreground font-mono">
          Activation height ({network}): {fh.toLocaleString()}
        </div>
      )}
    </div>
  );
}
