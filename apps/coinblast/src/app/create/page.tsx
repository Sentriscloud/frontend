'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDeployContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from 'wagmi'
import { parseUnits } from 'viem'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useWalletStore } from '@/store/wallet'
import { formatNumber } from '@/lib/utils'
import { COINBLAST_CURVE_ABI, COINBLAST_CURVE_BYTECODE } from '@/lib/coinblast-curve-bytecode'
import { COINBLAST_FACTORY_ABI, COINBLAST_FACTORY_ADDRESSES } from '@/lib/coinblast-factory'
import { recordLocalLaunch } from '@/lib/local-launches'
import { Rocket, AlertTriangle, Globe, Send, MessageSquare, ChevronDown, Upload, Settings2, ExternalLink, Copy, Check, Loader } from 'lucide-react'

interface FormData {
  name: string
  symbol: string
  description: string
  imageUrl: string
  totalSupply: string
  kParam: number
  graduationSrx: string
  website: string
  twitter: string
  telegram: string
  discord: string
}

// Per-network DEX addresses + treasury for the curve constructor.
// Deploying through CoinBlastCurve means each launch ships with a real
// bonding curve, fee accrual to the Ecosystem Fund, and an automatic
// graduation path into a SentrixV2 DEX pair (LP burnt to 0xdEaD).
// `explorerQuery` is appended AFTER the path, never before — the previous
// shape was `explorerBase: ".../?network=testnet"` and call sites concatenated
// `${explorerBase}/tx/<hash>` which produces `.../?network=testnet/tx/<hash>`,
// burying the path inside the query string and rendering scan's home page
// instead of the tx detail. Fix: keep the base bare and add the network
// query at the end of the URL via the helper below.
const NETWORKS = {
  7119: {
    label: 'Sentrix Chain',
    explorerBase: 'https://scan.sentrixchain.com',
    explorerQuery: '',
    feeRecipient: '0xeb70fdefd00fdb768dec06c478f450c351499f14' as `0x${string}`,
    router: '0xAb67E171c0DE0Cd6dD6fE87E5E399C091F9c9dE8' as `0x${string}`,
    wsrx: '0x4693b113e523A196d9579333c4ab8358e2656553' as `0x${string}`,
  },
  7120: {
    label: 'Sentrix Testnet',
    explorerBase: 'https://scan.sentrixchain.com',
    explorerQuery: '?network=testnet',
    feeRecipient: '0xeb70fdefd00fdb768dec06c478f450c351499f14' as `0x${string}`,
    router: '0x2bF73491733c3b87D72b16d4f7151dA294b55cB0' as `0x${string}`,
    wsrx: '0x85d5E7694AF31C2Edd0a7e66b7c6c92C59fF949A' as `0x${string}`,
  },
} as const

const ZERO_TO_ZERO_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
const ZERO_PADDED_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000'

/**
 * The CoinBlastCurve constructor spawns a new FactoryToken inside it and
 * mints the entire supply to itself. The Transfer(from=0x0, to=curve)
 * event fires from the *token* address, with the curve address in the
 * `to` topic. Walk receipt logs for that signature and decode the curve.
 */
function extractCurveAndTokenFromReceipt(logs: readonly { address: string; topics: readonly string[] }[]): { curve: `0x${string}`; token: `0x${string}` } | null {
  for (const log of logs) {
    if (log.topics[0]?.toLowerCase() !== ZERO_TO_ZERO_TOPIC) continue
    if (log.topics[1]?.toLowerCase() !== ZERO_PADDED_ADDRESS) continue
    const toTopic = log.topics[2]
    if (!toTopic) continue
    const curve = ('0x' + toTopic.slice(-40)) as `0x${string}`
    return { curve, token: log.address as `0x${string}` }
  }
  return null
}

