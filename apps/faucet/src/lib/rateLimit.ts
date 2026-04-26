import fs from 'fs'
import path from 'path'
import os from 'os'

const STORE_FILE = process.env.RATE_LIMIT_FILE ?? path.join(os.tmpdir(), 'faucet-limits.json')
const COOLDOWN_MS = 24 * 60 * 60 * 1000   // 24 hours
const CLEANUP_AGE_MS = 48 * 60 * 60 * 1000 // purge entries older than 48h

export type Network = 'testnet' | 'mainnet'

// Store shape (namespaced per network):
//   networks: {
//     testnet: { limits: { "ip_1.2.3.4": <ms>, "addr_0x1234": <ms> }, totalDistributed: <SRX> },
//     mainnet: { ... }
//   }
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
  network: Network,
  ip: string,
  address: string
): { allowed: boolean; cooldownSeconds: number; reason: 'ip' | 'address' | null } {
  const store = readStore()
  const net = store.networks[network]
  const ipTs = net.limits[`ip_${ip}`] ?? 0
  const addrTs = net.limits[`addr_${address.toLowerCase()}`] ?? 0

  const ipCooldown = remaining(ipTs)
  if (ipCooldown > 0) return { allowed: false, cooldownSeconds: ipCooldown, reason: 'ip' }

  const addrCooldown = remaining(addrTs)
  if (addrCooldown > 0) return { allowed: false, cooldownSeconds: addrCooldown, reason: 'address' }

  return { allowed: true, cooldownSeconds: 0, reason: null }
}

export function recordClaim(network: Network, ip: string, address: string, amountSrx: number): void {
  const store = readStore()
  const net = store.networks[network]
  const now = Date.now()
  const cutoff = now - CLEANUP_AGE_MS

  net.limits[`ip_${ip}`] = now
  net.limits[`addr_${address.toLowerCase()}`] = now
  net.totalDistributed = (net.totalDistributed ?? 0) + amountSrx

  for (const key of Object.keys(net.limits)) {
    if (net.limits[key] < cutoff) delete net.limits[key]
  }

  writeStore(store)
}

export function getTotalDistributed(network: Network): number {
  return readStore().networks[network].totalDistributed
}
