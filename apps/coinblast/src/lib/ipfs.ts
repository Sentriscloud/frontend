// ipfs:// → public-gateway resolver. The browser doesn't speak ipfs://
// natively, so any imageUrl persisted as ipfs://<cid> needs to be
// translated before it reaches an <img src>. Used by TokenAvatar +
// any other component that takes imageUrl from a Token.
//
// The gateway can be overridden per-deploy via NEXT_PUBLIC_IPFS_GATEWAY
// — useful when the shared Pinata gateway rate-limits and we want to
// switch to a custom-subdomain Pinata gateway without a code change.

const DEFAULT_GATEWAY = "https://gateway.pinata.cloud/ipfs/";

function gateway(): string {
  const g = process.env.NEXT_PUBLIC_IPFS_GATEWAY || DEFAULT_GATEWAY;
  // Always end in `/` so we can dumb-concat the CID.
  return g.endsWith("/") ? g : g + "/";
}

/**
 * Resolve an image reference to something <img> can load.
 *
 * - `ipfs://<cid>[/path]` → `<gateway><cid>[/path]`
 * - `https://…` / `http://…` / `data:…` / `blob:…` → unchanged
 * - empty / undefined → empty string (avatar then falls back to its
 *   deterministic gradient)
 */
export function ipfsToGateway(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("ipfs://")) {
    return gateway() + url.slice("ipfs://".length);
  }
  return url;
}
