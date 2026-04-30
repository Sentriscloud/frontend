"use client";

// Lightweight client-side index that powers the header search dropdown.
// We already polled `tokens` + `validators` for their respective list pages,
// so re-using those caches is free — no extra RPC traffic. The index is just
// a flat list of `(label, secondaryLabel, address, kind)` rows that the
// autocomplete fuzzy-matches against.
//
// We index two kinds:
//   - token   — match by symbol OR name OR contract-address prefix
//   - validator — match by moniker OR address prefix
//
// Filtering happens in-memory; the dataset is small (a few dozen tokens, a
// handful of validators), so a linear scan is plenty fast and avoids pulling
// in fuse.js / lunr just for this.

import { useMemo } from "react";
import { useTokens, useValidators } from "./hooks";
import type { NetworkId } from "./chain";

export type SearchHit = {
  kind: "token" | "validator";
  label: string;
  secondary: string;
  href: string;
  address: string;
};

const RECENT_KEY = "sentrix-scan:recent-searches:v1";
const RECENT_MAX = 8;

export type RecentEntry = {
  q: string;
  label: string;
  href: string;
  ts: number;
};

export function useSearchIndex(network: NetworkId): {
  match: (q: string, limit?: number) => SearchHit[];
  ready: boolean;
} {
  const { data: tokens } = useTokens(network);
  const { data: validators } = useValidators(network);

  return useMemo(() => {
    const tokenHits: SearchHit[] = (tokens ?? []).map((t) => ({
      kind: "token" as const,
      label: t.symbol || t.name || t.contract_address,
      secondary: t.name && t.name !== t.symbol ? t.name : t.contract_address.slice(0, 12) + "…",
      href: `/tokens/${t.contract_address}`,
      address: t.contract_address.toLowerCase(),
    }));

    const validatorHits: SearchHit[] = (validators ?? []).map((v) => ({
      kind: "validator" as const,
      label: v.name || v.address,
      secondary: v.address.slice(0, 12) + "…" + v.address.slice(-6),
      href: `/validators/${v.address}`,
      address: v.address.toLowerCase(),
    }));

    const all = [...tokenHits, ...validatorHits];

    function match(q: string, limit = 6): SearchHit[] {
      const needle = q.trim().toLowerCase();
      if (!needle) return [];
      // Score: prefix-match on label/symbol > substring on label > substring on
      // secondary. Stable order, capped at `limit`.
      const scored = all
        .map((h) => {
          const label = h.label.toLowerCase();
          const sec = h.secondary.toLowerCase();
          if (label === needle) return { h, score: 0 };
          if (label.startsWith(needle)) return { h, score: 1 };
          if (h.address === needle) return { h, score: 1 };
          if (h.address.startsWith(needle)) return { h, score: 2 };
          if (label.includes(needle)) return { h, score: 3 };
          if (sec.includes(needle)) return { h, score: 4 };
          return null;
        })
        .filter((x): x is { h: SearchHit; score: number } => x !== null)
        .sort((a, b) => a.score - b.score)
        .slice(0, limit)
        .map((x) => x.h);
      return scored;
    }

    return {
      match,
      ready: tokens != null && validators != null,
    };
  }, [tokens, validators]);
}

// Recent-searches helpers — localStorage backed, capped at RECENT_MAX. We store
// the resolved label + href so the dropdown can re-render the entry without
// re-running the index match (which may be cold during first paint).

export function getRecentSearches(): RecentEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentEntry[];
    return Array.isArray(parsed) ? parsed.slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

export function pushRecentSearch(entry: Omit<RecentEntry, "ts">): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getRecentSearches().filter((r) => r.href !== entry.href);
    const next: RecentEntry[] = [{ ...entry, ts: Date.now() }, ...existing].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* quota exceeded / private browsing — silently drop */
  }
}

export function clearRecentSearches(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    /* noop */
  }
}
