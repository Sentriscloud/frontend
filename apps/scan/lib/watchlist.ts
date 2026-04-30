"use client";

import { useEffect, useState } from "react";

// localStorage-backed watchlist. We don't have user accounts (deferred to
// post-launch per the audit), so the star is per-browser. Same shape as
// the recent-searches store — single key, JSON-encoded array, capped.
//
// One unified namespace covers addresses + tokens + validators because
// they're all 0x-prefixed hex addresses on Sentrix. The `kind` field lets
// the UI render an icon/label appropriate to the entry without reading
// the underlying contract bytecode.

const KEY = "sentrix-scan:watchlist:v1";
const MAX = 50;

export type WatchKind = "address" | "validator" | "token" | "contract";

export interface WatchEntry {
  /** lowercased 0x-prefixed address — used as the dedup key */
  address: string;
  /** caller-provided display label (canonical name when known) */
  label?: string;
  /** which kind of entity — drives icon + URL routing */
  kind: WatchKind;
  /** ms since epoch when the entry was starred — used for sort + diagnostics */
  ts: number;
}

function read(): WatchEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WatchEntry[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

function write(list: WatchEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
    window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
  } catch {
    /* quota exceeded — silently drop */
  }
}

export function getWatchlist(): WatchEntry[] {
  return read();
}

export function isWatched(address: string): boolean {
  const a = address.toLowerCase();
  return read().some((e) => e.address === a);
}

export function addWatch(entry: Omit<WatchEntry, "ts">): void {
  const a = entry.address.toLowerCase();
  const existing = read().filter((e) => e.address !== a);
  write([{ ...entry, address: a, ts: Date.now() }, ...existing]);
}

export function removeWatch(address: string): void {
  const a = address.toLowerCase();
  write(read().filter((e) => e.address !== a));
}

export function toggleWatch(entry: Omit<WatchEntry, "ts">): boolean {
  if (isWatched(entry.address)) {
    removeWatch(entry.address);
    return false;
  }
  addWatch(entry);
  return true;
}

// Reactive hook — listens to the same-page custom storage events fired by
// `write()` so the star button on the address page reflects the live state
// even when the change came from a different component or browser tab.
export function useWatched(address: string): {
  watched: boolean;
  toggle: (entry: Omit<WatchEntry, "ts" | "address">) => void;
} {
  const [watched, setWatched] = useState(false);

  useEffect(() => {
    setWatched(isWatched(address));
    function onStorage(e: StorageEvent) {
      if (e.key === KEY || !e.key) {
        setWatched(isWatched(address));
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [address]);

  return {
    watched,
    toggle: (entry) => {
      const next = toggleWatch({ ...entry, address });
      setWatched(next);
    },
  };
}
