"use client";

import { Star } from "lucide-react";
import { useWatched, type WatchKind } from "@/lib/watchlist";
import { cn } from "@/lib/utils";

interface WatchButtonProps {
  address: string;
  kind: WatchKind;
  label?: string;
  className?: string;
}

// Star toggle that pins/unpins an address into the per-browser watchlist.
// The label is what shows up in the watchlist viewer; we accept it from the
// host page so the star button doesn't have to re-derive it (the address
// page already resolved the canonical label by the time we render).

export function WatchButton({ address, kind, label, className }: WatchButtonProps) {
  const { watched, toggle } = useWatched(address);

  return (
    <button
      type="button"
      onClick={() => toggle({ kind, label })}
      title={watched ? "Remove from watchlist" : "Add to watchlist"}
      aria-pressed={watched}
      className={cn(
        "inline-flex items-center gap-1 h-8 px-2.5 rounded-full border text-[11px] tracking-[.08em] uppercase transition-colors",
        watched
          ? "border-[var(--gold)]/40 text-[var(--gold)] bg-[color-mix(in_oklab,var(--gold)_10%,transparent)] hover:bg-[color-mix(in_oklab,var(--gold)_15%,transparent)]"
          : "border-[var(--brd)] text-[var(--tx-d)] hover:text-[var(--gold)] hover:border-[var(--gold)]/30",
        className,
      )}
    >
      <Star className={cn("h-3.5 w-3.5", watched && "fill-[var(--gold)]")} />
      <span className="hidden sm:inline">{watched ? "Watched" : "Watch"}</span>
    </button>
  );
}
