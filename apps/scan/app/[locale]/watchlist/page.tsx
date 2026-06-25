"use client";

import { useEffect, useState } from "react";
import { Star, Coins, Shield, Wallet, FileCode, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Link } from "@/i18n/navigation";
import { getWatchlist, removeWatch, type WatchEntry } from "@/lib/watchlist";

// Per-browser watchlist viewer — list all addresses the user has starred
// across address / token / validator pages. Click-through goes to the
// appropriate detail page; hover surfaces a remove button.
//
// We re-read on mount + on the same-tab `storage` event so the page stays
// in sync if the user removes an entry from another tab.

const ICON: Record<WatchEntry["kind"], typeof Wallet> = {
  address: Wallet,
  validator: Shield,
  token: Coins,
  contract: FileCode,
};

const ROUTE: Record<WatchEntry["kind"], (a: string) => string> = {
  address: (a) => `/address/${a}`,
  validator: (a) => `/validators/${a}`,
  token: (a) => `/tokens/${a}`,
  contract: (a) => `/address/${a}`,
};

export default function WatchlistPage() {
  const [list, setList] = useState<WatchEntry[]>([]);

  useEffect(() => {
    setList(getWatchlist());
    function onStorage() {
      setList(getWatchlist());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function handleRemove(address: string) {
    removeWatch(address);
    setList(getWatchlist());
  }

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      <PageHeader icon={Star} eyebrow="WATCHLIST" title="Starred addresses" />

      <Card>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Star}
                title="Watchlist is empty"
                hint="Click the Watch button on any address, validator, or token detail page to add it here. Stored per-browser; no account needed."
              />
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {list.map((e) => {
                const Icon = ICON[e.kind];
                const href = ROUTE[e.kind](e.address);
                return (
                  <li key={e.address} className="group flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors">
                    <Icon className="h-4 w-4 text-[var(--gold)] shrink-0" />
                    <Link
                      href={href as "/address/${string}" | "/tokens/${string}" | "/validators/${string}"}
                      className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center gap-x-4"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {e.label && <span className="text-sm font-medium truncate">{e.label}</span>}
                        <span className="font-mono text-xs text-muted-foreground truncate">
                          {e.address.slice(0, 10)}…{e.address.slice(-6)}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono uppercase tracking-[.18em] text-[var(--tx-d)]">
                        {e.kind}
                      </span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleRemove(e.address)}
                      title="Remove from watchlist"
                      className="opacity-0 group-hover:opacity-100 inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
