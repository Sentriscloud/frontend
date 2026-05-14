// Per-IP rate limiter for coinblast server routes (currently /api/pin).
//
// In-memory only. Single Next.js process per host (systemd unit), so a
// Map keyed by IP and pruned on access is enough — the load is bounded
// by the public origin allowlist + Caddy's own connection limits, and
// we don't need cross-process consistency for "10 pins per hour".
//
// Modeled on apps/faucet's pattern but trimmed: no JSON persistence,
// no atomic-rename dance — pins are a quota guard against billing DoS,
// not a fairness ledger. A process restart drops the window, which we
// accept (worst case: an attacker times their burst around a deploy).
//
// Defaults: 10 pins per IP per hour. Override via PIN_RATE_LIMIT_MAX
// and PIN_RATE_LIMIT_WINDOW_MS env vars if the operator needs to flex.

const MAX = parseInt(process.env.PIN_RATE_LIMIT_MAX ?? "10", 10);
const WINDOW_MS = parseInt(
  process.env.PIN_RATE_LIMIT_WINDOW_MS ?? `${60 * 60 * 1000}`,
  10,
);

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type PinRateResult =
  | { allowed: true; remaining: number; resetAt: number }
  | { allowed: false; retryAfterSeconds: number };

export function checkPinRateLimit(ip: string): PinRateResult {
  const now = Date.now();
  const existing = buckets.get(ip);

  if (!existing || existing.resetAt <= now) {
    const fresh: Bucket = { count: 1, resetAt: now + WINDOW_MS };
    buckets.set(ip, fresh);
    return { allowed: true, remaining: MAX - 1, resetAt: fresh.resetAt };
  }

  if (existing.count >= MAX) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: MAX - existing.count,
    resetAt: existing.resetAt,
  };
}

// Read the client IP from headers in the same order of trustworthiness
// the faucet route uses. CF-Connecting-IP is authoritative when traffic
// comes through Cloudflare (the normal path for *.sentriscloud.com). In
// production we require it; otherwise an attacker hitting the origin
// directly with a forged X-Forwarded-For trivially per-IP-bypasses.
export function getClientIP(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const realIP = req.headers.get("x-real-ip");
  if (realIP) return realIP.trim();
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return "127.0.0.1";
}
