import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimits, recordClaim, getTotalDistributed } from '@/lib/rateLimit'
import * as secp from '@noble/secp256k1'
import { sha256 } from '@noble/hashes/sha2'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils'

const ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/
const REST_URL = process.env.REST_URL ?? 'http://103.175.219.233:8545'
const SENTRI_PER_SRX = 100_000_000
const MIN_FEE_SENTRI = 10_000 // protocol minimum enforced by Sentrix node
const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID ?? '7119', 10)

function getClientIP(request: NextRequest): string {
  const realIP = request.headers.get('x-real-ip')
  if (realIP) return realIP.trim()
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return '127.0.0.1'
}

// Derive Keccak-256 based Sentrix address from uncompressed public key.
// Mirrors Rust: sha3::Keccak256(pubkey[1..]) → last 20 bytes → "0x" + hex
async function deriveAddress(pubKeyUncompressed: Uint8Array): Promise<string> {
  // Use Web Crypto SHA-3 (keccak256) — Next.js edge/Node supports this via subtle or noble
  // @noble/hashes provides keccak256
  const { keccak_256 } = await import('@noble/hashes/sha3')
  const hash = keccak_256(pubKeyUncompressed.slice(1)) // skip 0x04 prefix
  return '0x' + bytesToHex(hash.slice(12)) // last 20 bytes
}

// Build canonical signing payload (BTreeMap-sorted keys, same as Rust)
function buildSigningPayload(
  amount: number,
  chainId: number,
  data: string,
  fee: number,
  fromAddress: string,
  nonce: number,
  timestamp: number,
  toAddress: string,
): string {
  // Keys must match Rust BTreeMap sort order: amount < chain_id < data < fee < from < nonce < timestamp < to
  return JSON.stringify({
    amount,
    chain_id: chainId,
    data,
    fee,
    from: fromAddress,
    nonce,
    timestamp,
    to: toAddress,
  })
}

async function fetchNonce(address: string): Promise<number> {
  const res = await fetch(`${REST_URL}/accounts/${address}/nonce`, {
    signal: AbortSignal.timeout(5_000),
  })
  const data = await res.json() as { nonce?: number }
  return data.nonce ?? 0
}

async function fetchFaucetBalance(): Promise<number> {
  const faucetAddress = process.env.FAUCET_ADDRESS
  if (!faucetAddress) return 0
  try {
    const res = await fetch(`${REST_URL}/accounts/${faucetAddress}/balance`, {
      signal: AbortSignal.timeout(3_000),
    })
    const data = await res.json() as { balance_srx?: number }
    return data.balance_srx ?? 0
  } catch {
    return 0
  }
}

