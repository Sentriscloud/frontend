import { NextRequest, NextResponse } from 'next/server'
import {
  tryReserveClaim, commitClaim, releaseClaim, getTotalDistributed,
  type Network,
} from '@/lib/rateLimit'
import * as secp from '@noble/secp256k1'
import { sha256 } from '@noble/hashes/sha2'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils'

const ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/
const PRIVATE_KEY_REGEX = /^[0-9a-fA-F]{64}$/
const SENTRI_PER_SRX = 100_000_000
const MIN_FEE_SENTRI = 10_000

// Origins that may POST to /api/faucet. Strict allowlist — same-origin
// requests already work without an Origin header (browser policy), this
// catches the cross-site case where a malicious page tries to drain the
// faucet through a victim's IP.
const ALLOWED_ORIGINS = new Set(
  (process.env.FAUCET_ALLOWED_ORIGINS ?? 'https://faucet.sentrixchain.com')
    .split(',').map((s) => s.trim()).filter(Boolean)
)

type NetworkConfig = {
  chainId: number
  restUrl: string
  faucetAddress: string | undefined
  faucetPrivateKey: string | undefined
  amountSrx: number
  feeSentri: number
  turnstileSecret: string | undefined
}

function getConfig(network: Network): NetworkConfig {
  if (network === 'mainnet') {
    return {
      chainId: 7119,
      restUrl: process.env.MAINNET_REST_URL ?? 'http://127.0.0.1:8545',
      faucetAddress: process.env.MAINNET_FAUCET_ADDRESS,
      faucetPrivateKey: process.env.MAINNET_FAUCET_PRIVATE_KEY,
      amountSrx: parseFloat(process.env.MAINNET_DRIP_AMOUNT_SRX ?? '0.01'),
      feeSentri: Math.max(parseInt(process.env.MAINNET_FEE_SENTRI ?? '10000', 10), MIN_FEE_SENTRI),
      turnstileSecret: process.env.MAINNET_TURNSTILE_SECRET_KEY,
    }
  }
  return {
    chainId: 7120,
    restUrl: process.env.TESTNET_REST_URL ?? 'http://127.0.0.1:9545',
    faucetAddress: process.env.TESTNET_FAUCET_ADDRESS,
    faucetPrivateKey: process.env.TESTNET_FAUCET_PRIVATE_KEY,
    amountSrx: parseFloat(process.env.TESTNET_DRIP_AMOUNT_SRX ?? '10'),
    feeSentri: Math.max(parseInt(process.env.TESTNET_FEE_SENTRI ?? '10000', 10), MIN_FEE_SENTRI),
    turnstileSecret: process.env.TESTNET_TURNSTILE_SECRET_KEY,
  }
}

// Per-faucet-address nonce mutex. Two requests landing on the same network
// in flight would otherwise both fetch the same on-chain nonce, sign tx
// with identical nonce, and the second would fail with InvalidNonce. The
// mutex serialises nonce fetch + sign + broadcast per faucet identity.
const nonceMutex = new Map<string, Promise<unknown>>()
function withNonceLock<T>(faucetAddress: string, fn: () => Promise<T>): Promise<T> {
  const prev = nonceMutex.get(faucetAddress) ?? Promise.resolve()
  const result = prev.then(() => fn())
  nonceMutex.set(faucetAddress, result.catch(() => undefined))
  return result
}

// Read the client IP from headers in order of trustworthiness:
//   1. `CF-Connecting-IP` — set by Cloudflare (the public proxy fronting
//      the Caddy edge). This is authoritative when traffic arrives via
//      CF, which is the normal path for faucet.sentrixchain.com.
//   2. `X-Real-IP` — set by Caddy if explicitly configured. Optional.
//   3. `X-Forwarded-For` — last resort. Caddy v2 by default *preserves*
//      any client-supplied X-Forwarded-For chain and appends the real
//      socket IP, so taking the first entry is spoofable. We take the
//      LAST entry instead (the closest trusted hop's view of the
//      client), which the local Caddy controls.
//
// The faucet is rate-limited per IP and an attacker bypassing this gate
// drains shared funds — header trust matters.
function getClientIP(request: NextRequest): string {
  const cf = request.headers.get('cf-connecting-ip')
  if (cf) return cf.trim()
  const realIP = request.headers.get('x-real-ip')
  if (realIP) return realIP.trim()
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const parts = forwarded.split(',').map((s) => s.trim()).filter(Boolean)
    if (parts.length > 0) return parts[parts.length - 1]
  }
  return '127.0.0.1'
}

async function deriveAddress(pubKeyUncompressed: Uint8Array): Promise<string> {
  const { keccak_256 } = await import('@noble/hashes/sha3')
  const hash = keccak_256(pubKeyUncompressed.slice(1))
  return '0x' + bytesToHex(hash.slice(12))
}

function buildSigningPayload(
  amount: number, chainId: number, data: string, fee: number,
  fromAddress: string, nonce: number, timestamp: number, toAddress: string,
): string {
  return JSON.stringify({
    amount, chain_id: chainId, data, fee,
    from: fromAddress, nonce, timestamp, to: toAddress,
  })
}

