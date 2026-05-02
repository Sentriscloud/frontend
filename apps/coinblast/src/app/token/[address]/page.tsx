'use client'
import { notFound } from 'next/navigation'
import { use } from 'react'
import { MOCK_TOKENS } from '@/lib/mock-data'
import { useDeployedTokens } from '@/lib/useDeployedTokens'
import { useDeployedCurves } from '@/lib/useDeployedCurves'
import { useTopHolders } from '@/lib/useTopHolders'
import { mergeStaticAndDeployed } from '@/lib/token-registry'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { BondingCurveChart } from '@/components/token/BondingCurveChart'
import { BuySellWidget } from '@/components/token/BuySellWidget'
import { PriceHistoryChart } from '@/components/token/PriceHistoryChart'
import { TradeHistoryTable } from '@/components/token/TradeHistoryTable'
import { ShareButtons } from '@/components/token/ShareButtons'
import { TokenAvatar } from '@/components/ui/TokenAvatar'
import { formatAddress, formatNumber, formatPrice, formatSRX } from '@/lib/utils'
import { GRADUATION_THRESHOLD as GRADUATION_THRESHOLD_FALLBACK } from '@/lib/bonding-curve'
import { ExternalLink, ShieldCheck, AlertTriangle, TrendingUp, Users, BarChart2, Globe, Send, MessageSquare } from 'lucide-react'
import Link from 'next/link'

// Convert a unix timestamp to a "X ago" relative string. The full
// timestamp goes into the title for accessibility — hover shows the
// exact moment without bloating the page text.
function relativeTime(unix: number): string {
  if (!unix) return 'just launched'
  const diffSec = Math.floor(Date.now() / 1000) - unix
  if (diffSec < 60) return `${diffSec}s ago`
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  if (diffSec < 86400 * 30) return `${Math.floor(diffSec / 86400)}d ago`
  if (diffSec < 86400 * 365) return `${Math.floor(diffSec / (86400 * 30))}mo ago`
  return `${Math.floor(diffSec / (86400 * 365))}y ago`
}

interface Props {
  params: Promise<{ address: string }>
}

