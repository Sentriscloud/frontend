"use client";

// Manual-address view mode — sits next to RainbowKit's ConnectButton and
// lets a visitor look up their state (eligibility, holdings, pool stats)
// against any 0x… address WITHOUT needing a wallet plugin installed. The
// hooks consumed by the apps return whichever is set: the connected wagmi
// address takes priority; if no wallet is connected, the manually entered
// address is used. Signing operations (claim / swap / buy / sell) still
// require a connected wallet — manual mode is read-only by design.
//
// Persisted in localStorage so the address survives page reloads, but
// scoped per app (key includes a `namespace` arg) so the airdrop's check
// doesn't bleed into coinblast's.

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";

const STORAGE_PREFIX = "sentrix:manual-address:";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function isAddress(value: string): value is `0x${string}` {
  return ADDRESS_RE.test(value);
}

/**
 * Read + write the manually-entered address for `namespace`. Falls back to
 * `null` when nothing is stored or the stored value is malformed.
 */
export function useManualAddress(namespace: string): {
  address: `0x${string}` | null;
  setAddress: (next: string | null) => void;
} {
  const key = STORAGE_PREFIX + namespace;
  const [address, _setAddress] = useState<`0x${string}` | null>(null);

  // Lazy hydrate from localStorage on mount — avoids SSR mismatch since
  // the server has no localStorage.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw && isAddress(raw)) _setAddress(raw);
    } catch {
      /* SSR / private mode / quota — ignore */
    }
  }, [key]);

  const setAddress = useCallback(
    (next: string | null) => {
      try {
        if (next === null) {
          localStorage.removeItem(key);
          _setAddress(null);
          return;
        }
        if (isAddress(next)) {
          localStorage.setItem(key, next);
          _setAddress(next);
        }
      } catch {
        /* ignore */
      }
    },
    [key],
  );

  return { address, setAddress };
}

/**
 * The "effective" address an app should use to render read-only state —
 * connected-wallet takes precedence; manual address fills the gap. Apps
 * that need to SIGN (claim, swap, etc.) must check `isConnected` separately
 * and prompt the user to connect a real wallet.
 */
export function useEffectiveAddress(namespace: string): {
  address: `0x${string}` | null;
  source: "connected" | "manual" | "none";
  isConnected: boolean;
  manualAddress: `0x${string}` | null;
  setManualAddress: (next: string | null) => void;
} {
  const { address: connected, isConnected } = useAccount();
  const { address: manual, setAddress: setManualAddress } = useManualAddress(namespace);

  if (isConnected && connected) {
    return {
      address: connected,
      source: "connected",
      isConnected: true,
      manualAddress: manual,
      setManualAddress,
    };
  }
  if (manual) {
    return {
      address: manual,
      source: "manual",
      isConnected: false,
      manualAddress: manual,
      setManualAddress,
    };
  }
  return {
    address: null,
    source: "none",
    isConnected: false,
    manualAddress: null,
    setManualAddress,
  };
}

/**
 * Drop-in input for view-only address entry. Renders nothing on its own —
 * caller composes around it however they want. Returns the trimmed input
 * value + an onChange that validates + persists when valid.
 *
 * Apps typically render this BELOW the RainbowKit ConnectButton with a
 * helper line: "Or check eligibility / view-only without connecting".
 */
export function ManualAddressInput(props: {
  namespace: string;
  placeholder?: string;
  className?: string;
  onAccept?: (addr: `0x${string}`) => void;
}) {
  const { manualAddress, setManualAddress } = useEffectiveAddress(props.namespace);
  const [draft, setDraft] = useState<string>(manualAddress ?? "");
  const [error, setError] = useState<string | null>(null);

  // Re-sync draft when the persisted value changes (e.g. cleared elsewhere)
  useEffect(() => {
    setDraft(manualAddress ?? "");
  }, [manualAddress]);

  function commit(value: string) {
    const v = value.trim();
    if (v === "") {
      setError(null);
      setManualAddress(null);
      return;
    }
    if (!isAddress(v)) {
      setError("Not a valid 0x… address");
      return;
    }
    setError(null);
    setManualAddress(v);
    props.onAccept?.(v);
  }

  return (
    <div className={props.className}>
      <input
        type="text"
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        placeholder={props.placeholder ?? "0x… address (view-only)"}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          // Auto-commit when user pastes a valid address (paste fires a single onChange)
          if (isAddress(e.target.value.trim())) commit(e.target.value);
        }}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          }
        }}
        style={{
          width: "100%",
          padding: "8px 12px",
          borderRadius: 8,
          border: error ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.12)",
          background: "rgba(0,0,0,0.3)",
          color: "var(--tx, #fafafa)",
          fontFamily: "ui-monospace, SFMono-Regular, monospace",
          fontSize: 12,
        }}
      />
      {error && (
        <div style={{ marginTop: 4, color: "#ef4444", fontSize: 11 }}>{error}</div>
      )}
    </div>
  );
}
