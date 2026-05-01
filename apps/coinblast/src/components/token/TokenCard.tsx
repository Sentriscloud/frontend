'use client'
import Link from 'next/link'
import type { Token } from '@/types'
import { Progress } from '@/components/ui/Progress'
import { TokenAvatar } from '@/components/ui/TokenAvatar'
import { formatNumber, formatPrice, formatAddress } from '@/lib/utils'
import { ShieldCheck, AlertTriangle, TrendingUp } from 'lucide-react'
import { GRADUATION_THRESHOLD as GRADUATION_THRESHOLD_FALLBACK } from '@/lib/bonding-curve'
import { useCurveState } from '@/lib/useCoinBlastCurve'
import { formatEther } from 'viem'

interface TokenCardProps {
  token: Token
}

export function TokenCard({ token }: TokenCardProps) {
  const hasCurve = !!token.curveAddress
  const gradThreshold = token.graduationThresholdSrx ?? GRADUATION_THRESHOLD_FALLBACK

  // Live curve state — only fetches when curveAddress is set (the hook
  // gates on the address being defined). For bare ERC-20s this is a
  // no-op, no RPC traffic. wagmi/react-query dedupes across cards.
  const live = useCurveState(token.curveAddress)
  const liveSrxRaised = live.srxRaised !== undefined ? Number(formatEther(live.srxRaised)) : null
  const liveTokensSold = live.tokensSold !== undefined ? Number(formatEther(live.tokensSold)) : null
  const liveCurveSupply = live.curveSupply !== undefined ? Number(formatEther(live.curveSupply)) : null

  const srxRaised = liveSrxRaised ?? token.marketCap
  const liveProgress = liveSrxRaised !== null
    ? Math.min(100, (liveSrxRaised / gradThreshold) * 100)
    : token.progress
  const toGrad = Math.max(0, gradThreshold - srxRaised)
  const soldPct = liveTokensSold !== null && liveCurveSupply
    ? (liveTokensSold / liveCurveSupply) * 100
    : null

  return (
    <Link
      href={`/token/${token.address}`}
      className="block group bg-[var(--sf)] border border-[var(--brd)] rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:border-[var(--brd2)] hover:shadow-[0_8px_32px_rgba(200,168,74,0.10)]"
    >
      {/* Square image */}
      <div className="relative aspect-square w-full overflow-hidden bg-[var(--sf2)] group-hover:scale-105 transition-transform duration-300">
        <TokenAvatar
          address={token.address}
          symbol={token.symbol}
          imageUrl={token.imageUrl}
          fluid
          className="!rounded-none"
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
        {/* Name + symbol */}
        <div className="flex items-baseline justify-between gap-1 min-w-0">
          <span className="font-bold text-sm text-[var(--tx)] truncate group-hover:text-[var(--gold)] transition-colors leading-tight">
            {token.name}
          </span>
          <span className="font-mono text-[10px] text-[var(--tx-d)] shrink-0">{token.symbol}</span>
        </div>

        {/* Creator */}
        <p className="text-[10px] text-[var(--tx-d)] -mt-1">by {formatAddress(token.creator)}</p>

        {/* SRX raised (live, when curve attached) + price */}
        <div className="flex items-baseline justify-between gap-1">
          <span className="text-base font-black text-[var(--gold)] leading-none">
            {hasCurve && liveSrxRaised !== null
              ? `${liveSrxRaised < 1 ? liveSrxRaised.toFixed(3) : formatNumber(liveSrxRaised)} SRX`
              : `${formatNumber(token.marketCap)} SRX`}
          </span>
          <span className="text-[10px] text-[var(--tx-d)] shrink-0">{formatPrice(token.price)}</span>
        </div>

        {/* Progress (only shown for tokens that actually have a bonding
            curve attached — bare ERC-20 deploys via the legacy
            TokenFactory route have no curve, so 'X SRX to grad' is
            meaningless for them). */}
        {!token.isGraduated && hasCurve ? (
          <div className="space-y-1">
            <Progress value={liveProgress} color="gold" />
            <p className="text-[10px] text-[var(--tx-d)]">
              {toGrad < 1 ? toGrad.toFixed(3) : formatNumber(toGrad)} SRX to grad
            </p>
          </div>
        ) : token.isGraduated ? (
          <div className="flex items-center gap-1.5 pt-0.5">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-[10px] text-emerald-400">Listed on Sentrix DEX</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 pt-0.5">
            <div className="w-1.5 h-1.5 bg-[var(--tx-d)] rounded-full" />
            <span className="text-[10px] text-[var(--tx-d)]">Plain ERC-20 (no curve)</span>
          </div>
        )}
      </div>
    </Link>
  )
}
