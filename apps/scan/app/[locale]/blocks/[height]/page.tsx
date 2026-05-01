"use client";

import { use, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Blocks, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Address } from "@/components/common/Address";
import { TxHash } from "@/components/common/TxHash";
import { BlockHeight } from "@/components/common/BlockHeight";
import { Timestamp } from "@/components/common/Timestamp";
import { InfoRow } from "@/components/common/InfoRow";
import { Copyable } from "@/components/common/Copyable";
import { Pagination } from "@/components/common/Pagination";
import { PageHeader } from "@/components/common/PageHeader";
import { useNetwork } from "@/lib/network-context";
import { useBlock } from "@/lib/hooks";
import { classifyRail, RailBadge, type Rail } from "@/components/common/RailBadge";

const TX_PAGE_SIZE = 25;
type RailFilter = "all" | Rail;

export default function BlockDetailPage({ params }: { params: Promise<{ height: string }> }) {
  const { height } = use(params);
  const { network } = useNetwork();
  const blockHeight = parseInt(height, 10);
  const { data: block, loading } = useBlock(network, blockHeight);
  const [txPage, setTxPage] = useState(1);
  const [railFilter, setRailFilter] = useState<RailFilter>("all");

  // Per-rail counts surfaced on the Transactions tab so the user can see
  // at a glance "this block was 12 EVM txs, 5 native, 3 SRC-20" without
  // scrolling the table.
  const railCounts = useMemo(() => {
    const txs = block?.transactions ?? [];
    const counts: Record<Rail, number> = { evm: 0, native: 0, token: 0, stake: 0 };
    for (const tx of txs) {
      counts[classifyRail({ to_address: tx.to, data: tx.input_data })] += 1;
    }
    return counts;
  }, [block]);

  const filteredTxs = useMemo(() => {
    const txs = block?.transactions ?? [];
    if (railFilter === "all") return txs;
    return txs.filter(
      (tx) => classifyRail({ to_address: tx.to, data: tx.input_data }) === railFilter,
    );
  }, [block, railFilter]);

  const pagedTxs = useMemo(() => {
    const start = (txPage - 1) * TX_PAGE_SIZE;
    return filteredTxs.slice(start, start + TX_PAGE_SIZE);
  }, [filteredTxs, txPage]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!block) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Block #{height} not found</p>
            <Link href="/blocks" className="text-primary hover:underline text-sm mt-2 inline-block">Back to blocks</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const txCount = block.transactions?.length || 0;
  const totalTxPages = Math.max(1, Math.ceil(filteredTxs.length / TX_PAGE_SIZE));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
      <PageHeader
        icon={Blocks}
        eyebrow="Block Height"
        title={`#${block.index.toLocaleString()}`}
        mono
        actions={
          <div className="flex gap-2">
            {blockHeight > 0 && (
              <Link href={`/blocks/${blockHeight - 1}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:bg-muted border border-border rounded-lg px-3 py-1.5 transition-colors">
                <ChevronLeft className="h-4 w-4" /> Prev
              </Link>
            )}
            <Link href={`/blocks/${blockHeight + 1}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:bg-muted border border-border rounded-lg px-3 py-1.5 transition-colors">
              Next <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        }
      />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList variant="line">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">
            Transactions <span className="ml-1.5 inline-flex items-center justify-center min-w-[1.5em] px-1 h-4 rounded text-[10px] font-mono leading-none bg-muted text-muted-foreground">{txCount}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Header — the human-readable facts */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="eyebrow">Header</CardTitle>
            </CardHeader>
            <CardContent className="px-6 py-0">
              <InfoRow label="Block Height" value={<BlockHeight height={block.index} link={false} />} />
              <InfoRow label="Timestamp" value={<Timestamp timestamp={block.timestamp} absolute />} />
              <InfoRow label="Transactions" value={String(txCount)} />
              <InfoRow
                label="Validator"
                value={
                  <div className="flex items-center gap-2 flex-wrap">
                    <Address address={block.validator} truncate={false} />
                    {block.validator_name && (
                      <span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                        {block.validator_name}
                      </span>
                    )}
                  </div>
                }
              />
              {block.round != null && (
                <InfoRow
                  label="BFT Round"
                  value={
                    <span className="font-mono text-xs">
                      {block.round}
                      {block.round === 0 && (
                        <span className="ml-2 text-[10px] text-green-500">first-round (happy path)</span>
                      )}
                    </span>
                  }
                  hint="0 = block finalised on the proposer's first attempt. Higher rounds mean the cluster needed a re-proposal — usually network jitter, not a problem."
                />
              )}
              {block.justification && (
                <InfoRow
                  label="Justification signers"
                  value={
                    <span className="font-mono text-xs">
                      {block.justification.precommits.length} precommit
                      {block.justification.precommits.length === 1 ? "" : "s"} ·{" "}
                      {(
                        block.justification.precommits.reduce(
                          (s, p) => s + (p.stake_weight ?? 0),
                          0,
                        ) / 100_000_000
                      ).toFixed(2)}{" "}
                      SRX stake-weight
                    </span>
                  }
                  hint="2/3+1 stake-weighted supermajority is required to finalise; signers listed here are the validators whose precommit was included in the justification."
                />
              )}
              <InfoRow
                label="Block reward"
                value={<span className="font-mono">1 SRX → Protocol Treasury (claim via StakingOp::ClaimRewards)</span>}
                hint="Post-V4 reward-v2 fork: coinbase routes to the protocol treasury; validators + delegators claim accrued rewards instead of being paid directly."
              />
              {/* Burnt fees: native txs flat-fee (10,000 sentri) split 50/50
                  validator-vs-burn. EVM txs hit the same protocol min-fee path
                  for the burn side so this is a faithful lower bound; the exact
                  per-tx fee differential isn't in the block payload (would need
                  per-receipt walk). At 1s blocks + low EVM traffic the
                  approximation matches the supply burn meter to <0.1%. */}
              <InfoRow
                label="Burnt fees"
                value={
                  <span className="font-mono">
                    {(txCount * 0.00005).toFixed(5)} SRX
                    {txCount > 0 && (
                      <span className="ml-2 text-[10px] text-[var(--pink)]">
                        (50% of {txCount}×0.0001 SRX min-fee)
                      </span>
                    )}
                  </span>
                }
                hint="Half of every native transaction fee is destroyed forever; the other half pays the validator. Cumulative burn rolls into /supply."
                last
              />
            </CardContent>
          </Card>

          {/* Hashes — long hex values, grouped separately so the eye doesn't drown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="eyebrow">Hashes</CardTitle>
            </CardHeader>
            <CardContent className="px-6 py-0">
              <InfoRow
                label="Block Hash"
                value={
                  <span className="inline-flex items-center gap-2 font-mono break-all">
                    {block.hash}
                    <Copyable text={block.hash} bare />
                  </span>
                }
              />
              <InfoRow
                label="Parent Hash"
                value={
                  blockHeight > 0 ? (
                    <Link href={`/blocks/${blockHeight - 1}`} className="inline-flex items-center gap-2 font-mono text-primary hover:underline break-all">
                      {block.previous_hash}
                      <Copyable text={block.previous_hash} bare />
                    </Link>
                  ) : (
                    <span className="font-mono break-all">{block.previous_hash}</span>
                  )
                }
              />
              <InfoRow
                label="Merkle Root"
                value={
                  <span className="inline-flex items-center gap-2 font-mono break-all">
                    {block.merkle_root}
                    <Copyable text={block.merkle_root} bare />
                  </span>
                }
                hint="Hash of all transaction hashes in this block"
                last
              />
            </CardContent>
          </Card>

          {/* Consensus — only render on PoW-style chains that actually populate
              nonce/difficulty. Sentrix is DPoS+BFT (no PoW), so the backend
              omits both; hide the whole card instead of rendering two empty rows. */}
          {(block.nonce != null && String(block.nonce) !== "" && block.nonce !== 0) ||
           (block.difficulty != null && String(block.difficulty) !== "" && block.difficulty !== 0) ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="eyebrow">Consensus</CardTitle>
              </CardHeader>
              <CardContent className="px-6 py-0">
                {block.nonce != null && String(block.nonce) !== "" && (
                  <InfoRow label="Nonce" value={<span className="font-mono">{block.nonce}</span>} last={block.difficulty == null} />
                )}
                {block.difficulty != null && String(block.difficulty) !== "" && (
                  <InfoRow label="Difficulty" value={<span className="font-mono">{block.difficulty}</span>} last />
                )}
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader className="pb-3 space-y-3">
              <CardTitle className="text-base">Block Transactions</CardTitle>
              {/* Rail breakdown + filter — Sentrix mixes EVM and native txs in
                  the same block; surfacing per-rail counts up front lets the
                  user see what kind of activity this block carried without
                  scanning the table. */}
              {txCount > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { key: "all", label: "All", n: txCount },
                      { key: "evm", label: "EVM", n: railCounts.evm },
                      { key: "native", label: "Native", n: railCounts.native },
                      { key: "token", label: "SRC-20", n: railCounts.token },
                      { key: "stake", label: "Staking", n: railCounts.stake },
                    ] as const
                  ).map((p) => {
                    const active = railFilter === p.key;
                    const dimmed = !active && p.n === 0;
                    return (
                      <button
                        key={p.key}
                        onClick={() => {
                          setRailFilter(p.key);
                          setTxPage(1);
                        }}
                        disabled={p.n === 0 && p.key !== "all"}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : dimmed
                              ? "bg-transparent text-muted-foreground/50 border-border/40 cursor-default"
                              : "bg-transparent text-muted-foreground border-border/60 hover:text-foreground hover:border-border"
                        }`}
                      >
                        {p.label}
                        <span className="ml-1.5 opacity-70 font-mono">{p.n}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {txCount === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No transactions in this block.</div>
              ) : pagedTxs.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No {railFilter} transactions in this block.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs text-muted-foreground bg-muted/30">
                          <th className="px-4 py-2.5 font-medium">Tx Hash</th>
                          <th className="px-4 py-2.5 font-medium">From</th>
                          <th className="px-4 py-2.5 font-medium">To</th>
                          <th className="px-4 py-2.5 font-medium text-right">Amount</th>
                          <th className="px-4 py-2.5 font-medium text-right">Fee</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60 row-hover">
                        {pagedTxs.map((tx) => (
                          <tr key={tx.id}>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <TxHash hash={tx.id} />
                                <RailBadge rail={classifyRail({ to_address: tx.to, data: tx.input_data })} size="sm" />
                              </div>
                            </td>
                            <td className="px-4 py-2.5"><Address address={tx.from} muted showCopy={false} className="text-xs" /></td>
                            <td className="px-4 py-2.5"><Address address={tx.to} muted showCopy={false} className="text-xs" /></td>
                            <td className="px-4 py-2.5 text-right font-mono">{tx.amount} SRX</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground font-mono">{tx.fee} SRX</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredTxs.length > TX_PAGE_SIZE && (
                    <div className="border-t border-border">
                      <Pagination page={txPage} totalPages={totalTxPages} onPageChange={setTxPage} />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
