import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimits, recordClaim, getTotalDistributed, type Network } from '@/lib/rateLimit'
import * as secp from '@noble/secp256k1'
import { sha256 } from '@noble/hashes/sha2'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils'

const ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/
const SENTRI_PER_SRX = 100_000_000
const MIN_FEE_SENTRI = 10_000

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
      restUrl: process.env.MAINNET_REST_URL ?? 'http://10.20.0.2:8545',
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

function getClientIP(request: NextRequest): string {
  const realIP = request.headers.get('x-real-ip')
  if (realIP) return realIP.trim()
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
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

// POST /api/faucet — request tokens
export async function POST(request: NextRequest) {
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

    const ip = getClientIP(request)
    const { allowed, cooldownSeconds, reason } = checkRateLimits(network, ip, address)
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

    if (!config.faucetPrivateKey || config.faucetPrivateKey === 'PLACEHOLDER') {
      console.error(`[faucet:${network}] FAUCET_PRIVATE_KEY not configured`)
      return NextResponse.json(
        { success: false, error: `${network} faucet not configured — contact admin` },
        { status: 503 }
      )
    }
    if (!config.faucetAddress || config.faucetAddress === 'PLACEHOLDER') {
      console.error(`[faucet:${network}] FAUCET_ADDRESS not configured`)
      return NextResponse.json(
        { success: false, error: `${network} faucet not configured — contact admin` },
        { status: 503 }
      )
    }

    const amountSentri = Math.round(config.amountSrx * SENTRI_PER_SRX)

    let nonce: number
    try {
      nonce = await fetchNonce(config.restUrl, config.faucetAddress)
    } catch (err) {
      console.error(`[faucet:${network}] Failed to fetch nonce:`, err)
      return NextResponse.json(
        { success: false, error: 'Sentrix node unreachable — try again later' },
        { status: 503 }
      )
    }

    const timestamp = Math.floor(Date.now() / 1000)
    const data = ''

    const signingPayload = buildSigningPayload(
      amountSentri, config.chainId, data, config.feeSentri,
      config.faucetAddress.toLowerCase(), nonce, timestamp,
      address.toLowerCase(),
    )

    const privKeyBytes = hexToBytes(config.faucetPrivateKey.startsWith('0x')
      ? config.faucetPrivateKey.slice(2)
      : config.faucetPrivateKey)

    const pubKeyUncompressed = secp.getPublicKey(privKeyBytes, false)
    const pubKeyHex = bytesToHex(pubKeyUncompressed)
    const fromAddress = await deriveAddress(pubKeyUncompressed)

    if (fromAddress.toLowerCase() !== config.faucetAddress.toLowerCase()) {
      console.error(`[faucet:${network}] FAUCET_PRIVATE_KEY does not match FAUCET_ADDRESS`)
      return NextResponse.json(
        { success: false, error: 'Faucet misconfigured — contact admin' },
        { status: 503 }
      )
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
      console.error(`[faucet:${network}] REST error:`, restData.error ?? restData.message)
      return NextResponse.json(
        { success: false, error: restData.error ?? restData.message ?? 'Transaction rejected by node' },
        { status: 400 }
      )
    }

    const txHash = restData.txid ?? signedTx.txid

    recordClaim(network, ip, address, amountSentri)
    console.info(`[faucet:${network}] Sent ${config.amountSrx} SRX → ${address} | tx: ${txHash} | ip: ${ip}`)

    return NextResponse.json({ success: true, txHash })
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
