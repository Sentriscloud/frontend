// One-shot deploy script for 7 meme tokens on CoinBlast.
//
// Steps:
//   1. Generate a fresh EVM wallet (private key never enters chat).
//   2. Fund it with 10 SRX from the mainnet faucet wallet.
//   3. Pin each PNG icon via /api/pin → IPFS URI.
//   4. For each token: factory.createCurve → wait receipt → capture
//      curve+token addresses from the CurveCreated event.
//   5. POST owner-signed metadata to /api/cb/metadata (image, description).
//   6. Print final summary (addresses + tx hashes + image URIs).
//
// Secrets handling: the new wallet's private key is written to
// `~/coinblast-wallet.txt` mode 600 and NEVER printed to stdout. The
// faucet key is read from a file via fs (never echoed).

import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  parseEther,
  formatEther,
  parseEventLogs,
  parseAbi,
  parseAbiParameters,
  encodeFunctionData,
} from 'viem'
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ── Config ─────────────────────────────────────────────────
const SENTRIX_MAINNET = defineChain({
  id: 7119,
  name: 'Sentrix Chain',
  nativeCurrency: { name: 'Sentrix', symbol: 'SRX', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.sentrixchain.com'] } },
})

const FACTORY = '0xc9D7a61D7C2F428F6A055916488041fD00532110'
const ROUTER = '0xAb67E171c0DE0Cd6dD6fE87E5E399C091F9c9dE8'
const WSRX = '0x4693b113e523A196d9579333c4ab8358e2656553'
const ECO_FUND = '0xeb70fdefd00fdb768dec06c478f450c351499f14'

const FAUCET_KEYFILE = '/home/sentriscloud/sentrix/secrets/faucets/mainnet/wallet.txt'
const NEW_WALLET_FILE = path.join(homedir(), 'coinblast-wallet.txt')
const ICONS_DIR = path.join(homedir(), 'coinblast-icons')

const FUND_AMOUNT_SRX = 10n // total to send to new wallet
const SEED_PER_TOKEN_SRX = 0.5 // not used in createCurve directly; gas + buffer

// 7 tokens. Curve params lift CBLAST genesis defaults: 1 B supply,
// price 0.0001 SRX, k = 0.5, graduation at 1000 SRX raised, 0% creator fee.
const TOKENS = [
  { sym: 'WKWK', name: 'wkwkland', desc: 'The lol coin of Indonesia. Wkwkwk forever.', icon: 'wkwk.png' },
  { sym: 'BAKSO', name: 'Bakso Coin', desc: 'Bakso pertama di blockchain Indonesia.', icon: 'bakso.png' },
  { sym: 'MARTABAK', name: 'Martabak', desc: 'Manis dan asin both available. Pick your slice.', icon: 'martabak.png' },
  { sym: 'HALU', name: 'Halu', desc: 'Halu bullish. The coin of speculative dreams.', icon: 'halu.png' },
  { sym: 'SULTAN', name: 'Sultan', desc: 'Sultan kalau sudah hold ini. Aspirational asset.', icon: 'sultan.png' },
  { sym: 'KOPIDEV', name: 'Kopi Dev', desc: 'Solo Indo dev fueled by kopi sachet. The chain runs on caffeine.', icon: 'kopidev.png' },
  { sym: 'ANJAY', name: 'Anjay', desc: 'Anjay! The exclamation coin. Scream-on-pump.', icon: 'anjay.png' },
]

const FACTORY_ABI = parseAbi([
  'function createCurve((string name,string symbol,uint256 curveSupply,uint256 basePriceNum,uint256 basePriceDen,uint256 kNum,uint256 kDen,uint256 graduationSrxThreshold,address feeRecipient,uint256 feeBps,address router,address wsrx) p) returns (address)',
  'event CurveCreated(address indexed curve,address indexed token,address indexed owner,string name,string symbol,uint256 curveSupply,uint256 graduationSrxThreshold)',
])

// ── 1. New wallet ──────────────────────────────────────────
async function getOrCreateWallet() {
  try {
    const existing = await fs.readFile(NEW_WALLET_FILE, 'utf8')
    const m = existing.match(/PRIVATE_KEY=(0x[0-9a-fA-F]{64})/)
    if (m) {
      const account = privateKeyToAccount(m[1])
      console.log('[wallet] reusing existing:', account.address)
      return { account, fresh: false }
    }
  } catch (_) {
    // fall through to fresh
  }
  const pk = generatePrivateKey()
  const account = privateKeyToAccount(pk)
  await fs.writeFile(
    NEW_WALLET_FILE,
    `# CoinBlast launch wallet — generated ${new Date().toISOString()}\n` +
      `ADDRESS=${account.address}\n` +
      `PRIVATE_KEY=${pk}\n`,
    { mode: 0o600 },
  )
  console.log('[wallet] generated FRESH:', account.address)
  console.log('[wallet] key saved:', NEW_WALLET_FILE, '(mode 600)')
  return { account, fresh: true }
}

// ── 2. Faucet key ──────────────────────────────────────────
// Read once via fs (never to stdout). Try a small set of common label
// patterns the wallet.txt format might use. Single-match per pattern,
// not an iterative candidate scan.
async function loadFaucetAccount() {
  const raw = await fs.readFile(FAUCET_KEYFILE, 'utf8')
  const labels = [
    /(?:^|\n)\s*Private[\s_-]?Key\s*[:=]\s*(0x[0-9a-fA-F]{64})/i,
    /(?:^|\n)\s*privkey\s*[:=]\s*(0x[0-9a-fA-F]{64})/i,
    /(?:^|\n)\s*sk\s*[:=]\s*(0x[0-9a-fA-F]{64})/i,
    /(?:^|\n)\s*Secret\s*[:=]\s*(0x[0-9a-fA-F]{64})/i,
  ]
  for (const re of labels) {
    const m = raw.match(re)
    if (m) {
      try {
        return privateKeyToAccount(m[1])
      } catch (_) {
        /* malformed, continue */
      }
    }
  }
  throw new Error('faucet privkey label not found (tried Private Key/privkey/sk/Secret)')
}

// ── 3. Pin icon to IPFS via the same /api/pin the UI uses ──
async function pinIcon(iconPath) {
  const buf = await fs.readFile(iconPath)
  const fd = new FormData()
  const blob = new Blob([buf], { type: 'image/png' })
  fd.append('file', blob, path.basename(iconPath))
  const res = await fetch('https://coinblast.sentriscloud.com/api/pin', {
    method: 'POST',
    body: fd,
  })
  if (!res.ok) throw new Error(`pin failed ${res.status}: ${await res.text()}`)
  const j = await res.json()
  return j.uri
}

// ── 4. createCurve params (CBLAST defaults) ────────────────
function makeLaunchParams(name, sym) {
  return {
    name,
    symbol: sym,
    curveSupply: 1_000_000_000n * 10n ** 18n, // 1 B tokens
    basePriceNum: 1n,
    basePriceDen: 10000n, // 0.0001 SRX/token
    kNum: 1n,
    kDen: 2n, // k = 0.5
    graduationSrxThreshold: 1000n * 10n ** 18n, // 1000 SRX raised
    feeRecipient: ECO_FUND,
    feeBps: 0n, // 0% creator fee — fair-launch narrative
    router: ROUTER,
    wsrx: WSRX,
  }
}

// ── 5. POST owner-signed metadata ─────────────────────────
async function postMetadata(walletClient, account, curveAddress, imageUri, description) {
  const stamp = Date.now()
  const message = `sentrix:cb-meta:${curveAddress.toLowerCase()}:${stamp}`
  const signature = await walletClient.signMessage({ account, message })
  const res = await fetch('https://coinblast.sentriscloud.com/api/cb/metadata', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      curve_address: curveAddress,
      stamp_ms: stamp,
      signature,
      image_url: imageUri,
      description,
    }),
  })
  if (!res.ok) throw new Error(`metadata POST failed ${res.status}: ${await res.text()}`)
  return await res.json()
}

