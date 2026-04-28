'use client'

import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { FaucetMark } from './faucet-mark'

// Live chain status card — sibling of Solux's NetworkCard component.
// Polls /chain/info on the configured REST URL every 12s and surfaces
// block height + finalized lag + active validator count. Operator
// trust signal: faucet visitors can see the chain is alive before they
// hit "claim".

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

export function NetworkCard({ network, restUrl, explorerUrl }: Props) {
  const [stats, setStats] = useState<Stats>({ height: null, finalized: null, validators: null })

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
    const id = setInterval(fetchStats, 12_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [restUrl])

  const lag = stats.height !== null && stats.finalized !== null
    ? Math.max(0, stats.height - stats.finalized)
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
            value={stats.height !== null ? `#${stats.height.toLocaleString()}` : '—'}
          />
          <Stat
            label="Finalized"
            value={lag !== null ? (lag === 0 ? 'live' : `−${lag}`) : '—'}
            tone={lag === 0 ? 'green' : 'tx'}
          />
          <Stat
            label="Validators"
            value={stats.validators !== null ? String(stats.validators) : '—'}
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
