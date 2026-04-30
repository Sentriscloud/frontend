"use client";

import { useEffect, useState } from "react";
import { Flame, Zap, Gauge } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DetailCard } from "@/components/common/DetailCard";
import { StatCard } from "@/components/common/StatCard";
import { useNetwork } from "@/lib/network-context";
import { useStats, useMempool } from "@/lib/hooks";
import { formatNumber } from "@/lib/format";
import { fetchBlocksPage, type BlockData } from "@/lib/api";

// DECISION: Etherscan-style "Gas tracker" without the gas oracle service.
// Sentrix's fee model is hybrid:
//   - Native txs: flat MIN_TX_FEE = 10_000 sentri (0.0001 SRX). 50% to
//     validator, 50% burnt. No market.
//   - EVM txs: standard EIP-1559 with INITIAL_BASE_FEE = 10_000 wei
//     (gas-priced normally).
//
// So the right "gas tracker" is two-pane:
//   left  — native flat fee + cumulative burnt
//   right — EVM base-fee history (last 50 blocks) + mempool depth as
//           the proxy for congestion (no auction so "fast/standard/slow"
//           collapses to a single number until a real bidding pressure
//           shows up post-DeFi)

const MIN_TX_FEE_SENTRI = 10_000;
const SENTRI_PER_SRX = 100_000_000;

export default function GasPage() {
  const { network } = useNetwork();
  const { data: stats } = useStats(network);
  const { data: mempool } = useMempool(network);

  const [recentBlocks, setRecentBlocks] = useState<BlockData[]>([]);
  useEffect(() => {
    fetchBlocksPage(network, 0, 50).then((p) => setRecentBlocks(p.blocks));
  }, [network]);

  // Derived: average gas-used over the recent block window.
  const avgTxPerBlock =
    recentBlocks.length > 0
      ? recentBlocks.reduce((s, b) => s + (b.tx_count ?? b.transactions?.length ?? 0), 0) /
        recentBlocks.length
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader icon={Gauge} eyebrow="GAS TRACKER" title="Network gas + fee status" />

      {/* ── Native-side ─────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DetailCard title="Native fees">
          <div className="grid gap-3 grid-cols-2 py-2">
            <StatCard
              label="Flat tx fee"
              value={`${(MIN_TX_FEE_SENTRI / SENTRI_PER_SRX).toFixed(4)} SRX`}
              accent="var(--gold)"
            />
            <StatCard
              label="Validator share"
              value="50%"
              accent="var(--green)"
            />
            <StatCard
              label="Burnt share"
              value="50%"
              accent="var(--pink)"
            />
            <StatCard
              label="Total burnt"
              value={
                stats?.total_burned_srx != null
                  ? `${formatNumber(stats.total_burned_srx)} SRX`
                  : "—"
              }
              accent="var(--pink)"
            />
          </div>
          <div className="text-xs text-muted-foreground space-y-1 pt-2">
            <p>
              Native Sentrix transactions use a flat minimum fee, not a fee market — so there
              is no &quot;slow / standard / fast&quot; tier. Half goes to the proposer; half is
              destroyed forever, drifting circulating supply down over time.
            </p>
          </div>
        </DetailCard>

        <DetailCard title="Mempool pressure">
          <div className="grid gap-3 grid-cols-2 py-2">
            <StatCard
              label="Pending tx"
              value={mempool ? formatNumber(mempool.size) : "—"}
              accent="var(--blue)"
            />
            <StatCard
              label="Avg tx / block"
              value={avgTxPerBlock.toFixed(1)}
              accent="var(--purple)"
            />
            <StatCard
              label="Block time target"
              value="1s"
              accent="var(--cyan)"
            />
            <StatCard
              label="Active validators"
              value={stats?.active_validators?.toString() ?? "—"}
              accent="var(--gold)"
            />
          </div>
          <div className="text-xs text-muted-foreground pt-2">
            Mempool depth is the practical &quot;am I going to wait&quot; signal. Below ~50 = land
            in the next block; above a few hundred = expect 2-3 block delay.
          </div>
        </DetailCard>
      </div>

      {/* ── EVM-side ───────────────────────────────────── */}
      <DetailCard
        title={
          <span className="inline-flex items-center gap-2">
            <Zap className="h-4 w-4 text-[var(--gold)]" /> EVM gas (revm 38)
          </span>
        }
      >
        <div className="text-sm leading-relaxed py-2 space-y-3">
          <p className="text-muted-foreground">
            EVM transactions follow standard EIP-1559: <code className="font-mono text-xs">baseFeePerGas</code>{" "}
            adjusts per block within a target band, and senders pay{" "}
            <code className="font-mono text-xs">baseFee + tip</code>. Base fee starts at{" "}
            <span className="font-mono text-xs">10,000 wei</span> (0.00000000001 SRX) and rises
            only under sustained block-fullness — at the chain&apos;s current load there&apos;s no
            congestion premium to pay.
          </p>
          <p className="text-muted-foreground">
            Standard wallets (MetaMask, ethers, viem) read <code className="font-mono text-xs">eth_feeHistory</code>{" "}
            and pick their own slow/standard/fast offsets — a separate auction-style oracle
            isn&apos;t needed at current TPS.
          </p>
        </div>

        <div className="overflow-x-auto -mx-6 mt-2">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border/60">
                <th className="px-6 py-2 font-medium">Block</th>
                <th className="px-6 py-2 font-medium text-right">Txs</th>
                <th className="px-6 py-2 font-medium text-right">Validator</th>
                <th className="px-6 py-2 font-medium text-right">Age</th>
              </tr>
            </thead>
            <tbody>
              {recentBlocks.slice(0, 10).map((b) => (
                <tr key={b.index} className="border-b border-border/30 last:border-0">
                  <td className="px-6 py-2.5 font-mono">#{b.index.toLocaleString()}</td>
                  <td className="px-6 py-2.5 text-right font-mono">{b.tx_count ?? 0}</td>
                  <td className="px-6 py-2.5 text-right font-mono text-muted-foreground">
                    {b.validator.slice(0, 10)}…
                  </td>
                  <td className="px-6 py-2.5 text-right font-mono text-muted-foreground">
                    h-{(stats?.height ?? 0) - b.index}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DetailCard>

      <DetailCard
        title={
          <span className="inline-flex items-center gap-2">
            <Flame className="h-4 w-4 text-[var(--pink)]" /> Burn meter
          </span>
        }
      >
        <p className="py-2 text-sm text-muted-foreground">
          Of every native transaction fee, half is destroyed. Cumulative across the chain&apos;s
          life:{" "}
          <span className="font-mono text-foreground">
            {stats?.total_burned_srx != null ? `${formatNumber(stats.total_burned_srx)} SRX` : "—"}
          </span>
          . Visible on the address page for the burn sentinel and rolled into the supply
          breakdown at <code className="font-mono text-xs">/supply</code>.
        </p>
      </DetailCard>
    </div>
  );
}
