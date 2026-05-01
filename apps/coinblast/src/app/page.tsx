'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { TokenCard } from '@/components/token/TokenCard'
import { DotGrid, GradientBlur } from '@/components/ui/GridBg'
import { MOCK_TOKENS } from '@/lib/mock-data'
import { useDeployedTokens } from '@/lib/useDeployedTokens'
import { useDeployedCurves } from '@/lib/useDeployedCurves'
import { useCurveTradeStats } from '@/lib/useCurveTradeStats'
import { mergeStaticAndDeployed } from '@/lib/token-registry'
import { formatNumber } from '@/lib/utils'
import { Rocket, TrendingUp } from 'lucide-react'
import type { Token } from '@/types'

type Tab = 'hot' | 'new' | 'graduating' | 'graduated'

const TABS: { key: Tab; label: string }[] = [
  { key: 'hot', label: '🔥 Hot' },
  { key: 'new', label: '✨ New' },
  { key: 'graduating', label: '📈 Graduating' },
  { key: 'graduated', label: '✅ Graduated' },
]

interface ActivityRow {
  type: 'launch'
  symbol: string
  curve: `0x${string}`
  ts: number // block number — relative to latestBlock yields seconds-ago
}

// Sentrix mainnet runs ~1s blocks (BLOCK_TIME_SECS=1), so the gap
// between two block numbers is approximately the gap in seconds.
function formatBlocksAgo(latest: bigint | null, then: bigint): string {
  if (!latest) return ''
  const diffSec = Number(latest - then)
  if (diffSec < 0) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  return `${Math.floor(diffSec / 86400)}d ago`
}

function getTabTokens(tokens: Token[], tab: Tab): Token[] {
  switch (tab) {
    case 'hot':
      return [...tokens].filter((t) => !t.isWarned).sort((a, b) => b.marketCap - a.marketCap)
    case 'new':
      // Live tokens get a real createdAt; static seeds use 0 ("just launched").
      // Tokens with createdAt=0 sort to the top, then by descending real ts.
      return [...tokens].sort((a, b) => {
        if (a.createdAt === 0 && b.createdAt === 0) return 0
        if (a.createdAt === 0) return -1
        if (b.createdAt === 0) return 1
        return b.createdAt - a.createdAt
      })
    case 'graduating':
      return [...tokens].filter((t) => !t.isGraduated && t.progress >= 50).sort((a, b) => b.progress - a.progress)
    case 'graduated':
      return [...tokens].filter((t) => t.isGraduated)
  }
}

