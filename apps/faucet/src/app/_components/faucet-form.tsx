'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  CheckCircle, AlertCircle, Clock,
  ExternalLink, Loader,
} from 'lucide-react'
import { useAccount } from 'wagmi'
import { usePrivy } from '@privy-io/react-auth'
import { useSoluxConnect, useEffectiveAddress } from '@sentriscloud/wallet-config'
import { FaucetMark } from './faucet-mark'
import { AnimatedNumber } from './animated-number'
import { NetworkCard } from './network-card'
import { useLatestFinalized } from '@/lib/ws'

// window.turnstile is now declared by @marsidev/react-turnstile (pulled
// in transitively via Privy). We just augment the onTurnstileLoad
// callback we attach for the Cloudflare script's `?onload=` query param.
declare global {
  interface Window {
    onTurnstileLoad?: () => void
  }
}

type Status = 'idle' | 'loading' | 'success' | 'finalized' | 'error' | 'cooldown'

// restUrl is e.g. https://api.sentrixchain.com → wss://rpc.sentrixchain.com/ws
// testnet-api.sentrixchain.com → wss://testnet-rpc.sentrixchain.com/ws
function deriveWsUrl(restUrl: string): string {
  try {
    const u = new URL(restUrl)
    const host = u.host
      .replace(/^api\./, 'rpc.')
      .replace(/^testnet-api\./, 'testnet-rpc.')
    return `wss://${host}/ws`
  } catch {
    return restUrl
  }
}

type FaucetStats = {
  balance: number
  totalDistributed: number
  amount: number
  faucetAddress: string
  status?: 'active' | 'unconfigured'
}

type Network = 'testnet' | 'mainnet'

type Props = {
  network: Network
  chainId: number
  defaultAmountSrx: number
  turnstileSiteKey?: string
  explorerUrl: string
  publicRestUrl: string
  docsUrl: string
}

const COOLDOWN_MS = 24 * 60 * 60 * 1000
const ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/

function lsKey(network: Network) {
  return `sentrix_faucet_last_claim_${network}`
}

function truncateAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function formatNum(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 4 })
}

