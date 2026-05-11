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

// 64-hex strings are ambiguous between tx hashes and block hashes. We
// probe both in parallel; if a block matches we resolve the height so
// the caller can route to /blocks/<height> (the only block route is
// height-keyed).
async function probeBlockByHash(
  network: NetworkId,
  hash: `0x${string}`,
): Promise<bigint | null> {
  try {
    const client = createClient(network);
    const block = await client.getBlock({ blockHash: hash });
    return block?.number ?? null;
  } catch {
    return null;
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

  // 64-hex — ambiguous between tx hash and block hash. Accept both
  // 0x-prefixed (wallet shape) and bare (Sentrix internal shape).
  // viem needs the 0x form for both getTransaction + getBlock, so we
  // prepend if missing before probing. Run all four probes (tx + block
  // on current + other network) in parallel — at chain-RPC latencies
  // (~50ms each) the cost is dominated by the slowest, not the sum.
  if (/^(0x)?[a-fA-F0-9]{64}$/.test(q)) {
    const probeHash = (q.startsWith("0x") ? q : `0x${q}`) as `0x${string}`;
    const other = OTHER[network];
    const [txHere, txOther, blockHere, blockOther] = await Promise.all([
      probeTx(network, probeHash),
      probeTx(other, probeHash),
      probeBlockByHash(network, probeHash),
      probeBlockByHash(other, probeHash),
    ]);
    if (txHere) return { kind: "tx", href: `/tx/${q}`, onNetwork: network };
    if (blockHere !== null)
      return { kind: "block", href: `/blocks/${blockHere}`, onNetwork: network };
    if (txOther)
      return {
        kind: "tx",
        href: withNetwork(`/tx/${q}`, network, other),
        onNetwork: other,
      };
    if (blockOther !== null)
      return {
        kind: "block",
        href: withNetwork(`/blocks/${blockOther}`, network, other),
        onNetwork: other,
      };
    return { kind: "not_found", reason: "No transaction or block with that hash on either network" };
  }

  // Address — viem's `isAddress` accepts 0x-prefixed only. Sentrix's
  // backend index also keys on the 0x-prefixed lowercase form; pasting
  // bare 40-hex would otherwise silently route to a 0-balance ghost
  // row. Accept both shapes here, normalize before the route.
  if (isAddress(q) || /^[a-fA-F0-9]{40}$/.test(q)) {
    const norm = q.toLowerCase();
    const withPrefix = norm.startsWith("0x") ? norm : `0x${norm}`;
    return { kind: "address", href: `/address/${withPrefix}`, onNetwork: network };
  }

  // Fallback: token name / symbol search.
  return { kind: "tokens", href: `/tokens?search=${encodeURIComponent(q)}`, onNetwork: network };
}
