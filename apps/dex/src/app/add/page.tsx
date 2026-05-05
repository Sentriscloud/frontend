'use client'

// Add-liquidity widget. Two-token form, auto-balancing the second
// amount once the first is entered + reserves are known. Uses
// router.addLiquiditySRX when one side is native SRX, router.addLiquidity
// when both sides are ERC-20s. Approval flow for ERC-20s if allowance
// is below the desired-in amount.
//
// Pre-fills tokens from `?pair=0x…` if present (linked from /pools);
// otherwise defaults to SRX/SGC since that's the current canonical
// pair. Selecting two tokens with no existing pair triggers
// router.addLiquidity which internally calls factory.createPair on
// first deposit — same UniswapV2 pattern.

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
  usePublicClient,
} from 'wagmi'
import { parseEther, formatEther, type Address } from 'viem'
import { ArrowLeft, Check, Plus } from 'lucide-react'
import { DEX, ROUTER_ABI, FACTORY_ABI, ERC20_ABI, TOKENS, type Token } from '@/lib/contracts'
import { usePair, formatPriceRatio } from '@/lib/usePools'
import { Nav } from '@/components/Nav'

export const dynamic = 'force-dynamic'

const NETWORK: 'mainnet' | 'testnet' =
  (process.env.NEXT_PUBLIC_DEX_NETWORK as 'mainnet' | 'testnet' | undefined) ??
  'mainnet'

// 20-minute deadline for the addLiquidity tx — long enough that wallet
// confirmation lag doesn't stale the deadline, short enough that a
// long-stuck tx won't dust at a wildly different price.
const DEADLINE_SECS = 20 * 60
// 0.5% slippage tolerance — UniswapV2 default; users on volatile pools
// can re-enter with a fresh quote rather than dialing this.
const SLIPPAGE_BPS = 50n

function withSlippage(amount: bigint): bigint {
  return (amount * (10000n - SLIPPAGE_BPS)) / 10000n
}

function deadlineNow(): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + DEADLINE_SECS)
}

