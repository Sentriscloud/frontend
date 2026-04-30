"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Blocks as BlocksIcon, Coins, FileCode, History, Shield, Users, X } from "lucide-react";
import { useNetwork } from "@/lib/network-context";
import {
  clearRecentSearches,
  getRecentSearches,
  pushRecentSearch,
  useSearchIndex,
  type RecentEntry,
  type SearchHit,
} from "@/lib/search-index";

// Header autocomplete dropdown.
//
// Three states it can be in:
//   1. empty input  → recent searches (localStorage, last 8)
//   2. typed input that resolves to a raw block/tx/address — show single
//      "go to X" hint matching the existing typed-hint behaviour
//   3. typed input that doesn't resolve — fuzzy-match against the in-memory
//      token + validator index, show up to 6 results grouped by kind
//
// Submitting the form falls through to the parent `handleSearch` which
// already handles the raw-type case + redirects unknown queries to the
// `/search` page.

type Props = {
  query: string;
  onPick: () => void;
};

type RawHint = {
  kind: "block" | "tx" | "address" | "src20";
  label: string;
  href: string;
  icon: typeof BlocksIcon;
};

function detectRaw(q: string): RawHint | null {
  if (/^\d+$/.test(q)) return { kind: "block", label: "Block", href: `/blocks/${q}`, icon: BlocksIcon };
  if (/^0x[a-fA-F0-9]{64}$/.test(q)) return { kind: "tx", label: "Transaction", href: `/tx/${q}`, icon: FileCode };
  if (/^0x[a-fA-F0-9]{40}$/.test(q)) return { kind: "address", label: "Address", href: `/address/${q}`, icon: Users };
  if (/^SRC20_[a-fA-F0-9]{40}$/i.test(q)) return { kind: "src20", label: "Token", href: `/tokens/${q}`, icon: Coins };
  return null;
}

function iconForHit(kind: SearchHit["kind"]): typeof BlocksIcon {
  return kind === "token" ? Coins : Shield;
}

export function SearchAutocomplete({ query, onPick }: Props) {
  const router = useRouter();
  const { network } = useNetwork();
  const { match } = useSearchIndex(network);
  const [recents, setRecents] = useState<RecentEntry[]>([]);

  // Refresh recents whenever the dropdown opens or storage changes — gives
  // the user the up-to-date list across tabs without complicated bus wiring.
  useEffect(() => {
    setRecents(getRecentSearches());
    function onStorage(e: StorageEvent) {
      if (e.key && e.key.startsWith("sentrix-scan:recent-searches")) {
        setRecents(getRecentSearches());
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [query]);

  const q = query.trim();

  function handlePick(href: string, label: string, raw: string) {
    pushRecentSearch({ q: raw, label, href });
    setRecents(getRecentSearches());
    router.push(
      href as "/blocks/${string}" | "/tx/${string}" | "/address/${string}" | "/tokens/${string}" | "/validators/${string}",
    );
    onPick();
  }

  // ── empty-state: recent searches ──────────────────────────────────
  if (!q) {
    if (recents.length === 0) return null;
    return (
      <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--bk)]/95 backdrop-blur-xl border border-[var(--brd)] rounded-lg shadow-[0_10px_40px_rgba(0,0,0,.3)] z-50 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--brd)]">
          <span className="text-[10px] font-mono tracking-[.2em] uppercase text-[var(--tx-d)]">
            Recent
          </span>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              clearRecentSearches();
              setRecents([]);
            }}
            className="text-[10px] font-mono tracking-[.1em] uppercase text-[var(--tx-d)] hover:text-[var(--gold)]"
          >
            <X className="h-3 w-3 inline" />
          </button>
        </div>
        <ul className="py-1 max-h-72 overflow-y-auto">
          {recents.map((r) => (
            <li key={r.href}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handlePick(r.href, r.label, r.q);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[color-mix(in_oklab,var(--gold)_5%,transparent)] transition-colors"
              >
                <History className="h-3.5 w-3.5 text-[var(--tx-d)]" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs truncate">{r.label}</div>
                  <div className="text-[10px] font-mono text-[var(--tx-d)] truncate">{r.q}</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // ── typed state: combine raw-detection + index match ──────────────
  const raw = detectRaw(q);
  const hits = match(q);

  // Nothing matched at all
  if (!raw && hits.length === 0) {
    return (
      <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--bk)]/95 backdrop-blur-xl border border-[var(--brd)] rounded-lg shadow-[0_10px_40px_rgba(0,0,0,.3)] p-3 z-50 text-xs text-muted-foreground">
        Press Enter to search across blocks, txs, addresses, symbols, and validator names.
      </div>
    );
  }

  return (
    <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--bk)]/95 backdrop-blur-xl border border-[var(--brd)] rounded-lg shadow-[0_10px_40px_rgba(0,0,0,.3)] z-50 overflow-hidden">
      {raw && (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handlePick(raw.href, `${raw.label} ${q.slice(0, 18)}…`, q);
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[color-mix(in_oklab,var(--gold)_5%,transparent)] transition-colors text-left border-b border-[var(--brd)]"
        >
          <raw.icon className="h-4 w-4 text-[var(--gold)]" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-mono tracking-[.15em] uppercase text-[var(--tx-d)]">
              {raw.label}
            </div>
            <div className="text-xs font-mono truncate">{q}</div>
          </div>
          <kbd className="text-[10px] font-mono text-[var(--tx-d)] border border-[var(--brd)] rounded px-1.5 py-0.5">
            ↵
          </kbd>
        </button>
      )}

      {hits.length > 0 && (
        <ul className="py-1 max-h-80 overflow-y-auto">
          {hits.map((h) => {
            const Icon = iconForHit(h.kind);
            return (
              <li key={h.href}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handlePick(h.href, h.label, q);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[color-mix(in_oklab,var(--gold)_5%,transparent)] transition-colors text-left"
                >
                  <Icon className="h-3.5 w-3.5 text-[var(--gold)]" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs truncate flex items-center gap-2">
                      <span className="font-medium">{h.label}</span>
                      <span className="text-[10px] font-mono uppercase tracking-[.15em] text-[var(--tx-d)]">
                        {h.kind}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-[var(--tx-d)] truncate">
                      {h.secondary}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
