"use client";

import { use, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Users, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Address } from "@/components/common/Address";
import { BlockHeight } from "@/components/common/BlockHeight";
import { Timestamp } from "@/components/common/Timestamp";
import { InfoRow } from "@/components/common/InfoRow";
import { Pagination } from "@/components/common/Pagination";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { useNetwork } from "@/lib/network-context";
import { useValidators, useBlocks, useValidatorRewards, useValidatorBlocksOverTime, useValidatorDelegators, useStats } from "@/lib/hooks";
import { formatNumber } from "@/lib/format";
import { Calculator } from "lucide-react";

// DECISION: lazy-load Recharts to keep initial bundle below 500 kB gzipped target.
const ValidatorChart = dynamic(() => import("./chart").then((m) => m.ValidatorChart), {
  ssr: false,
  loading: () => <Skeleton className="h-56 w-full" />,
});

const PAGE_SIZE = 20;

function statusLabel(s?: string) {
  if (s === "jailed") return { icon: <AlertTriangle className="h-4 w-4 text-orange-500" />, text: "Jailed", color: "text-orange-500" };
  if (s === "inactive") return { icon: <XCircle className="h-4 w-4 text-red-500" />, text: "Inactive", color: "text-red-500" };
  return { icon: <CheckCircle className="h-4 w-4 text-green-500" />, text: "Active", color: "text-green-500" };
}