function AddLiquidityInner() {
  const search = useSearchParams()
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const client = usePublicClient({ chainId: NETWORK === 'mainnet' ? 7119 : 7120 })
  const tokens = TOKENS[NETWORK]
  const dex = DEX[NETWORK]

  const [tokenA, setTokenA] = useState<Token>(tokens[0])
  const [tokenB, setTokenB] = useState<Token>(tokens[1])
  const [amountA, setAmountA] = useState('')
  const [amountB, setAmountB] = useState('')
  // Track which input the user is editing — when reserves are known we
  // auto-balance the OTHER side, but only if the user didn't just type
  // there (otherwise the cursor jumps every keystroke).
  const [lastEdited, setLastEdited] = useState<'A' | 'B'>('A')

  // Resolve the pair address (for existing pairs) so we can read
  // reserves + auto-balance the form. Native SRX is mapped to WSRX
  // for the factory lookup.
  const tokenAResolved: Address = tokenA.address === 'native' ? dex.wsrx : tokenA.address
  const tokenBResolved: Address = tokenB.address === 'native' ? dex.wsrx : tokenB.address
  const { data: pairAddr } = useReadContract({
    address: dex.factory,
    abi: FACTORY_ABI,
    functionName: 'getPair',
    args: [tokenAResolved, tokenBResolved],
  })
  const validPair =
    pairAddr && pairAddr !== '0x0000000000000000000000000000000000000000'
      ? (pairAddr as Address)
      : undefined
  const { info: pairInfo } = usePair(validPair)

  // Auto-balance: when amountA changes + reserves are known, set amountB
  // = reserve1 × amountA / reserve0 (or reverse depending on sort order
  // of token0/1 in the pair).
  useEffect(() => {
    if (!pairInfo || lastEdited !== 'A' || !amountA) return
    try {
      const a = parseEther(amountA)
      // Match the form's tokenA to whichever side of the pair it is.
      const aIs0 = pairInfo.token0.toLowerCase() === tokenAResolved.toLowerCase()
      const reserveA = aIs0 ? pairInfo.reserve0 : pairInfo.reserve1
      const reserveB = aIs0 ? pairInfo.reserve1 : pairInfo.reserve0
      if (reserveA === 0n) return
      const b = (a * reserveB) / reserveA
      setAmountB(formatEther(b))
    } catch {
      // ignore parse errors — user is mid-typing
    }
  }, [amountA, pairInfo, lastEdited, tokenAResolved])

  useEffect(() => {
    if (!pairInfo || lastEdited !== 'B' || !amountB) return
    try {
      const b = parseEther(amountB)
      const aIs0 = pairInfo.token0.toLowerCase() === tokenAResolved.toLowerCase()
      const reserveA = aIs0 ? pairInfo.reserve0 : pairInfo.reserve1
      const reserveB = aIs0 ? pairInfo.reserve1 : pairInfo.reserve0
      if (reserveB === 0n) return
      const a = (b * reserveA) / reserveB
      setAmountA(formatEther(a))
    } catch {
      // ignore
    }
  }, [amountB, pairInfo, lastEdited, tokenAResolved])

  // Pre-fill tokens from ?pair= query param. Looks up the pair, picks
  // tokens in the form's order, falls through to defaults on miss.
  useEffect(() => {
    const qp = search.get('pair') as Address | null
    if (!qp || !client) return
    let cancelled = false
    ;(async () => {
      try {
        const t0 = (await client.readContract({
          address: qp,
          abi: [
            { type: 'function', stateMutability: 'view', name: 'token0', inputs: [], outputs: [{ type: 'address' }] },
          ] as const,
          functionName: 'token0',
        })) as Address
        const t1 = (await client.readContract({
          address: qp,
          abi: [
            { type: 'function', stateMutability: 'view', name: 'token1', inputs: [], outputs: [{ type: 'address' }] },
          ] as const,
          functionName: 'token1',
        })) as Address
        if (cancelled) return
        const findToken = (addr: Address): Token | null => {
          if (addr.toLowerCase() === dex.wsrx.toLowerCase()) {
            return tokens.find((t) => t.address === 'native') ?? null
          }
          return (
            tokens.find(
              (t) => t.address !== 'native' && t.address.toLowerCase() === addr.toLowerCase(),
            ) ?? null
          )
        }
        const tA = findToken(t0)
        const tB = findToken(t1)
        if (tA && tB) {
          setTokenA(tA)
          setTokenB(tB)
        }
      } catch {
        // bad pair address; leave defaults
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, client])

  // Allowance reads — only relevant for ERC-20 sides. native SRX has
  // no allowance concept; the router pulls value from msg.value.
  const { data: allowanceA } = useReadContract({
    address: tokenA.address === 'native' ? undefined : tokenA.address,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, dex.router] : undefined,
    query: { enabled: tokenA.address !== 'native' && !!address },
  })
  const { data: allowanceB } = useReadContract({
    address: tokenB.address === 'native' ? undefined : tokenB.address,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, dex.router] : undefined,
    query: { enabled: tokenB.address !== 'native' && !!address },
  })

  const wantA = (() => {
    try {
      return parseEther(amountA || '0')
    } catch {
      return 0n
    }
  })()
  const wantB = (() => {
    try {
      return parseEther(amountB || '0')
    } catch {
      return 0n
    }
  })()
  const needsApproveA =
    tokenA.address !== 'native' && (allowanceA as bigint | undefined ?? 0n) < wantA && wantA > 0n
  const needsApproveB =
    tokenB.address !== 'native' && (allowanceB as bigint | undefined ?? 0n) < wantB && wantB > 0n

  // Transaction state. We separate approve + addLiquidity hooks so each
  // can show its own pending/success state in the UI.
  const { writeContract: approve, data: approveTx, isPending: approving } = useWriteContract()
  const { isSuccess: approveDone } = useWaitForTransactionReceipt({ hash: approveTx })
  const { writeContract: addLiq, data: addTx, isPending: adding, error: addError } = useWriteContract()
  const { isSuccess: addDone, isLoading: addMining } = useWaitForTransactionReceipt({ hash: addTx })

  const samePair = tokenA.address === tokenB.address
  const canSubmit =
    isConnected &&
    !samePair &&
    wantA > 0n &&
    wantB > 0n &&
    !needsApproveA &&
    !needsApproveB &&
    !adding &&
    !addMining

  function handleApproveA() {
    if (tokenA.address === 'native') return
    approve({
      address: tokenA.address,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [dex.router, 2n ** 256n - 1n],
    })
  }
  function handleApproveB() {
    if (tokenB.address === 'native') return
    approve({
      address: tokenB.address,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [dex.router, 2n ** 256n - 1n],
    })
  }

  function handleAdd() {
    if (!address) return
    const dl = deadlineNow()
    const minA = withSlippage(wantA)
    const minB = withSlippage(wantB)

    // Native side picks addLiquiditySRX; native value goes in tx.value.
    if (tokenA.address === 'native') {
      addLiq({
        address: dex.router,
        abi: ROUTER_ABI,
        functionName: 'addLiquiditySRX',
        args: [tokenB.address as Address, wantB, minB, minA, address, dl],
        value: wantA,
      })
      return
    }
    if (tokenB.address === 'native') {
      addLiq({
        address: dex.router,
        abi: ROUTER_ABI,
        functionName: 'addLiquiditySRX',
        args: [tokenA.address as Address, wantA, minA, minB, address, dl],
        value: wantB,
      })
      return
    }
    // Both ERC-20.
    addLiq({
      address: dex.router,
      abi: ROUTER_ABI,
      functionName: 'addLiquidity',
      args: [
        tokenA.address as Address,
        tokenB.address as Address,
        wantA,
        wantB,
        minA,
        minB,
        address,
        dl,
      ],
    })
  }

  // After a successful add, reset the form + bounce to the pool detail
  // page so the user can see their new position immediately.
  useEffect(() => {
    if (addDone && validPair) {
      setAmountA('')
      setAmountB('')
      router.push(`/pools/${validPair}`)
    } else if (addDone && !validPair) {
      // New pair — go to /pools so they see the freshly-listed row.
      router.push('/pools')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addDone])

  // Build the token-pick options once. Could memoise but it's tiny.
  const otherTokens = (active: Token) => tokens.filter((t) => t.symbol !== active.symbol)

  return (
    <main className="flex flex-col">
      <Nav />
      <div className="max-w-md mx-auto px-4 py-10 w-full">
      <Link
        href="/pools"
        className="text-sm text-[var(--tx-d)] hover:text-[var(--tx)] inline-flex items-center gap-1 mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Pools
      </Link>

      <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-[var(--tx)]">Add liquidity</h1>
          {!validPair && wantA > 0n && wantB > 0n && (
            <span className="text-[10px] text-emerald-400 uppercase tracking-wider">
              new pair
            </span>
          )}
        </div>

        {/* Token A */}
        <div className="bg-[var(--sf2)] border border-[var(--brd)] rounded-xl p-3 mb-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-wider text-[var(--tx-d)]">From</span>
            <select
              value={tokenA.symbol}
              onChange={(e) => {
                const t = tokens.find((t) => t.symbol === e.target.value)
                if (t) setTokenA(t)
              }}
              className="bg-[var(--sf)] border border-[var(--brd)] rounded-md px-2 py-0.5 text-xs text-[var(--tx)] cursor-pointer focus:outline-none focus:border-[var(--brd2)]"
            >
              {otherTokens(tokenB).map((t) => (
                <option key={t.symbol} value={t.symbol}>
                  {t.symbol}
                </option>
              ))}
            </select>
          </div>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.0"
            value={amountA}
            onChange={(e) => {
              setAmountA(e.target.value)
              setLastEdited('A')
            }}
            className="w-full bg-transparent text-2xl font-bold text-[var(--tx)] placeholder:text-[var(--tx-d)] focus:outline-none tabular-nums"
          />
        </div>

        {/* Plus icon between the two inputs — same pattern as the swap
            widget but using a + instead of an arrow. */}
        <div className="flex justify-center -my-1 relative z-10">
          <span className="w-8 h-8 rounded-lg bg-[var(--sf)] border border-[var(--brd)] flex items-center justify-center">
            <Plus className="w-4 h-4 text-[var(--tx-d)]" />
          </span>
        </div>

        {/* Token B */}
        <div className="bg-[var(--sf2)] border border-[var(--brd)] rounded-xl p-3 mt-2 mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-wider text-[var(--tx-d)]">And</span>
            <select
              value={tokenB.symbol}
              onChange={(e) => {
                const t = tokens.find((t) => t.symbol === e.target.value)
                if (t) setTokenB(t)
              }}
              className="bg-[var(--sf)] border border-[var(--brd)] rounded-md px-2 py-0.5 text-xs text-[var(--tx)] cursor-pointer focus:outline-none focus:border-[var(--brd2)]"
            >
              {otherTokens(tokenA).map((t) => (
                <option key={t.symbol} value={t.symbol}>
                  {t.symbol}
                </option>
              ))}
            </select>
          </div>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.0"
            value={amountB}
            onChange={(e) => {
              setAmountB(e.target.value)
              setLastEdited('B')
            }}
            className="w-full bg-transparent text-2xl font-bold text-[var(--tx)] placeholder:text-[var(--tx-d)] focus:outline-none tabular-nums"
          />
        </div>

        {/* Pool ratio hint when an existing pair is selected. The
            previous form computed ratio × (1/ratio² when inverted) which
            was correct but unreadable; this version picks the right
            direction directly off the reserves. */}
        {pairInfo && pairInfo.reserve0 > 0n && pairInfo.reserve1 > 0n && (() => {
          const aIs0 = pairInfo.token0.toLowerCase() === tokenAResolved.toLowerCase()
          const rate = aIs0
            ? Number(pairInfo.reserve1) / Number(pairInfo.reserve0)
            : Number(pairInfo.reserve0) / Number(pairInfo.reserve1)
          return (
            <div className="text-[11px] text-[var(--tx-d)] mb-3 px-1">
              Pool rate: 1 {tokenA.symbol} = {formatPriceRatio(rate)} {tokenB.symbol} ·{' '}
              <span className="text-emerald-400">slippage 0.5%</span>
            </div>
          )
        })()}

        {/* Action stack — approve A, approve B, add. Approve buttons
            collapse once their allowance is sufficient. */}
        {!isConnected ? (
          <button
            disabled
            className="w-full py-3 rounded-xl bg-[var(--sf2)] border border-[var(--brd)] text-sm text-[var(--tx-d)]"
          >
            Connect wallet
          </button>
        ) : samePair ? (
          <button
            disabled
            className="w-full py-3 rounded-xl bg-[var(--sf2)] border border-[var(--brd)] text-sm text-[var(--tx-d)]"
          >
            Pick two different tokens
          </button>
        ) : (
          <div className="space-y-2">
            {needsApproveA && (
              <button
                onClick={handleApproveA}
                disabled={approving}
                className="w-full py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-sm text-emerald-400 hover:bg-emerald-500/25 transition-colors disabled:opacity-60"
              >
                {approveDone ? <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> {tokenA.symbol} approved</span> : approving ? `Approving ${tokenA.symbol}…` : `Approve ${tokenA.symbol}`}
              </button>
            )}
            {needsApproveB && (
              <button
                onClick={handleApproveB}
                disabled={approving}
                className="w-full py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-sm text-emerald-400 hover:bg-emerald-500/25 transition-colors disabled:opacity-60"
              >
                {approving ? `Approving ${tokenB.symbol}…` : `Approve ${tokenB.symbol}`}
              </button>
            )}
            <button
              onClick={handleAdd}
              disabled={!canSubmit}
              className="w-full py-3 rounded-xl bg-[var(--gold)] hover:bg-[var(--gold-l)] text-[var(--bk)] font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adding || addMining ? 'Adding liquidity…' : 'Add liquidity'}
            </button>
            {addError && (
              <p className="text-[11px] text-red-400 break-all">
                {addError.message}
              </p>
            )}
          </div>
        )}
      </div>
      </div>
    </main>
  )
}

export default function AddLiquidityPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-col">
          <Nav />
          <div className="max-w-md mx-auto px-4 py-10 w-full">
            <p className="text-sm text-[var(--tx-d)]">Loading…</p>
          </div>
        </main>
      }
    >
      <AddLiquidityInner />
    </Suspense>
  )
}