async function fetchNonce(restUrl: string, address: string): Promise<number> {
  const res = await fetch(`${restUrl}/accounts/${address}/nonce`, {
    signal: AbortSignal.timeout(5_000),
  })
  const data = await res.json() as { nonce?: number }
  return data.nonce ?? 0
}

async function fetchFaucetBalance(restUrl: string, faucetAddress: string | undefined): Promise<number> {
  if (!faucetAddress) return 0
  try {
    const res = await fetch(`${restUrl}/accounts/${faucetAddress}/balance`, {
      signal: AbortSignal.timeout(3_000),
    })
    const data = await res.json() as { balance_srx?: number }
    return data.balance_srx ?? 0
  } catch {
    return 0
  }
}

function parseNetwork(value: unknown): Network | null {
  if (value === 'testnet' || value === 'mainnet') return value
  return null
}

// Map opaque chain errors into stable, user-facing strings. Internal state
// like nonce numbers / mempool sizes shouldn't bleed to the end user. Falls
// back to a generic message if the error is unrecognised.
function sanitizeChainError(raw: string | undefined): string {
  if (!raw) return 'Transaction rejected by node'
  const lower = raw.toLowerCase()
  if (lower.includes('invalidnonce') || lower.includes('nonce')) {
    return 'Faucet busy — try again in a moment'
  }
  if (lower.includes('insufficient') || lower.includes('balance')) {
    return 'Faucet temporarily depleted — try again later'
  }
  if (lower.includes('mempool') && lower.includes('full')) {
    return 'Network congested — try again in a moment'
  }
  if (lower.includes('signature')) {
    return 'Faucet misconfigured — contact admin'
  }
  return 'Transaction rejected by node'
}

function checkOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  // Same-origin browser POSTs may omit Origin in some edge cases (older
  // browsers, file:// pages). Treat null as same-origin since the browser
  // would have set it for any cross-origin request.
  if (!origin) return true
  return ALLOWED_ORIGINS.has(origin)
}

