'use client'
import { notFound } from 'next/navigation'
import { use, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { formatEther } from 'viem'
import { useBlockNumber } from 'wagmi'
import { MOCK_TOKENS } from '@/lib/mock-data'
import { useDeployedTokens } from '@/lib/useDeployedTokens'
import { useDeployedCurves } from '@/lib/useDeployedCurves'
import { useTopHolders } from '@/lib/useTopHolders'
import { useTradesByCurve, useIndexerTokenMeta } from '@/lib/useCoinblastIndexer'
import { useCurveState } from '@/lib/useCoinBlastCurve'
import { mergeStaticAndDeployed } from '@/lib/token-registry'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { BuySellWidget } from '@/components/token/BuySellWidget'
import { TradeHistoryTable } from '@/components/token/TradeHistoryTable'
import { ShareButtons } from '@/components/token/ShareButtons'

// Lazy-load both charts. PriceHistoryChart imports lightweight-charts,
// BondingCurveChart imports recharts — together those two libraries
// were landing ~600 KB of First Load JS on this route (969 KB total
// before this change). The buy/sell widget + trade table + holders
// list are the interaction-critical surfaces; the charts are below
// the fold on mobile and useful but not blocking. Deferring them past
// first paint keeps the buy flow responsive from page mount.
const BondingCurveChart = dynamic(
  () => import('@/components/token/BondingCurveChart').then((m) => ({ default: m.BondingCurveChart })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[200px] w-full bg-[var(--sf)] border border-[var(--brd)] rounded-xl animate-pulse" />
    ),
  },
)
const PriceHistoryChart = dynamic(
  () => import('@/components/token/PriceHistoryChart').then((m) => ({ default: m.PriceHistoryChart })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] w-full bg-[var(--sf)] border border-[var(--brd)] rounded-xl animate-pulse" />
    ),
  },
)
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

  // Live curve state — must be called unconditionally before any early
  // return, per React's rules-of-hooks. Hook gates internally on the
  // curve address being defined, so a missing token (or a bare ERC-20)
  // produces a no-op read. Overrides MOCK_TOKENS' static tokensSold /
  // marketCap / progress fields once the on-chain reads resolve.
  const live = useCurveState(token?.curveAddress)
  const liveTokensSold =
    live.tokensSold !== undefined ? Number(formatEther(live.tokensSold)) : null
  const liveSrxRaised =
    live.srxRaised !== undefined ? Number(formatEther(live.srxRaised)) : null
  const liveCurveSupply =
    live.curveSupply !== undefined ? Number(formatEther(live.curveSupply)) : null

  // Lifted from <TopHoldersPanel> (was duplicated): top-of-page stats
  // grid renders the holder count, panel below renders the full list.
  // Single useTopHolders call feeds both. token.address is set as soon
  // as the merge resolves, so the hook gates internally until then.
  const topHoldersData = useTopHolders(token?.address as `0x${string}` | undefined)

  // 24h volume + unique trader count both derived from indexer trades
  // for the curve. 1-second blocks on Sentrix → 86,400 blocks ≈ 24 h.
  // Polls every 5 s — same cadence as the chart so the stats grid
  // stays in sync with the candle stream.
  //
  // Holder count: bonding-curve tokens have only one acquisition path
  // (buying via curve), so unique trader_address from cb_trades is
  // exact for stats-grid display purposes. Beats useTopHolders for the
  // count because (a) /api/cb/* is same-origin (no CORS races during
  // burst eth_getLogs) and (b) one fetch vs ~30 chunked Transfer-event
  // calls. The full TopHoldersPanel below still uses useTopHolders to
  // sort by balance — intermittent partial failure there is OK
  // because the count is shown elsewhere.
  const { trades: tradesForVol } = useTradesByCurve(token?.curveAddress, 500, 5000)
  const { data: tipBlock } = useBlockNumber({ watch: true, chainId: 7119 })
  const volume24h = useMemo(() => {
    if (!tradesForVol || tradesForVol.length === 0 || !tipBlock) return 0
    const dayAgoBlock = tipBlock - 86400n
    return tradesForVol
      .filter((t) => t.type !== 'graduated' && BigInt(t.block_number) >= dayAgoBlock)
      .reduce((sum, t) => sum + Number(formatEther(BigInt(t.srx_amount))), 0)
  }, [tradesForVol, tipBlock])
  const uniqueTraders = useMemo(() => {
    if (!tradesForVol || tradesForVol.length === 0) return 0
    const set = new Set(
      tradesForVol
        .filter((t) => t.type === 'buy' && t.trader_address)
        .map((t) => t.trader_address.toLowerCase()),
    )
    return set.size
  }, [tradesForVol])

  // Indexer-sourced metadata (image, description, socials). Overrides
  // MOCK_TOKENS / static seed when present. Multi-browser visible —
  // every visitor sees the icon the launcher posted, not just the
  // launching browser's localStorage. Hook gates on undefined curve so
  // bare ERC-20s without a curve return null and we keep the seed.
  const { meta: indexerMeta } = useIndexerTokenMeta(token?.curveAddress)

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

  // Apply indexer metadata over the static token row (read-through).
  // Order: indexer.image → static MOCK_TOKENS.imageUrl → empty (avatar
  // generates a colored letter fallback). Same for description / socials.
  const displayImage = indexerMeta?.imageUrl || token.imageUrl
  const displayDescription = indexerMeta?.description ?? (token as { description?: string }).description ?? ''
  const displayTwitter = indexerMeta?.twitterUrl || token.twitter
  const displayTelegram = indexerMeta?.telegramUrl || token.telegram
  const displayWebsite = indexerMeta?.websiteUrl || token.website

  // Live launches put their graduation threshold on the Token row (in SRX
  // raised). Pre-deploy preview rows fall back to the legacy 69k mcap.
  const gradThreshold = token.graduationThresholdSrx ?? GRADUATION_THRESHOLD_FALLBACK
  const gradLabel = token.graduationThresholdSrx ? 'SRX raised' : 'SRX mcap'

  // Resolve display fields: prefer live on-chain reads when the curve is
  // attached and reachable; fall back to the static Token row otherwise
  // (bare ERC-20s without a curve, mid-load before the read resolves).
  const tokensSold = liveTokensSold ?? token.tokensSold
  const srxRaised = liveSrxRaised ?? token.marketCap
  const totalSupply = liveCurveSupply ?? token.totalSupply
  const soldPct = totalSupply > 0 ? ((tokensSold / totalSupply) * 100).toFixed(1) : '0.0'
  const progressPct = Math.min(100, (srxRaised / gradThreshold) * 100)
  const isGraduated = live.graduated ?? token.isGraduated

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
              imageUrl={displayImage}
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
                {isGraduated && (
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

              {/* Social links — read indexer metadata first, fall back
                  to the static Token row's social fields if present. */}
              {(displayWebsite || displayTwitter || displayTelegram || token.discord) && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {displayWebsite && (
                    <Link href={displayWebsite} target="_blank"
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--sf)] border border-[var(--brd)] text-xs text-[var(--tx-d)] hover:text-[var(--gold)] hover:border-[var(--brd2)] transition-all">
                      <Globe className="w-3 h-3" /> Website
                    </Link>
                  )}
                  {displayTwitter && (
                    <Link href={displayTwitter} target="_blank"
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--sf)] border border-[var(--brd)] text-xs text-[var(--tx-d)] hover:text-[var(--gold)] hover:border-[var(--brd2)] transition-all">
                      <span className="text-[10px] font-bold leading-none">𝕏</span> Twitter
                    </Link>
                  )}
                  {displayTelegram && (
                    <Link href={displayTelegram} target="_blank"
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

          {/* Stats grid — values come from live curve reads when the
              curve is on-chain. Bare ERC-20s without a curve fall back
              to the Token row (which carries the MOCK_TOKENS seed
              shape) so the layout stays consistent across both kinds. */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Price', value: formatPrice(token.price), icon: <BarChart2 className="w-4 h-4 text-[var(--gold)]" /> },
              { label: 'Market Cap', value: formatSRX(srxRaised), icon: <TrendingUp className="w-4 h-4 text-[var(--gold-l)]" /> },
              // Real 24h volume from indexer cb_trades (was reading the
              // static token.volume24h seed which never updated).
              { label: '24h Volume', value: formatSRX(volume24h), icon: <BarChart2 className="w-4 h-4 text-emerald-400" /> },
              // Holder count via unique buyer addresses from indexer
              // trades (same-origin /api/cb/, no CORS race). Falls
              // through to useTopHolders length only when curve has
              // zero indexer trades but the on-chain Transfer scan
              // surfaced something — covers the rare edge case of a
              // CoinBlast token whose bonding curve isn't tracked by
              // the indexer (shouldn't happen for tokens listed here).
              {
                label: 'Holders',
                value: uniqueTraders > 0
                  ? String(uniqueTraders)
                  : topHoldersData.holders.length > 0
                    ? String(topHoldersData.holders.length)
                    : '—',
                icon: <Users className="w-4 h-4 text-[var(--tx-m)]" />,
              },
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
          {!isGraduated && !!token.curveAddress && (
            <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-[var(--tx)] text-sm">Graduation Progress</h3>
                <span className="text-[var(--gold)] font-bold">{progressPct.toFixed(1)}%</span>
              </div>
              <Progress value={progressPct} color="gold" showLabel />
              <div className="flex items-center justify-between mt-3 text-xs text-[var(--tx-d)]">
                <span>Current: {formatSRX(srxRaised)} raised</span>
                <span>Goal: {formatNumber(gradThreshold)} {gradLabel}</span>
              </div>
              <p className="text-xs text-[var(--tx-d)] mt-2">
                {formatSRX(Math.max(0, gradThreshold - srxRaised))} remaining to auto-list on Sentrix DEX
              </p>
            </div>
          )}

          {/* Price history (real trades) — sits above the theoretical
              curve so traders see actual fills first. Only renders for
              tokens with a curve attached. */}
          {token.curveAddress && (
            <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[var(--tx)] font-mono tracking-wide">
                  {token.symbol}/SRX
                </h3>
                <span className="text-xs text-[var(--tx-d)]">price in SRX per token</span>
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
          {displayDescription && (
            <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-5">
              <h3 className="font-semibold text-[var(--tx)] mb-3">About</h3>
              <p className="text-[var(--tx-m)] text-sm leading-relaxed">{displayDescription}</p>
            </div>
          )}

          {/* Token info */}
          <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-5">
            <h3 className="font-semibold text-[var(--tx)] mb-4">Token Info</h3>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Contract Address', value: token.address, mono: true },
                { label: 'Total Supply', value: formatNumber(totalSupply, 0), mono: false },
                { label: 'Tokens Sold', value: `${formatNumber(tokensSold, 0)} (${soldPct}%)`, mono: false },
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
          <TopHoldersPanel data={topHoldersData} />

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

function TopHoldersPanel({ data }: { data: ReturnType<typeof useTopHolders> }) {
  const { holders, totalSupply, isLoading } = data
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
