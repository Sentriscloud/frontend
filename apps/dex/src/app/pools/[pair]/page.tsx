'use client'

import { use } from 'react'
import Link from 'next/link'
import { useAccount, useReadContract } from 'wagmi'
import type { Address } from 'viem'
import { usePair, formatUnits18 } from '@/lib/usePools'
import { PAIR_ABI } from '@/lib/contracts'
import { ArrowLeft, ArrowRightLeft, Minus, Plus } from 'lucide-react'
import { Nav } from '@/components/Nav'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ pair: string }>
}

export default function PoolDetailPage({ params }: Props) {
  const { pair } = use(params)
  const pairAddr = pair as Address
  const { info, isLoading, error } = usePair(pairAddr)
  const { address } = useAccount()

  // User's LP balance — stand-alone read so the page still resolves the
  // top half (pool stats) when the user isn't connected.
  const { data: lpBalance } = useReadContract({
    address: pairAddr,
    abi: PAIR_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  if (error) {
    return (
      <main className="flex flex-col">
        <Nav />
        <div className="max-w-3xl mx-auto px-4 py-10 w-full">
          <Link href="/pools" className="text-sm text-[var(--tx-d)] hover:text-[var(--tx)] inline-flex items-center gap-1 mb-4">
            <ArrowLeft className="w-3.5 h-3.5" /> All pools
          </Link>
          <div className="bg-[var(--sf)] border border-red-500/40 rounded-xl p-6 text-sm text-red-400">
            Failed to load pool: {error.message}
          </div>
        </div>
      </main>
    )
  }

  if (isLoading || !info) {
    return (
      <main className="flex flex-col">
        <Nav />
        <div className="max-w-3xl mx-auto px-4 py-10 w-full">
          <Link href="/pools" className="text-sm text-[var(--tx-d)] hover:text-[var(--tx)] inline-flex items-center gap-1 mb-4">
            <ArrowLeft className="w-3.5 h-3.5" /> All pools
          </Link>
          <p className="text-sm text-[var(--tx-d)]">Loading pool…</p>
        </div>
      </main>
    )
  }

  const userLp = (lpBalance as bigint | undefined) ?? 0n
  const share = info.totalSupply > 0n ? Number(userLp) / Number(info.totalSupply) : 0
  const userAmount0 = info.totalSupply > 0n ? (info.reserve0 * userLp) / info.totalSupply : 0n
  const userAmount1 = info.totalSupply > 0n ? (info.reserve1 * userLp) / info.totalSupply : 0n
  const price = info.reserve0 > 0n ? Number(info.reserve1) / Number(info.reserve0) : 0
  const priceInv = info.reserve1 > 0n ? Number(info.reserve0) / Number(info.reserve1) : 0

  return (
    <main className="flex flex-col">
      <Nav />
      <div className="max-w-3xl mx-auto px-4 py-10 w-full">
      <Link
        href="/pools"
        className="text-sm text-[var(--tx-d)] hover:text-[var(--tx)] inline-flex items-center gap-1 mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> All pools
      </Link>

      {/* Header */}
      <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-6 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex">
              <span className="w-9 h-9 rounded-full bg-[var(--gold)]/15 border border-[var(--brd2)] flex items-center justify-center text-[11px] font-bold text-[var(--gold)]">
                {info.symbol0.slice(0, 3)}
              </span>
              <span className="-ml-3 w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-[11px] font-bold text-emerald-400">
                {info.symbol1.slice(0, 3)}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-[var(--tx)]">
                {info.symbol0} / {info.symbol1}
              </h1>
              <p className="font-mono text-[10px] text-[var(--tx-d)]">{pairAddr}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/?from=${info.token0}&to=${info.token1}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-[var(--gold)] border border-[var(--brd2)] hover:border-[var(--gold)] transition-colors"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" /> Swap
            </Link>
            <Link
              href={`/add?pair=${pairAddr}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[var(--bk)] bg-[var(--gold)] hover:bg-[var(--gold-l)] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </Link>
            {userLp > 0n && (
              <Link
                href={`/remove/${pairAddr}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-red-400 border border-red-500/40 hover:border-red-400 transition-colors"
              >
                <Minus className="w-3.5 h-3.5" /> Remove
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Pool stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-[var(--tx-d)] mb-1">
            Reserve 0 ({info.symbol0})
          </p>
          <p className="text-xl font-bold text-[var(--tx)] tabular-nums">
            {formatUnits18(info.reserve0, 4)}
          </p>
        </div>
        <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-[var(--tx-d)] mb-1">
            Reserve 1 ({info.symbol1})
          </p>
          <p className="text-xl font-bold text-[var(--tx)] tabular-nums">
            {formatUnits18(info.reserve1, 4)}
          </p>
        </div>
        <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-[var(--tx-d)] mb-1">
            1 {info.symbol0} ≈
          </p>
          <p className="text-base font-bold text-[var(--tx)] tabular-nums">
            {price > 0 ? price.toExponential(3) : '—'}{' '}
            <span className="text-[var(--tx-d)] text-sm">{info.symbol1}</span>
          </p>
        </div>
        <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-[var(--tx-d)] mb-1">
            1 {info.symbol1} ≈
          </p>
          <p className="text-base font-bold text-[var(--tx)] tabular-nums">
            {priceInv > 0 ? priceInv.toExponential(3) : '—'}{' '}
            <span className="text-[var(--tx-d)] text-sm">{info.symbol0}</span>
          </p>
        </div>
      </div>

      {/* Your position */}
      <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-[var(--tx)] mb-3">Your position</h2>
        {!address ? (
          <p className="text-xs text-[var(--tx-d)]">
            Connect your wallet to see your share of this pool.
          </p>
        ) : userLp === 0n ? (
          <p className="text-xs text-[var(--tx-d)]">
            You have no liquidity in this pair yet.
          </p>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[var(--tx-d)]">LP tokens</span>
              <span className="font-mono text-[var(--tx)] tabular-nums">{formatUnits18(userLp, 6)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--tx-d)]">Pool share</span>
              <span className="text-[var(--gold)] font-bold tabular-nums">{(share * 100).toFixed(4)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--tx-d)]">{info.symbol0}</span>
              <span className="font-mono text-[var(--tx)] tabular-nums">{formatUnits18(userAmount0, 6)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--tx-d)]">{info.symbol1}</span>
              <span className="font-mono text-[var(--tx)] tabular-nums">{formatUnits18(userAmount1, 6)}</span>
            </div>
          </div>
        )}
      </div>
      </div>
    </main>
  )
}
