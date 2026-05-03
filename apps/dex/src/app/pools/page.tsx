'use client'

// All pools listing — Uniswap V2 fork pattern. Scans factory.allPairs
// and renders one row per pair with reserves + a per-row Swap/Add CTA.
//
// `force-dynamic` keeps Next from trying to static-prerender the route
// — usePoolList hits wagmi's PublicClient which only exists once
// WagmiProvider has hydrated client-side. Same pattern HomeContent
// covers via ClientShell's `dynamic({ssr:false})` for the swap page.
//
// New pairs appear here automatically once anyone calls
// factory.createPair (either via the /add flow or directly via
// router.addLiquidity for a non-existent pair).

import Link from 'next/link'
import { usePoolList, formatUnits18, type PoolInfo } from '@/lib/usePools'
import { Plus, ArrowRightLeft, Droplet } from 'lucide-react'
import { Nav } from '@/components/Nav'

export const dynamic = 'force-dynamic'

function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

function PoolRow({ p }: { p: PoolInfo }) {
  // Spot price = reserve1 / reserve0 (= "how much token1 per token0").
  // Both reserves are 18-decimal here, so the ratio is dimensionless and
  // safe to render without scaling.
  const price =
    p.reserve0 > 0n
      ? Number(p.reserve1) / Number(p.reserve0)
      : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-[2fr_2fr_1fr_1.4fr] gap-3 md:gap-4 px-4 py-3 border-b border-[var(--brd)] hover:bg-[var(--sf2)] transition-colors items-center">
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative flex shrink-0">
          <span className="w-7 h-7 rounded-full bg-[var(--gold)]/15 border border-[var(--brd2)] flex items-center justify-center text-[10px] font-bold text-[var(--gold)]">
            {p.symbol0.slice(0, 3)}
          </span>
          <span className="-ml-2 w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-[10px] font-bold text-emerald-400">
            {p.symbol1.slice(0, 3)}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-[var(--tx)] truncate">
            {p.symbol0}/{p.symbol1}
          </p>
          <p className="font-mono text-[10px] text-[var(--tx-d)] truncate">
            {shortAddr(p.pair)}
          </p>
        </div>
      </div>

      <div className="text-xs text-[var(--tx-m)] tabular-nums">
        <p>{formatUnits18(p.reserve0, 4)} {p.symbol0}</p>
        <p>{formatUnits18(p.reserve1, 4)} {p.symbol1}</p>
      </div>

      <div className="text-xs text-[var(--tx-m)] tabular-nums hidden md:block">
        {price > 0 ? price.toExponential(3) : '—'}
        <span className="text-[var(--tx-d)] ml-1">
          {p.symbol1}/{p.symbol0}
        </span>
      </div>

      <div className="flex items-center gap-1.5 justify-start md:justify-end">
        <Link
          href={`/pools/${p.pair}`}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] text-[var(--tx-m)] hover:text-[var(--tx)] border border-[var(--brd)] hover:border-[var(--brd2)] transition-colors"
        >
          <Droplet className="w-3 h-3" /> Pool
        </Link>
        <Link
          href={`/add?pair=${p.pair}`}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] text-emerald-400 hover:text-emerald-300 border border-emerald-500/40 hover:border-emerald-400 transition-colors"
        >
          <Plus className="w-3 h-3" /> Add
        </Link>
        <Link
          href={`/?from=${p.token0}&to=${p.token1}`}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] text-[var(--gold)] hover:text-[var(--gold-l)] border border-[var(--brd2)] hover:border-[var(--gold)] transition-colors"
        >
          <ArrowRightLeft className="w-3 h-3" /> Swap
        </Link>
      </div>
    </div>
  )
}

export default function PoolsPage() {
  const { pools, isLoading, error } = usePoolList()

  return (
    <main className="flex flex-col">
      <Nav />
      <div className="max-w-5xl mx-auto px-4 py-10 w-full">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--tx)]">Pools</h1>
          <p className="text-sm text-[var(--tx-d)] mt-1">
            All SentrixV2 liquidity pools. Add liquidity to earn 0.3% of trading fees pro-rata.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/positions"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-[var(--tx-m)] hover:text-[var(--tx)] border border-[var(--brd)] hover:border-[var(--brd2)] transition-colors"
          >
            Your positions
          </Link>
          <Link
            href="/add"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[var(--bk)] bg-[var(--gold)] hover:bg-[var(--gold-l)] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add liquidity
          </Link>
        </div>
      </div>

      <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl overflow-hidden">
        {/* Header row — desktop only; mobile collapses to single column. */}
        <div className="hidden md:grid grid-cols-[2fr_2fr_1fr_1.4fr] gap-4 px-4 py-2.5 text-[10px] uppercase tracking-wider text-[var(--tx-d)] border-b border-[var(--brd)] bg-[var(--sf2)]">
          <span>Pair</span>
          <span>Reserves</span>
          <span>Spot</span>
          <span className="text-right">Action</span>
        </div>

        {error ? (
          <p className="px-4 py-12 text-center text-sm text-red-400">
            Failed to load pools: {error.message}
          </p>
        ) : isLoading ? (
          <p className="px-4 py-12 text-center text-sm text-[var(--tx-d)]">Loading pools…</p>
        ) : pools.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="text-3xl mb-2">💧</p>
            <p className="text-[var(--tx)] font-semibold mb-1">No pools yet</p>
            <p className="text-xs text-[var(--tx-d)] mb-4">
              Be the first to seed liquidity for a pair.
            </p>
            <Link
              href="/add"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[var(--bk)] bg-[var(--gold)] hover:bg-[var(--gold-l)] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add liquidity
            </Link>
          </div>
        ) : (
          pools.map((p) => <PoolRow key={p.pair} p={p} />)
        )}
      </div>
      </div>
    </main>
  )
}
