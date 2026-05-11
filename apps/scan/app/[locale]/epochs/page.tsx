"use client";

import { useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { CalendarRange, Layers } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DetailCard } from "@/components/common/DetailCard";
import { InfoRow } from "@/components/common/InfoRow";
import { StatCard } from "@/components/common/StatCard";
import { useNetwork, useNetworkFromQuery } from "@/lib/network-context";
import { useStats, useCurrentEpoch, useValidators } from "@/lib/hooks";
import { formatNumber, formatSRX } from "@/lib/format";

// Mirrors the staking-layer constant. Epochs are 28,800 blocks long — at 1s
// blocks that's exactly 8 hours — so we can derive every past epoch's height
// range from a single counter without a dedicated API.
const EPOCH_LENGTH = 28_800;
const PAST_TO_SHOW = 12;

// DECISION: Epoch view is the primary unit for staking analytics — rewards
// are settled at boundaries, validator set rotates at boundaries, slashing
// looks at the last full epoch's missed-blocks counter. This page surfaces:
//
//   - the current epoch (live — what's happening right now)
//   - a tail of recent past epochs with their height ranges so a user can
//     deep-link to "blocks produced in epoch N" via the list page
//   - validator set count + total stake at the current epoch boundary
//
// No new backend endpoint required: `/epoch/current` already exists and
// /validators carries enough to render the active set count. Past epochs
// are derived locally from epoch_number — historical epoch payouts will
// require an indexer-side endpoint we haven't built yet (the indexer
// scaffold has the schema; renderer wires up once that ships).