export default function TokenDetailPage({ params }: Props) {
  // Client component now (was server). Reason: any address deployed via
  // /create needs to render here, not just the static MOCK_TOKENS rows.
  // We unwrap params with React's use() hook + merge live-from-chain
  // tokens with the static seed list.
  const { address } = use(params)
  const { tokens: deployed, isLoading: tokensLoading } = useDeployedTokens()
  const { curves, isLoading: curvesLoading } = useDeployedCurves()
  const isLoading = tokensLoading || curvesLoading
  const merged = mergeStaticAndDeployed(MOCK_TOKENS, deployed, 7119, curves)
  // Top holders — reads Transfer events for the token directly. Hook
  // gates on undefined address so it's a no-op until the token row
  // resolves out of the merge.
  const token = merged.find((t) => t.address.toLowerCase() === address.toLowerCase())

  if (!token) {
    if (isLoading) {
      return (
        <div className="max-w-7xl mx-auto px-4 pt-[96px] pb-10 text-center text-[var(--tx-m)]">
          Loading on-chain registry…
        </div>
      )
    }
    notFound()
  }

  const soldPct = ((token.tokensSold / token.totalSupply) * 100).toFixed(1)
  // Live launches put their graduation threshold on the Token row (in SRX
  // raised). Pre-deploy preview rows fall back to the legacy 69k mcap.
  const gradThreshold = token.graduationThresholdSrx ?? GRADUATION_THRESHOLD_FALLBACK
  const gradLabel = token.graduationThresholdSrx ? 'SRX raised' : 'SRX mcap'

  return (
    <div className="max-w-7xl mx-auto px-4 pt-[96px] pb-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--tx-d)] mb-6">
        <Link href="/explore" className="hover:text-[var(--gold)] transition-colors">Explore</Link>
        <span>/</span>
        <span className="text-[var(--tx-m)]">{token.symbol}</span>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-8">
        {/* Left column */}
        <div className="space-y-8">

          {/* Token header */}
          <div className="flex items-start gap-4">
            <TokenAvatar
              address={token.address}
              symbol={token.symbol}
              imageUrl={token.imageUrl}
              size={64}
              className="shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-2xl font-black text-[var(--tx)]">{token.name}</h1>
                <span className="text-[var(--tx-d)] font-mono text-lg">{token.symbol}</span>
                {token.isVerified && (
                  <Badge variant="blue"><ShieldCheck className="w-3 h-3" /> Verified</Badge>
                )}
                {token.isWarned && (
                  <Badge variant="warn"><AlertTriangle className="w-3 h-3" /> Warning</Badge>
                )}
                {token.isGraduated && (
                  <Badge variant="green"><TrendingUp className="w-3 h-3" /> Graduated</Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-[var(--tx-d)] flex-wrap">
                <span>
                  Created by{' '}
                  <Link
                    href={`${process.env.NEXT_PUBLIC_EXPLORER_URL ?? 'https://scan.sentrixchain.com'}/address/${token.creator}`}
                    target="_blank"
                    className="font-mono text-[var(--tx-m)] hover:text-[var(--gold)] transition-colors"
                  >
                    {formatAddress(token.creator, 6)}
                  </Link>
                </span>
                <span>·</span>
                <span title={token.createdAt ? new Date(token.createdAt * 1000).toLocaleString() : ''}>
                  {relativeTime(token.createdAt)}
                </span>
                <Link
                  href={`${process.env.NEXT_PUBLIC_EXPLORER_URL ?? 'https://scan.sentrixchain.com'}/address/${token.address}`}
                  target="_blank"
                  className="flex items-center gap-1 hover:text-[var(--gold)] transition-colors"
                >
                  Explorer <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {/* Share row — sits below the meta line so it's
                  clearly a separate action. Copy-link gets feedback
                  via inline state, no toast. */}
              <div className="mt-3">
                <ShareButtons name={token.name} symbol={token.symbol} />
              </div>

              {/* Social links */}
              {(token.website || token.twitter || token.telegram || token.discord) && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {token.website && (
                    <Link href={token.website} target="_blank"
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--sf)] border border-[var(--brd)] text-xs text-[var(--tx-d)] hover:text-[var(--gold)] hover:border-[var(--brd2)] transition-all">
                      <Globe className="w-3 h-3" /> Website
                    </Link>
                  )}
                  {token.twitter && (
                    <Link href={token.twitter} target="_blank"
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--sf)] border border-[var(--brd)] text-xs text-[var(--tx-d)] hover:text-[var(--gold)] hover:border-[var(--brd2)] transition-all">
                      <span className="text-[10px] font-bold leading-none">𝕏</span> Twitter
                    </Link>
                  )}
                  {token.telegram && (
                    <Link href={token.telegram} target="_blank"
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--sf)] border border-[var(--brd)] text-xs text-[var(--tx-d)] hover:text-[var(--gold)] hover:border-[var(--brd2)] transition-all">
                      <Send className="w-3 h-3" /> Telegram
                    </Link>
                  )}
                  {token.discord && (
                    <Link href={token.discord} target="_blank"
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--sf)] border border-[var(--brd)] text-xs text-[var(--tx-d)] hover:text-[var(--gold)] hover:border-[var(--brd2)] transition-all">
                      <MessageSquare className="w-3 h-3" /> Discord
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Price', value: formatPrice(token.price), icon: <BarChart2 className="w-4 h-4 text-[var(--gold)]" /> },
              { label: 'Market Cap', value: formatSRX(token.marketCap), icon: <TrendingUp className="w-4 h-4 text-[var(--gold-l)]" /> },
              { label: '24h Volume', value: formatSRX(token.volume24h), icon: <BarChart2 className="w-4 h-4 text-emerald-400" /> },
              { label: 'Holders', value: '—', icon: <Users className="w-4 h-4 text-[var(--tx-m)]" /> },
            ].map((s) => (
              <div key={s.label} className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  {s.icon}
                  <span className="text-xs text-[var(--tx-d)]">{s.label}</span>
                </div>
                <p className="text-[var(--tx)] font-bold text-sm">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Graduation progress (curve-only — bare ERC-20s have no
              graduation flow, so the section is hidden for them). */}
          {!token.isGraduated && !!token.curveAddress && (
            <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-[var(--tx)] text-sm">Graduation Progress</h3>
                <span className="text-[var(--gold)] font-bold">{token.progress.toFixed(1)}%</span>
              </div>
              <Progress value={token.progress} color="gold" showLabel />
              <div className="flex items-center justify-between mt-3 text-xs text-[var(--tx-d)]">
                <span>Current: {formatSRX(token.marketCap)} mcap</span>
                <span>Goal: {formatNumber(gradThreshold)} {gradLabel}</span>
              </div>
              <p className="text-xs text-[var(--tx-d)] mt-2">
                {formatSRX(Math.max(0, gradThreshold - token.marketCap))} remaining to auto-list on Sentrix DEX
              </p>
            </div>
          )}

          {/* Price history (real trades) — sits above the theoretical
              curve so traders see actual fills first. Only renders for
              tokens with a curve attached. */}
          {token.curveAddress && (
            <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[var(--tx)]">Price History</h3>
                <span className="text-xs text-[var(--tx-d)]">SRX per token</span>
              </div>
              <PriceHistoryChart curveAddress={token.curveAddress} />
            </div>
          )}

          {/* Bonding curve chart — only if there's a real curve. For
              bare ERC-20s the chart would be a static lie. */}
          {token.curveAddress ? (
            <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[var(--tx)]">Bonding Curve</h3>
                <span className="text-xs text-[var(--tx-d)]">{soldPct}% sold</span>
              </div>
              <BondingCurveChart token={token} />
            </div>
          ) : (
            <div className="bg-amber-500/8 border border-amber-500/30 rounded-xl p-5">
              <h3 className="font-semibold text-amber-300 text-sm mb-2">No bonding curve</h3>
              <p className="text-xs text-amber-200/80 leading-relaxed">
                This token was deployed via the legacy TokenFactory flow — full supply went
                straight to the deployer&apos;s wallet, no on-chain curve attached. Trading
                happens off-curve: peer-to-peer transfers, or a manual SentrixV2 DEX listing
                if someone seeds liquidity. To get pump.fun-style buy/sell flow, deploy a
                fresh curve via <a className="underline" href="/create">/create</a>.
              </p>
            </div>
          )}

          {/* Description */}
          {token.description && (
            <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-5">
              <h3 className="font-semibold text-[var(--tx)] mb-3">About</h3>
              <p className="text-[var(--tx-m)] text-sm leading-relaxed">{token.description}</p>
            </div>
          )}

          {/* Token info */}
          <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-5">
            <h3 className="font-semibold text-[var(--tx)] mb-4">Token Info</h3>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Contract Address', value: token.address, mono: true },
                { label: 'Total Supply', value: formatNumber(token.totalSupply, 0), mono: false },
                { label: 'Tokens Sold', value: `${formatNumber(token.tokensSold, 0)} (${soldPct}%)`, mono: false },
                { label: 'Creator', value: formatAddress(token.creator, 8), mono: true },
                { label: 'Chain', value: 'Sentrix Chain (ID: 7119)', mono: false },
              ].map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-4">
                  <span className="text-[var(--tx-d)] shrink-0">{row.label}</span>
                  <span className={`text-[var(--tx)] text-right truncate max-w-[200px] ${row.mono ? 'font-mono text-xs' : ''}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Holders — live from Transfer events (no indexer required) */}
          <TopHoldersPanel tokenAddress={token.address as `0x${string}`} />

          {/* Stat row pulls Holders count from the same hook below. */}

          {/* Recent trades — paginated, indexer-fed. Hidden for bare
              ERC-20s (no curve = nothing to index). */}
          {token.curveAddress && (
            <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-5">
              <h3 className="font-semibold text-[var(--tx)] mb-4">Recent Trades</h3>
              <TradeHistoryTable curveAddress={token.curveAddress} />
            </div>
          )}
        </div>

        {/* Right column — Buy/Sell */}
        <div className="space-y-4">
          <BuySellWidget token={token} />

          {/* Warning card */}
          {token.isWarned && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
                <span className="text-orange-400 font-semibold text-sm">Warning</span>
              </div>
              <p className="text-orange-300 text-xs leading-relaxed">
                This token has no description. Exercise caution — do your own research before trading.
              </p>
            </div>
          )}

          {/* Fee info — only meaningful for tokens with a real curve.
              Bare ERC-20s have no curve fee + no graduation, so the
              panel would just print misleading numbers. */}
          {token.curveAddress && (
            <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-4 text-xs space-y-2 text-[var(--tx-d)]">
              <p className="font-semibold text-[var(--tx)] text-sm mb-3">Fee Structure</p>
              <div className="flex justify-between">
                <span>Trading fee</span><span className="text-[var(--tx)]">1%</span>
              </div>
              <div className="flex justify-between">
                <span>Fee distribution</span><span className="text-[var(--tx)]">100% to Ecosystem Fund</span>
              </div>
              <div className="flex justify-between">
                <span>Graduation threshold</span><span className="text-[var(--gold)]">{formatNumber(gradThreshold)} {gradLabel}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TopHoldersPanel({ tokenAddress }: { tokenAddress: `0x${string}` }) {
  const { holders, totalSupply, isLoading } = useTopHolders(tokenAddress)
  return (
    <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[var(--tx)]">Top Holders</h3>
        {totalSupply > 0n && holders.length > 0 && (
          <span className="text-xs text-[var(--tx-d)]">{holders.length} shown</span>
        )}
      </div>
      {isLoading && holders.length === 0 ? (
        <p className="text-xs text-[var(--tx-d)] py-4 text-center">Scanning Transfer events…</p>
      ) : holders.length === 0 ? (
        <p className="text-xs text-[var(--tx-d)] py-4 text-center">No holders yet.</p>
      ) : (
        <div className="space-y-3">
          {holders.map((holder, i) => (
            <div key={holder.address} className="flex items-center gap-3">
              <span className="text-[var(--tx-d)] text-xs w-4 text-right">{i + 1}</span>
              <span className="font-mono text-xs text-[var(--tx-m)] flex-1 truncate">
                {formatAddress(holder.address, 6)}
              </span>
              <div className="flex-1">
                <Progress value={Math.min(100, holder.percentage)} color="gold" />
              </div>
              <span className="text-xs text-[var(--tx-d)] w-14 text-right">
                {holder.percentage < 0.01 ? '<0.01' : holder.percentage.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
