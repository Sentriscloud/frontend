"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "./EmptyState";

// Shown when a list/table fetch fails with no data. Kept distinct from the
// empty state so an outage doesn't read as "nothing here". Pass the hook's
// retry to offer a one-click refetch.
export function FetchError({ onRetry }: { onRetry?: () => void }) {
  const tc = useTranslations("common");
  return (
    <EmptyState
      tone="warn"
      icon={AlertTriangle}
      title={tc("failed_to_load")}
      hint={tc("failed_to_load_hint")}
      action={
        onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 text-sm font-mono text-[var(--orange)] hover:opacity-80 transition-opacity"
          >
            <RotateCw className="h-3.5 w-3.5" />
            {tc("retry")}
          </button>
        ) : undefined
      }
    />
  );
}
