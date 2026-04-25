"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages?: number;
  hasMore?: boolean;
  onPageChange: (page: number) => void;
  className?: string;
}

// DECISION: when totalPages is unknown, we only expose prev/next + "hasMore" hint — mirrors Etherscan behavior for unbounded lists.
export function Pagination({ page, totalPages, hasMore, onPageChange, className }: PaginationProps) {
  const hasPrev = page > 1;
  const hasNext = totalPages != null ? page < totalPages : !!hasMore;

  function go(p: number) {
    if (totalPages != null) p = Math.min(totalPages, Math.max(1, p));
    else p = Math.max(1, p);
    onPageChange(p);
  }

  const buttonBase =
    "inline-flex items-center justify-center h-8 min-w-8 px-2 text-xs border border-border rounded-md hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors";

  return (
    <div className={cn("flex items-center justify-center gap-1 p-3", className)}>
      {totalPages != null && (
        <button onClick={() => go(1)} disabled={!hasPrev} className={buttonBase} aria-label="First page">
          <ChevronsLeft className="h-3.5 w-3.5" />
        </button>
      )}
      <button onClick={() => go(page - 1)} disabled={!hasPrev} className={buttonBase} aria-label="Previous page">
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <span className="px-2 text-xs text-muted-foreground font-mono">
        {totalPages != null ? `Page ${page} of ${totalPages}` : `Page ${page}`}
      </span>
      <button onClick={() => go(page + 1)} disabled={!hasNext} className={buttonBase} aria-label="Next page">
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
      {totalPages != null && (
        <button onClick={() => go(totalPages)} disabled={!hasNext} className={buttonBase} aria-label="Last page">
          <ChevronsRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
