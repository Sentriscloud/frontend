"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Coins, Search, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { detectSearchType } from "@/lib/format";
import { useNetwork } from "@/lib/network-context";
import { useSearchIndex } from "@/lib/search-index";
import { Suspense, useEffect } from "react";

// /search?q=… is the fallback target for queries the header form can't
// resolve directly to a block / tx / address. We try four things in order:
//   1. raw type (block / tx / address) — redirect immediately
//   2. exact symbol or moniker match — auto-redirect to the single result
//   3. fuzzy index match — show clickable list
//   4. nothing — print an explainer

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";
  const type = detectSearchType(query);
  const { network } = useNetwork();
  const { match, ready } = useSearchIndex(network);

  const hits = ready ? match(query, 12) : [];
  const exact = hits.find(
    (h) => h.label.toLowerCase() === query.trim().toLowerCase(),
  );

  // Auto-redirect when the query is a raw type or matches one entry exactly.
  useEffect(() => {
    if (type === "block") router.replace(`/blocks/${query}`);
    else if (type === "tx") router.replace(`/tx/${query}`);
    else if (type === "address") router.replace(`/address/${query}`);
    else if (exact) router.replace(exact.href);
  }, [type, exact, query, router]);

  if (type === "block" || type === "tx" || type === "address") {
    return (
      <div className="text-center space-y-4">
        <p className="text-muted-foreground">Redirecting…</p>
      </div>
    );
  }

  if (exact) {
    return (
      <div className="text-center space-y-4">
        <p className="text-muted-foreground">Redirecting to {exact.label}…</p>
        <Link href={exact.href as "/tokens/${string}" | "/validators/${string}"} className="text-primary hover:underline">
          {exact.label}
        </Link>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="text-center space-y-4">
        <p className="text-muted-foreground">Looking up &quot;{query}&quot;…</p>
      </div>
    );
  }

  if (hits.length === 0) {
    return (
      <div className="text-center space-y-4">
        <Search className="h-12 w-12 text-muted-foreground mx-auto" />
        <p className="text-muted-foreground">No results found for &quot;{query}&quot;</p>
        <p className="text-xs text-muted-foreground">
          Try a block height, transaction hash (0x + 64 hex), address (0x + 40 hex), token symbol, or validator name.
        </p>
        <Link href="/" className="text-primary hover:underline text-sm inline-block">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Results for &quot;<span className="font-mono">{query}</span>&quot; — {hits.length} match{hits.length === 1 ? "" : "es"}
      </p>
      <ul className="divide-y divide-border/60 border border-border rounded-lg overflow-hidden">
        {hits.map((h) => {
          const Icon = h.kind === "token" ? Coins : Shield;
          return (
            <li key={h.href}>
              <Link
                href={h.href as "/tokens/${string}" | "/validators/${string}"}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
              >
                <Icon className="h-4 w-4 text-[var(--gold)]" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm flex items-center gap-2">
                    <span className="font-medium">{h.label}</span>
                    <span className="text-[10px] font-mono uppercase tracking-[.15em] text-muted-foreground">
                      {h.kind}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-muted-foreground truncate">{h.secondary}</div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function SearchPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Card>
        <CardContent className="p-8">
          <Suspense fallback={<p className="text-center text-muted-foreground">Loading...</p>}>
            <SearchContent />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
