"use client";

import { useEffect, useState } from "react";
import type { NetworkId } from "./chain";

export type SourcifyMatch = "perfect" | "partial" | "none";

const SOURCIFY_URL = "https://verify.sentrixchain.com";

const CHAIN_FOR_NETWORK: Record<NetworkId, string> = {
  mainnet: "7119",
  testnet: "7120",
};

/** Hook: query Sourcify for verification status of a contract.
 *  Returns "perfect" if bytecode matches source 1:1 + metadata,
 *  "partial" if bytecode matches but metadata differs,
 *  "none" if not verified or unreachable.
 */
export function useSourcifyStatus(network: NetworkId, address: string | undefined): {
  match: SourcifyMatch;
  loading: boolean;
} {
  const [match, setMatch] = useState<SourcifyMatch>("none");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const chain = CHAIN_FOR_NETWORK[network];

    (async () => {
      try {
        // /files/any returns "full" / "partial" / 404
        const res = await fetch(`${SOURCIFY_URL}/files/any/${chain}/${address}`, {
          signal: AbortSignal.timeout(5000),
        });
        if (cancelled) return;

        if (res.ok) {
          const body = await res.json();
          const status = body?.status;
          if (status === "full") setMatch("perfect");
          else if (status === "partial") setMatch("partial");
          else setMatch("none");
        } else {
          setMatch("none");
        }
      } catch {
        if (!cancelled) setMatch("none");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [network, address]);

  return { match, loading };
}

/** External link to Sourcify verification page for a contract */
export function sourcifyContractUrl(network: NetworkId, address: string): string {
  const chain = CHAIN_FOR_NETWORK[network];
  return `${SOURCIFY_URL}/files/any/${chain}/${address}`;
}
