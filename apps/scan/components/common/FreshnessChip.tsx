"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface FreshnessChipProps {
  /** ms since epoch when the underlying data was last refreshed.
   *  Pass `Date.now()` after every successful fetch — the chip
   *  re-renders on a 1s tick and shows the relative age. */
  updatedAt: number | null | undefined;
  className?: string;
}

// "Updated 11 secs ago" — DeBank's freshness chip pattern. Sits next to the
// header of any live-data panel. Cheap to add, big perceived-trust win
// because the user sees at a glance whether the data is current vs stale.
//
// We tick every 1s so the user can watch the seconds count up, and switch
// the dot from green → yellow → red depending on staleness so the eye
// catches "this is too stale" without reading the number.

export function FreshnessChip({ updatedAt, className }: FreshnessChipProps) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (updatedAt == null || now == null) {
    return null;
  }

  const ageSec = Math.max(0, Math.floor((now - updatedAt) / 1000));
  const tone =
    ageSec < 10 ? "var(--green)"
    : ageSec < 60 ? "var(--gold)"
    : "var(--red)";
  const text =
    ageSec < 1 ? "Just now"
    : ageSec < 60 ? `Updated ${ageSec}s ago`
    : ageSec < 3600 ? `Updated ${Math.floor(ageSec / 60)}m ago`
    : `Updated ${Math.floor(ageSec / 3600)}h ago`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[.1em] uppercase text-[var(--tx-d)]",
        className,
      )}
    >
      <span
        className="h-1.5 w-1.5 rounded-full animate-pulse-live"
        style={{ background: tone }}
      />
      {text}
    </span>
  );
}
