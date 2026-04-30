import { Boxes, Coins, Cpu, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";

// DECISION: Sentrix is one of the only chains where SRC-20 (native TokenOps)
// and ERC-20 (EVM) live side-by-side at the protocol level. A user staring
// at a tx page has to be told which rail this tx travelled on — otherwise the
// "I sent SRX but Etherscan-style decoded view shows nothing" confusion is
// the dominant support ticket. Four rails:
//
//   - "evm"    — eth_sendRawTransaction call against an EVM contract
//   - "native" — basic native SRX transfer (no token op encoded)
//   - "token"  — native SRC-20 op (Mint / Burn / Transfer / Approve / Deploy)
//   - "stake"  — native StakingOp (Delegate / Undelegate / ClaimRewards /
//                RegisterValidator / AddSelfStake / Unjail)
//
// Colours pull from the chain's existing accent palette so the badge feels
// native to the explorer, not a slap-on add-on.

export type Rail = "evm" | "native" | "token" | "stake";

const STYLES: Record<Rail, { bg: string; text: string; border: string; icon: React.ElementType; label: string; tooltip: string }> = {
  evm: {
    bg: "bg-[color-mix(in_oklab,var(--blue)_12%,transparent)]",
    text: "text-[var(--blue)]",
    border: "border-[color-mix(in_oklab,var(--blue)_25%,transparent)]",
    icon: Cpu,
    label: "EVM",
    tooltip: "EVM transaction — executed by the embedded revm runtime against a Solidity / Vyper contract.",
  },
  native: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-[var(--brd)]",
    icon: Boxes,
    label: "Native",
    tooltip: "Native Sentrix transfer — moves SRX between two accounts without invoking a contract.",
  },
  token: {
    bg: "bg-[color-mix(in_oklab,var(--gold)_12%,transparent)]",
    text: "text-[var(--gold)]",
    border: "border-[color-mix(in_oklab,var(--gold)_25%,transparent)]",
    icon: Coins,
    label: "SRC-20",
    tooltip: "Native SRC-20 token operation (Mint / Burn / Transfer / Approve / Deploy) — runs at the protocol level, not via revm.",
  },
  stake: {
    bg: "bg-[color-mix(in_oklab,var(--green)_12%,transparent)]",
    text: "text-[var(--green)]",
    border: "border-[color-mix(in_oklab,var(--green)_25%,transparent)]",
    icon: Landmark,
    label: "Staking",
    tooltip: "Native staking operation (Delegate / Undelegate / Claim / RegisterValidator / AddSelfStake / Unjail) — applied directly against the stake registry.",
  },
};

interface RailBadgeProps {
  rail: Rail;
  size?: "sm" | "md";
  className?: string;
  /** Override the default label (e.g. "Delegate" instead of generic "Staking"). */
  label?: string;
}

export function RailBadge({ rail, size = "sm", className, label }: RailBadgeProps) {
  const cfg = STYLES[rail];
  const Icon = cfg.icon;
  const displayLabel = label ?? cfg.label;
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
      {displayLabel}
    </span>
  );
}

/** Heuristic: classify a tx into a rail from the data + to_address fields the
 *  REST API returns. Centralised so every page that renders a rail badge
 *  agrees on the answer.
 *
 *    - to_address == 0x0000…0000 sentinel → SRC-20 TokenOp
 *    - to_address == 0x0000…0100 sentinel → Native StakingOp
 *    - data starts with "EVM:" prefix     → EVM call
 *    - everything else                    → Native SRX transfer
 */
export function classifyRail(tx: { to_address?: string | null; data?: string | null }): Rail {
  const to = (tx.to_address ?? "").toLowerCase();
  if (to === "0x0000000000000000000000000000000000000000") return "token";
  if (to === "0x0000000000000000000000000000000000000100") return "stake";
  if (tx.data && tx.data.startsWith("EVM:")) return "evm";
  return "native";
}
