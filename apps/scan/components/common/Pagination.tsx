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

// When totalPages is unknown we only expose prev/next + hasMore — Etherscan-
// style for unbounded lists. When totalPages is known we render numbered
// buttons with ellipsis collapsing for large ranges (like a typical
// search-result pager).
//
// Numbered window logic: always show first + last, plus ±1 around the
// current page. If a gap of >1 exists between rendered pages, drop in an
// ellipsis cell. The result is at most 7 visible items
// ([1] [...] [4] [5] [6] [...] [N]) which fits comfortably on mobile too.
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
  const buttonActive =
    "inline-flex items-center justify-center h-8 min-w-8 px-2 text-xs border border-[var(--gold)] bg-[color-mix(in_oklab,var(--gold)_10%,transparent)] text-[var(--gold)] rounded-md";

  // Build the numbered window when totalPages is known.
  const numbered: Array<number | "ellipsis"> = [];
  if (totalPages != null) {
    const pages = new Set<number>([1, totalPages, page - 1, page, page + 1]);
    const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
    let prev: number | null = null;
    for (const p of sorted) {
      if (prev !== null && p - prev > 1) numbered.push("ellipsis");
      numbered.push(p);
      prev = p;
    }
  }

  return (
    <div className={cn("flex items-center justify-center gap-1 p-3 flex-wrap", className)}>
      {totalPages != null && (
        <button onClick={() => go(1)} disabled={!hasPrev} className={buttonBase} aria-label="First page">
          <ChevronsLeft className="h-3.5 w-3.5" />
        </button>
      )}
      <button onClick={() => go(page - 1)} disabled={!hasPrev} className={buttonBase} aria-label="Previous page">
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>

      {totalPages != null ? (
        numbered.map((cell, idx) =>
          cell === "ellipsis" ? (
            <span
              key={`ellipsis-${idx}`}
              className="px-1 text-xs text-muted-foreground select-none"
              aria-hidden
            >
              …
            </span>
          ) : (
            <button
              key={cell}
              onClick={() => go(cell)}
              className={cell === page ? buttonActive : buttonBase}
              aria-label={`Page ${cell}`}
              aria-current={cell === page ? "page" : undefined}
            >
              {cell}
            </button>
          ),
        )
      ) : (
        <span className="px-2 text-xs text-muted-foreground font-mono">Page {page}</span>
      )}

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
