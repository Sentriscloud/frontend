"use client";

// Cross-app connect endpoint. External Sentrix apps (coinblast, dex,
// airdrop, faucet) open this URL in a popup with `?origin=...` and
// listen for a postMessage carrying the user's Solux-account address.
// User has to explicitly approve — we never auto-resolve, and the
// returned address is view-only on the consumer side (Solux still
// signs every tx; the consumer just has visibility into balance,
// eligibility, holdings, etc.).
//
// Why not WalletConnect: Solux is an in-browser self-custody wallet,
// not a mobile peer that runs WC's relay. Implementing a WC sign
// client in Solux would be ~thousands of lines for the auth/signing
// session machinery. This postMessage flow gives us cross-app account
// visibility today without that lift; signing through Solux happens
// the way it always did — open Solux, paste tx data, sign.

import { useEffect, useState } from "react";
import { useWalletStore } from "@/lib/store";
import SrxMark from "@/components/SrxMark";
import { ShieldCheck, X } from "lucide-react";

interface PendingMessage {
  type: "sentrix:connect-result";
  address: string | null;
  origin: string;
}

export default function ConnectPage() {
  const [origin, setOrigin] = useState<string | null>(null);
  const [decision, setDecision] = useState<"pending" | "approved" | "denied">("pending");
  const [error, setError] = useState<string | null>(null);

  // Read the requesting origin from the URL. We *only* postMessage back
  // to that exact origin — never to "*". Otherwise any tab anywhere on
  // the internet that opened this popup could harvest the address.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const o = params.get("origin");
    if (!o || !/^https?:\/\/[a-z0-9.-]+(:\d+)?$/i.test(o)) {
      setError("Missing or malformed `origin` parameter.");
      return;
    }
    // Allowlist — only Sentrix-official domains can request a connect.
    // Add more here when new apps go live.
    const ALLOWED = [
      "https://airdrop.sentrixchain.com",
      "https://faucet.sentrixchain.com",
      "https://dex.sentrixchain.com",
      "https://coinblast.sentriscloud.com",
      // local-dev convenience — only ports we use
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "http://localhost:3003",
      "http://localhost:3006",
      "http://localhost:3008",
      "http://localhost:3009",
    ];
    if (!ALLOWED.includes(o)) {
      setError(`Origin not allowed: ${o}`);
      return;
    }
    setOrigin(o);
  }, []);

  const address = useWalletStore((s) => s.address);
  const hydrated = useWalletStore((s) => s.hydrated);
  const hydrate = useWalletStore((s) => s.hydrate);
  useEffect(() => { if (!hydrated) hydrate(); }, [hydrated, hydrate]);

  function send(address: string | null) {
    if (!origin || typeof window === "undefined" || !window.opener) return;
    const msg: PendingMessage = {
      type: "sentrix:connect-result",
      address,
      origin,
    };
    window.opener.postMessage(msg, origin);
  }

  function handleApprove() {
    if (!address) {
      setError("No Solux account loaded. Set up a wallet first.");
      return;
    }
    send(address);
    setDecision("approved");
    // Auto-close after a short beat so the consumer's listener fires
    // before the popup vanishes.
    setTimeout(() => window.close(), 600);
  }

  function handleDeny() {
    send(null);
    setDecision("denied");
    setTimeout(() => window.close(), 400);
  }

  if (error) {
    return (
      <Shell>
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={() => window.close()}
          className="mt-4 w-full py-2 rounded-lg border border-[var(--brd)] text-[var(--tx-m)] hover:text-[var(--tx)] text-sm"
        >
          Close
        </button>
      </Shell>
    );
  }

  if (!origin) {
    return <Shell>Loading…</Shell>;
  }

  if (decision === "approved") {
    return (
      <Shell>
        <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
        <p className="text-sm text-[var(--tx)] text-center">Connected. Closing…</p>
      </Shell>
    );
  }

  if (decision === "denied") {
    return (
      <Shell>
        <X className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-sm text-[var(--tx)] text-center">Denied.</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="text-center mb-5">
        <div className="w-14 h-14 mx-auto mb-3 opacity-90">
          <SrxMark className="w-full h-full" />
        </div>
        <h1 className="text-lg font-semibold text-[var(--tx)] mb-1">Approve connection</h1>
        <p className="text-xs text-[var(--tx-m)]">
          <span className="font-mono">{origin.replace(/^https?:\/\//, "")}</span> wants to see
          your Solux address (view-only). Solux still signs every tx — the requesting app gets
          read access only.
        </p>
      </div>

      {address ? (
        <div className="rounded-xl border border-[var(--brd)] bg-[var(--sf-2)] p-3 mb-4 text-center">
          <p className="text-[10px] uppercase tracking-widest text-[var(--tx-m)] mb-1">Active account</p>
          <p className="text-sm font-mono text-[var(--tx)]">
            {address.slice(0, 8)}…{address.slice(-6)}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-3 mb-4 text-center">
          <p className="text-xs text-amber-300/90 leading-snug">
            No Solux wallet found. Open <a className="underline" href="/wallet">/wallet</a> to set
            one up first, then come back.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleDeny}
          className="py-2 rounded-lg border border-[var(--brd)] text-[var(--tx-m)] hover:text-[var(--tx)] hover:bg-[var(--sf-2)] text-sm font-semibold transition-colors"
        >
          Deny
        </button>
        <button
          onClick={handleApprove}
          disabled={!address}
          className="py-2 rounded-lg bg-[var(--gold)] text-[var(--bk)] hover:bg-[var(--gold-l)] text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Approve
        </button>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--brd)] bg-[var(--sf)] p-6">
        {children}
      </div>
    </main>
  );
}
