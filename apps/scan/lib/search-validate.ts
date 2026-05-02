// Validate a global-search query before redirecting. Pre-validation closes
// the gap where a user's typo (off-by-one block height, malformed tx hash)
// landed them on a 404 page. Now: validate via RPC first, surface a "not
// found" toast inline, never navigate to a dead route.
//
// Detection rules mirror `lib/format.ts::detectSearchType` — digits only =
// block height, 0x + 64 hex = tx hash, 0x + 40 hex = address. Anything else
// falls through to /tokens?search=… so the user lands on a filtered token
// list instead of a generic search page that may return nothing.

import { isAddress } from "viem";
import { createClient, type NetworkId } from "@/lib/chain";

export type SearchResult =
  | { kind: "block"; href: `/blocks/${string}` }
  | { kind: "tx"; href: `/tx/${string}` }
  | { kind: "address"; href: `/address/${string}` }
  | { kind: "tokens"; href: `/tokens?search=${string}` }
  | { kind: "not_found"; reason: string };

export async function validateAndResolveSearch(
  network: NetworkId,
  query: string,
): Promise<SearchResult> {
  const q = query.trim();
  if (!q) return { kind: "not_found", reason: "Empty query" };

  // Block height — digits only
  if (/^\d+$/.test(q)) {
    try {
      const client = createClient(network);
      const block = await client.getBlock({ blockNumber: BigInt(q) });
      if (block) return { kind: "block", href: `/blocks/${q}` };
    } catch {
      // viem throws when the block doesn't exist; fall through to not_found
    }
    return { kind: "not_found", reason: `Block #${q} not found` };
  }

  // Transaction hash — 0x + 64 hex
  if (/^0x[a-fA-F0-9]{64}$/.test(q)) {
    try {
      const client = createClient(network);
      const tx = await client.getTransaction({ hash: q as `0x${string}` });
      if (tx) return { kind: "tx", href: `/tx/${q}` };
    } catch {
      // not found / invalid
    }
    return { kind: "not_found", reason: "Transaction not found" };
  }

  // Address — viem's checksum-or-lowercase validator. Every well-formed
  // address is a valid lookup target whether or not it has on-chain
  // activity (zero-balance EOAs are normal), so no balance check needed.
  if (isAddress(q)) {
    return { kind: "address", href: `/address/${q.toLowerCase()}` };
  }

  // Fallback: token name / symbol search.
  return { kind: "tokens", href: `/tokens?search=${encodeURIComponent(q)}` };
}
