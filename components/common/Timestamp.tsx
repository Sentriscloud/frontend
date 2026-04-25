"use client";

import { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { timeAgo, formatTimestamp } from "@/lib/format";
import { cn } from "@/lib/utils";

interface TimestampProps {
  timestamp: string | number;
  className?: string;
  /** If true, show absolute timestamp with relative in tooltip (for detail pages) */
  absolute?: boolean;
}

// DECISION: Re-render every 30s to keep relative time fresh.
// Uses @base-ui tooltip (this project's UI lib), prop name is `delay`.
//
// Hydration: relative time depends on Date.now() which drifts between SSR and CSR. On the very
// first paint we render the absolute timestamp (deterministic), then on mount we flip to the
// relative form. Avoids React error #418 when the rest of the page is server-rendered.
export function Timestamp({ timestamp, className, absolute = false }: TimestampProps) {
  const [mounted, setMounted] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const abs = formatTimestamp(timestamp);
  const rel = mounted ? timeAgo(timestamp) : abs;

  const primary = absolute ? abs : rel;
  const secondary = absolute ? rel : abs;

  return (
    <TooltipProvider delay={150}>
      <Tooltip>
        <TooltipTrigger
          render={<span className={cn("cursor-help", className)}>{primary}</span>}
        />
        <TooltipContent side="top" className="font-mono text-xs">
          {secondary}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
