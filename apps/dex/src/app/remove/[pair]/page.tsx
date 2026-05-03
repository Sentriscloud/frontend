'use client'

// Remove-liquidity widget. Slider 0-100% of the user's LP balance,
// computes withdraw amounts at the current pool ratio, calls
// router.removeLiquiditySRX (when one side is WSRX) or removeLiquidity
// (both ERC-20). Approves the LP token to the router first if needed —
// the LP token is itself an ERC-20 with a standard approve surface.

import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi'
import { type Address } from 'viem'
import { ArrowLeft, Minus, Wallet } from 'lucide-react'
import { DEX, ROUTER_ABI, PAIR_ABI } from '@/lib/contracts'
import { usePair, formatUnits18, isWSRX } from '@/lib/usePools'
import { Nav } from '@/components/Nav'

export const dynamic = 'force-dynamic'

const NETWORK: 'mainnet' | 'testnet' =
  (process.env.NEXT_PUBLIC_DEX_NETWORK as 'mainnet' | 'testnet' | undefined) ??
  'mainnet'

const DEADLINE_SECS = 20 * 60
const SLIPPAGE_BPS = 50n

function withSlippage(amount: bigint): bigint {
  return (amount * (10000n - SLIPPAGE_BPS)) / 10000n
}

function deadlineNow(): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + DEADLINE_SECS)
}

interface Props {
  params: Promise<{ pair: string }>
}