export default function HomePage() {
  const [tab, setTab] = useState<Tab>('hot')
  const [visible, setVisible] = useState(8)
  const { tokens: deployed } = useDeployedTokens()
  const { curves, latestBlock } = useDeployedCurves()

  // Volume + trader stats — scans Buy/Sell events from every curve.
  // Only the address+deploy-block is stable input; pulling those out
  // keeps the hook from re-firing every render when DeployedCurve
  // shape (which carries strings + bigints) gets a fresh array ref.
  const tradeInput = useMemo(
    () => curves.map((c) => ({ curveAddress: c.curveAddress, blockNumber: c.blockNumber })),
    [curves],
  )
  const trade = useCurveTradeStats(tradeInput)

  const merged = useMemo(
    () => mergeStaticAndDeployed(MOCK_TOKENS, deployed, 7119, curves),
    [deployed, curves],
  )

  // Live Activity feed — derived from the same CurveCreated events
  // useDeployedCurves consumes. Newest first, capped at 8. Block
  // numbers stand in for timestamps (no extra eth_getBlock fetch).
  const activity: ActivityRow[] = useMemo(
    () =>
      curves.slice(0, 8).map((c) => ({
        type: 'launch' as const,
        symbol: c.symbol || c.tokenAddress.slice(0, 6),
        curve: c.curveAddress,
        ts: Number(c.blockNumber),
      })),
    [curves],
  )
  const allTokens = getTabTokens(merged, tab)
  const shown = allTokens.slice(0, visible)

  const handleTabChange = (t: Tab) => {
    setTab(t)
    setVisible(8)
  }

  return (
    <div className="pt-[60px] pb-20">

      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-20 text-center">
        <DotGrid />
        <GradientBlur />
        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-[var(--tx)] tracking-tight leading-tight animate-fade-up">
            Launch your coin.<br />
            <span className="shimmer-text">Fair for everyone.</span>
          </h1>
          <p className="text-[var(--tx-m)] text-base max-w-md mx-auto animate-fade-up" style={{ animationDelay: '0.1s' }}>
            Pay gas → coin goes live instantly on a bonding curve. No VC, no presale.
          </p>
          <div className="flex gap-3 justify-center animate-fade-up" style={{ animationDelay: '0.15s' }}>
            <Link href="/create">
              <Button variant="gold" size="lg">
                <Rocket className="w-4 h-4" /> Launch a Coin
              </Button>
            </Link>
            <Link href="/explore">
              <Button variant="secondary" size="lg">
                <TrendingUp className="w-4 h-4" /> Explore
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Live stats strip — left side is launchpad inventory, right
          side is real on-chain trade activity scanned across every
          curve. Trade numbers blank-out while loading so we don't
          flash zeroes that look like "nothing's happening". */}
      <div className="border-y border-[var(--brd)] bg-[var(--sf)]/50 py-3 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-x-8 gap-y-2 text-sm flex-wrap">
          {[
            { label: 'coins launched', value: String(merged.length) },
            { label: 'with bonding curve', value: String(merged.filter(t => t.curveAddress).length) },
            { label: 'graduated to DEX', value: String(merged.filter(t => t.isGraduated).length) },
            {
              label: 'SRX volume',
              value: trade.isLoading ? '…' : formatNumber(trade.totalVolumeSrx, trade.totalVolumeSrx < 1 ? 4 : 2),
            },
            {
              label: 'traders',
              value: trade.isLoading ? '…' : String(trade.uniqueTraders),
            },
            {
              label: 'trades',
              value: trade.isLoading ? '…' : String(trade.buyCount + trade.sellCount),
            },
          ].map((s) => (
            <span key={s.label} className="text-[var(--tx-d)]">
              <span className="text-[var(--gold)] font-bold">{s.value}</span> {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 mt-10">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Token grid */}
          <div className="flex-1 min-w-0">
            {/* Tabs */}
            <div className="flex items-center gap-1 mb-5 flex-wrap">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => handleTabChange(t.key)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
                    tab === t.key
                      ? 'bg-[var(--gold)] text-[var(--bk)]'
                      : 'bg-[var(--sf)] border border-[var(--brd)] text-[var(--tx-d)] hover:border-[var(--brd2)] hover:text-[var(--tx)]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Grid */}
            {shown.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {shown.map((token) => (
                    <TokenCard key={token.address} token={token} />
                  ))}
                </div>
                {visible < allTokens.length && (
                  <div className="text-center mt-6">
                    <button
                      onClick={() => setVisible((v) => v + 8)}
                      className="px-6 py-2.5 rounded-full bg-[var(--sf)] border border-[var(--brd)] text-sm text-[var(--tx-d)] hover:border-[var(--brd2)] hover:text-[var(--tx)] transition-all"
                    >
                      Load more
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16 text-[var(--tx-d)]">
                <p className="text-3xl mb-3">
                  {tab === 'graduating' ? '📈' : tab === 'graduated' ? '✅' : '🔍'}
                </p>
                <p className="text-[var(--tx)] font-semibold">No coins here yet</p>
              </div>
            )}
          </div>

          {/* Activity feed */}
          <div className="lg:w-[260px] shrink-0">
            <h2 className="text-lg font-bold text-[var(--tx)] mb-5">Live Activity</h2>
            <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl overflow-hidden">
              {activity.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-[var(--tx-d)]">
                  No on-chain activity yet — be the first to launch.
                </div>
              ) : (
                activity.map((a) => (
                  <Link
                    key={a.curve}
                    href={`/token/${a.curve}`}
                    className="flex items-center gap-2.5 px-3 py-2.5 border-b border-[var(--brd)] last:border-0 hover:bg-[var(--sf2)] transition-colors"
                  >
                    <span className="text-xs font-bold w-12 shrink-0 text-[var(--gold)]">
                      🚀 NEW
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[var(--tx)] font-medium truncate">{a.symbol}</p>
                    </div>
                    <span className="text-xs text-[var(--tx-m)] shrink-0">{formatBlocksAgo(latestBlock, BigInt(a.ts))}</span>
                  </Link>
                ))
              )}
            </div>

            {/* CTA box */}
            <div className="mt-4 bg-[var(--gold)]/8 border border-[var(--brd2)] rounded-xl p-4 text-center">
              <p className="text-sm font-semibold text-[var(--tx)] mb-1">Ready to launch?</p>
              <p className="text-xs text-[var(--tx-d)] mb-3">gas-only · instant · fair</p>
              <Link href="/create">
                <Button variant="gold" size="sm" className="w-full">
                  <Rocket className="w-3.5 h-3.5" /> Launch Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