// POST /api/faucet — request tokens
export async function POST(request: NextRequest) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
    }

    const { address } = body as { address?: string }

    if (!address || typeof address !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing wallet address' }, { status: 400 })
    }

    if (!ADDRESS_REGEX.test(address)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address (must be 0x + 40 hex characters)' },
        { status: 400 }
      )
    }

    // Check rate limits — IP AND address
    const ip = getClientIP(request)
    const { allowed, cooldownSeconds, reason } = checkRateLimits(ip, address)

    if (!allowed) {
      const msg =
        reason === 'address'
          ? 'This address already claimed today — come back in 24h'
          : 'Rate limit: 1 request per 24 hours per IP address'
      return NextResponse.json(
        { success: false, error: msg, cooldown: cooldownSeconds },
        { status: 429 }
      )
    }

    // Validate server config
    const faucetPrivateKeyHex = process.env.FAUCET_PRIVATE_KEY
    const faucetAddress = process.env.FAUCET_ADDRESS
    const amountSRX = parseInt(process.env.FAUCET_AMOUNT ?? '10', 10)
    const amountSentri = amountSRX * SENTRI_PER_SRX
    const feeSentri = Math.max(
      parseInt(process.env.FAUCET_FEE_SENTRI ?? '10000', 10),
      MIN_FEE_SENTRI
    )

    if (!faucetPrivateKeyHex || faucetPrivateKeyHex === 'FILL_IN_FROM_GENESIS_WALLETS') {
      console.error('[faucet] FAUCET_PRIVATE_KEY not configured')
      return NextResponse.json(
        { success: false, error: 'Faucet not configured — contact admin' },
        { status: 503 }
      )
    }
    if (!faucetAddress) {
      console.error('[faucet] FAUCET_ADDRESS not configured')
      return NextResponse.json(
        { success: false, error: 'Faucet not configured — contact admin' },
        { status: 503 }
      )
    }

    // C-01 FIX: Sign transaction locally — private key never leaves this server
    let nonce: number
    try {
      nonce = await fetchNonce(faucetAddress)
    } catch (err) {
      console.error('[faucet] Failed to fetch nonce:', err)
      return NextResponse.json(
        { success: false, error: 'Sentrix node unreachable — try again later' },
        { status: 503 }
      )
    }

    const timestamp = Math.floor(Date.now() / 1000)
    const data = ''

    // Build signing payload (canonical BTreeMap-sorted JSON)
    const signingPayload = buildSigningPayload(
      amountSentri, CHAIN_ID, data, feeSentri,
      faucetAddress.toLowerCase(), nonce, timestamp,
      address.toLowerCase(),
    )

    // Derive keys from private key
    const privKeyBytes = hexToBytes(faucetPrivateKeyHex.startsWith('0x')
      ? faucetPrivateKeyHex.slice(2)
      : faucetPrivateKeyHex)

    const pubKeyUncompressed = secp.getPublicKey(privKeyBytes, false) // uncompressed 65 bytes
    const pubKeyHex = bytesToHex(pubKeyUncompressed)
    const fromAddress = await deriveAddress(pubKeyUncompressed)

    if (fromAddress.toLowerCase() !== faucetAddress.toLowerCase()) {
      console.error('[faucet] FAUCET_PRIVATE_KEY does not match FAUCET_ADDRESS')
      return NextResponse.json(
        { success: false, error: 'Faucet misconfigured — contact admin' },
        { status: 503 }
      )
    }

    // Sign: SHA-256 of payload → ECDSA signature (compact 64 bytes)
    const msgHash = sha256(new TextEncoder().encode(signingPayload))
    const sig = await secp.signAsync(msgHash, privKeyBytes)
    const sigHex = bytesToHex(sig.toCompactRawBytes())

    // Compute txid = SHA-256 of signing payload
    const txid = bytesToHex(sha256(new TextEncoder().encode(signingPayload)))

    // Build signed transaction object
    const signedTx = {
      txid,
      from_address: fromAddress.toLowerCase(),
      to_address: address.toLowerCase(),
      amount: amountSentri,
      fee: feeSentri,
      nonce,
      data,
      timestamp,
      chain_id: CHAIN_ID,
      signature: sigHex,
      public_key: pubKeyHex,
    }

    // Submit via REST POST /transactions (no private key transmitted)
    let restRes: Response
    try {
      restRes = await fetch(`${REST_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.SENTRIX_API_KEY ? { 'X-API-Key': process.env.SENTRIX_API_KEY } : {}),
        },
        body: JSON.stringify({ transaction: signedTx }),
        signal: AbortSignal.timeout(15_000),
      })
    } catch (err) {
      console.error('[faucet] REST unreachable:', err)
      return NextResponse.json(
        { success: false, error: 'Sentrix node unreachable — try again later' },
        { status: 503 }
      )
    }

    let restData: { success?: boolean; txid?: string; error?: string; message?: string }
    try {
      restData = await restRes.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid response from Sentrix node' },
        { status: 502 }
      )
    }

    if (!restData.success) {
      console.error('[faucet] REST error:', restData.error ?? restData.message)
      return NextResponse.json(
        { success: false, error: restData.error ?? restData.message ?? 'Transaction rejected by node' },
        { status: 400 }
      )
    }

    const txHash = restData.txid ?? signedTx.txid

    // Record after confirmed success
    recordClaim(ip, address, amountSentri)
    console.info(`[faucet] Sent ${amountSRX} SRX → ${address} | tx: ${txHash} | ip: ${ip}`)

    return NextResponse.json({ success: true, txHash })
  } catch (err) {
    console.error('[faucet] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/faucet — faucet stats (no sensitive data)
export async function GET() {
  const [balance, totalDistributed] = await Promise.all([
    fetchFaucetBalance(),
    Promise.resolve(getTotalDistributed()),
  ])

  return NextResponse.json({
    amount: parseInt(process.env.FAUCET_AMOUNT ?? '10', 10),
    chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID ?? '7119', 10),
    faucetAddress: process.env.FAUCET_ADDRESS ?? '',
    cooldownHours: 24,
    balance,
    totalDistributed,
    status: 'active',
  })
}
