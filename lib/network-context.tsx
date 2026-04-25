"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
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
export function NetworkProvider({
  initial = "mainnet",
  children,
}: {
  initial?: NetworkId;
  children: ReactNode;
}) {
  const [network, setNetworkState] = useState<NetworkId>(initial);

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

  const handleSet = useCallback((n: NetworkId) => {
    setNetworkState(n);
    writeCookie(n);
    toast.success(`Switched to ${n === "mainnet" ? "Mainnet (Chain ID 7119)" : "Testnet (Chain ID 7120)"}`);
  }, []);

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