export default function EpochsPage() {
  const { network } = useNetwork();
  useNetworkFromQuery();
  const { data: stats } = useStats(network);
  const { data: epoch } = useCurrentEpoch(network);
  const { data: validators } = useValidators(network);

  // null while the validators query is in-flight — the StatCard
  // accepts null as "show em-dash" rather than rendering "0 SRX",
  // which previously read as if no one was bonded on the chain.
  const totalBonded = useMemo<number | null>(() => {
    if (!validators) return null;
    return validators.reduce((s, v) => s + (v.stake ?? 0), 0);
  }, [validators]);

  const past = useMemo<Array<{ n: number; start: number; end: number }>>(() => {
    if (!epoch) return [];
    const out: Array<{ n: number; start: number; end: number }> = [];
    for (let i = 1; i <= PAST_TO_SHOW; i++) {
      const n = epoch.epoch_number - i;
      if (n < 0) break;
      const start = n * EPOCH_LENGTH;
      const end = start + EPOCH_LENGTH - 1;
      out.push({ n, start, end });
    }
    return out;
  }, [epoch]);

  // Raw difference can exceed EPOCH_LENGTH when /epoch/current is stale
  // (chain restarted past an epoch boundary, counter didn't refresh).
  // Clamp the displayed "blocks-in" so the "X of EPOCH_LENGTH" hint
  // doesn't read as nonsense (we were rendering "347,604 of 28,800").
  const rawBlocksIn = stats && epoch ? stats.height - epoch.start_height + 1 : 0;
  const epochStale = rawBlocksIn > EPOCH_LENGTH;
  const currentBlocksIn = Math.min(rawBlocksIn, EPOCH_LENGTH);
  const currentProgressPct = epoch
    ? Math.min(100, Math.max(0, (currentBlocksIn / EPOCH_LENGTH) * 100))
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={CalendarRange}
        eyebrow="EPOCHS"
        title={epoch ? `Epoch ${epoch.epoch_number} (current)` : "Epochs"}
      />

      {/* ── Headline stats ─────────────────────────── */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Current epoch"
          value={epoch ? `#${epoch.epoch_number}` : "—"}
          accent="var(--gold)"
        />
        <StatCard
          label="Active validators"
          value={
            stats?.active_validators != null
              ? formatNumber(stats.active_validators)
              : "—"
          }
          accent="var(--blue)"
        />
        <StatCard
          label="Total bonded"
          value={totalBonded != null ? formatSRX(totalBonded) : "—"}
          loading={totalBonded == null}
          accent="var(--green)"
        />
        <StatCard
          label="Epoch length"
          value="28,800 blk"
          accent="var(--purple)"
        />
      </div>

      {/* ── Current-epoch detail ──────────────────── */}
      <DetailCard title="Current epoch detail">
        {epoch && stats ? (
          <>
            <InfoRow label="Epoch number" value={`#${epoch.epoch_number}`} />
            <InfoRow
              label="Block range"
              value={
                <span className="font-mono text-xs">
                  {epoch.start_height.toLocaleString()} →{" "}
                  {epoch.end_height.toLocaleString()}
                </span>
              }
              hint={
                epochStale
                  ? `Epoch boundary passed — chain is at #${stats.height.toLocaleString()} but /epoch/current still reports #${epoch.epoch_number}. Refreshing soon.`
                  : `${currentBlocksIn.toLocaleString()} of ${EPOCH_LENGTH.toLocaleString()} blocks produced — ${currentProgressPct.toFixed(1)}% complete.`
              }
            />
            <div className="py-3 border-b border-border/60">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-[var(--gold)] transition-all"
                  style={{ width: `${currentProgressPct}%` }}
                />
              </div>
            </div>
            <InfoRow
              label="Total staked at boundary"
              value={formatSRX(epoch.total_staked / 100_000_000)}
              hint="Sum of self-stake + delegations across the active set when this epoch started."
            />
            <InfoRow
              label="Rewards this epoch"
              value={`${formatSRX(epoch.total_rewards / 100_000_000)}`}
              hint="Sentri minted to the protocol treasury since this epoch began."
            />
            <InfoRow
              label="Blocks produced"
              value={formatNumber(epoch.total_blocks_produced)}
              last
            />
          </>
        ) : (
          <div className="text-sm text-muted-foreground py-4">Loading…</div>
        )}
      </DetailCard>

      {/* ── Past epochs ──────────────────────────── */}
      <DetailCard
        title={
          <span className="inline-flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" /> Past {PAST_TO_SHOW} epochs
          </span>
        }
      >
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
                <th className="px-6 py-2 font-medium">Epoch</th>
                <th className="px-6 py-2 font-medium">First block</th>
                <th className="px-6 py-2 font-medium">Last block</th>
                <th className="px-6 py-2 font-medium text-right">Blocks</th>
              </tr>
            </thead>
            <tbody>
              {past.map((e) => (
                <tr key={e.n} className="border-b border-border/30 last:border-0">
                  <td className="px-6 py-2.5 font-mono">#{e.n}</td>
                  <td className="px-6 py-2.5 font-mono text-xs">
                    <Link
                      href={`/blocks/${e.start}`}
                      className="text-[var(--gold)] hover:underline"
                    >
                      {e.start.toLocaleString()}
                    </Link>
                  </td>
                  <td className="px-6 py-2.5 font-mono text-xs">
                    <Link
                      href={`/blocks/${e.end}`}
                      className="text-[var(--gold)] hover:underline"
                    >
                      {e.end.toLocaleString()}
                    </Link>
                  </td>
                  <td className="px-6 py-2.5 text-right font-mono text-xs">{EPOCH_LENGTH.toLocaleString()}</td>
                </tr>
              ))}
              {past.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-6 text-center text-muted-foreground text-sm">No past epochs yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </DetailCard>

      {/* ── Footnote ──────────────────────────────── */}
      <DetailCard title="What an epoch does">
        <div className="text-sm leading-relaxed text-muted-foreground space-y-2 py-1">
          <p>
            An epoch is the basic unit Sentrix uses for everything time-bucketed: validator-set
            rotation, reward settlement, slashing windows, and the consensus-jail boundary
            check (post-fork). At the end of every epoch the active validator set is
            recomputed, accrued rewards are pushed to delegators&apos; claim balances, and
            jail evidence (if any) is dispatched as a system transaction.
          </p>
          <p>
            Length is fixed at <span className="font-mono">28,800 blocks</span> (≈ 8 hours at
            our 1-second block target), set by the staking layer at the
            consensus level — not a parameter the scan can override.
          </p>
        </div>
      </DetailCard>
    </div>
  );
}
