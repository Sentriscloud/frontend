"use client";

// Cross-app EVM signing endpoint. Sister of /connect. External Sentrix
// dapps (dex, coinblast, airdrop) open this URL in a popup with a base64-
// encoded JSON request as the `req` query param plus the `origin`. We
// review the tx with the user, sign locally with the unlocked vault key,
// and postMessage the raw signed tx back. Consumer broadcasts.
//
// The Solux private key NEVER crosses the popup boundary. Only the raw
// signed tx (already authenticated) leaves. Origin allowlist + echo-check
// match /connect.
//
// Why a popup and not WalletConnect: same trade-off as /connect — we
// avoid the WC client lift but keep the trust model honest. Each tx is
// an explicit user gesture.

import { useEffect, useMemo, useState } from "react";
import { useWalletStore } from "@/lib/store";
import { signEvmTransaction } from "@/lib/evm-sign";
import { ShieldCheck, X, AlertTriangle } from "lucide-react";
import SrxMark from "@/components/SrxMark";
import { formatUnits } from "viem";
import { isAllowedOrigin } from "@/lib/allowed-origins";

interface SignRequestEnvelope {
  chainId: number;
  to: `0x${string}`;
  data?: `0x${string}`;
  value?: string;          // bigint serialized as decimal string
  gas?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: number;
  // Optional: human-readable hint sent by the consumer so the user sees
  // what they're signing. We never trust this for security — it's a UX
  // convenience only.
  label?: string;
}

interface ResultMessage {
  type: "sentrix:sign-result";
  origin: string;
  rawTx: `0x${string}` | null;
  error?: string;
}

// ALLOWED_ORIGINS lives in @/lib/allowed-origins so /sign and /connect
// share the same source of truth — adding a new dApp to one file no
// longer risks the other rejecting it.

function parseRequest(rawB64: string): SignRequestEnvelope | null {
  try {
    const json = atob(rawB64);
    const obj = JSON.parse(json);
    if (typeof obj !== "object" || obj === null) return null;
    if (typeof obj.chainId !== "number") return null;
    if (typeof obj.to !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(obj.to)) return null;
    return obj as SignRequestEnvelope;
  } catch {
    return null;
  }
}

function fmtValue(value: string | undefined): string {
  if (!value || value === "0") return "0";
  try {
    return formatUnits(BigInt(value), 18);
  } catch {
    return value;
  }
}

