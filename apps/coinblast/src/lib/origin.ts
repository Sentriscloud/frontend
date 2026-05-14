// CSRF defence — strict Origin allowlist for state-changing routes.
//
// Mirrors the pattern from apps/faucet/src/app/api/faucet/route.ts. The
// browser sets the Origin header on every cross-origin request; same-
// origin browser POSTs may omit it (older browsers, file:// pages),
// which we treat as same-origin since the browser would have populated
// it for any cross-origin call.
//
// Override the allowlist via COINBLAST_ALLOWED_ORIGINS (comma-separated).
// Default covers the public coinblast subdomain plus the dev hostnames
// faucet's allowlist also accepts (localhost ports devs run while
// hacking on the create-coin flow). Anything else gets a 403.

const DEFAULT_ALLOWED = [
  "https://coinblast.sentriscloud.com",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:3002",
].join(",");

const ALLOWED_ORIGINS = new Set(
  (process.env.COINBLAST_ALLOWED_ORIGINS ?? DEFAULT_ALLOWED)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

export function checkOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  return ALLOWED_ORIGINS.has(origin);
}
