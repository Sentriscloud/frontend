import fs from 'fs'
import path from 'path'
import os from 'os'

const STORE_FILE = process.env.RATE_LIMIT_FILE ?? path.join(os.tmpdir(), 'faucet-limits.json')
const COOLDOWN_MS = 24 * 60 * 60 * 1000   // 24 hours
const CLEANUP_AGE_MS = 48 * 60 * 60 * 1000 // purge entries older than 48h

// Store shape:
//   limits: { "ip_1.2.3.4": <ms>, "addr_0x1234": <ms> }
//   totalDistributed: <number SRX>
type Store = {
  limits: Record<string, number>
  totalDistributed: number
}

function readStore(): Store {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8')
      const parsed = JSON.parse(raw) as Partial<Store>
      return {
        limits: parsed.limits ?? {},
        totalDistributed: parsed.totalDistributed ?? 0,
      }
    }
  } catch {
    // corrupt or missing — start fresh
  }
  return { limits: {}, totalDistributed: 0 }
}

function writeStore(store: Store): void {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8')
  } catch {
    // non-fatal
  }
}

function remaining(ts: number): number {
  const elapsed = Date.now() - ts
  if (elapsed < COOLDOWN_MS) return Math.ceil((COOLDOWN_MS - elapsed) / 1000)
  return 0
}

export function checkRateLimits(
  ip: string,
  address: string
): { allowed: boolean; cooldownSeconds: number; reason: 'ip' | 'address' | null } {
  const store = readStore()
  const ipKey = `ip_${ip}`
  const addrKey = `addr_${address.toLowerCase()}`

  const ipTs = store.limits[ipKey] ?? 0
  const addrTs = store.limits[addrKey] ?? 0

  const ipCooldown = remaining(ipTs)
  if (ipCooldown > 0) {
    return { allowed: false, cooldownSeconds: ipCooldown, reason: 'ip' }
  }

  const addrCooldown = remaining(addrTs)
  if (addrCooldown > 0) {
    return { allowed: false, cooldownSeconds: addrCooldown, reason: 'address' }
  }

  return { allowed: true, cooldownSeconds: 0, reason: null }
}

export function recordClaim(ip: string, address: string, amountSrx: number): void {
  const store = readStore()
  const now = Date.now()
  const cutoff = now - CLEANUP_AGE_MS

  store.limits[`ip_${ip}`] = now
  store.limits[`addr_${address.toLowerCase()}`] = now
  store.totalDistributed = (store.totalDistributed ?? 0) + amountSrx

  // Purge stale entries
  for (const key of Object.keys(store.limits)) {
    if (store.limits[key] < cutoff) delete store.limits[key]
  }

  writeStore(store)
}

export function getTotalDistributed(): number {
  return readStore().totalDistributed
}
