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

/** Sourcify file payload — what `/files/any/{chain}/{address}` actually returns. */
export interface SourcifyFile {
  /** Display name (e.g. `WSRX.sol`, `metadata.json`). */
  name: string;
  /** Full path inside Sourcify's content store; useful as a stable React key. */
  path: string;
  /** Inline file contents — Sourcify embeds them so the consumer doesn't need a second hop. */
  content: string;
}

export interface SourcifyResponse {
  status: "full" | "partial";
  files: SourcifyFile[];
}

/** Hook: fetch the full source-file listing for a verified contract.
 *  Returns null until either the network responds or the contract is
 *  unverified. The Sourcify response embeds the file content inline,
 *  so a single fetch is enough — no per-file second-round trip.
 */
export function useSourcifyFiles(
  network: NetworkId,
  address: string | undefined,
): { files: SourcifyFile[] | null; status: "full" | "partial" | "none"; loading: boolean } {
  const [files, setFiles] = useState<SourcifyFile[] | null>(null);
  const [status, setStatus] = useState<"full" | "partial" | "none">("none");
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
        const res = await fetch(`${SOURCIFY_URL}/files/any/${chain}/${address}`, {
          signal: AbortSignal.timeout(8000),
        });
        if (cancelled) return;
        if (!res.ok) {
          setStatus("none");
          setFiles(null);
          return;
        }
        const body = (await res.json()) as SourcifyResponse | null;
        if (cancelled || !body) return;
        setStatus(body.status === "full" ? "full" : body.status === "partial" ? "partial" : "none");
        setFiles(Array.isArray(body.files) ? body.files : null);
      } catch {
        if (!cancelled) {
          setStatus("none");
          setFiles(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [network, address]);

  return { files, status, loading };
}

/** Filter out the metadata.json blob — useful when the UI only wants the
 *  human-readable .sol files. The metadata is JSON containing the ABI + compiler
 *  flags; rendering it as Solidity source confuses readers. We expose it
 *  separately for the "ABI" tab. */
export function partitionSourceFiles(files: SourcifyFile[] | null): {
  source: SourcifyFile[];
  metadata: SourcifyFile | null;
} {
  if (!files) return { source: [], metadata: null };
  const metadata = files.find((f) => f.name.toLowerCase() === "metadata.json") ?? null;
  const source = files.filter((f) => f.name.toLowerCase() !== "metadata.json");
  return { source, metadata };
}
