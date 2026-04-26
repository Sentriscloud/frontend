'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  CheckCircle, AlertCircle, Clock,
  ExternalLink, Loader,
} from 'lucide-react'
import { FaucetMark } from './faucet-mark'

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string
          callback?: (token: string) => void
          'error-callback'?: () => void
          'expired-callback'?: () => void
          theme?: 'light' | 'dark' | 'auto'
          size?: 'normal' | 'flexible' | 'compact'
        },
      ) => string
      reset: (id?: string) => void
      getResponse: (id?: string) => string | undefined
    }
    onTurnstileLoad?: () => void
  }
}

type Status = 'idle' | 'loading' | 'success' | 'error' | 'cooldown'

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
  docsUrl,
}: Props) {
  const [address, setAddress] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [txHash, setTxHash] = useState('')
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const [stats, setStats] = useState<FaucetStats | null>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const captchaContainerRef = useRef<HTMLDivElement | null>(null)
  const captchaWidgetIdRef = useRef<string | null>(null)

  const captchaRequired = Boolean(turnstileSiteKey)
  const isMainnet = network === 'mainnet'

  // ── On mount: cooldown + stats ─────────────────────────────────────────
  useEffect(() => {
    const last = localStorage.getItem(lsKey(network))
    if (last) {
      const elapsed = Date.now() - parseInt(last, 10)
      if (elapsed < COOLDOWN_MS) {
        const secs = Math.ceil((COOLDOWN_MS - elapsed) / 1000)
        setCooldownSeconds(secs)
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
      })
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
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 40%, rgba(200,168,74,0.07) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 w-full max-w-[480px] animate-fade-up">
        <div className="flex flex-col items-center text-center mb-7">
          <FaucetMark className="w-20 h-20 mb-5 drop-shadow-[0_0_28px_rgba(200,168,74,0.2)]" />
          <h1 className="font-serif text-xl tracking-[.18em] uppercase text-[var(--tx)]">
            Sentrix <span className="text-[var(--gold)]">Faucet</span>
          </h1>
          <p className="text-[10px] text-[var(--tx-d)] tracking-[.18em] uppercase mt-1.5 flex items-center gap-2">
            <span>Chain {chainId}</span>
            <span className="opacity-40">·</span>
            <span className={`inline-flex items-center gap-1.5 ${isMainnet ? 'text-rose-400' : 'text-emerald-400/90'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isMainnet ? 'bg-rose-400' : 'bg-emerald-400'} animate-pulse`} />
              {network}
            </span>
          </p>
        </div>

        {stats?.status === 'unconfigured' && (
          <div className="mb-4 px-4 py-2.5 rounded-xl border border-amber-500/25 bg-amber-500/8 text-center">
            <p className="text-xs text-amber-300/90">
              <span className="font-semibold">Faucet not yet operational.</span>{' '}
              Wallet credentials pending. Claims will fail until configured.
            </p>
          </div>
        )}

        {isMainnet && stats?.status !== 'unconfigured' && (
          <div className="mb-4 px-4 py-2.5 rounded-xl border border-rose-500/25 bg-rose-500/8 text-center">
            <p className="text-xs text-rose-300/90">
              Mainnet faucet — for new wallet onboarding only.
              Drips are tiny (gas-only). Captcha required.
            </p>
          </div>
        )}

        <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-2xl p-6 space-y-5">
          <div className="text-center space-y-1">
            <p className="font-serif text-2xl text-[var(--tx)] leading-tight">
              Get free SRX
              <br />
              <span className="text-[var(--gold)]">
                {isMainnet ? 'for onboarding' : 'for testing'}
              </span>
            </p>
            <p className="text-xs text-[var(--tx-m)]">
              {dripAmount} SRX per request · 1 request per 24 hours
            </p>
          </div>

          <div className="border-t border-[var(--brd)]" />

          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block">
              <span className="text-[10px] uppercase tracking-[.18em] text-[var(--tx-d)]">
                Wallet address
              </span>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="0x… 40 hex characters"
                spellCheck={false}
                autoComplete="off"
                className="mt-2 w-full bg-[var(--sf2)] border border-[var(--brd)] rounded-xl px-4 py-3 text-sm text-[var(--tx)] placeholder:text-[var(--tx-d)] font-mono focus:outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/20 transition-colors disabled:opacity-50"
                disabled={status === 'loading'}
              />
            </label>

            {captchaRequired && (
              <div ref={captchaContainerRef} className="cf-turnstile-mount min-h-[65px]" />
            )}

            <button
              type="submit"
              disabled={submitDisabled}
              className="w-full py-3 rounded-xl font-semibold text-sm tracking-wide transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-[var(--gold)] text-[var(--bk)] hover:bg-[var(--gold-l)] active:scale-[.98]"
            >
              {status === 'loading' ? (
                <>
                  <Loader className="w-4 h-4 animate-spin-slow" />
                  Signing & broadcasting…
                </>
              ) : (
                <>Request {dripAmount} SRX</>
              )}
            </button>
          </form>

          {status === 'cooldown' && cooldownSeconds > 0 && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-orange-500/8 border border-orange-500/20 rounded-xl">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-400 shrink-0" />
                <p className="text-sm text-orange-400 font-medium">Next claim in</p>
              </div>
              <p className="font-mono text-sm text-orange-300 font-bold tabular-nums">
                {formatHHMMSS(cooldownSeconds)}
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex items-start gap-3 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-emerald-400 font-semibold">{message}</p>
                {txHash && (
                  <a
                    href={`${explorerUrl}/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-1.5 text-xs text-emerald-500/80 hover:text-emerald-300 transition-colors font-mono"
                  >
                    Tx: {truncateAddr(txHash)}
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                )}
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-start gap-3 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{message}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-4">
            <p className="text-[10px] text-[var(--tx-d)] uppercase tracking-[.12em] mb-1">
              Faucet balance
            </p>
            <p className="text-lg font-semibold text-[var(--gold)] tabular-nums">
              {stats ? `${formatNum(stats.balance)} SRX` : '—'}
            </p>
          </div>
          <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-4">
            <p className="text-[10px] text-[var(--tx-d)] uppercase tracking-[.12em] mb-1">
              Total distributed
            </p>
            <p className="text-lg font-semibold text-[var(--tx)] tabular-nums">
              {stats ? `${formatNum(stats.totalDistributed)} SRX` : '—'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 mt-4">
          {[
            { v: `${dripAmount} SRX`, l: 'per drop' },
            { v: '24h', l: 'cooldown' },
            { v: captchaRequired ? 'Captcha' : 'Free', l: captchaRequired ? 'protected' : 'no sign-up' },
          ].map((s) => (
            <div key={s.l} className="text-center">
              <p className="text-sm font-semibold text-[var(--gold)]">{s.v}</p>
              <p className="text-[10px] text-[var(--tx-d)] uppercase tracking-[.1em]">{s.l}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-6 space-y-1">
          <p className="text-xs text-[var(--tx-d)]">
            Powered by{' '}
            <a
              href="https://sentrixchain.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--gold)]/70 hover:text-[var(--gold)] transition-colors"
            >
              Sentrix Chain
            </a>
            {!isMainnet && ' · For testing only · No real value'}
          </p>
          <p className="text-xs flex items-center justify-center gap-3">
            <a
              href={isMainnet ? '/testnet' : '/mainnet'}
              className="text-[var(--gold)]/70 hover:text-[var(--gold)] transition-colors"
            >
              {isMainnet ? 'Switch to testnet →' : 'Switch to mainnet →'}
            </a>
            <span className="text-[var(--tx-d)]">·</span>
            <a
              href={docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--gold)]/70 hover:text-[var(--gold)] transition-colors"
            >
              How to use →
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