export default function ValidatorDetailPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params);
  const { network } = useNetwork();
  const { data: validators, loading } = useValidators(network);
  const { data: stats } = useStats(network);
  const { data: recentBlocks } = useBlocks(network, 100);
  const [blockPage, setBlockPage] = useState(1);
  const [rewardsPage, setRewardsPage] = useState(1);
  const { data: rewardsData, loading: rewardsLoading } = useValidatorRewards(network, address, rewardsPage);
  const { data: blocksOverTime } = useValidatorBlocksOverTime(network, address, "1h");
  const { data: delegatorsData, loading: delegatorsLoading } = useValidatorDelegators(network, address);

  const validator = useMemo(
    () => validators?.find((v) => v.address.toLowerCase() === address.toLowerCase()) ?? null,
    [validators, address],
  );

  const producedBlocks = useMemo(() => {
    if (!recentBlocks) return [];
    return recentBlocks.filter((b) => b.validator.toLowerCase() === address.toLowerCase());
  }, [recentBlocks, address]);

  const pagedBlocks = producedBlocks.slice((blockPage - 1) * PAGE_SIZE, blockPage * PAGE_SIZE);
  const totalBlockPages = Math.max(1, Math.ceil(producedBlocks.length / PAGE_SIZE));

  // Backend /validators/{addr}/blocks-over-time returns real time-series buckets.
  const chartData = useMemo(() => {
    if (!blocksOverTime || blocksOverTime.length === 0) return [];
    return blocksOverTime.map((p) => {
      const d = new Date(p.timestamp * 1000);
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return { hour: `${hh}:${mm}`, count: p.count };
    });
  }, [blocksOverTime]);

  if (loading && !validators) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!validator) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Validator not found</p>
            <p className="text-xs font-mono text-muted-foreground mt-2 break-all">{address}</p>
            <Link href="/validators" className="text-primary hover:underline text-sm mt-4 inline-block">Back to validators</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const st = statusLabel(validator.status);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
      <PageHeader
        icon={Users}
        eyebrow="Validator"
        title={validator.name || "Unnamed"}
        actions={
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${st.color}`}>
            {st.icon}
            {st.text}
          </span>
        }
      />

      {/* Stats — on PoA, only Blocks Produced is populated. Render a single hero card in that
          case instead of 4 cards full of em-dashes. Post-Voyager DPoS will re-fill the grid. */}
      {validator.stake !== undefined || validator.commission !== undefined || validator.uptime !== undefined ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Stake"
            value={validator.stake !== undefined ? `${formatNumber(validator.stake)} SRX` : "—"}
            accent="var(--gold)"
          />
          <StatCard
            label="Commission"
            value={validator.commission !== undefined ? `${validator.commission}%` : "—"}
            accent="var(--cyan)"
          />
          <StatCard
            label="Uptime"
            value={validator.uptime !== undefined ? `${validator.uptime.toFixed(1)}%` : "—"}
            accent={
              validator.uptime === undefined ? "var(--tx-d)" :
              validator.uptime >= 99 ? "var(--green)" :
              validator.uptime >= 95 ? "var(--orange)" :
              "var(--red)"
            }
          />
          <StatCard
            label="Blocks Produced"
            value={validator.blocks_produced !== undefined ? formatNumber(validator.blocks_produced) : "—"}
            accent="var(--purple)"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatCard
            label="Blocks Produced"
            value={validator.blocks_produced !== undefined ? formatNumber(validator.blocks_produced) : "—"}
            accent="var(--purple)"
          />
          <StatCard
            label="Consensus"
            value="PoA"
            accent="var(--gold)"
            title="Proof of Authority — stake/commission/uptime are DPoS-only fields."
          />
          <StatCard
            label="Status"
            value={validator.is_active === false ? "Inactive" : "Active"}
            accent={validator.is_active === false ? "var(--red)" : "var(--green)"}
          />
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="blocks">Produced Blocks</TabsTrigger>
          <TabsTrigger value="delegators">Delegators</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="calculator">Calculator</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {/* Only render rows that actually have data. Stake/Commission/Uptime/Rewards are
              DPoS fields the PoA backend omits — listing them as '-' just reads as broken. */}
          <Card>
            <CardContent className="px-6 py-0">
              <InfoRow label="Name" value={validator.name ?? "-"} />
              <InfoRow label="Address" value={<Address address={validator.address} truncate={false} />} />
              <InfoRow label="Status" value={<span className={`inline-flex items-center gap-1.5 text-sm ${st.color}`}>{st.icon}{st.text}</span>} />
              {validator.stake !== undefined && (
                <InfoRow label="Stake" value={<span className="font-mono">{formatNumber(validator.stake)} SRX</span>} />
              )}
              {validator.commission !== undefined && (
                <InfoRow label="Commission" value={<span className="font-mono">{validator.commission}%</span>} />
              )}
              {validator.uptime !== undefined && (
                <InfoRow label="Uptime" value={<span className="font-mono">{validator.uptime.toFixed(1)}%</span>} />
              )}
              <InfoRow
                label="Blocks Produced"
                value={<span className="font-mono">{validator.blocks_produced !== undefined ? formatNumber(validator.blocks_produced) : "-"}</span>}
                last={validator.rewards_earned === undefined}
              />
              {validator.rewards_earned !== undefined && (
                <InfoRow
                  label="Rewards Earned"
                  value={<span className="font-mono">{formatNumber(validator.rewards_earned)} SRX</span>}
                  last
                />
              )}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader><CardTitle className="text-base">Recent Block Activity</CardTitle></CardHeader>
            <CardContent className="p-4">
              {chartData.length > 0 ? (
                <ValidatorChart data={chartData} />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No recent blocks from this validator in the last window.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blocks">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Blocks Produced <span className="text-muted-foreground font-normal text-sm ml-1">({producedBlocks.length} in last 100)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {producedBlocks.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No blocks produced in the last window.</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs text-muted-foreground bg-muted/30">
                          <th className="px-4 py-2.5 font-medium">Block</th>
                          <th className="px-4 py-2.5 font-medium">Age</th>
                          <th className="px-4 py-2.5 font-medium text-right">Transactions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60 row-hover">
                        {pagedBlocks.map((b) => (
                          <tr key={b.index}>
                            <td className="px-4 py-2.5"><BlockHeight height={b.index} /></td>
                            <td className="px-4 py-2.5 text-muted-foreground text-xs"><Timestamp timestamp={b.timestamp} /></td>
                            <td className="px-4 py-2.5 text-right">{b.tx_count ?? b.transactions?.length ?? 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {producedBlocks.length > PAGE_SIZE && (
                    <div className="border-t border-border">
                      <Pagination page={blockPage} totalPages={totalBlockPages} onPageChange={setBlockPage} />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delegators">
          <Card>
            <CardContent className="p-0">
              {delegatorsLoading && !delegatorsData ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : delegatorsData && delegatorsData.delegators.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground bg-muted/30">
                        <th className="px-4 py-2.5 font-medium w-10">#</th>
                        <th className="px-4 py-2.5 font-medium">Delegator</th>
                        <th className="px-4 py-2.5 font-medium text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 row-hover">
                      {delegatorsData.delegators.map((d, i) => (
                        <tr key={d.address}>
                          <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-2.5"><Address address={d.address} /></td>
                          <td className="px-4 py-2.5 text-right font-mono">{formatNumber(d.amount_srx)} SRX</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  icon={Users}
                  title="No delegators"
                  hint="Delegation will become active after the Voyager DPoS upgrade."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards">
          <Card>
            <CardContent className="p-0">
              {rewardsLoading && !rewardsData ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : rewardsData && rewardsData.rewards.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs text-muted-foreground bg-muted/30">
                          <th className="px-4 py-2.5 font-medium">Block</th>
                          <th className="px-4 py-2.5 font-medium">Age</th>
                          <th className="px-4 py-2.5 font-medium text-right">Reward</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60 row-hover">
                        {rewardsData.rewards.map((r) => (
                          <tr key={`${r.block_height}-${r.timestamp}`}>
                            <td className="px-4 py-2.5"><BlockHeight height={r.block_height} /></td>
                            <td className="px-4 py-2.5 text-muted-foreground text-xs"><Timestamp timestamp={r.timestamp} /></td>
                            <td className="px-4 py-2.5 text-right font-mono text-[var(--green)]">+{r.amount.toFixed(2)} SRX</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {(rewardsData.hasMore || rewardsPage > 1) && (
                    <div className="border-t border-border flex items-center justify-between px-4 py-2 text-xs text-muted-foreground">
                      <span>Page {rewardsPage}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setRewardsPage(Math.max(1, rewardsPage - 1))}
                          disabled={rewardsPage === 1}
                          className="px-2 py-1 rounded border border-border hover:bg-muted disabled:opacity-40"
                        >
                          Prev
                        </button>
                        <button
                          onClick={() => setRewardsPage(rewardsPage + 1)}
                          disabled={!rewardsData.hasMore}
                          className="px-2 py-1 rounded border border-border hover:bg-muted disabled:opacity-40"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <EmptyState
                  icon={Users}
                  title="No rewards recorded yet"
                  hint="Rewards land on every block this validator produces."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calculator">
          <RewardsCalculator
            blockRewardSrx={stats?.next_block_reward_srx ?? 1}
            blocksProduced={validator.blocks_produced ?? 0}
            totalBlocks={stats?.total_blocks ?? 1}
            commission={validator.commission ?? 0}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RewardsCalculator({ blockRewardSrx, blocksProduced, totalBlocks, commission }: {
  blockRewardSrx: number;
  blocksProduced: number;
  totalBlocks: number;
  commission: number;
}) {
  const [stake, setStake] = useState(1000);

  // Validator's share of blocks produced (what fraction of total chain blocks came from them).
  const validatorShare = totalBlocks > 0 ? blocksProduced / totalBlocks : 0;

  // Assume ~1 block/sec target rate. Total SRX minted per day = 86400 × block_reward.
  const dailyChainMint = 86400 * blockRewardSrx;

  // Validator's daily revenue (before commission) proportional to share.
  const dailyValidatorRevenue = dailyChainMint * validatorShare;

  // After commission: delegator share = (1 - commission) × their pro-rata of the pool.
  // For a PoA chain without DPoS, stake has no yield — show a clear notice and keep the
  // calculator visible for post-Voyager preview.
  const delegatorShare = (1 - commission / 100);

  // We don't know the delegator pool size here; assume user is a sole delegator for a rough
  // upper-bound ("what if I delegate X SRX today"). Realistically this is diluted by others.
  const estDaily = dailyValidatorRevenue * delegatorShare;
  const estMonthly = estDaily * 30;
  const estYearly = estDaily * 365;

  // Rough APR ignoring other delegators — upper bound.
  const apr = stake > 0 ? (estYearly / stake) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="eyebrow flex items-center gap-2">
          <Calculator className="h-3.5 w-3.5 text-[var(--gold)]" />
          Staking Rewards Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 py-4 space-y-5">
        <p className="text-xs text-muted-foreground">
          Rough estimate assuming you are the sole delegator and this validator keeps the same block-producing
          pace. Real earnings scale down as more delegators share the same pool. Post-Voyager DPoS will replace
          these heuristics with on-chain delegation data.
        </p>

        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm font-medium">Delegate</label>
          <input
            type="number"
            value={stake}
            onChange={(e) => setStake(Math.max(0, Number(e.target.value) || 0))}
            min={0}
            step={100}
            className="w-40 h-9 px-3 rounded-md border border-border bg-muted/30 text-sm font-mono tabular-nums focus:outline-none focus:border-[var(--gold)]"
          />
          <span className="text-sm text-muted-foreground font-mono">SRX</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <EstCard label="Daily" value={`${estDaily.toFixed(4)} SRX`} />
          <EstCard label="Monthly" value={`${estMonthly.toFixed(2)} SRX`} />
          <EstCard label="Yearly" value={`${estYearly.toFixed(2)} SRX`} />
          <EstCard label="APR" value={`${apr.toFixed(2)}%`} accent />
        </div>

        <div className="text-xs text-muted-foreground font-mono border-t border-border/60 pt-3 grid grid-cols-2 gap-2">
          <span>Block reward: <span className="text-foreground">{blockRewardSrx} SRX</span></span>
          <span>Commission: <span className="text-foreground">{commission}%</span></span>
          <span>Validator share: <span className="text-foreground">{(validatorShare * 100).toFixed(2)}%</span></span>
          <span>Chain mint / day: <span className="text-foreground">{formatNumber(Math.round(dailyChainMint))} SRX</span></span>
        </div>
      </CardContent>
    </Card>
  );
}

function EstCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${accent ? "bg-[var(--gold)]/5 border-[var(--gold)]/30" : "bg-muted/30 border-border"}`}>
      <div className="eyebrow mb-1">{label}</div>
      <div className={`font-serif text-xl ${accent ? "text-[var(--gold)]" : ""}`}>{value}</div>
    </div>
  );
}
