// Server-side network detection. Used by every page.tsx / layout.tsx that
// needs to know the active network during SSR (before NetworkProvider
// hydrates on the client). Host wins: scan-testnet.sentrixchain.com is
// the testnet-locked variant, scan.sentrixchain.com is mainnet. Anything
// else (local dev, scan.sentriscloud.com) falls back to the cookie.
//
// Centralised here because the scan home page used to do its own
// cookie-only read and serve mainnet blocks under the testnet host —
// fresh visitors saw a frame of mainnet data before the client polled
// testnet on hydrate.

import { cookies, headers } from "next/headers";
import type { NetworkId } from "./chain";

export async function readServerNetwork(): Promise<NetworkId> {
  const h = await headers();
  const host = (h.get("host") ?? "").toLowerCase();
  if (host.startsWith("scan-testnet.") || host.startsWith("testnet-scan.")) {
    return "testnet";
  }
  if (host === "scan.sentrixchain.com" || host.startsWith("scan.")) {
    return "mainnet";
  }
  const cookieStore = await cookies();
  const stored = cookieStore.get("sentrix-network")?.value;
  return stored === "testnet" ? "testnet" : "mainnet";
}