export default function CreatePage() {
  const router = useRouter()
  const { isConnected, connect } = useWalletStore()
  const { address } = useAccount()
  const chainId = useChainId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showSocials, setShowSocials] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [form, setForm] = useState<FormData>({
    name: '',
    symbol: '',
    description: '',
    imageUrl: '',
    totalSupply: '1000000000',
    kParam: 0.5,
    graduationSrx: '1000',
    website: '',
    twitter: '',
    telegram: '',
    discord: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  const net = NETWORKS[chainId === 7120 ? 7120 : 7119]

  // ── On-chain deploy state ─────────────────────────────────────────
  // Two paths depending on chain — preferred: factory.createCurve so
  // every launch fires CurveCreated and shows up in cross-device
  // discovery via useDeployedCurves. Fallback (testnet, no factory
  // deployed yet): direct CoinBlastCurve CREATE via useDeployContract.
  // Either way, we derive curve+token from receipt logs (Sentrix RPC's
  // contractAddress field is unreliable on alloy-backed clients).
  const factoryAddr = COINBLAST_FACTORY_ADDRESSES[chainId === 7120 ? 7120 : 7119]
  const useFactory = !!factoryAddr

  const {
    writeContract,
    data: factoryTxHash,
    isPending: isFactoryWriting,
    error: factoryError,
    reset: resetFactory,
  } = useWriteContract()

  const {
    deployContract,
    data: directTxHash,
    isPending: isDirectWriting,
    error: directError,
    reset: resetDirect,
  } = useDeployContract()

  const deployTxHash = useFactory ? factoryTxHash : directTxHash
  const isWriting = useFactory ? isFactoryWriting : isDirectWriting
  const writeError = useFactory ? factoryError : directError
  const resetWrite = () => {
    resetFactory()
    resetDirect()
  }

  const {
    data: receipt,
    isLoading: isMining,
    isSuccess: isMined,
  } = useWaitForTransactionReceipt({ hash: deployTxHash })

  const [deployed, setDeployed] = useState<{ curve: `0x${string}`; token: `0x${string}` } | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (isMined && receipt && !deployed) {
      const found = extractCurveAndTokenFromReceipt(receipt.logs)
      if (found) {
        setDeployed(found)
        // Persist the launch metadata locally so the user's own
        // launches surface in the explore list immediately, even
        // before the chain-scan picks them up. Multi-user discovery
        // still relies on TokenDeployed-style events; until the
        // CoinBlastFactory ships, this is the per-browser shortcut.
        recordLocalLaunch({
          curveAddress: found.curve,
          tokenAddress: found.token,
          name: form.name,
          symbol: form.symbol.toUpperCase(),
          owner: (address ?? '0x0000000000000000000000000000000000000000') as `0x${string}`,
          chainId: chainId === 7120 ? 7120 : 7119,
          createdAt: Math.floor(Date.now() / 1000),
          // ipfs://<cid> from /api/pin if the user uploaded an image; empty
          // string if they didn't bother (TokenAvatar then renders the
          // deterministic gradient placeholder).
          imageUrl: form.imageUrl || undefined,
        })
      }
    }
  }, [isMined, receipt, deployed, form.name, form.symbol, form.imageUrl, address, chainId])

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }))

  // Image upload state. previewUrl is a local blob URL for instant
  // visual feedback; form.imageUrl is the persistent ipfs:// reference
  // we get back from /api/pin and ship into recordLocalLaunch + (later)
  // any token-list / metadata payloads. The two are deliberately split
  // so the user sees the image immediately while the pin is in flight.
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const uploadImage = async (file: File) => {
    setUploadError(null)
    // Show local preview right away so the UI feels instant — even if
    // the IPFS pin takes a couple of seconds.
    setPreviewUrl(URL.createObjectURL(file))
    // Clear any previous CID while we're re-uploading.
    setForm((p) => ({ ...p, imageUrl: '' }))
    setIsUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/pin', { method: 'POST', body: fd })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error || `Upload failed (${res.status})`)
      }
      const j = (await res.json()) as { cid: string; uri: string }
      setForm((p) => ({ ...p, imageUrl: j.uri }))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed'
      setUploadError(msg)
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setUploadError('Pick an image file (PNG, JPG, GIF, SVG, WebP)')
      return
    }
    void uploadImage(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    void uploadImage(file)
  }

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormData, string>> = {}
    if (!form.name.trim()) errs.name = 'Required'
    if (!form.symbol.trim()) errs.symbol = 'Required'
    else if (form.symbol.length < 2 || form.symbol.length > 8) errs.symbol = '2–8 characters'
    else if (!/^[A-Z0-9]+$/.test(form.symbol.toUpperCase())) errs.symbol = 'Letters and numbers only'
    if (showAdvanced) {
      const supply = parseInt(form.totalSupply)
      if (!supply || supply < 1_000 || supply > 1_000_000_000_000)
        errs.totalSupply = 'Between 1,000 and 1,000,000,000,000'
      const grad = parseFloat(form.graduationSrx)
      if (!grad || grad < 10 || grad > 100_000)
        errs.graduationSrx = 'Between 10 and 100,000 SRX'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = () => {
    if (!isConnected || !address) { connect(); return }
    if (!validate()) return
    resetWrite()
    setDeployed(null)

    // Build CoinBlastCurve.InitParams. Defaults match the production
    // CBLAST launch params (1B × 1e18 supply, 0.0001 SRX/whole-token
    // base, K = 0.5, threshold 1000 SRX, 1% fee).
    const supplyWei = parseUnits(form.totalSupply || '1000000000', 18)
    const gradSrxWei = parseUnits(form.graduationSrx || '1000', 18)
    // K = kNum/kDen. User picks K as a decimal slider, store as int/100
    // so we keep precision through to the contract.
    const kNum = BigInt(Math.round(form.kParam * 100))
    const kDen = 100n

    const initParams = {
      name: form.name,
      symbol: form.symbol.toUpperCase(),
      curveSupply: supplyWei,
      basePriceNum: 1n,
      basePriceDen: 10000n, // P0 = 1/10000 SRX-wei per token-wei = 0.0001 SRX/whole
      kNum,
      kDen,
      graduationSrxThreshold: gradSrxWei,
      feeRecipient: net.feeRecipient,
      feeBps: 100n, // 1%
      router: net.router,
      wsrx: net.wsrx,
    }

    if (useFactory && factoryAddr) {
      // Canonical path — factory.createCurve(initParams). Fires the
      // CurveCreated event that useDeployedCurves picks up, so other
      // visitors see this launch without a cache reload.
      writeContract({
        abi: COINBLAST_FACTORY_ABI,
        address: factoryAddr,
        functionName: 'createCurve',
        args: [initParams],
      })
    } else {
      // Fallback (testnet pre-factory): direct CREATE.
      deployContract({
        abi: COINBLAST_CURVE_ABI,
        bytecode: COINBLAST_CURVE_BYTECODE,
        args: [initParams],
      })
    }
    setSubmitted(true)
  }

  const supply = parseInt(form.totalSupply) || 1_000_000_000

  if (submitted) {
    const status: 'pending' | 'mining' | 'success' | 'error' =
      writeError ? 'error' :
      isWriting ? 'pending' :
      (isMining && !isMined) ? 'mining' :
      isMined ? 'success' :
      'pending'

    const reset = () => {
      setSubmitted(false)
      setDeployed(null)
      resetWrite()
    }

    return (
      <div className="max-w-lg mx-auto px-4 pt-[96px] pb-20 text-center">
        {status === 'pending' && (
          <>
            <div className="w-20 h-20 bg-[var(--gold)]/15 border border-[var(--brd2)] rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader className="w-10 h-10 text-[var(--gold)] animate-spin" />
            </div>
            <h2 className="text-3xl font-black text-[var(--tx)] mb-3">Confirm in your wallet</h2>
            <p className="text-[var(--tx-m)] leading-relaxed">
              Approve the CoinBlast curve deploy for{' '}
              <span className="text-[var(--tx)] font-semibold">{form.name} ({form.symbol.toUpperCase()})</span>{' '}
              in MetaMask / Rabby / your wallet.
            </p>
          </>
        )}

        {status === 'mining' && (
          <>
            <div className="w-20 h-20 bg-[var(--gold)]/15 border border-[var(--brd2)] rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader className="w-10 h-10 text-[var(--gold)] animate-spin" />
            </div>
            <h2 className="text-3xl font-black text-[var(--tx)] mb-3">Mining…</h2>
            <p className="text-[var(--tx-m)] mb-3 leading-relaxed">
              Curve deploy broadcast — finality &lt;5s.
            </p>
            {deployTxHash && (
              <a
                href={`${net.explorerBase}/tx/${deployTxHash}${net.explorerQuery}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-mono text-[var(--gold)] hover:text-[var(--gold-l)]"
              >
                {deployTxHash.slice(0, 10)}…{deployTxHash.slice(-8)} <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-[var(--gold)]/15 border border-[var(--brd2)] rounded-full flex items-center justify-center mx-auto mb-6 animate-glow-pulse">
              <Rocket className="w-10 h-10 text-[var(--gold)]" />
            </div>
            <h2 className="text-3xl font-black text-[var(--tx)] mb-3">Curve live 🚀</h2>
            <p className="text-[var(--tx-m)] mb-6 leading-relaxed">
              <span className="text-[var(--tx)] font-semibold">{form.name} ({form.symbol.toUpperCase()})</span>{' '}
              has a real bonding curve now. Anyone can buy from it; sells go back along the curve.
              At {form.graduationSrx} SRX raised, the curve auto-graduates to a SentrixV2 DEX pair.
            </p>
            <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-5 text-left mb-6 space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-[var(--tx-d)]">Curve contract</span>
                {deployed ? (
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(deployed.curve)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 1500)
                    }}
                    className="font-mono text-xs text-[var(--gold)] hover:text-[var(--gold-l)] inline-flex items-center gap-1"
                  >
                    {deployed.curve.slice(0, 10)}…{deployed.curve.slice(-8)}
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                ) : (
                  <span className="text-[var(--tx-d)] text-xs">parsing receipt…</span>
                )}
              </div>
              <div className="flex justify-between"><span className="text-[var(--tx-d)]">Token (ERC-20)</span>{deployed ? <span className="font-mono text-xs text-[var(--tx)]">{deployed.token.slice(0, 10)}…{deployed.token.slice(-8)}</span> : <span className="text-[var(--tx-d)] text-xs">…</span>}</div>
              <div className="flex justify-between"><span className="text-[var(--tx-d)]">Supply</span><span className="text-[var(--tx)]">{formatNumber(supply, 0)} {form.symbol.toUpperCase()}</span></div>
              <div className="flex justify-between"><span className="text-[var(--tx-d)]">Curve K</span><span className="text-[var(--tx)] font-mono">{form.kParam.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--tx-d)]">Graduation</span><span className="text-[var(--tx)]">{form.graduationSrx} SRX raised</span></div>
            </div>
            <div className="flex gap-2 justify-center flex-wrap">
              {deployed && (
                <Button
                  variant="gold"
                  onClick={() => router.push(`/token/${deployed.token}`)}
                >
                  Open token page →
                </Button>
              )}
              {deployed && (
                <a
                  href={`${net.explorerBase}/address/${deployed.curve}${net.explorerQuery}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-[var(--sf)] border border-[var(--brd)] text-sm text-[var(--tx-m)] hover:text-[var(--tx)] hover:border-[var(--brd2)] transition-colors"
                >
                  Curve on Scan <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <Button variant="secondary" onClick={reset}>Launch another</Button>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 bg-red-500/15 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-3xl font-black text-[var(--tx)] mb-3">Deploy failed</h2>
            <p className="text-[var(--tx-m)] mb-6 leading-relaxed">
              {writeError?.message?.slice(0, 200) ?? 'Unknown error'}
            </p>
            <Button variant="secondary" onClick={reset}>← Try again</Button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-[96px] pb-16">
      {/* Title */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-black text-[var(--tx)]">Launch a Coin</h1>
        <p className="text-[var(--tx-m)] mt-1 text-sm">
          Real bonding curve · live trading from block 1 · graduates to DEX
        </p>
      </div>

      <div className="space-y-5">

        {/* Centered 200×200 image upload */}
        <div className="flex flex-col items-center gap-3">
          <div
            className={`relative w-[200px] h-[200px] rounded-2xl border-2 border-dashed cursor-pointer transition-all overflow-hidden ${
              isDragging
                ? 'border-[var(--gold)] bg-[var(--gold)]/10 scale-[1.02]'
                : previewUrl
                  ? 'border-[var(--brd2)] bg-[var(--sf2)]'
                  : 'border-[var(--brd2)] bg-[var(--sf)] hover:border-[var(--gold)] hover:bg-[var(--sf2)]'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-center px-4">
                <Upload className="w-8 h-8 text-[var(--tx-d)]" />
                <p className="text-xs text-[var(--tx-d)] leading-relaxed">
                  Drag & drop<br />or click to upload
                </p>
                <p className="text-[10px] text-[var(--tx-d)]/60">PNG, JPG, GIF, SVG</p>
              </div>
            )}
            {previewUrl && (
              <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                <p className="text-xs text-white font-medium">Change image</p>
              </div>
            )}
            {isUploading && (
              <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                <p className="text-[11px] text-white font-medium tracking-wide animate-pulse">Pinning to IPFS…</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          {uploadError ? (
            <p className="text-[10px] text-red-400 max-w-[260px] text-center">{uploadError}</p>
          ) : form.imageUrl ? (
            <p className="text-[10px] text-emerald-400/90 max-w-[260px] text-center break-all">
              Pinned — {form.imageUrl.slice(0, 28)}…
            </p>
          ) : (
            <p className="text-[10px] text-[var(--tx-d)]">Coin image (optional, 1:1 recommended)</p>
          )}
        </div>

        {/* Coin name */}
        <Input
          label="Coin name *"
          placeholder="Name your coin"
          value={form.name}
          onChange={set('name')}
          error={errors.name}
        />

        {/* Symbol */}
        <Input
          label="Ticker symbol *"
          placeholder="e.g. DOGE"
          value={form.symbol}
          onChange={(e) => setForm((p) => ({ ...p, symbol: e.target.value.toUpperCase() }))}
          error={errors.symbol}
          hint="2–8 characters, uppercase only"
        />

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--tx-m)]">
            Description <span className="text-[var(--tx-d)] font-normal">(Optional)</span>
          </label>
          <textarea
            placeholder="What's this coin about?"
            value={form.description}
            onChange={set('description')}
            rows={3}
            className="w-full bg-[var(--sf)] border border-[var(--brd)] rounded-xl px-3 py-2.5 text-sm text-[var(--tx)] placeholder:text-[var(--tx-d)] focus:outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/20 resize-none transition-colors"
          />
          {!form.description && (
            <p className="flex items-center gap-1 text-xs text-orange-400">
              <AlertTriangle className="w-3 h-3" /> No description = warning label on your coin
            </p>
          )}
        </div>

        {/* Social links */}
        <div className="border border-[var(--brd)] rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowSocials((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-[var(--tx-m)] hover:text-[var(--tx)] hover:bg-[var(--sf2)] transition-colors"
          >
            <span>Social Links <span className="text-[var(--tx-d)]">(Optional)</span></span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showSocials ? 'rotate-180' : ''}`} />
          </button>
          {showSocials && (
            <div className="px-4 pb-4 space-y-3 border-t border-[var(--brd)] pt-3">
              <Input placeholder="https://yourproject.com" value={form.website} onChange={set('website')} prefix={<Globe className="w-3.5 h-3.5" />} hint="Website" />
              <Input placeholder="https://twitter.com/yourproject" value={form.twitter} onChange={set('twitter')} prefix={<span className="text-xs font-bold">𝕏</span>} hint="Twitter / X" />
              <Input placeholder="https://t.me/yourproject" value={form.telegram} onChange={set('telegram')} prefix={<Send className="w-3.5 h-3.5" />} hint="Telegram" />
              <Input placeholder="https://discord.gg/yourproject" value={form.discord} onChange={set('discord')} prefix={<MessageSquare className="w-3.5 h-3.5" />} hint="Discord" />
            </div>
          )}
        </div>

        {/* Advanced settings */}
        <div className="border border-[var(--brd)] rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-[var(--tx-m)] hover:text-[var(--tx)] hover:bg-[var(--sf2)] transition-colors"
          >
            <span className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Advanced Settings
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>
          {showAdvanced && (
            <div className="px-4 pb-4 space-y-5 border-t border-[var(--brd)] pt-4">
              <Input
                label="Total Supply"
                placeholder="1000000000"
                value={form.totalSupply}
                onChange={set('totalSupply')}
                error={errors.totalSupply}
                hint="Default: 1,000,000,000 — range: 1K to 1T"
              />

              <Input
                label="Graduation threshold (SRX raised)"
                placeholder="1000"
                value={form.graduationSrx}
                onChange={set('graduationSrx')}
                error={errors.graduationSrx}
                hint="Once this much SRX has been raised, the curve auto-migrates to a DEX pair (LP burnt). Default 1000 SRX. Lower = faster graduation, higher = more capital trapped pre-grad."
              />

              {/* Bonding curve K slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-[var(--tx-m)]">
                    Curve Steepness (K)
                  </label>
                  <span className="font-mono text-sm text-[var(--gold)]">{form.kParam.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="2.0"
                  step="0.05"
                  value={form.kParam}
                  onChange={(e) => setForm((p) => ({ ...p, kParam: parseFloat(e.target.value) }))}
                  className="w-full accent-[var(--gold)] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[var(--tx-d)]">
                  <span>Flatter (cheaper early)</span>
                  <span>Steeper (more price action)</span>
                </div>
                <div className="bg-[var(--sf2)] rounded-lg px-3 py-2 text-xs text-[var(--tx-d)]">
                  Price formula: <span className="font-mono text-[var(--tx-m)]">P = 0.0001 × (1 + {form.kParam.toFixed(2)} × sold/supply)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fee summary */}
        <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-4 space-y-1.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[var(--tx)] font-semibold">Network</span>
            <span className="text-xs text-[var(--tx-m)]">{net.label} (chain {chainId === 7120 ? 7120 : 7119})</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--tx-d)] text-xs">Trading fee</span>
            <span className="text-xs text-[var(--tx-m)]">1% to Ecosystem Fund</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--tx-d)] text-xs">Gas</span>
            <span className="text-xs text-[var(--tx-m)]">Pay your wallet&apos;s gas estimate</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--tx-d)] text-xs">After {form.graduationSrx} SRX raised</span>
            <span className="text-xs text-[var(--tx-m)]">Auto-list on SentrixV2 DEX</span>
          </div>
        </div>

        {/* Launch button. Block while the IPFS pin is in flight so the
            launch doesn't get recorded with an empty imageUrl while the
            user thinks their image is going to make it on. */}
        <Button
          variant="gold"
          size="lg"
          className="w-full"
          onClick={handleSubmit}
          disabled={isUploading}
        >
          <Rocket className="w-4 h-4" />
          {!isConnected
            ? 'Connect Wallet to Launch'
            : isUploading
              ? 'Pinning image…'
              : `Launch ${form.symbol || 'Coin'}`}
        </Button>

        {!isConnected && (
          <p className="text-xs text-center text-[var(--tx-d)]">MetaMask · Sentrix Chain ID 7119</p>
        )}
      </div>
    </div>
  )
}
