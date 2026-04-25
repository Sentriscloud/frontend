'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  Droplets, CheckCircle, AlertCircle, Clock,
  ExternalLink, Loader, Wallet, Unlink,
} from 'lucide-react'

// Minimal type for window.ethereum — avoids importing ethers.js
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      on: (event: string, cb: (...args: unknown[]) => void) => void
      removeListener: (event: string, cb: (...args: unknown[]) => void) => void
    }
  }
}

type Status = 'idle' | 'loading' | 'success' | 'error' | 'cooldown'

type FaucetStats = {
  balance: number
  totalDistributed: number
  amount: number
  faucetAddress: string
}

const COOLDOWN_MS = 24 * 60 * 60 * 1000
const LS_KEY = 'sentrix_faucet_last_claim'

function truncateAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function formatNum(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

function formatHHMMSS(seconds: number) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0')
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${h}:${m}:${s}`
}

export default function FaucetPage() {
  const [manualAddress, setManualAddress] = useState('')
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [mmError, setMmError] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [txHash, setTxHash] = useState('')
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const [stats, setStats] = useState<FaucetStats | null>(null)

  const explorerUrl = process.env.NEXT_PUBLIC_EXPLORER_URL ?? 'https://sentrixscan.sentriscloud.com'
  const chainId = process.env.NEXT_PUBLIC_CHAIN_ID ?? '7119'

  // Effective address: wallet takes priority, else manual input
  const effectiveAddress = walletAddress ?? manualAddress.trim()

  // ── On mount: restore localStorage cooldown + fetch stats ──────────────
  useEffect(() => {
    // Restore cooldown from localStorage
    const last = localStorage.getItem(LS_KEY)
    if (last) {
      const elapsed = Date.now() - parseInt(last, 10)
      if (elapsed < COOLDOWN_MS) {
        const secs = Math.ceil((COOLDOWN_MS - elapsed) / 1000)
        setCooldownSeconds(secs)
        setStatus('cooldown')
      }
    }

    // Fetch faucet stats
    fetch('/api/faucet')
      .then((r) => r.json())
      .then((d: FaucetStats) => setStats(d))
      .catch(() => {})
  }, [])

  // ── Cooldown countdown ──────────────────────────────────────────────────
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

  // ── Listen for MetaMask account changes ────────────────────────────────
  useEffect(() => {
    const handleAccountsChanged = (accounts: unknown) => {
      const list = accounts as string[]
      setWalletAddress(list.length > 0 ? list[0] : null)
    }
    window.ethereum?.on('accountsChanged', handleAccountsChanged)
    return () => window.ethereum?.removeListener('accountsChanged', handleAccountsChanged)
  }, [])

  // ── MetaMask connect ────────────────────────────────────────────────────
  const connectWallet = useCallback(async () => {
    setMmError(null)
    if (!window.ethereum?.isMetaMask) {
      setMmError('no-metamask')
      return
    }
    try {
      const accounts = (await window.ethereum.request({
        method: 'eth_requestAccounts',
      })) as string[]
      if (accounts.length > 0) {
        setWalletAddress(accounts[0])
      }
    } catch {
      setMmError('rejected')
    }
  }, [])

  const disconnectWallet = useCallback(() => {
    setWalletAddress(null)
    setMmError(null)
  }, [])

  // ── Submit claim ────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!effectiveAddress) return

    setStatus('loading')
    setMessage('')
    setTxHash('')

    try {
      const res = await fetch('/api/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: effectiveAddress }),
      })
      const data = await res.json() as {
        success: boolean
        txHash?: string
        error?: string
        cooldown?: number
      }

      if (data.success) {
        setStatus('success')
        setTxHash(data.txHash ?? '')
        setMessage('10 SRX sent!')
        // Save claim time to localStorage
        localStorage.setItem(LS_KEY, Date.now().toString())
        // Refresh stats
        fetch('/api/faucet')
          .then((r) => r.json())
          .then((d: FaucetStats) => setStats(d))
          .catch(() => {})
      } else if (data.cooldown) {
        setStatus('cooldown')
        setCooldownSeconds(data.cooldown)
        setMessage(data.error ?? 'Rate limit exceeded')
        // Sync localStorage with server cooldown
        const serverTs = Date.now() - (COOLDOWN_MS - data.cooldown * 1000)
        localStorage.setItem(LS_KEY, serverTs.toString())
      } else {
        setStatus('error')
        setMessage(data.error ?? 'Request failed — please try again')
      }
    } catch {
      setStatus('error')
      setMessage('Network error — please try again')
    }
  }

  const isDisabled = status === 'loading' || status === 'cooldown' || !effectiveAddress

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-16">

      {/* Background radial glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 40%, rgba(200,168,74,0.07) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 w-full max-w-[480px] animate-fade-up">

        {/* ── Logo header ── */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-[var(--gold)]/15 border border-[var(--brd2)] flex items-center justify-center animate-glow-pulse shrink-0">
            <Droplets className="w-6 h-6 text-[var(--gold)]" />
          </div>
          <div>
            <h1 className="font-serif text-xl tracking-[.2em] uppercase text-[var(--tx)]">
              Sentrix <span className="text-[var(--gold)]">Faucet</span>
            </h1>
            <p className="text-[10px] text-[var(--tx-d)] tracking-[.15em] uppercase mt-0.5">
              Chain ID {chainId} · For Testing Only
            </p>
          </div>
        </div>

        {/* ── Main card ── */}
        <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-2xl p-6 space-y-5">

          {/* Headline */}
          <div className="text-center space-y-1">
            <p className="text-2xl font-black text-[var(--tx)] leading-tight">
              Get free SRX<br />
              <span className="text-[var(--gold)]">for testing</span>
            </p>
            <p className="text-xs text-[var(--tx-m)]">
              10 SRX per request · 1 request per 24 hours
            </p>
          </div>

          <div className="border-t border-[var(--brd)]" />

          {/* ── Wallet connect ── */}
          <div>
            {walletAddress ? (
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-emerald-500/8 border border-emerald-500/20 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                  <span className="text-sm text-emerald-400 font-medium">Connected</span>
                  <span className="font-mono text-xs text-[var(--tx-m)]">
                    {truncateAddr(walletAddress)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={disconnectWallet}
                  className="flex items-center gap-1 text-xs text-[var(--tx-d)] hover:text-red-400 transition-colors"
                >
                  <Unlink className="w-3 h-3" /> Disconnect
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={connectWallet}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[var(--brd2)] bg-[var(--sf2)] text-sm text-[var(--tx)] hover:border-[var(--gold)] hover:text-[var(--gold)] transition-all duration-150"
                >
                  <Wallet className="w-4 h-4" />
                  Connect MetaMask
                </button>
                {mmError === 'no-metamask' && (
                  <p className="text-xs text-center text-orange-400">
                    MetaMask not found.{' '}
                    <a
                      href="https://metamask.io/download/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-orange-300 transition-colors"
                    >
                      Install MetaMask →
                    </a>
                  </p>
                )}
                {mmError === 'rejected' && (
                  <p className="text-xs text-center text-[var(--tx-d)]">
                    Connection rejected — you can still enter address manually.
                  </p>
                )}
                <div className="flex items-center gap-2 text-[10px] text-[var(--tx-d)]">
                  <div className="flex-1 h-px bg-[var(--brd)]" />
                  or enter manually
                  <div className="flex-1 h-px bg-[var(--brd)]" />
                </div>
              </div>
            )}
          </div>

          {/* ── Address form ── */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {!walletAddress && (
              <input
                type="text"
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                placeholder="0x... wallet address"
                spellCheck={false}
                autoComplete="off"
                className="w-full bg-[var(--sf2)] border border-[var(--brd)] rounded-xl px-4 py-3 text-sm text-[var(--tx)] placeholder:text-[var(--tx-d)] font-mono focus:outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/20 transition-colors disabled:opacity-50"
                disabled={status === 'loading'}
              />
            )}
            {walletAddress && (
              <div className="px-4 py-3 bg-[var(--sf2)] border border-[var(--brd)] rounded-xl">
                <p className="text-xs text-[var(--tx-d)] mb-0.5">Sending to</p>
                <p className="font-mono text-sm text-[var(--tx)] truncate">{walletAddress}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isDisabled}
              className="w-full py-3 rounded-xl font-bold text-sm tracking-wide transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-[var(--gold)] text-[var(--bk)] hover:bg-[var(--gold-l)] active:scale-[.98]"
            >
              {status === 'loading' ? (
                <>
                  <Loader className="w-4 h-4 animate-spin-slow" />
                  Sending...
                </>
              ) : (
                <>
                  <Droplets className="w-4 h-4" />
                  Request 10 SRX
                </>
              )}
            </button>
          </form>

          {/* ── Cooldown banner (inline, always visible when active) ── */}
          {status === 'cooldown' && cooldownSeconds > 0 && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-orange-500/8 border border-orange-500/20 rounded-xl">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-400 shrink-0" />
                <p className="text-sm text-orange-400 font-medium">Next claim available in</p>
              </div>
              <p className="font-mono text-sm text-orange-300 font-bold tabular-nums">
                {formatHHMMSS(cooldownSeconds)}
              </p>
            </div>
          )}

          {/* ── Success message ── */}
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
                    Transaction: {truncateAddr(txHash)}
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* ── Error message ── */}
          {status === 'error' && (
            <div className="flex items-start gap-3 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{message}</p>
            </div>
          )}
        </div>

        {/* ── Faucet stats ── */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-4">
            <p className="text-[10px] text-[var(--tx-d)] uppercase tracking-[.1em] mb-1">Faucet Balance</p>
            <p className="text-lg font-black text-[var(--gold)]">
              {stats ? `${formatNum(stats.balance)} SRX` : '—'}
            </p>
          </div>
          <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-4">
            <p className="text-[10px] text-[var(--tx-d)] uppercase tracking-[.1em] mb-1">Total Distributed</p>
            <p className="text-lg font-black text-[var(--tx)]">
              {stats ? `${formatNum(stats.totalDistributed)} SRX` : '—'}
            </p>
          </div>
        </div>

        {/* ── Info chips ── */}
        <div className="flex items-center justify-center gap-4 mt-3">
          {[
            { v: '10 SRX', l: 'per drop' },
            { v: '24h', l: 'cooldown' },
            { v: 'Free', l: 'no sign-up' },
          ].map((s) => (
            <div key={s.l} className="text-center">
              <p className="text-sm font-bold text-[var(--gold)]">{s.v}</p>
              <p className="text-[10px] text-[var(--tx-d)]">{s.l}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[var(--tx-d)] mt-5">
          Powered by{' '}
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--gold)]/70 hover:text-[var(--gold)] transition-colors"
          >
            Sentrix Chain
          </a>
          {' '}· For testing only · Not real value
        </p>
        <p className="text-center text-xs text-[var(--tx-d)] mt-2">
          <a
            href="https://t.me/SentrixCommunity"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--gold)]/70 hover:text-[var(--gold)] transition-colors"
          >
            Join our Telegram Community →
          </a>
        </p>
      </div>
    </div>
  )
}
