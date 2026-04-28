import fs from 'fs'
import path from 'path'
import os from 'os'

// Faucet rate limiter — JSON-backed, intra-process mutex serialised.
//
// Why this layout:
//   - Faucet runs as a single Next.js process per host (systemd unit).
//     A module-level Promise chain is therefore enough to serialise
//     read-modify-write — Node is single-threaded and we only have
//     one writer.
//   - We combine "is the caller allowed?" with "reserve the slot" in
//     one atomic call (`tryReserveClaim`). The previous shape exposed
//     `checkRateLimits` separately from `recordClaim`, which left a
//     gap between pass-check and broadcast where two concurrent
//     requests could both clear the gate before either committed.
//   - On broadcast failure we expose `releaseClaim` so the caller
//     can give the slot back rather than punishing the user for a
//     chain-side error.

const STORE_FILE = process.env.RATE_LIMIT_FILE ?? path.join(os.tmpdir(), 'faucet-limits.json')
const COOLDOWN_MS = 24 * 60 * 60 * 1000   // 24 hours
const CLEANUP_AGE_MS = 48 * 60 * 60 * 1000 // purge entries older than 48h

export type Network = 'testnet' | 'mainnet'

type NetworkStore = {
  limits: Record<string, number>
  totalDistributed: number
}

type Store = {
  networks: Record<Network, NetworkStore>
}

const emptyNetwork = (): NetworkStore => ({ limits: {}, totalDistributed: 0 })

function readStore(): Store {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8')
      const parsed = JSON.parse(raw) as Partial<Store> & {
        // Backwards-compat with pre-network store shape
        limits?: Record<string, number>
        totalDistributed?: number
      }
      // Migration: older single-network store → assume testnet
      if (!parsed.networks && parsed.limits) {
        return {
          networks: {
            testnet: { limits: parsed.limits, totalDistributed: parsed.totalDistributed ?? 0 },
            mainnet: emptyNetwork(),
          },
        }
      }
      return {
        networks: {
          testnet: parsed.networks?.testnet ?? emptyNetwork(),
          mainnet: parsed.networks?.mainnet ?? emptyNetwork(),
        },
      }
    }
  } catch {
    // corrupt or missing — start fresh
  }
  return { networks: { testnet: emptyNetwork(), mainnet: emptyNetwork() } }
}

function writeStore(store: Store): void {
  // Write to a tempfile in the same directory then rename — POSIX rename
  // is atomic, so a concurrent reader either sees the old file or the
  // new file, never a half-written one.
  try {
    const dir = path.dirname(STORE_FILE)
    const tmp = path.join(dir, `.faucet-limits.${process.pid}.${Date.now()}.tmp`)
    fs.writeFileSync(tmp, JSON.stringify(store, null, 2), 'utf-8')
    fs.renameSync(tmp, STORE_FILE)
  } catch {
    // non-fatal
  }
}

function remaining(ts: number): number {
  const elapsed = Date.now() - ts
  if (elapsed < COOLDOWN_MS) return Math.ceil((COOLDOWN_MS - elapsed) / 1000)
  return 0
}

// ── Module-level mutex ────────────────────────────────────────────────
// Guarantees that all reservations / releases are linearised even when
// multiple concurrent requests arrive at the same Node process.
let chain: Promise<unknown> = Promise.resolve()
function withLock<T>(fn: () => T): Promise<T> {
  const result = chain.then(() => fn())
  // Don't break the chain on errors — next caller still runs.
  chain = result.catch(() => undefined)
  return result
}

export interface Reservation {
  ipKey: string
  addrKey: string
  network: Network
}

export type ReserveResult =
  | { allowed: true; reservation: Reservation }
  | { allowed: false; cooldownSeconds: number; reason: 'ip' | 'address' }

/**
 * Atomically: check both rate-limit slots, and (if both pass) write the
 * reservation into the store. Returns a reservation handle the caller can
 * later pass to releaseClaim() if the broadcast fails.
 */
export function tryReserveClaim(
  network: Network,
  ip: string,
  address: string,
): Promise<ReserveResult> {
  return withLock(() => {
    const store = readStore()
    const net = store.networks[network]
    const ipKey = `ip_${ip}`
    const addrKey = `addr_${address.toLowerCase()}`
    const ipTs = net.limits[ipKey] ?? 0
    const addrTs = net.limits[addrKey] ?? 0

    const ipCooldown = remaining(ipTs)
    if (ipCooldown > 0) {
      return { allowed: false, cooldownSeconds: ipCooldown, reason: 'ip' as const }
    }
    const addrCooldown = remaining(addrTs)
    if (addrCooldown > 0) {
      return { allowed: false, cooldownSeconds: addrCooldown, reason: 'address' as const }
    }

    // Reserve immediately so concurrent callers can't pass the gate.
    const now = Date.now()
    const cutoff = now - CLEANUP_AGE_MS
    net.limits[ipKey] = now
    net.limits[addrKey] = now
    for (const key of Object.keys(net.limits)) {
      if (net.limits[key] < cutoff) delete net.limits[key]
    }
    writeStore(store)

    return { allowed: true, reservation: { ipKey, addrKey, network } }
  })
}

/** Persist the SRX amount against the totalDistributed counter (success). */
export function commitClaim(network: Network, amountSrx: number): Promise<void> {
  return withLock(() => {
    const store = readStore()
    const net = store.networks[network]
    net.totalDistributed = (net.totalDistributed ?? 0) + amountSrx
    writeStore(store)
  })
}

/** Roll back a reservation if broadcast failed. The slot becomes claimable
 *  again — fair to the user since they didn't actually receive anything. */
export function releaseClaim(reservation: Reservation): Promise<void> {
  return withLock(() => {
    const store = readStore()
    const net = store.networks[reservation.network]
    delete net.limits[reservation.ipKey]
    delete net.limits[reservation.addrKey]
    writeStore(store)
  })
}

export function getTotalDistributed(network: Network): number {
  return readStore().networks[network].totalDistributed
}
