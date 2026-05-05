"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { NetworkId } from "./chain";

interface NetworkContextValue {
  network: NetworkId;
  setNetwork: (n: NetworkId) => void;
  toggle: () => void;
}

const NetworkContext = createContext<NetworkContextValue>({
  network: "mainnet",
  setNetwork: () => {},
  toggle: () => {},
});

const COOKIE_NAME = "sentrix-network";
const ONE_YEAR = 60 * 60 * 24 * 365;

// Etherscan-style two-host pattern: scan.sentrixchain.com is mainnet-only,
// scan-testnet.sentrixchain.com is testnet-only. Toggle on either host
// redirects to the sibling instead of just flipping the cookie — keeps
// the host and the data rail aligned, so a deep-linked tx hash on testnet
// can never land on mainnet API mid-render.
const HOST_MAINNET = "scan.sentrixchain.com";
const HOST_TESTNET = "scan-testnet.sentrixchain.com";

function writeCookie(value: NetworkId) {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}

function crossHostTarget(next: NetworkId, currentHost: string): string | null {
  // Only auto-redirect on the two pinned sentrixchain.com hosts. Every
  // other host (sentriscloud.com explorer-v2, localhost, custom domains)
  // keeps the cookie-only flow.
  if (currentHost !== HOST_MAINNET && currentHost !== HOST_TESTNET) return null;
  const want = next === "testnet" ? HOST_TESTNET : HOST_MAINNET;
  return currentHost === want ? null : want;
}

// DECISION: network preference lives in a cookie so the server layout can read it via
// next/headers and pass `initial` here. Eliminates the prior "render mainnet → useEffect →
// setNetwork(testnet) → re-fetch" double-fetch + visual flash for testnet users.
// Legacy localStorage values from earlier builds are migrated on mount.
//
// SECOND DECISION (2026-05-02): clicking the toggle has to fire `router.refresh()` AFTER
// writing the cookie. Without that, server components stay anchored to whatever cookie
// existed when the page first loaded — so the toggle pill flips and the toast says
// "Switched to Testnet", but the blocks list / supply card / validators panel keep
// rendering the previous network's data until the user navigates away or hard-reloads.
// router.refresh() invalidates the RSC payload + re-fetches with the new cookie.
export function NetworkProvider({
  initial = "mainnet",
  children,
}: {
  initial?: NetworkId;
  children: ReactNode;
}) {
  const [network, setNetworkState] = useState<NetworkId>(initial);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const legacy = localStorage.getItem(COOKIE_NAME);
    if (legacy === "mainnet" || legacy === "testnet") {
      writeCookie(legacy);
      localStorage.removeItem(COOKIE_NAME);
      if (legacy !== network) setNetworkState(legacy);
    } else {
      writeCookie(network);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSet = useCallback(
    (n: NetworkId) => {
      // If we're on one of the pinned sentrixchain hosts, the toggle
      // means "go to the other host" — preserve pathname + query so a
      // deeplink (e.g. /tx/<hash>?network=testnet) survives the jump.
      // Cross-host nav is a full page load and there's no avoiding the
      // white flash, so we (1) flip the toggle pill optimistically so
      // the click feels instant, (2) write the cookie pre-nav as a
      // belt-and-suspenders signal — the destination's layout still
      // pins from the host header, but the cookie keeps any other tab
      // on the destination host coherent — and (3) show a loading
      // toast so the user has visible feedback before the new host
      // takes over the viewport.
      if (typeof window !== "undefined") {
        const target = crossHostTarget(n, window.location.hostname.toLowerCase());
        if (target) {
          setNetworkState(n);
          writeCookie(n);
          toast.loading(
            `Switching to ${n === "mainnet" ? "Mainnet" : "Testnet"}…`,
            { duration: 4000 },
          );
          window.location.href = `https://${target}${window.location.pathname}${window.location.search}`;
          return;
        }
      }
      setNetworkState(n);
      writeCookie(n);
      toast.success(`Switched to ${n === "mainnet" ? "Mainnet (Chain ID 7119)" : "Testnet (Chain ID 7120)"}`);
      // RSC re-render with the new cookie. Without this the toggle UI
      // changes but server-rendered sections stay on the old network.
      router.refresh();
    },
    [router],
  );

  const toggle = useCallback(() => {
    handleSet(network === "mainnet" ? "testnet" : "mainnet");
  }, [network, handleSet]);

  return (
    <NetworkContext.Provider value={{ network, setNetwork: handleSet, toggle }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}

// Honour `?network=mainnet|testnet` on detail pages — without this, a
// testnet deeplink (e.g. tx hash from the faucet, address from Solux)
// landed on the user's cookie network instead of the link's network.
// Was tx-page-only as of 2026-04-28; lifted to a shared hook 2026-05-02
// so every detail page (blocks/address/tokens/validators) sticks to the
// caller's network. Drop on routes that don't take a network — toggle
// only fires when the param differs from the current network.
export function useNetworkFromQuery() {
  const { network, setNetwork } = useNetwork();
  const searchParams = useSearchParams();
  useEffect(() => {
    const param = searchParams.get("network");
    if ((param === "mainnet" || param === "testnet") && param !== network) {
      setNetwork(param);
    }
  }, [searchParams, network, setNetwork]);
}
