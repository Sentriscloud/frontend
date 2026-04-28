'use client'

import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { FaucetMark } from './faucet-mark'
import { useLatestBlock, useLatestFinalized, useValidatorSet } from '@/lib/ws'

// Live chain status card. WebSocket subscriptions drive the live values
// (block height, finalized height, validator count); a slow REST poll
// (60s) backstops the initial load and any WS reconnect window so the
// user never sees stale dashes.

interface ChainInfo {
  height?: number
  active_validators?: number
  chain_id?: number
}

interface FinalizedHeight {
  finalized_height?: number
}

interface Stats {
  height: number | null
  finalized: number | null
  validators: number | null
}

interface Props {
  network: 'testnet' | 'mainnet'
  restUrl: string
  explorerUrl: string
}

function deriveWsUrl(restUrl: string): string {
  // restUrl is e.g. https://api.sentrixchain.com → wss://rpc.sentrixchain.com/ws
  // testnet-api.sentrixchain.com → wss://testnet-rpc.sentrixchain.com/ws
  const u = new URL(restUrl)
  const host = u.host.replace(/^api\./, 'rpc.').replace(/^testnet-api\./, 'testnet-rpc.')
  return `wss://${host}/ws`
}

export function NetworkCard({ network, restUrl, explorerUrl }: Props) {
  const [stats, setStats] = useState<Stats>({ height: null, finalized: null, validators: null })
  const wsUrl = deriveWsUrl(restUrl)
  const wsHead = useLatestBlock(wsUrl)
  const wsFinalized = useLatestFinalized(wsUrl)
  const wsValidators = useValidatorSet(wsUrl)

  useEffect(() => {
    let cancelled = false
    const fetchStats = async () => {
      try {
        const [info, fh] = await Promise.all([
          fetch(`${restUrl}/chain/info`, { signal: AbortSignal.timeout(4_000) })
            .then((r) => r.ok ? r.json() as Promise<ChainInfo> : null)
            .catch(() => null),
          fetch(`${restUrl}/chain/finalized-height`, { signal: AbortSignal.timeout(4_000) })
            .then((r) => r.ok ? r.json() as Promise<FinalizedHeight> : null)
            .catch(() => null),
        ])
        if (cancelled) return
        setStats({
          height: info?.height ?? null,
          finalized: fh?.finalized_height ?? null,
          validators: info?.active_validators ?? null,
        })
      } catch { /* keep dashes */ }
    }
    fetchStats()
    const id = setInterval(fetchStats, 60_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [restUrl])

  // WS-fresh values win over REST when present.
  const liveHeight = wsHead?.number ?? stats.height
  const liveFinalized = wsFinalized ?? stats.finalized
  const liveValidators = wsValidators ?? stats.validators
  const lag = liveHeight !== null && liveFinalized !== null
    ? Math.max(0, liveHeight - liveFinalized)
    : null

  const explorerLink = network === 'testnet'
    ? `${explorerUrl}?network=testnet`
    : explorerUrl

  return (
    <div className="relative rounded-2xl bg-[var(--sf)] border border-[var(--brd)] overflow-hidden">
      <div aria-hidden className="absolute -top-8 -right-10 w-40 h-40 text-[var(--gold)] opacity-[0.05] pointer-events-none">
        <FaucetMark className="w-full h-full" />
      </div>
      <div className="relative px-5 py-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse-live" />
            <h3 className="text-[14px] font-semibold text-[var(--tx)]">
              Sentrix {network === 'mainnet' ? 'Mainnet' : 'Testnet'}
            </h3>
          </div>
          <a
            href={explorerLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] font-medium text-[var(--gold)] hover:text-[var(--gold-l)] transition-colors flex items-center gap-1"
          >
            Explorer <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Stat
            label="Block"
            value={liveHeight !== null ? `#${liveHeight.toLocaleString()}` : '—'}
          />
          <Stat
            label="Finalized"
            value={lag !== null ? (lag === 0 ? 'live' : `−${lag}`) : '—'}
            tone={lag === 0 ? 'green' : 'tx'}
          />
          <Stat
            label="Validators"
            value={liveValidators !== null ? String(liveValidators) : '—'}
          />
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, tone = 'tx' }: { label: string; value: string; tone?: 'tx' | 'green' }) {
  const color = tone === 'green' ? 'var(--green)' : 'var(--tx)'
  return (
    <div>
      <p className="text-[11px] text-[var(--tx-m)] mb-1">{label}</p>
      <p className="text-[14px] font-semibold tabular-nums" style={{ color }}>{value}</p>
    </div>
  )
}