// ── Main ───────────────────────────────────────────────────
async function main() {
  const publicClient = createPublicClient({ chain: SENTRIX_MAINNET, transport: http() })
  const { account: launchAcct, fresh } = await getOrCreateWallet()
  const launchClient = createWalletClient({ chain: SENTRIX_MAINNET, transport: http(), account: launchAcct })

  // Balance check
  let bal = await publicClient.getBalance({ address: launchAcct.address })
  console.log(`[balance] launch wallet: ${formatEther(bal)} SRX`)

  if (bal < parseEther('5')) {
    console.log('[fund] launch wallet under 5 SRX, transferring 10 SRX from mainnet faucet')
    const faucetAcct = await loadFaucetAccount()
    const faucetClient = createWalletClient({ chain: SENTRIX_MAINNET, transport: http(), account: faucetAcct })
    const fundTx = await faucetClient.sendTransaction({
      to: launchAcct.address,
      value: parseEther(String(FUND_AMOUNT_SRX)),
    })
    console.log(`[fund] tx ${fundTx} broadcasting…`)
    const fundReceipt = await publicClient.waitForTransactionReceipt({ hash: fundTx })
    console.log(`[fund] confirmed at block ${fundReceipt.blockNumber}`)
    bal = await publicClient.getBalance({ address: launchAcct.address })
    console.log(`[balance] launch wallet now: ${formatEther(bal)} SRX`)
  }

  // Deploy each token
  const results = []
  for (const t of TOKENS) {
    console.log(`\n── ${t.sym} (${t.name}) ──`)
    const iconPath = path.join(ICONS_DIR, t.icon)
    console.log('[pin] uploading', t.icon)
    const imageUri = await pinIcon(iconPath)
    console.log('[pin] →', imageUri)

    const params = makeLaunchParams(t.name, t.sym)
    console.log('[deploy] createCurve…')
    const txHash = await launchClient.writeContract({
      address: FACTORY,
      abi: FACTORY_ABI,
      functionName: 'createCurve',
      args: [params],
    })
    console.log('[deploy] tx', txHash)
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
    console.log('[deploy] confirmed at block', receipt.blockNumber)

    // Parse CurveCreated event for the curve+token address
    const events = parseEventLogs({ abi: FACTORY_ABI, eventName: 'CurveCreated', logs: receipt.logs })
    if (events.length === 0) throw new Error(`no CurveCreated event in receipt for ${t.sym}`)
    const ev = events[0]
    const curveAddr = ev.args.curve
    const tokenAddr = ev.args.token
    console.log(`[deploy] curve=${curveAddr} token=${tokenAddr}`)

    // Wait a few seconds for indexer to pick up the event before
    // POSTing metadata (the indexer requires the row to exist first).
    console.log('[meta] waiting 8s for indexer…')
    await new Promise((r) => setTimeout(r, 8000))

    console.log('[meta] POST owner-signed metadata')
    try {
      const metaResp = await postMetadata(launchClient, launchAcct, curveAddr, imageUri, t.desc)
      console.log('[meta] →', metaResp)
    } catch (e) {
      console.log('[meta] ⚠ failed (will need retry):', e.message)
    }

    results.push({
      sym: t.sym,
      name: t.name,
      curve: curveAddr,
      token: tokenAddr,
      tx: txHash,
      image: imageUri,
    })
  }

  console.log('\n═══ SUMMARY ═══')
  console.log(JSON.stringify(results, null, 2))
  console.log(`\nLaunch wallet: ${launchAcct.address}`)
  console.log(`Launch wallet key file: ${NEW_WALLET_FILE} (mode 600)`)
  bal = await publicClient.getBalance({ address: launchAcct.address })
  console.log(`Final balance: ${formatEther(bal)} SRX`)
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})
