'use client'
import Link from 'next/link'
import type { Token } from '@/types'
import { TokenAvatar } from '@/components/ui/TokenAvatar'
import { formatAddress } from '@/lib/utils'
import { ShieldCheck, AlertTriangle, TrendingUp } from 'lucide-react'
import { GRADUATION_THRESHOLD as GRADUATION_THRESHOLD_FALLBACK } from '@/lib/bonding-curve'
import { useCurveState } from '@/lib/useCoinBlastCurve'
import { formatEther } from 'viem'

interface TokenCardProps {
  token: Token
}

// Compact SRX-denominated market-cap formatter — matches the spec's
// "$X / $Xk / $X.XXM" tiers but stays in SRX since CoinBlast has no
// price oracle yet. Switch to USD-denom once an oracle wires in
// (a single multiplier on the call site is enough — keep this fn
// pure so the swap is cheap).
function formatCompactSrx(n: number): string {
  if (!isFinite(n) || n <= 0) return '— SRX'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M SRX`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k SRX`
  if (n >= 1) return `${n.toFixed(1)} SRX`
  return `${n.toFixed(3)} SRX`
}

export function TokenCard({ token }: TokenCardProps) {
  const hasCurve = !!token.curveAddress
  const gradThreshold = token.graduationThresholdSrx ?? GRADUATION_THRESHOLD_FALLBACK

  // Live curve state — only fetches when curveAddress is set. Bare
  // ERC-20s skip the call entirely. wagmi/react-query dedupes across
  // identically-keyed cards in the same grid.
  const live = useCurveState(token.curveAddress)
  const liveSrxRaised = live.srxRaised !== undefined ? Number(formatEther(live.srxRaised)) : null

  const srxRaised = liveSrxRaised ?? token.marketCap
  const progress = liveSrxRaised !== null
    ? Math.min(100, (liveSrxRaised / gradThreshold) * 100)
    : token.progress

  // Description preview — keep it tight; the card is small so we
  // line-clamp at 2. `description` may be undefined for bare ERC-20s.
  const description = token.description?.trim() || ''

  // Stats row — market cap (SRX raised proxy) is real today;
  // holders + per-curve trade count need either a per-card indexer
  // fetch (waterfall) or an aggregated parent prop. Showing "—"
  // beats fabricating until the parent passes them down.
  const holdersDisplay = '—'
  const tradesDisplay = '—'

  // Progress bar label tiers per spec: "Graduating soon 🔥" >80%,
  // "% to graduation" otherwise. "✅ Graduated" replaces the bar.
  const progressLabel =
    progress >= 80 ? 'Graduating soon 🔥' : `${progress.toFixed(1)}% to graduation`

  return (
    <Link
      href={`/token/${token.address}`}
      className="block group bg-[var(--sf)] border border-[var(--brd)] rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.03] hover:border-[var(--brd2)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)]"
    >
      {/* Square image */}
      <div className="relative aspect-square w-full overflow-hidden bg-[var(--sf2)]">
        <TokenAvatar
          address={token.address}
          symbol={token.symbol}
          imageUrl={token.imageUrl}
          fluid
          className="!rounded-none transition-transform duration-300 group-hover:scale-105"
        />
        {/* Badge overlays */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          {token.isVerified && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-[10px] text-[var(--gold)] border border-[var(--brd2)]">
              <ShieldCheck className="w-2.5 h-2.5" /> Verified
            </span>
          )}
          {token.isWarned && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-[10px] text-orange-400 border border-orange-500/30">
              <AlertTriangle className="w-2.5 h-2.5" /> Warn
            </span>
          )}
          {token.isGraduated && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-[10px] text-emerald-400 border border-emerald-500/30">
              <TrendingUp className="w-2.5 h-2.5" /> DEX
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        {/* Name + symbol + creator. MC moved to the stats row below to
            avoid showing the same number twice on the card. */}
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="font-bold text-sm text-[var(--tx)] truncate group-hover:text-[var(--gold)] transition-colors leading-tight">
              {token.name}
            </span>
            <span className="font-mono text-[10px] text-[var(--tx-d)] shrink-0">{token.symbol}</span>
          </div>
          <p className="text-[10px] text-[var(--tx-d)]">by {formatAddress(token.creator)}</p>
        </div>

        {/* Description preview — 2 lines max with ellipsis. Hidden when
            empty so the card collapses cleanly for bare ERC-20s. */}
        {description && (
          <p className="text-[11px] text-[var(--tx-m)] leading-snug line-clamp-2">
            {description}
          </p>
        )}

        {/* Stats row: market cap | holders | trades. MC is the primary
            number — bold + gold to lead the eye. Holders + trades sit
            in muted text since they often render "—" today. */}
        <div className="flex items-center justify-between gap-1 pt-0.5">
          <div className="flex flex-col items-start min-w-0">
            <span className="text-[9px] uppercase tracking-wider text-[var(--tx-d)] opacity-70">MC</span>
            <span className="text-[var(--gold)] font-bold text-[13px] leading-none tabular-nums">{formatCompactSrx(srxRaised)}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[9px] uppercase tracking-wider text-[var(--tx-d)] opacity-70">Holders</span>
            <span className="text-[var(--tx-m)] font-mono text-[12px] leading-none">{holdersDisplay}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] uppercase tracking-wider text-[var(--tx-d)] opacity-70">Trades</span>
            <span className="text-[var(--tx-m)] font-mono text-[12px] leading-none">{tradesDisplay}</span>
          </div>
        </div>

        {/* Progress bar — emerald per spec. "Graduating soon 🔥" tier
            kicks in at 80% to give a visible heat signal before the
            bar fully fills. Bare ERC-20s skip this whole section
            (their progress isn't meaningful). */}
        {!token.isGraduated && hasCurve ? (
          <div className="space-y-1 pt-1">
            <div className="h-1.5 bg-[var(--sf2)] rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500 group-hover:shadow-[0_0_10px_rgba(16,185,129,0.55)]"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
            <p className="text-[10px] text-[var(--tx-d)]">{progressLabel}</p>
          </div>
        ) : token.isGraduated ? (
          <div className="flex items-center gap-1.5 pt-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-[10px] text-emerald-400 font-semibold">
              ✅ Graduated
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 pt-1">
            <div className="w-1.5 h-1.5 bg-[var(--tx-d)] rounded-full" />
            <span className="text-[10px] text-[var(--tx-d)]">Plain ERC-20 (no curve)</span>
          </div>
        )}
      </div>
    </Link>
  )
}
