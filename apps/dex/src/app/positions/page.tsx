'use client'

// Your-positions page. Sweeps the LP token of every pair returned by
// usePoolList, filters to ones where the connected user has a non-zero
// balance, renders share + underlying amounts. Empty state for
// disconnected / zero-balance users.

import Link from 'next/link'
import { useAccount } from 'wagmi'
import { useLPPositions, formatUnits18 } from '@/lib/usePools'
import { ArrowLeft, Minus, Plus, Wallet } from 'lucide-react'
import { Nav } from '@/components/Nav'

export const dynamic = 'force-dynamic'

export default function PositionsPage() {
  const { address, isConnected } = useAccount()
  const { positions, isLoading } = useLPPositions()

  return (
    <main className="flex flex-col">
      <Nav />
      <div className="max-w-3xl mx-auto px-4 py-10 w-full">
      <Link
        href="/pools"
        className="text-sm text-[var(--tx-d)] hover:text-[var(--tx)] inline-flex items-center gap-1 mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Pools
      </Link>

      <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--tx)]">Your liquidity</h1>
          <p className="text-sm text-[var(--tx-d)] mt-1">
            LP positions you hold across SentrixV2 pools.
          </p>
        </div>
        <Link
          href="/add"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[var(--bk)] bg-[var(--gold)] hover:bg-[var(--gold-l)] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add liquidity
        </Link>
      </div>

      {!isConnected ? (
        <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-12 text-center">
          <Wallet className="w-10 h-10 text-[var(--tx-d)] mx-auto mb-3" />
          <p className="text-[var(--tx)] font-semibold mb-1">Connect your wallet</p>
          <p className="text-xs text-[var(--tx-d)]">
            Once connected we&apos;ll list every pool you have LP tokens in.
          </p>
        </div>
      ) : isLoading ? (
        <p className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-6 text-sm text-[var(--tx-d)]">
          Scanning pools…
        </p>
      ) : positions.length === 0 ? (
        <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-12 text-center">
          <p className="text-3xl mb-2">🪣</p>
          <p className="text-[var(--tx)] font-semibold mb-1">No liquidity yet</p>
          <p className="text-xs text-[var(--tx-d)] mb-4">
            Add liquidity to a pool to start earning trading fees.
          </p>
          <Link
            href="/add"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[var(--bk)] bg-[var(--gold)] hover:bg-[var(--gold-l)] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add liquidity
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {positions.map((p) => (
            <div
              key={p.pair}
              className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-5"
            >
              <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex">
                    <span className="w-8 h-8 rounded-full bg-[var(--gold)]/15 border border-[var(--brd2)] flex items-center justify-center text-[10px] font-bold text-[var(--gold)]">
                      {p.symbol0.slice(0, 3)}
                    </span>
                    <span className="-ml-2.5 w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-[10px] font-bold text-emerald-400">
                      {p.symbol1.slice(0, 3)}
                    </span>
                  </div>
                  <div>
                    <p className="text-base font-bold text-[var(--tx)]">
                      {p.symbol0}/{p.symbol1}
                    </p>
                    <p className="text-[11px] text-[var(--gold)] font-semibold tabular-nums">
                      {(p.share * 100).toFixed(4)}% share
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/pools/${p.pair}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] text-[var(--tx-m)] hover:text-[var(--tx)] border border-[var(--brd)] hover:border-[var(--brd2)] transition-colors"
                  >
                    Detail
                  </Link>
                  <Link
                    href={`/add?pair=${p.pair}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] text-emerald-400 hover:text-emerald-300 border border-emerald-500/40 hover:border-emerald-400 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </Link>
                  <Link
                    href={`/remove/${p.pair}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] text-red-400 hover:text-red-300 border border-red-500/40 hover:border-red-400 transition-colors"
                  >
                    <Minus className="w-3 h-3" /> Remove
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-[var(--sf2)] border border-[var(--brd)] rounded-lg p-3">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--tx-d)]">
                    {p.symbol0}
                  </p>
                  <p className="text-[var(--tx)] font-mono tabular-nums">
                    {formatUnits18(p.amount0, 6)}
                  </p>
                </div>
                <div className="bg-[var(--sf2)] border border-[var(--brd)] rounded-lg p-3">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--tx-d)]">
                    {p.symbol1}
                  </p>
                  <p className="text-[var(--tx)] font-mono tabular-nums">
                    {formatUnits18(p.amount1, 6)}
                  </p>
                </div>
              </div>

              <p className="text-[10px] text-[var(--tx-d)] mt-3 font-mono tabular-nums">
                LP: {formatUnits18(p.lpBalance, 6)} ·{' '}
                <span className="text-[var(--tx-m)]">
                  {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ''}
                </span>
              </p>
            </div>
          ))}
        </div>
      )}
      </div>
    </main>
  )
}
