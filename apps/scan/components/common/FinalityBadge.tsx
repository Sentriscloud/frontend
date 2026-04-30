import { CheckCircle2, Clock, Layers, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

// Sentrix BFT finality has four observable states, modelled after the
// way Tendermint-derived chains expose them but renamed to plain English so
// non-technical users get it on first read:
//
//   pending    — tx is in the mempool, no block has included it
//   included   — tx is inside a block, the block is at the chain head
//   justified  — block has 2/3+1 stake-weighted precommit signatures
//                attached (fast finality threshold met for this height)
//   finalized  — at least one descendant block has been justified, so a
//                conflicting block at this height can no longer reach
//                supermajority without slashing → safe to consider settled
//
// "Finalized" is what exchanges + bridges should wait for. We surface the
// distinction prominently because it's a Sentrix-specific value-prop other
// EVM chains don't expose. Keeping the colours separate from `StatusBadge`
// (success/failed) so they can be shown together — a tx can be "Success +
// Finalized" or "Success + Justified" or "Failed + Included" etc.

export type Finality = "pending" | "included" | "justified" | "finalized";

const STYLES: Record<Finality, { bg: string; text: string; border: string; icon: React.ElementType; label: string; tooltip: string }> = {
  pending: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-500",
    border: "border-yellow-500/20",
    icon: Clock,
    label: "Pending",
    tooltip: "In the mempool — not yet included in a block.",
  },
  included: {
    bg: "bg-[color-mix(in_oklab,var(--blue)_12%,transparent)]",
    text: "text-[var(--blue)]",
    border: "border-[color-mix(in_oklab,var(--blue)_25%,transparent)]",
    icon: Layers,
    label: "Included",
    tooltip: "Sealed inside a block at the chain head. Wait for justification before treating as settled.",
  },
  justified: {
    bg: "bg-[color-mix(in_oklab,var(--gold)_12%,transparent)]",
    text: "text-[var(--gold)]",
    border: "border-[color-mix(in_oklab,var(--gold)_25%,transparent)]",
    icon: Shield,
    label: "Justified",
    tooltip: "Block has the 2/3+1 stake-weighted precommit supermajority. Reverting requires slashing.",
  },
  finalized: {
    bg: "bg-green-500/10",
    text: "text-green-500",
    border: "border-green-500/20",
    icon: CheckCircle2,
    label: "Finalized",
    tooltip: "A descendant block has been justified — this height is settled. Safe for exchanges + bridges.",
  },
};

interface FinalityBadgeProps {
  finality: Finality;
  size?: "sm" | "md";
  className?: string;
}

export function FinalityBadge({ finality, size = "sm", className }: FinalityBadgeProps) {
  const cfg = STYLES[finality];
  const Icon = cfg.icon;
  return (
    <span
      title={cfg.tooltip}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        cfg.bg,
        cfg.text,
        cfg.border,
        className,
      )}
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {cfg.label}
    </span>
  );
}

/** Compute the BFT finality state for a tx from the chain head + the block
 *  the tx was included in. Caller passes:
 *   - `txBlockHeight` — null if the tx is still pending in the mempool.
 *   - `latestHeight`  — current chain head as the explorer sees it.
 *   - `hasJustification` — true if the tx's block carries a precommit-
 *                          supermajority justification (every block produced
 *                          under Voyager ships one, but historical pre-fork
 *                          blocks don't, so the caller should consult the
 *                          block payload, not assume).
 *
 *  We call a height "finalized" if at least one descendant block has its own
 *  justification — keeping the rule simple instead of walking the precommit
 *  graph, since under Voyager every block is justified at production time.
 */
export function classifyFinality(opts: {
  txBlockHeight: number | null;
  latestHeight: number | null;
  hasJustification: boolean;
}): Finality {
  if (opts.txBlockHeight == null) return "pending";
  if (!opts.hasJustification) return "included";
  if (opts.latestHeight != null && opts.latestHeight > opts.txBlockHeight) return "finalized";
  return "justified";
}
