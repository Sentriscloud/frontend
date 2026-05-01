"use client";

// Cross-app Solux connect — view-only. Opens
// https://solux.sentriscloud.com/connect?origin=… in a popup, waits for
// a postMessage with the user's Solux address, and feeds it into the
// existing manual-address mode (so downstream hooks see it the same
// way as a typed-in address).
//
// View-only by design: Solux still signs every tx — the consuming app
// only gets the address for balance/eligibility/holdings reads. Real
// signing requires WalletConnect support in Solux, which is a future
// feature; this gives users a "connect Solux" button TODAY without
// pretending to be more than it is.

import { useEffect, useRef, useState } from "react";
import { useManualAddress, isAddress } from "./manual-address";

const SOLUX_ORIGIN = "https://solux.sentriscloud.com";
const POPUP_FEATURES = "width=420,height=560,popup=yes,noopener=no,noreferrer=no";

interface SoluxConnectResult {
  type: "sentrix:connect-result";
  address: string | null;
  origin: string;
}

/**
 * Hook: open Solux popup, await user approval, persist returned address
 * into the manual-address store under `namespace`.
 *
 * Usage:
 *   const { connect, isConnecting, error } = useSoluxConnect("airdrop");
 *   <button onClick={connect}>Connect Solux</button>
 */
export function useSoluxConnect(namespace: string): {
  connect: () => void;
  isConnecting: boolean;
  error: string | null;
} {
  const { setAddress } = useManualAddress(namespace);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);

  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      // Only trust messages from the Solux origin we opened. The browser
      // tags MessageEvent.origin with the sender's actual origin, so a
      // page from anywhere-else can't impersonate Solux even if they
      // postMessage to our window.
      if (ev.origin !== SOLUX_ORIGIN) return;
      const data = ev.data as SoluxConnectResult | undefined;
      if (!data || data.type !== "sentrix:connect-result") return;
      // Echo-check: Solux should send back the origin it loaded under
      // (= our own origin) to confirm the round-trip wasn't redirected.
      if (typeof window !== "undefined" && data.origin !== window.location.origin) {
        setError("Origin mismatch in Solux response.");
        setIsConnecting(false);
        return;
      }
      if (data.address && isAddress(data.address)) {
        setAddress(data.address);
        setError(null);
      } else if (data.address === null) {
        setError("Connection denied in Solux.");
      } else {
        setError("Solux returned a malformed address.");
      }
      setIsConnecting(false);
      try {
        popupRef.current?.close();
      } catch {
        /* popup may have closed already */
      }
    }
    if (typeof window !== "undefined") {
      window.addEventListener("message", onMessage);
      return () => window.removeEventListener("message", onMessage);
    }
  }, [setAddress]);

  function connect() {
    if (typeof window === "undefined") return;
    setError(null);
    setIsConnecting(true);
    const url = `${SOLUX_ORIGIN}/connect?origin=${encodeURIComponent(window.location.origin)}`;
    const popup = window.open(url, "sentrix-solux-connect", POPUP_FEATURES);
    if (!popup) {
      setError("Popup blocked. Allow popups for this site and try again.");
      setIsConnecting(false);
      return;
    }
    popupRef.current = popup;
    // If user closes popup without approving, time out the spinner.
    const watchClose = setInterval(() => {
      if (popup.closed) {
        clearInterval(watchClose);
        setIsConnecting((prev) => (prev ? false : prev));
      }
    }, 500);
    // Belt-and-braces — clear the watcher after 5 min regardless.
    setTimeout(() => clearInterval(watchClose), 5 * 60_000);
  }

  return { connect, isConnecting, error };
}

/**
 * Drop-in button. Apps with a small connect-affordance area can render
 * this directly; apps with custom-styled connect rows should call
 * `useSoluxConnect()` directly. Renders two states:
 *  - no Solux address persisted → "Connect Solux (view-only)"
 *  - Solux address persisted → pill showing "Solux 0x12…ab · disconnect"
 *
 * Deliberately does NOT consult wagmi here — wallet-config's
 * useEffectiveAddress reads useAccount, and wagmi v2 throws if a
 * WagmiProvider hasn't mounted yet (statically-rendered pages hit that
 * path during hydration). Consumers that want to hide the Solux button
 * once a real wallet is connected should gate at the call site, e.g.
 *   `{!isConnected && <SoluxConnectButton namespace="..." />}`.
 */
export function SoluxConnectButton(props: { namespace: string; className?: string }) {
  const { connect, isConnecting, error } = useSoluxConnect(props.namespace);
  const { address: manualAddress, setAddress: setManualAddress } = useManualAddress(props.namespace);
  const soluxConnected = manualAddress !== null;

  return (
    <div className={props.className}>
      {soluxConnected ? (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--gold,#f4c75e)]/40 bg-[var(--gold,#f4c75e)]/10">
          <span className="text-[10px] uppercase tracking-widest text-[var(--gold,#f4c75e)] font-semibold">Solux</span>
          <span className="text-xs font-mono text-[var(--tx,#fafafa)]">
            {manualAddress!.slice(0, 6)}…{manualAddress!.slice(-4)}
          </span>
          <button
            onClick={() => setManualAddress(null)}
            className="text-[10px] text-[var(--tx-m,#9a9aa4)] hover:text-red-400 underline underline-offset-2"
            title="Disconnect Solux (view-only)"
          >
            disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={connect}
          disabled={isConnecting}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--brd,rgba(255,255,255,0.12))] bg-[var(--sf,rgba(255,255,255,0.04))] hover:border-[var(--gold,#f4c75e)]/60 hover:text-[var(--gold,#f4c75e)] text-xs font-medium text-[var(--tx,#fafafa)] transition-colors disabled:opacity-50 disabled:cursor-wait"
        >
          <span className="text-base leading-none">⌬</span>
          {isConnecting ? "waiting for Solux…" : "Connect Solux (view-only)"}
        </button>
      )}
      {error && <p className="mt-1 text-[10px] text-red-400">{error}</p>}
    </div>
  );
}
