"use client";

import { useEffect, useRef, useState } from "react";
import { useNetwork } from "@/lib/network-context";
import { useStats } from "@/lib/hooks";
import { cn } from "@/lib/utils";

// DECISION: traffic-light dot in the header tracking three states the
// operator + the user both want at a glance:
//
//   green  — chain head advanced in the last 5s (1s blocks expected;
//            5s of staleness covers normal jitter)
//   yellow — head hasn't advanced for 5–30s (a single missed block round)
//   red    — head hasn't advanced for >30s (BFT round-spin / halt)
//
// The hook polls `useStats` which is already on a 5s tick; we just track
// the last-changed timestamp and compare against `Date.now()` on every
// render. No additional polling, no extra RPC traffic.

export function NetworkHealth() {
  const { network } = useNetwork();
  const { data: stats } = useStats(network);
  const lastHeight = useRef<number | null>(null);
  const lastChange = useRef<number>(Date.now());
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (stats?.height != null && stats.height !== lastHeight.current) {
      lastHeight.current = stats.height;
      lastChange.current = Date.now();
    }
  }, [stats?.height]);

  // Re-render every 2s so the colour transitions live without waiting for
  // the next stats poll.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 2000);
    return () => clearInterval(id);
  }, []);

  const sinceMs = now - lastChange.current;
  const tone =
    sinceMs < 5000 ? "green"
    : sinceMs < 30000 ? "yellow"
    : "red";

  const label =
    tone === "green" ? `Chain advancing — h=${stats?.height ?? "—"}`
    : tone === "yellow" ? `No new block for ${Math.round(sinceMs / 1000)}s — possible stall`
    : `No new block for ${Math.round(sinceMs / 1000)}s — chain may be halted`;

  return (
    <span
      title={label}
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-mono"
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          tone === "green" && "bg-green-500 animate-pulse",
          tone === "yellow" && "bg-yellow-500",
          tone === "red" && "bg-red-500",
        )}
      />
      <span className="hidden md:inline text-muted-foreground">
        {tone === "green" ? "advancing" : tone === "yellow" ? "stalled?" : "halted"}
      </span>
    </span>
  );
}
