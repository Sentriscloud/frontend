"use client";

// DECISION: single registry that maps address → human label (e.g., "Sentrix Foundation").
// Data source: /validators (names), /accounts/top (names on top accounts), /tokens (contract).
// Any address resolved here gets a colored tag next to its short-hash display, Solscan-style.
//
// Design goals:
// - Read-only React context populated once per network + refreshed with the underlying hooks.
// - O(1) lookup via a lower-cased Map.
// - No coupling to individual pages; components call `useAddressLabel(addr)`.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { NetworkId } from "./chain";
import { fetchValidators, fetchAccountsTop, fetchTokens } from "./api";

export type LabelKind = "validator" | "account" | "token" | "treasury";

export interface LabelEntry {
  name: string;
  kind: LabelKind;
}

type LabelMap = Map<string, LabelEntry>;

const LabelContext = createContext<LabelMap>(new Map());

// Premine + governance + protocol-reserved sentinels are always known at
// compile time and rarely surface in /accounts/top (they hold large balances
// and don't move often, so the dynamic top-N feed misses them on quiet
// chains). Hard-code so they always render with the right tag — Solscan-style
// "Foundation"/"Treasury".
//
// chain-id agnostic: same addresses are seeded in genesis for both 7119 and
// 7120, so these labels apply on either network.
const STATIC_LABELS: ReadonlyArray<[string, LabelEntry]> = [
  // Premine wallets
  ["0x5b5b06688dcdbe532353ac610aaff41af825279d", { name: "Founder (Vesting 1y+4y)", kind: "treasury" }],
  ["0xeb70fdefd00fdb768dec06c478f450c351499f14", { name: "Sentrix Ecosystem Fund", kind: "treasury" }],
  ["0x328d56b8174697ef6c9e40e19b7663797e16fa47", { name: "Validator Incentive Pool", kind: "treasury" }],
  ["0x2578cad17e3e56c2970a5b5eab45952439f5ba97", { name: "Strategic Reserve", kind: "treasury" }],

  // Governance
  ["0xa25236925bc10954e0519731cc7ba97f4bb5714b", { name: "Authority Wallet", kind: "treasury" }],
  ["0x6272dc0c842f05542f9ff7b5443e93c0642a3b26", { name: "SentrixSafe (Mainnet)", kind: "treasury" }],
  ["0xc9d7a61d7c2f428f6a055916488041fd00532110", { name: "SentrixSafe (Testnet)", kind: "treasury" }],

  // Protocol-reserved sentinels (no private key — consensus-level only)
  ["0x0000000000000000000000000000000000000000", { name: "Sentrix Token Op (sentinel)", kind: "treasury" }],
  ["0x0000000000000000000000000000000000000002", { name: "Protocol Treasury (Reward Escrow)", kind: "treasury" }],
  ["0x0000000000000000000000000000000000000100", { name: "Sentrix Staking (sentinel)", kind: "treasury" }],
];

function buildMap(entries: Array<[string, LabelEntry]>): LabelMap {
  const m = new Map<string, LabelEntry>();
  // Seed static premine + governance labels first so the dynamic feed can
  // overwrite them if the backend ever wants to send a more specific name
  // (e.g., "Founder Vesting Contract" once the on-chain contract deploys).
  for (const [addr, entry] of STATIC_LABELS) {
    m.set(addr.toLowerCase(), entry);
  }
  for (const [addr, entry] of entries) {
    if (!addr) continue;
    m.set(addr.toLowerCase(), entry);
  }
  return m;
}

export function LabelProvider({ network, children }: { network: NetworkId; children: ReactNode }) {
  // Seed with static premine + governance labels so they render immediately
  // on mount, before the dynamic /accounts/top fetch returns. Same addresses
  // exist in both genesis files, so this is network-agnostic.
  const [map, setMap] = useState<LabelMap>(() => buildMap([]));

  useEffect(() => {
    let cancelled = false;
    // When network flips, drop dynamic labels but keep statics — premine
    // addresses are identical across mainnet + testnet genesis.
    setMap(buildMap([]));

    async function load() {
      // DECISION: parallel — backend rate-limit flood was fixed server-side, so the old
      // sequential+200ms-gap workaround (which delayed label resolution by ~2s on mount)
      // is no longer needed. 3 concurrent reads + the mount-time polling burst still fit
      // well under the 60 req/min cap.
      const [validators, top, tokens] = await Promise.all([
        fetchValidators(network),
        fetchAccountsTop(network, 50),
        fetchTokens(network),
      ]);

      const entries: Array<[string, LabelEntry]> = [];

      for (const v of validators ?? []) {
        if (v.address && v.name) {
          const kind: LabelKind = v.name.toLowerCase().includes("treasury") ? "treasury" : "validator";
          entries.push([v.address, { name: v.name, kind }]);
        }
      }
      for (const a of top ?? []) {
        if (a.address && a.label) {
          entries.push([a.address, { name: a.label, kind: "account" }]);
        }
      }
      for (const t of tokens ?? []) {
        if (t.contract_address && t.symbol) {
          entries.push([t.contract_address, { name: t.symbol, kind: "token" }]);
        }
      }

      if (!cancelled) setMap(buildMap(entries));
    }

    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [network]);

  return <LabelContext.Provider value={map}>{children}</LabelContext.Provider>;
}

export function useAddressLabel(address: string | undefined | null): LabelEntry | undefined {
  const map = useContext(LabelContext);
  if (!address) return undefined;
  return map.get(address.toLowerCase());
}

export function toneForKind(kind: LabelKind): { bg: string; fg: string; border: string } {
  switch (kind) {
    case "validator":
      return { bg: "bg-[var(--purple)]/10", fg: "text-[var(--purple)]", border: "border-[var(--purple)]/25" };
    case "treasury":
      return { bg: "bg-[var(--gold)]/10", fg: "text-[var(--gold)]", border: "border-[var(--gold)]/25" };
    case "token":
      return { bg: "bg-[var(--teal)]/10", fg: "text-[var(--teal)]", border: "border-[var(--teal)]/25" };
    case "account":
    default:
      return { bg: "bg-[var(--blue)]/10", fg: "text-[var(--blue)]", border: "border-[var(--blue)]/25" };
  }
}