// Compact stat formatter for the balance / total-distributed cards.
// Long numbers like 10,000,078.9999 overflow narrow stat cards; collapse
// to "10.00M" / "1.00B" once we cross 10k. Tooltip shows the exact figure
// for users who need the precise value.
function formatCompact(n: number): string {
  if (!isFinite(n)) return '—'
  const abs = Math.abs(n)
  if (abs >= 1e9) return (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B'
  if (abs >= 1e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M'
  if (abs >= 1e4) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K'
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

// Sanity cap for the running totalDistributed counter. Above this we
// know the counter has been polluted (test fixture seeded a vanity
// base, JSON store edited manually, etc.) — the chain's hard cap is
// 315 M SRX, so any total above that is mathematically impossible.
// Render "—" rather than a fabricated number; per "yang real2 aja"
// principle, an honest blank beats a misleading figure.
const MAX_SUPPLY_SRX = 315_000_000

function formatTotalDistributed(n: number): string {
  if (!isFinite(n) || n < 0 || n > MAX_SUPPLY_SRX) return '—'
  return formatCompact(n)
}

function formatHHMMSS(seconds: number) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0')
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${h}:${m}:${s}`
}

export function FaucetForm({
  network,
  chainId,
  defaultAmountSrx,
  turnstileSiteKey,
  explorerUrl,
  publicRestUrl,
  docsUrl,
}: Props) {
  const [address, setAddress] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [txHash, setTxHash] = useState('')

  // Privy-driven autofill — when a wallet is connected (external or
  // Privy embedded), surface a "Use connected wallet" pill that one-
  // click fills the manual input. The user can still type/paste any
  // other address; we don't override their typed value automatically
  // (that'd be confusing if they're requesting SRX for someone else).
  const { address: connectedAddr, isConnected } = useAccount()
  const { ready: isPrivyReady, login: privyLogin } = usePrivy()

  // Solux cross-app connect (view-only). Stashes the returned address
  // in the wallet-config manual store; we read it back via
  // useEffectiveAddress so a "Use Solux address" affordance can fill
  // the input the same way "Use connected wallet" does.
  const { connect: connectSolux, isConnecting: isSoluxConnecting } = useSoluxConnect('faucet')
  const { manualAddress: soluxAddr } = useEffectiveAddress('faucet')
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const [stats, setStats] = useState<FaucetStats | null>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const captchaContainerRef = useRef<HTMLDivElement | null>(null)
  const captchaWidgetIdRef = useRef<string | null>(null)

  const captchaRequired = Boolean(turnstileSiteKey)
  const isMainnet = network === 'mainnet'

  // Live BFT-finalised height. The faucet API returns as soon as the tx is
  // accepted by the RPC's mempool (effectively "broadcast OK"); the user
  // benefits from a clearer signal once the block holding the tx has crossed
  // BFT supermajority. We capture the finalised height at submit time and
  // flip status from 'success' to 'finalized' as soon as the WS pushes a
  // higher value (the next finalised block — within ~2s for a 1s-block chain
  // when the tx lands in the very next block).
  const wsFinalized = useLatestFinalized(deriveWsUrl(publicRestUrl))
  const [submitFinalizedAt, setSubmitFinalizedAt] = useState<number | null>(null)
  // Reactive transition off external WS push — when finalized height crosses
  // the height we captured at submit time, flip 'success' → 'finalized'. This
  // is exactly the "subscribe to external system, mirror into local state"
  // shape useEffect is meant for; the react-hooks/set-state-in-effect
  // warning over-flags single-shot transitions of this kind.
  useEffect(() => {
    if (status !== 'success' || submitFinalizedAt == null || wsFinalized == null) return
    if (wsFinalized > submitFinalizedAt) {
      // eslint-disable-next-line
      setStatus('finalized')
    }
  }, [status, submitFinalizedAt, wsFinalized])

  // ── On mount / network change: read localStorage cooldown + fetch stats ──
  // localStorage is browser-only so the cooldown read genuinely has to
  // happen post-mount; lint rule react-hooks/set-state-in-effect can't see
  // that the alternative (initial-state function) would crash on SSR.
  useEffect(() => {
    const last = localStorage.getItem(lsKey(network))
    if (last) {
      const elapsed = Date.now() - parseInt(last, 10)
      if (elapsed < COOLDOWN_MS) {
        const secs = Math.ceil((COOLDOWN_MS - elapsed) / 1000)
        // eslint-disable-next-line
        setCooldownSeconds(secs)
        // eslint-disable-next-line
        setStatus('cooldown')
      }
    }

    fetch(`/api/faucet?network=${network}`)
      .then((r) => r.json())
      .then((d: FaucetStats) => setStats(d))
      .catch(() => {})
  }, [network])

  // ── Render Turnstile when script is ready ──────────────────────────────
  useEffect(() => {
    if (!captchaRequired || !turnstileSiteKey || !captchaContainerRef.current) return

    const tryRender = () => {
      if (!window.turnstile || !captchaContainerRef.current) return false
      if (captchaWidgetIdRef.current) return true
      captchaWidgetIdRef.current = window.turnstile.render(captchaContainerRef.current, {
        sitekey: turnstileSiteKey,
        theme: 'dark',
        size: 'flexible',
        callback: (token) => setCaptchaToken(token),
        'expired-callback': () => setCaptchaToken(null),
        'error-callback': () => setCaptchaToken(null),
      }) ?? null
      return true
    }

    if (!tryRender()) {
      const interval = setInterval(() => {
        if (tryRender()) clearInterval(interval)
      }, 200)
      return () => clearInterval(interval)
    }
  }, [captchaRequired, turnstileSiteKey])

  // ── Cooldown countdown ─────────────────────────────────────────────────
  useEffect(() => {
    if (cooldownSeconds <= 0) return
    const t = setInterval(() => {
      setCooldownSeconds((s) => {
        if (s <= 1) {
          clearInterval(t)
          if (status === 'cooldown') setStatus('idle')
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [cooldownSeconds, status])

  const resetCaptcha = useCallback(() => {
    if (window.turnstile && captchaWidgetIdRef.current) {
      window.turnstile.reset(captchaWidgetIdRef.current)
    }
    setCaptchaToken(null)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = address.trim()
    if (!ADDRESS_REGEX.test(trimmed)) {
      setStatus('error')
      setMessage('Invalid wallet address — must be 0x followed by 40 hex characters')
      return
    }
    if (captchaRequired && !captchaToken) {
      setStatus('error')
      setMessage('Please complete the captcha')
      return
    }

    setStatus('loading')
    setMessage('')
    setTxHash('')

    try {
      const res = await fetch('/api/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: trimmed, captcha: captchaToken, network }),
      })
      const data = (await res.json()) as {
        success: boolean
        txHash?: string
        error?: string
        cooldown?: number
      }

      if (data.success) {
        setStatus('success')
        setTxHash(data.txHash ?? '')
        setMessage(`${stats?.amount ?? defaultAmountSrx} SRX sent`)
        // Capture the finalised height the moment we get tx-accepted. The
        // useEffect watching wsFinalized flips us to 'finalized' once the
        // chain advances past this. WS has been live since mount so a value
        // is almost always available; on the rare miss (WS reconnect) we
        // never flip and the user just sees the green "sent" state.
        setSubmitFinalizedAt(wsFinalized)
        localStorage.setItem(lsKey(network), Date.now().toString())
        fetch(`/api/faucet?network=${network}`)
          .then((r) => r.json())
          .then((d: FaucetStats) => setStats(d))
          .catch(() => {})
        resetCaptcha()
      } else if (data.cooldown) {
        setStatus('cooldown')
        setCooldownSeconds(data.cooldown)
        setMessage(data.error ?? 'Rate limit exceeded')
        const serverTs = Date.now() - (COOLDOWN_MS - data.cooldown * 1000)
        localStorage.setItem(lsKey(network), serverTs.toString())
        resetCaptcha()
      } else {
        setStatus('error')
        setMessage(data.error ?? 'Request failed — please try again')
        resetCaptcha()
      }
    } catch {
      setStatus('error')
      setMessage('Network error — please try again')
      resetCaptcha()
    }
  }

  const submitDisabled =
    status === 'loading' ||
    status === 'cooldown' ||
    !ADDRESS_REGEX.test(address.trim()) ||
    (captchaRequired && !captchaToken)

  const dripAmount = stats?.amount ?? defaultAmountSrx

  return (
    <div className="relative min-h-screen flex flex-col items-center px-4 pt-16 pb-12 sm:pt-20 sm:pb-16">
      <div aria-hidden className="gold-orb fixed top-[-120px] right-[-100px] z-0" />

      <div className="relative z-10 w-full max-w-[480px] animate-fade-up">
        {/* Hero — same brand mark + Playfair wordmark as the landing.
            The brand-kit coin avatar already has its own ring + diamond,
            so we let it stand alone on the dark surface (no extra
            gold-bg disc wrapper) with a soft halo behind it. */}
        <div className="flex flex-col items-center text-center mb-7">
          <div className="relative mb-5">
            <div
              aria-hidden
              className="absolute inset-0 -m-6 rounded-full opacity-60 blur-3xl"
              style={{ background: 'radial-gradient(circle, rgba(244,199,94,0.35) 0%, transparent 65%)' }}
            />
            <FaucetMark className="relative w-20 h-20 drop-shadow-[0_0_24px_rgba(244,199,94,0.20)]" />
          </div>
          <h1 className="font-serif text-[34px] tracking-tight text-[var(--tx)] leading-none">
            Sentrix <span className="text-[var(--gold)]">Faucet</span>
          </h1>
          <div className="flex items-center gap-2 mt-3">
            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold ${
              isMainnet
                ? 'bg-[rgba(248,113,113,0.10)] text-[var(--red)]'
                : 'bg-[rgba(34,197,94,0.10)] text-[var(--green)]'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse-live ${isMainnet ? 'bg-[var(--red)]' : 'bg-[var(--green)]'}`} />
              {network}
            </span>
            <span className="text-[12px] text-[var(--tx-m)] font-mono">Chain {chainId}</span>
          </div>
        </div>

        {stats?.status === 'unconfigured' && (
          <div className="mb-4 px-4 py-3 rounded-2xl border border-amber-500/25 bg-amber-500/8 text-center">
            <p className="text-[13px] text-amber-300/90">
              <span className="font-semibold">Faucet not yet operational.</span>{' '}
              Wallet credentials pending. Claims will fail until configured.
            </p>
          </div>
        )}

        {isMainnet && stats?.status !== 'unconfigured' && (
          <div className="mb-4 px-4 py-3 rounded-2xl border border-[rgba(248,113,113,0.25)] bg-[rgba(248,113,113,0.08)] text-center">
            <p className="text-[13px] text-[var(--red)]">
              Mainnet faucet — new-wallet onboarding only. Drips are gas-only. Captcha required.
            </p>
          </div>
        )}

        <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-2xl p-6 space-y-5">
          <div className="text-center space-y-2">
            <p className="text-[20px] font-bold text-[var(--tx)] leading-tight tracking-tight">
              Claim {dripAmount} SRX
            </p>
            <p className="text-[13px] text-[var(--tx-m)]">
              One request per address every 24 hours.
            </p>
          </div>

          <div className="border-t border-[var(--brd)]" />

          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-medium text-[var(--tx-2)]">
                  Wallet address
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (connectedAddr) {
                        setAddress(connectedAddr)
                      } else if (isPrivyReady) {
                        privyLogin()
                      }
                    }}
                    disabled={!isPrivyReady && !connectedAddr}
                    className="text-[11px] text-[var(--gold)] hover:text-[var(--gold-l)] underline underline-offset-2 disabled:opacity-50"
                  >
                    {connectedAddr ? 'Use connected wallet' : 'or sign in'}
                  </button>
                  <span className="text-[var(--tx-d)] text-[11px]">·</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (soluxAddr) {
                        setAddress(soluxAddr)
                      } else {
                        connectSolux()
                      }
                    }}
                    className="text-[11px] text-[var(--tx-m)] hover:text-[var(--gold)] underline underline-offset-2"
                  >
                    {isSoluxConnecting
                      ? 'waiting for Solux…'
                      : soluxAddr
                        ? 'Use Solux address'
                        : 'or Solux'}
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="0x…"
                spellCheck={false}
                autoComplete="off"
                className="w-full bg-[var(--bk-2)] border border-[var(--brd)] rounded-xl px-4 py-3.5 text-[14px] text-[var(--tx)] placeholder:text-[var(--tx-d)] font-mono focus:outline-none focus:border-[var(--gold-d)] transition-colors disabled:opacity-50"
                disabled={status === 'loading'}
              />
              {isConnected && connectedAddr && address.toLowerCase() !== connectedAddr.toLowerCase() && (
                <p className="mt-1.5 text-[11px] text-[var(--tx-d)]">
                  Connected: <span className="font-mono">{connectedAddr.slice(0, 6)}…{connectedAddr.slice(-4)}</span>
                  {' · '}
                  <button
                    type="button"
                    onClick={() => setAddress(connectedAddr)}
                    className="text-[var(--gold)] hover:underline"
                  >
                    fill in
                  </button>
                </p>
              )}
            </label>

            {captchaRequired && (
              <div ref={captchaContainerRef} className="cf-turnstile-mount min-h-[65px]" />
            )}

            <button
              type="submit"
              disabled={submitDisabled}
              className="w-full py-3.5 rounded-xl font-semibold text-[14px] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-[var(--gold)] text-[#3a2a0e] hover:bg-[var(--gold-l)] active:scale-[.98]"
            >
              {status === 'loading' ? (
                <>
                  <Loader className="w-4 h-4 animate-spin-slow" />
                  Signing &amp; broadcasting…
                </>
              ) : (
                <>Request {dripAmount} SRX</>
              )}
            </button>
          </form>

          {status === 'cooldown' && cooldownSeconds > 0 && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-[rgba(244,199,94,0.08)] border border-[rgba(244,199,94,0.20)] rounded-xl">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--gold)] shrink-0" />
                <p className="text-[13px] text-[var(--gold)] font-semibold">Next claim in</p>
              </div>
              <p className="font-mono text-[14px] text-[var(--gold-l)] font-bold tabular-nums">
                {formatHHMMSS(cooldownSeconds)}
              </p>
            </div>
          )}

          {(status === 'success' || status === 'finalized') && (
            <div className="flex items-start gap-3 p-4 bg-[rgba(34,197,94,0.10)] border border-[rgba(34,197,94,0.25)] rounded-xl">
              {status === 'finalized' ? (
                <CheckCircle className="w-4 h-4 text-[var(--green)] shrink-0 mt-0.5" />
              ) : (
                <Loader className="w-4 h-4 text-[var(--green)] shrink-0 mt-0.5 animate-spin-slow" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[14px] text-[var(--green)] font-semibold">
                  {message}
                  <span className="ml-2 text-[11px] font-normal text-[var(--green)] opacity-80">
                    {status === 'finalized' ? '· BFT finalized' : '· awaiting BFT finality…'}
                  </span>
                </p>
                {txHash && (
                  <a
                    href={`${explorerUrl.replace(/\/$/, '')}/tx/${txHash}${network === 'testnet' ? '?network=testnet' : ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-1.5 text-[12px] text-[var(--green)] hover:opacity-80 transition-opacity font-mono"
                  >
                    Tx: {truncateAddr(txHash)}
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                )}
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-start gap-3 p-4 bg-[rgba(248,113,113,0.10)] border border-[rgba(248,113,113,0.25)] rounded-xl">
              <AlertCircle className="w-4 h-4 text-[var(--red)] shrink-0 mt-0.5" />
              <p className="text-[13px] text-[var(--red)]">{message}</p>
            </div>
          )}
        </div>

        {/* Live stats: faucet balance + total distributed. Numbers tween
            via AnimatedNumber + use compact notation (10M / 1B) so they
            never overflow the narrow stat card. The full unrounded
            figure is preserved on hover via the title attribute. */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div
            className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-4 overflow-hidden"
            title={stats ? `${formatNum(stats.balance)} SRX` : undefined}
          >
            <p className="text-[12px] text-[var(--tx-m)] mb-1">Faucet balance</p>
            <p className="text-[18px] font-bold text-[var(--gold)] tabular-nums whitespace-nowrap">
              {stats ? (
                <>
                  <AnimatedNumber value={stats.balance} format={formatCompact} />
                  <span className="text-[var(--gold-d)] ml-1.5 text-[12px] font-semibold">SRX</span>
                </>
              ) : '—'}
            </p>
          </div>
          <div
            className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-4 overflow-hidden"
            title={stats ? `${formatNum(stats.totalDistributed)} SRX` : undefined}
          >
            <p className="text-[12px] text-[var(--tx-m)] mb-1">Total distributed</p>
            <p className="text-[18px] font-bold text-[var(--tx)] tabular-nums whitespace-nowrap">
              {stats ? (
                <>
                  <AnimatedNumber value={stats.totalDistributed} format={formatTotalDistributed} />
                  <span className="text-[var(--tx-m)] ml-1.5 text-[12px] font-semibold">SRX</span>
                </>
              ) : '—'}
            </p>
          </div>
        </div>

        {/* Live chain status — block height + finalized lag + validators.
            Same component family Solux ships on its dashboard. */}
        <div className="mt-3">
          <NetworkCard network={network} restUrl={publicRestUrl} explorerUrl={explorerUrl} />
        </div>

        <div className="text-center mt-7 space-y-2">
          <p className="text-[13px] text-[var(--tx-m)]">
            Powered by{' '}
            <a
              href="https://sentrixchain.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--gold)] hover:text-[var(--gold-l)] transition-colors font-medium"
            >
              Sentrix Chain
            </a>
            {!isMainnet && (
              <>
                {' '}
                <span className="text-[var(--tx-d)]">·</span>{' '}
                For testing — no real value
              </>
            )}
          </p>
          <p className="text-[12px] flex items-center justify-center gap-3">
            <a
              href={isMainnet ? '/testnet' : '/mainnet'}
              className="text-[var(--tx-m)] hover:text-[var(--gold)] transition-colors"
            >
              {isMainnet ? 'Switch to testnet →' : 'Switch to mainnet →'}
            </a>
            <span className="text-[var(--tx-d)]">·</span>
            <a
              href={docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--tx-m)] hover:text-[var(--gold)] transition-colors"
            >
              How to use →
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
