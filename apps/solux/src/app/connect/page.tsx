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
import { ShieldCheck, X, ArrowUpRight, Wallet } from "lucide-react";
import { isAllowedOrigin } from "@/lib/allowed-origins";

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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError("Missing or malformed `origin` parameter.");
      return;
    }
    // Allowlist lives in @/lib/allowed-origins so /connect and /sign
    // share the same source of truth — adding a new dApp to one
    // endpoint can't accidentally lock the other out.
    if (!isAllowedOrigin(o)) {
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
    // Pull the requesting tab back to the foreground so the user
    // doesn't have to manually click back to it after Approve. Some
    // browsers gate this on a still-active user gesture; the click
    // that triggered handleApprove qualifies.
    try {
      window.opener.focus();
    } catch {
      /* opener might be cross-origin-restricted on some browsers — ignore */
    }
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

  // No wallet branch — completely separate UX. Showing Approve/Deny
  // when there's nothing to approve was confusing (the previous UI
  // grayed out Approve and stuck a tiny "Open /wallet" link inside an
  // amber banner — most testers walked away). New flow: clear "set
  // up first" headline + one big CTA that opens /wallet in a new tab
  // so this popup stays put. Once the user has a wallet, they re-
  // trigger connect from the requesting app.
  if (!hydrated || !address) {
    return (
      <Shell>
        <div className="text-center mb-5">
          <div className="w-14 h-14 mx-auto mb-3 opacity-90">
            <SrxMark className="w-full h-full" />
          </div>
          <h1 className="text-lg font-semibold text-[var(--tx)] mb-1">
            {hydrated ? "Solux wallet not set up" : "Loading Solux…"}
          </h1>
          {hydrated && (
            <p className="text-xs text-[var(--tx-m)] leading-relaxed">
              <span className="font-mono">{origin.replace(/^https?:\/\//, "")}</span>
              {" "}wants to connect to Solux, but there&apos;s no Solux wallet on this browser
              yet. Set one up first — takes 30 seconds, your keys never leave your device.
            </p>
          )}
        </div>

        {hydrated && (
          <div className="space-y-2">
            <a
              href="/wallet"
              target="_blank"
              rel="noopener"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-[var(--gold)] text-[var(--bk)] hover:bg-[var(--gold-l)] text-sm font-semibold transition-colors"
            >
              <Wallet className="w-4 h-4" />
              Set up Solux wallet
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
            <p className="text-[10px] text-center text-[var(--tx-d)] leading-snug">
              Opens in a new tab. After your wallet is ready, click <span className="text-[var(--tx-m)]">Sign in → Solux</span>{" "}
              again on{" "}
              <span className="font-mono text-[var(--tx-m)]">{origin.replace(/^https?:\/\//, "")}</span>.
            </p>
            <button
              onClick={() => window.close()}
              className="w-full py-2 mt-1 rounded-lg border border-[var(--brd)] text-[var(--tx-m)] hover:text-[var(--tx)] hover:bg-[var(--sf-2)] text-xs font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
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

      <div className="rounded-xl border border-[var(--brd)] bg-[var(--sf-2)] p-3 mb-4 text-center">
        <p className="text-[10px] uppercase tracking-widest text-[var(--tx-m)] mb-1">Active account</p>
        <p className="text-sm font-mono text-[var(--tx)]">
          {address.slice(0, 8)}…{address.slice(-6)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleDeny}
          className="py-2 rounded-lg border border-[var(--brd)] text-[var(--tx-m)] hover:text-[var(--tx)] hover:bg-[var(--sf-2)] text-sm font-semibold transition-colors"
        >
          Deny
        </button>
        <button
          onClick={handleApprove}
          className="py-2 rounded-lg bg-[var(--gold)] text-[var(--bk)] hover:bg-[var(--gold-l)] text-sm font-semibold transition-colors"
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
