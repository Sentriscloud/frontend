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

function writeCookie(value: NetworkId) {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
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
