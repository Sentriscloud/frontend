"use client";

import { Info } from "lucide-react";
import { DetailCard } from "./DetailCard";

// Sentrix RPC doesn't expose `debug_traceTransaction`, so we can't render
// internal txs the way Etherscan / Blockscout do. Without this card the
// "Internal" tab is silently empty — users assume scan is broken or that
// the tx genuinely had no internal calls. Honest > clever: tell them why.

export function InternalTxsPlaceholder() {
  return (
    <DetailCard
      title={
        <span className="inline-flex items-center gap-2">
          <Info className="h-4 w-4 text-[var(--tx-d)]" /> Internal Transactions
        </span>
      }
    >
      <div className="py-4 px-1 space-y-2 text-sm">
        <p className="text-muted-foreground">
          Internal-tx tracing is not yet available on Sentrix Chain. Surfacing them requires
          {" "}
          <code className="font-mono text-xs px-1 py-0.5 rounded bg-muted">debug_traceTransaction</code>
          , which the RPC doesn&apos;t expose.
        </p>
        <p className="text-xs text-muted-foreground">
          Same limitation applies to all explorers on this chain — no scan/blockscout difference here.
          If the tracing endpoint lands later, this tab will populate automatically.
        </p>
      </div>
    </DetailCard>
  );
}
