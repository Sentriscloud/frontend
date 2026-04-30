"use client";

// Shared in-memory Sourcify ABI cache. Multiple components query the same
// contract's ABI within a single page render (TxLogs decodes events,
// DecodedInputData decodes the call, TokenTransfers regroups Transfer
// events from the same contract). Without a shared cache each component
// would refetch the same metadata.json — slow + rude to the verifier.
//
// Cache lives at module scope so it survives client-side route changes.

import type { Abi } from "viem";
import type { NetworkId } from "./chain";

const SOURCIFY_URL = "https://verify.sentrixchain.com";
const CHAIN_FOR_NETWORK: Record<NetworkId, string> = { mainnet: "7119", testnet: "7120" };

const cache = new Map<string, Abi | null>();
const inflight = new Map<string, Promise<Abi | null>>();

export async function resolveAbi(network: NetworkId, address: string): Promise<Abi | null> {
  const key = `${network}:${address.toLowerCase()}`;
  if (cache.has(key)) return cache.get(key) ?? null;
  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const res = await fetch(
        `${SOURCIFY_URL}/files/any/${CHAIN_FOR_NETWORK[network]}/${address}`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (!res.ok) {
        cache.set(key, null);
        return null;
      }
      const body = await res.json();
      const meta = body?.files?.find?.((f: { name: string }) => f.name?.toLowerCase() === "metadata.json");
      if (!meta?.content) {
        cache.set(key, null);
        return null;
      }
      const parsed = JSON.parse(meta.content);
      const abi = Array.isArray(parsed?.output?.abi) ? (parsed.output.abi as Abi) : null;
      cache.set(key, abi);
      return abi;
    } catch {
      cache.set(key, null);
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

export function _resetAbiCache(): void {
  cache.clear();
}
