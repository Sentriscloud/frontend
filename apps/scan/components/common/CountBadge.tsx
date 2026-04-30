import { cn } from "@/lib/utils";

interface CountBadgeProps {
  count: number | null | undefined;
  className?: string;
}

// Inline numeric badge for tab labels — Etherscan/Blockscout pattern:
//   "Transactions <CountBadge count={234} />" → renders "Transactions 234"
//   with the number visually subordinate so the tab label is still scannable.
//
// We hide on null/undefined (not-yet-loaded) instead of showing 0 so the user
// doesn't see "Approvals 0" before the lookup completes and conclude there
// are no approvals when in fact we just haven't checked yet.

export function CountBadge({ count, className }: CountBadgeProps) {
  if (count == null) return null;
  return (
    <span
      className={cn(
        "ml-1 inline-flex items-center justify-center min-w-[1.5em] px-1 h-4 rounded text-[10px] font-mono leading-none bg-muted text-muted-foreground",
        className,
      )}
    >
      {count > 9999 ? `${(count / 1000).toFixed(1)}K` : count.toLocaleString()}
    </span>
  );
}