export default function RemoveLiquidityPage({ params }: Props) {
  const { pair } = use(params)
  const pairAddr = pair as Address
  const dex = DEX[NETWORK]
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { info } = usePair(pairAddr)

  // 0..100 percent of user's LP. Default 25% — same friendly midpoint
  // Uniswap uses; users typically tune from there.
  const [pct, setPct] = useState(25)

  const { data: lpBalance, refetch: refetchLp } = useReadContract({
    address: pairAddr,
    abi: PAIR_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
  const { data: lpAllowance, refetch: refetchAllowance } = useReadContract({
    address: pairAddr,
    abi: PAIR_ABI,
    functionName: 'allowance',
    args: address ? [address, dex.router] : undefined,
    query: { enabled: !!address },
  })

  const userLp = (lpBalance as bigint | undefined) ?? 0n
  const liquidity = (userLp * BigInt(pct)) / 100n
  const allowance = (lpAllowance as bigint | undefined) ?? 0n
  const needsApprove = liquidity > 0n && allowance < liquidity

  // Underlying amounts at the user's slice of the pool. Uses the same
  // ratio formula as the V2 burn() flow: amount = reserve × liquidity
  // / totalSupply.
  const { amount0, amount1 } = useMemo(() => {
    if (!info || info.totalSupply === 0n)
      return { amount0: 0n, amount1: 0n }
    return {
      amount0: (info.reserve0 * liquidity) / info.totalSupply,
      amount1: (info.reserve1 * liquidity) / info.totalSupply,
    }
  }, [info, liquidity])

  const { writeContract: approve, data: approveTx, isPending: approving } = useWriteContract()
  const { isSuccess: approveDone } = useWaitForTransactionReceipt({ hash: approveTx })
  const { writeContract: remove, data: removeTx, isPending: removing, error: removeError } = useWriteContract()
  const { isSuccess: removeDone, isLoading: removeMining } = useWaitForTransactionReceipt({ hash: removeTx })

  // Refetch allowance + LP balance on each receipt so the next render
  // reflects what just happened (allowance after approve, LP balance
  // after removeLiquidity).
  useEffect(() => {
    if (approveDone) refetchAllowance()
  }, [approveDone, refetchAllowance])
  useEffect(() => {
    if (removeDone) {
      refetchLp()
      // Bounce to /positions so the user sees the updated set without
      // having to navigate themselves.
      router.push('/positions')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [removeDone])

  function handleApprove() {
    approve({
      address: pairAddr,
      abi: PAIR_ABI,
      functionName: 'approve',
      args: [dex.router, 2n ** 256n - 1n],
    })
  }

  function handleRemove() {
    if (!address || !info || liquidity === 0n) return
    const dl = deadlineNow()
    const min0 = withSlippage(amount0)
    const min1 = withSlippage(amount1)

    // Pick removeLiquiditySRX when one side is WSRX so the user gets
    // native SRX out instead of WSRX they'd then have to unwrap.
    const t0IsWsrx = isWSRX(info.token0)
    const t1IsWsrx = isWSRX(info.token1)

    if (t0IsWsrx) {
      remove({
        address: dex.router,
        abi: ROUTER_ABI,
        functionName: 'removeLiquiditySRX',
        args: [info.token1, liquidity, min1, min0, address, dl],
      })
      return
    }
    if (t1IsWsrx) {
      remove({
        address: dex.router,
        abi: ROUTER_ABI,
        functionName: 'removeLiquiditySRX',
        args: [info.token0, liquidity, min0, min1, address, dl],
      })
      return
    }
    // Both ERC-20.
    remove({
      address: dex.router,
      abi: ROUTER_ABI,
      functionName: 'removeLiquidity',
      args: [info.token0, info.token1, liquidity, min0, min1, address, dl],
    })
  }

  return (
    <main className="flex flex-col">
      <Nav />
      <div className="max-w-md mx-auto px-4 py-10 w-full">
      <Link
        href={`/pools/${pairAddr}`}
        className="text-sm text-[var(--tx-d)] hover:text-[var(--tx)] inline-flex items-center gap-1 mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Pool
      </Link>

      <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-[var(--tx)]">Remove liquidity</h1>
          {info && (
            <span className="text-xs font-mono text-[var(--tx-d)]">
              {info.symbol0}/{info.symbol1}
            </span>
          )}
        </div>

        {!isConnected ? (
          <div className="text-center py-6">
            <Wallet className="w-8 h-8 text-[var(--tx-d)] mx-auto mb-2" />
            <p className="text-xs text-[var(--tx-d)]">Connect your wallet to manage LP.</p>
          </div>
        ) : userLp === 0n ? (
          <p className="text-xs text-[var(--tx-d)] text-center py-6">
            You have no LP tokens in this pool.
          </p>
        ) : (
          <>
            {/* Percent display + slider */}
            <div className="bg-[var(--sf2)] border border-[var(--brd)] rounded-xl p-4 mb-4 text-center">
              <p className="text-4xl font-black text-[var(--gold)] tabular-nums leading-none mb-3">
                {pct}%
              </p>
              <input
                type="range"
                min={0}
                max={100}
                value={pct}
                onChange={(e) => setPct(Number(e.target.value))}
                className="w-full accent-[var(--gold)]"
              />
              <div className="flex justify-between gap-1 mt-3">
                {[25, 50, 75, 100].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPct(p)}
                    className={`flex-1 py-1 text-[11px] rounded-md transition-colors ${
                      pct === p
                        ? 'bg-[var(--gold)]/15 text-[var(--gold)] border border-[var(--gold)]/30'
                        : 'text-[var(--tx-d)] hover:text-[var(--tx)] border border-[var(--brd)] hover:border-[var(--brd2)]'
                    }`}
                  >
                    {p}%
                  </button>
                ))}
              </div>
            </div>

            {/* Output preview */}
            {info && (
              <div className="space-y-1.5 mb-4 text-sm">
                <div className="flex items-center justify-between bg-[var(--sf2)] border border-[var(--brd)] rounded-lg px-3 py-2.5">
                  <span className="text-[var(--tx-d)]">{info.symbol0}</span>
                  <span className="font-mono text-[var(--tx)] tabular-nums">
                    {formatUnits18(amount0, 6)}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-[var(--sf2)] border border-[var(--brd)] rounded-lg px-3 py-2.5">
                  <span className="text-[var(--tx-d)]">{info.symbol1}</span>
                  <span className="font-mono text-[var(--tx)] tabular-nums">
                    {formatUnits18(amount1, 6)}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--tx-d)] px-1 pt-1">
                  Burning {formatUnits18(liquidity, 6)} LP · slippage 0.5%
                </p>
              </div>
            )}

            {/* Approve + Remove */}
            <div className="space-y-2">
              {needsApprove ? (
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  className="w-full py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-sm text-emerald-400 hover:bg-emerald-500/25 transition-colors disabled:opacity-60"
                >
                  {approving ? 'Approving LP…' : 'Approve LP'}
                </button>
              ) : (
                <button
                  onClick={handleRemove}
                  disabled={removing || removeMining || liquidity === 0n}
                  className="w-full py-3 rounded-xl bg-red-500/90 hover:bg-red-500 text-white font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
                >
                  <Minus className="w-3.5 h-3.5" />
                  {removing || removeMining ? 'Removing…' : 'Remove'}
                </button>
              )}
              {removeError && (
                <p className="text-[11px] text-red-400 break-all">
                  {removeError.message}
                </p>
              )}
            </div>
          </>
        )}
      </div>
      </div>
    </main>
  )
}
