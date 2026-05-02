// Validate a global-search query before redirecting. Pre-validation closes
// the gap where a user's typo (off-by-one block height, malformed tx hash)
// landed them on a 404 page. Now: validate via RPC first, surface a "not
// found" toast inline, never navigate to a dead route.
//
// Detection rules mirror `lib/format.ts::detectSearchType` — digits only =
// block height, 0x + 64 hex = tx hash, 0x + 40 hex = address. Anything else
// falls through to /tokens?search=… so the user lands on a filtered token
// list instead of a generic search page that may return nothing.
//
// Cross-network probe (added 2026-05-02): block + tx queries run on the
// current network AND the other network in parallel. If the hit lands on
// the other network, the result carries `onNetwork` and the caller appends
// `?network=…` to the route so `useNetworkFromQuery()` flips the cookie
// before the detail page renders. This was the reviewer's pain point —
// pasting a testnet tx hash on a mainnet-cookie browser used to dead-end
// at "Transaction not found".

import { isAddress } from "viem";
import { createClient, type NetworkId } from "@/lib/chain";

export type SearchResult =
  | { kind: "block"; href: string; onNetwork: NetworkId }
  | { kind: "tx"; href: string; onNetwork: NetworkId }
  | { kind: "address"; href: string; onNetwork: NetworkId }
  | { kind: "tokens"; href: string; onNetwork: NetworkId }
  | { kind: "not_found"; reason: string };

const OTHER: Record<NetworkId, NetworkId> = { mainnet: "testnet", testnet: "mainnet" };

function withNetwork(href: string, current: NetworkId, onNetwork: NetworkId): string {
  if (current === onNetwork) return href;
  const sep = href.includes("?") ? "&" : "?";
  return `${href}${sep}network=${onNetwork}`;
}

async function probeBlock(network: NetworkId, height: string): Promise<boolean> {
  try {
    const client = createClient(network);
    const block = await client.getBlock({ blockNumber: BigInt(height) });
    return block != null;
  } catch {
    return false;
  }
}

async function probeTx(network: NetworkId, hash: `0x${string}`): Promise<boolean> {
  try {
    const client = createClient(network);
    const tx = await client.getTransaction({ hash });
    return tx != null;
  } catch {
    return false;
  }
}

export async function validateAndResolveSearch(
  network: NetworkId,
  query: string,
): Promise<SearchResult> {
  const q = query.trim();
  if (!q) return { kind: "not_found", reason: "Empty query" };

  // Block height — digits only
  if (/^\d+$/.test(q)) {
    const [hereOk, otherOk] = await Promise.all([
      probeBlock(network, q),
      probeBlock(OTHER[network], q),
    ]);
    if (hereOk) return { kind: "block", href: `/blocks/${q}`, onNetwork: network };
    if (otherOk)
      return {
        kind: "block",
        href: withNetwork(`/blocks/${q}`, network, OTHER[network]),
        onNetwork: OTHER[network],
      };
    return { kind: "not_found", reason: `Block #${q} not found on either network` };
  }

  // Transaction hash — 0x + 64 hex
  if (/^0x[a-fA-F0-9]{64}$/.test(q)) {
    const hash = q as `0x${string}`;
    const [hereOk, otherOk] = await Promise.all([
      probeTx(network, hash),
      probeTx(OTHER[network], hash),
    ]);
    if (hereOk) return { kind: "tx", href: `/tx/${q}`, onNetwork: network };
    if (otherOk)
      return {
        kind: "tx",
        href: withNetwork(`/tx/${q}`, network, OTHER[network]),
        onNetwork: OTHER[network],
      };
    return { kind: "not_found", reason: "Transaction not found on either network" };
  }

  // Address — viem's checksum-or-lowercase validator. Every well-formed
  // address is a valid lookup target whether or not it has on-chain
  // activity (zero-balance EOAs are normal), so no balance check needed.
  // Stays on the current network because addresses aren't network-scoped
  // in a way that makes "found on the other side" meaningful for an
  // address with zero activity.
  if (isAddress(q)) {
    return { kind: "address", href: `/address/${q.toLowerCase()}`, onNetwork: network };
  }

  // Fallback: token name / symbol search.
  return { kind: "tokens", href: `/tokens?search=${encodeURIComponent(q)}`, onNetwork: network };
}
