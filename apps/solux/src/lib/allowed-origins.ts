// Single source of truth for cross-app postMessage allowlist.
// Both /connect (account share) and /sign (EVM signing) endpoints
// validate the requesting origin against this list before responding.
//
// Add new dApps here. Both pages auto-pickup. Avoids drift bug where
// /sign accepts a new origin but /connect rejects it (or vice versa).
//
// Local-dev ports: covers vps4 + typical Next.js dev defaults across
// the apps in this monorepo.
export const ALLOWED_ORIGINS = [
  // Production dApps — Sentrix-official domains only.
  "https://airdrop.sentrixchain.com",
  "https://faucet.sentrixchain.com",
  "https://dex.sentrixchain.com",
  "https://coinblast.sentriscloud.com",
  // Local dev — only ports actually used in the monorepo.
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
  "http://localhost:3006",
  "http://localhost:3008",
  "http://localhost:3009",
] as const;

/**
 * Validate that an origin string conforms to the allowlist.
 * Centralized here so both /sign and /connect have identical semantics.
 */
export function isAllowedOrigin(origin: string): boolean {
  return (ALLOWED_ORIGINS as readonly string[]).includes(origin);
}