export default function SignPage() {
  const [origin, setOrigin] = useState<string | null>(null);
  const [req, setReq] = useState<SignRequestEnvelope | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<"pending" | "approved" | "denied" | "signing">("pending");

  // Read the request envelope from the URL on mount. Validate before we
  // ever render a signing prompt — bad input → close popup with error.
  // The setError/setOrigin/setReq calls are intentional bootstrapping
  // synchronous setState (mount-only), not a render cascade.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const o = params.get("origin");
    const r = params.get("req");
    if (!o || !/^https?:\/\/[a-z0-9.-]+(:\d+)?$/i.test(o)) {
      setError("Missing or malformed `origin` parameter.");
      return;
    }
    if (!isAllowedOrigin(o)) {
      setError(`Origin not allowed: ${o}`);
      return;
    }
    if (!r) {
      setError("Missing `req` (base64 transaction envelope).");
      return;
    }
    const parsed = parseRequest(r);
    if (!parsed) {
      setError("Malformed transaction envelope.");
      return;
    }
    setOrigin(o);
    setReq(parsed);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const address = useWalletStore((s) => s.address);
  const privateKey = useWalletStore((s) => s.privateKey);
  const watchOnly = useWalletStore((s) => s.watchOnly);
  const hydrated = useWalletStore((s) => s.hydrated);
  const hydrate = useWalletStore((s) => s.hydrate);
  useEffect(() => { if (!hydrated) hydrate(); }, [hydrated, hydrate]);

  const selector = useMemo(() => req?.data?.slice(0, 10), [req?.data]);

  function send(rawTx: `0x${string}` | null, errMsg?: string) {
    if (!origin || typeof window === "undefined" || !window.opener) return;
    const msg: ResultMessage = {
      type: "sentrix:sign-result",
      origin,
      rawTx,
      ...(errMsg ? { error: errMsg } : {}),
    };
    window.opener.postMessage(msg, origin);
    // Bring the requesting tab to the front so the user lands back
    // on the dapp without an extra click. Same trick as /connect.
    try {
      window.opener.focus();
    } catch {
      /* cross-origin restricted on some browsers — silent */
    }
  }

  async function handleApprove() {
    if (!privateKey || !address || !req) {
      setError("Vault is locked or no account loaded.");
      return;
    }
    if (watchOnly) {
      setError("Watch-only wallet can't sign.");
      return;
    }
    setDecision("signing");
    try {
      const rawTx = await signEvmTransaction(privateKey, {
        chainId: req.chainId,
        to: req.to,
        data: req.data,
        value: req.value !== undefined ? BigInt(req.value) : undefined,
        gas: req.gas !== undefined ? BigInt(req.gas) : undefined,
        maxFeePerGas: req.maxFeePerGas !== undefined ? BigInt(req.maxFeePerGas) : undefined,
        maxPriorityFeePerGas: req.maxPriorityFeePerGas !== undefined ? BigInt(req.maxPriorityFeePerGas) : undefined,
        nonce: req.nonce,
      });
      send(rawTx);
      setDecision("approved");
      setTimeout(() => window.close(), 600);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Signing failed.";
      setError(msg);
      send(null, msg);
      setDecision("denied");
    }
  }

  function handleDeny() {
    send(null, "Denied by user.");
    setDecision("denied");
    setTimeout(() => window.close(), 400);
  }

  if (error && !req) {
    return (
      <Shell>
        <p className="text-sm text-red-400 text-center">{error}</p>
        <button
          onClick={() => window.close()}
          className="mt-4 w-full py-2 rounded-lg border border-[var(--brd)] text-[var(--tx-m)] hover:text-[var(--tx)] text-sm"
        >
          Close
        </button>
      </Shell>
    );
  }

  if (!origin || !req) return <Shell>Loading…</Shell>;

  if (decision === "approved") {
    return (
      <Shell>
        <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
        <p className="text-sm text-[var(--tx)] text-center">Signed. Closing…</p>
      </Shell>
    );
  }

  if (decision === "denied") {
    return (
      <Shell>
        <X className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-sm text-[var(--tx)] text-center">{error ?? "Denied."}</p>
      </Shell>
    );
  }

  const valueDisplay = fmtValue(req.value);
  const canSign = Boolean(privateKey && address && !watchOnly);

  return (
    <Shell>
      <div className="text-center mb-5">
        <div className="w-14 h-14 mx-auto mb-3 opacity-90">
          <SrxMark className="w-full h-full" />
        </div>
        <h1 className="text-lg font-semibold text-[var(--tx)] mb-1">Approve transaction</h1>
        <p className="text-xs text-[var(--tx-m)]">
          <span className="font-mono">{origin.replace(/^https?:\/\//, "")}</span> wants you to sign.
        </p>
      </div>

      {req.label && (
        <div className="rounded-xl border border-[var(--brd)] bg-[var(--sf-2)] p-3 mb-3 text-center">
          <p className="text-[10px] uppercase tracking-widest text-[var(--tx-m)] mb-1">Action (per app)</p>
          <p className="text-sm text-[var(--tx)]">{req.label}</p>
        </div>
      )}

      <div className="rounded-xl border border-[var(--brd)] bg-[var(--sf-2)] p-3 mb-3 space-y-2 text-xs">
        <Row k="From" v={address ? `${address.slice(0, 8)}…${address.slice(-6)}` : "—"} mono />
        <Row k="To" v={`${req.to.slice(0, 10)}…${req.to.slice(-8)}`} mono />
        <Row k="Value" v={`${valueDisplay} SRX`} />
        <Row k="Network" v={`Chain ${req.chainId}`} />
        {selector && <Row k="Selector" v={selector} mono />}
      </div>

      {!canSign && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-3 mb-3 text-center">
          <AlertTriangle className="w-4 h-4 inline mr-1 text-amber-300/90" />
          <span className="text-xs text-amber-300/90 leading-snug">
            {watchOnly
              ? "Watch-only wallet — can't sign."
              : "Wallet locked. Open Solux, unlock, then retry."}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleDeny}
          className="py-2 rounded-lg border border-[var(--brd)] text-[var(--tx-m)] hover:text-[var(--tx)] hover:bg-[var(--sf-2)] text-sm font-semibold transition-colors"
        >
          Reject
        </button>
        <button
          onClick={handleApprove}
          disabled={!canSign || decision === "signing"}
          className="py-2 rounded-lg bg-[var(--gold)] text-[var(--bk)] hover:bg-[var(--gold-l)] text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {decision === "signing" ? "Signing…" : "Sign"}
        </button>
      </div>

      {error && <p className="mt-3 text-[11px] text-red-400 text-center">{error}</p>}
    </Shell>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center gap-3">
      <span className="text-[10px] uppercase tracking-widest text-[var(--tx-m)]">{k}</span>
      <span className={`text-[var(--tx)] ${mono ? "font-mono text-[11px]" : "text-xs"}`}>{v}</span>
    </div>
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