// POST /api/faucet — request tokens
export async function POST(request: NextRequest) {
  if (!checkOrigin(request)) {
    return NextResponse.json({ success: false, error: 'Cross-origin requests not allowed' }, { status: 403 })
  }
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
    }

    const { address, captcha, network: networkRaw } = body as {
      address?: string; captcha?: string; network?: string
    }

    const network = parseNetwork(networkRaw)
    if (!network) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid network — must be "testnet" or "mainnet"' },
        { status: 400 }
      )
    }

    if (!address || typeof address !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing wallet address' }, { status: 400 })
    }

    if (!ADDRESS_REGEX.test(address)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address (must be 0x + 40 hex characters)' },
        { status: 400 }
      )
    }

    const config = getConfig(network)

    // Cloudflare Turnstile verification — only enforced when secret is set
    if (config.turnstileSecret) {
      if (!captcha || typeof captcha !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Captcha token missing' },
          { status: 400 }
        )
      }
      try {
        const verifyRes = await fetch(
          'https://challenges.cloudflare.com/turnstile/v0/siteverify',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ secret: config.turnstileSecret, response: captcha }),
            signal: AbortSignal.timeout(5_000),
          }
        )
        const verifyData = (await verifyRes.json()) as { success?: boolean; 'error-codes'?: string[] }
        if (!verifyData.success) {
          console.warn(`[faucet:${network}] turnstile failed:`, verifyData['error-codes'])
          return NextResponse.json(
            { success: false, error: 'Captcha verification failed — try again' },
            { status: 403 }
          )
        }
      } catch (err) {
        console.error(`[faucet:${network}] turnstile verify error:`, err)
        return NextResponse.json(
          { success: false, error: 'Captcha verification unavailable — try again later' },
          { status: 503 }
        )
      }
    }

    // Atomically check + reserve the rate-limit slot. Concurrent requests
    // can't both pass — the second one sees the first one's reservation.
    const ip = getClientIP(request)
    const reservation = await tryReserveClaim(network, ip, address)
    if (!reservation.allowed) {
      const msg = reservation.reason === 'address'
        ? 'This address already claimed today — come back in 24h'
        : 'Rate limit: 1 request per 24 hours per IP address'
      return NextResponse.json(
        { success: false, error: msg, cooldown: reservation.cooldownSeconds },
        { status: 429 }
      )
    }

    // Validate config; if missing, release the reservation we just made
    // so the user can retry once the operator fixes things.
    const fail = async (status: number, error: string) => {
      await releaseClaim(reservation.reservation)
      return NextResponse.json({ success: false, error }, { status })
    }

    if (!config.faucetPrivateKey || config.faucetPrivateKey === 'PLACEHOLDER') {
      console.error(`[faucet:${network}] FAUCET_PRIVATE_KEY not configured`)
      return fail(503, `${network} faucet not configured — contact admin`)
    }
    if (!config.faucetAddress || config.faucetAddress === 'PLACEHOLDER') {
      console.error(`[faucet:${network}] FAUCET_ADDRESS not configured`)
      return fail(503, `${network} faucet not configured — contact admin`)
    }
    const cleanedKey = config.faucetPrivateKey.startsWith('0x')
      ? config.faucetPrivateKey.slice(2)
      : config.faucetPrivateKey
    if (!PRIVATE_KEY_REGEX.test(cleanedKey)) {
      console.error(`[faucet:${network}] FAUCET_PRIVATE_KEY is not 64 hex chars`)
      return fail(503, `${network} faucet misconfigured — contact admin`)
    }

    const amountSentri = Math.round(config.amountSrx * SENTRI_PER_SRX)

    // Sign + broadcast under the per-faucet-address nonce mutex so
    // concurrent claims don't collide on the same nonce.
    const broadcastResult = await withNonceLock(config.faucetAddress, async () => {
      let nonce: number
      try {
        nonce = await fetchNonce(config.restUrl, config.faucetAddress!)
      } catch (err) {
        console.error(`[faucet:${network}] Failed to fetch nonce:`, err)
        return { ok: false as const, status: 503, error: 'Sentrix node unreachable — try again later' }
      }

      const timestamp = Math.floor(Date.now() / 1000)
      const data = ''
      const signingPayload = buildSigningPayload(
        amountSentri, config.chainId, data, config.feeSentri,
        config.faucetAddress!.toLowerCase(), nonce, timestamp,
        address.toLowerCase(),
      )

      const privKeyBytes = hexToBytes(cleanedKey)
      const pubKeyUncompressed = secp.getPublicKey(privKeyBytes, false)
      const pubKeyHex = bytesToHex(pubKeyUncompressed)
      const fromAddress = await deriveAddress(pubKeyUncompressed)

      if (fromAddress.toLowerCase() !== config.faucetAddress!.toLowerCase()) {
        console.error(`[faucet:${network}] FAUCET_PRIVATE_KEY does not match FAUCET_ADDRESS`)
        return { ok: false as const, status: 503, error: 'Faucet misconfigured — contact admin' }
      }

      const msgHash = sha256(new TextEncoder().encode(signingPayload))
      const sig = await secp.signAsync(msgHash, privKeyBytes)
      const sigHex = bytesToHex(sig.toCompactRawBytes())
      const txid = bytesToHex(sha256(new TextEncoder().encode(signingPayload)))

      const signedTx = {
        txid,
        from_address: fromAddress.toLowerCase(),
        to_address: address.toLowerCase(),
        amount: amountSentri,
        fee: config.feeSentri,
        nonce,
        data,
        timestamp,
        chain_id: config.chainId,
        signature: sigHex,
        public_key: pubKeyHex,
      }

      let restRes: Response
      try {
        restRes = await fetch(`${config.restUrl}/transactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.SENTRIX_API_KEY ? { 'X-API-Key': process.env.SENTRIX_API_KEY } : {}),
          },
          body: JSON.stringify({ transaction: signedTx }),
          signal: AbortSignal.timeout(15_000),
        })
      } catch (err) {
        console.error(`[faucet:${network}] REST unreachable:`, err)
        return { ok: false as const, status: 503, error: 'Sentrix node unreachable — try again later' }
      }

      let restData: { success?: boolean; txid?: string; error?: string; message?: string }
      try {
        restData = await restRes.json()
      } catch {
        return { ok: false as const, status: 502, error: 'Invalid response from Sentrix node' }
      }

      if (!restData.success) {
        console.error(`[faucet:${network}] REST error:`, restData.error ?? restData.message)
        return {
          ok: false as const,
          status: 400,
          error: sanitizeChainError(restData.error ?? restData.message),
        }
      }

      return { ok: true as const, txHash: restData.txid ?? signedTx.txid }
    })

    if (!broadcastResult.ok) {
      // Roll back the rate-limit reservation so the user can retry.
      await releaseClaim(reservation.reservation)
      return NextResponse.json(
        { success: false, error: broadcastResult.error },
        { status: broadcastResult.status }
      )
    }

    await commitClaim(network, config.amountSrx)
    console.info(`[faucet:${network}] Sent ${config.amountSrx} SRX → ${address} | tx: ${broadcastResult.txHash} | ip: ${ip}`)

    return NextResponse.json({ success: true, txHash: broadcastResult.txHash })
  } catch (err) {
    console.error('[faucet] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/faucet?network=testnet|mainnet — faucet stats
export async function GET(request: NextRequest) {
  const networkRaw = request.nextUrl.searchParams.get('network')
  const network = parseNetwork(networkRaw)
  if (!network) {
    return NextResponse.json(
      { error: 'Missing or invalid network query param — must be "testnet" or "mainnet"' },
      { status: 400 }
    )
  }

  const config = getConfig(network)
  const [balance, totalDistributed] = await Promise.all([
    fetchFaucetBalance(config.restUrl, config.faucetAddress),
    Promise.resolve(getTotalDistributed(network)),
  ])

  return NextResponse.json({
    network,
    amount: config.amountSrx,
    chainId: config.chainId,
    faucetAddress: config.faucetAddress ?? '',
    cooldownHours: 24,
    balance,
    totalDistributed,
    status: config.faucetAddress && config.faucetAddress !== 'PLACEHOLDER' ? 'active' : 'unconfigured',
  })
}
