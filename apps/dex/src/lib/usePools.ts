'use client'

// Pool / pair hooks for the SentrixV2 DEX. Mirrors UniswapV2 surfaces:
//   - usePoolList: scans factory.allPairs(0..N-1) once + reads token0/1 +
//     reserves + symbols for each pair. Returns a stable typed array.
//   - usePair: single-pair detail (reserves, token addresses, totalSupply).
//   - useLPPositions: same pool list but filtered to pairs where the
//     connected user has a non-zero LP balance, with their share + their
//     underlying token amounts pre-computed.
//
// Token symbol resolution prefers the static TOKENS list (so SRX renders
// as SRX even though the on-chain pair holds WSRX); unknown ERC-20s fall
// back to a live `symbol()` read.

import { useEffect, useMemo, useState } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import type { Address } from 'viem'
import { DEX, FACTORY_ABI, PAIR_ABI, ERC20_ABI, TOKENS } from './contracts'

export interface PoolInfo {
  pair: Address
  token0: Address
  token1: Address
  symbol0: string
  symbol1: string
  reserve0: bigint
  reserve1: bigint
  totalSupply: bigint
}

export interface LPPosition extends PoolInfo {
  lpBalance: bigint
  /** User's share of the pool, 0..1 (scaled). */
  share: number
  /** Underlying token amounts at the user's share. */
  amount0: bigint
  amount1: bigint
}

const NETWORK: 'mainnet' | 'testnet' =
  (process.env.NEXT_PUBLIC_DEX_NETWORK as 'mainnet' | 'testnet' | undefined) ??
  'mainnet'

function resolveSymbolStatic(addr: Address): string | null {
  const list = TOKENS[NETWORK]
  for (const t of list) {
    if (t.address === 'native') continue
    if (t.address.toLowerCase() === addr.toLowerCase()) return t.symbol
  }
  // WSRX special-case — display as SRX in the UI since the user thinks
  // in native terms even though the pair contract holds the wrapped form.
  if (addr.toLowerCase() === DEX[NETWORK].wsrx.toLowerCase()) return 'SRX'
  return null
}

export function usePoolList() {
  const client = usePublicClient({ chainId: NETWORK === 'mainnet' ? 7119 : 7120 })
  const [pools, setPools] = useState<PoolInfo[]>([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!client) return
    let cancelled = false

    async function load() {
      try {
        if (!client) return
        const factory = DEX[NETWORK].factory
        const len = (await client.readContract({
          address: factory,
          abi: FACTORY_ABI,
          functionName: 'allPairsLength',
        })) as bigint

        if (Number(len) === 0) {
          if (!cancelled) {
            setPools([])
            setLoading(false)
          }
          return
        }

        // Pair addresses — sequential reads. Could be batched via multicall
        // once the chain ships one at a stable address; until then this
        // stays a small N (1-handful of pairs) so the read cost is fine.
        const pairs: Address[] = []
        for (let i = 0n; i < len; i++) {
          const p = (await client.readContract({
            address: factory,
            abi: FACTORY_ABI,
            functionName: 'allPairs',
            args: [i],
          })) as Address
          pairs.push(p)
        }

        // Per-pair: token0, token1, reserves, totalSupply.
        const built: PoolInfo[] = []
        for (const pair of pairs) {
          const [t0, t1, reserves, totalSupply] = await Promise.all([
            client.readContract({ address: pair, abi: PAIR_ABI, functionName: 'token0' }) as Promise<Address>,
            client.readContract({ address: pair, abi: PAIR_ABI, functionName: 'token1' }) as Promise<Address>,
            client.readContract({ address: pair, abi: PAIR_ABI, functionName: 'getReserves' }) as Promise<readonly [bigint, bigint, number]>,
            client.readContract({ address: pair, abi: PAIR_ABI, functionName: 'totalSupply' }) as Promise<bigint>,
          ])

          // Static-list symbol first; fall back to on-chain reads only
          // for unknown tokens.
          let s0 = resolveSymbolStatic(t0)
          let s1 = resolveSymbolStatic(t1)
          if (!s0) {
            try {
              s0 = (await client.readContract({
                address: t0,
                abi: ERC20_ABI,
                functionName: 'symbol',
              })) as string
            } catch {
              s0 = '???'
            }
          }
          if (!s1) {
            try {
              s1 = (await client.readContract({
                address: t1,
                abi: ERC20_ABI,
                functionName: 'symbol',
              })) as string
            } catch {
              s1 = '???'
            }
          }

          built.push({
            pair,
            token0: t0,
            token1: t1,
            symbol0: s0,
            symbol1: s1,
            reserve0: reserves[0],
            reserve1: reserves[1],
            totalSupply,
          })
        }

        if (!cancelled) {
          setPools(built)
          setLoading(false)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e as Error)
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [client])

  return { pools, isLoading, error }
}

export function usePair(pair: Address | undefined) {
  const client = usePublicClient({ chainId: NETWORK === 'mainnet' ? 7119 : 7120 })
  const [info, setInfo] = useState<PoolInfo | null>(null)
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!client || !pair) {
      setLoading(false)
      return
    }
    let cancelled = false

    async function load() {
      try {
        if (!client || !pair) return
        const [t0, t1, reserves, totalSupply] = await Promise.all([
          client.readContract({ address: pair, abi: PAIR_ABI, functionName: 'token0' }) as Promise<Address>,
          client.readContract({ address: pair, abi: PAIR_ABI, functionName: 'token1' }) as Promise<Address>,
          client.readContract({ address: pair, abi: PAIR_ABI, functionName: 'getReserves' }) as Promise<readonly [bigint, bigint, number]>,
          client.readContract({ address: pair, abi: PAIR_ABI, functionName: 'totalSupply' }) as Promise<bigint>,
        ])

        let s0 = resolveSymbolStatic(t0)
        let s1 = resolveSymbolStatic(t1)
        if (!s0) {
          try {
            s0 = (await client.readContract({ address: t0, abi: ERC20_ABI, functionName: 'symbol' })) as string
          } catch {
            s0 = '???'
          }
        }
        if (!s1) {
          try {
            s1 = (await client.readContract({ address: t1, abi: ERC20_ABI, functionName: 'symbol' })) as string
          } catch {
            s1 = '???'
          }
        }

        if (!cancelled) {
          setInfo({
            pair,
            token0: t0,
            token1: t1,
            symbol0: s0,
            symbol1: s1,
            reserve0: reserves[0],
            reserve1: reserves[1],
            totalSupply,
          })
          setLoading(false)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e as Error)
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [client, pair])

  return { info, isLoading, error }
}

export function useLPPositions() {
  const { pools, isLoading: poolsLoading } = usePoolList()
  const { address } = useAccount()
  const client = usePublicClient({ chainId: NETWORK === 'mainnet' ? 7119 : 7120 })
  const [positions, setPositions] = useState<LPPosition[]>([])
  const [isLoading, setLoading] = useState(true)

  useEffect(() => {
    if (!client || !address || poolsLoading) {
      if (!address) setPositions([])
      return
    }
    let cancelled = false

    async function load() {
      try {
        if (!client || !address) return
        const found: LPPosition[] = []
        for (const p of pools) {
          const bal = (await client.readContract({
            address: p.pair,
            abi: PAIR_ABI,
            functionName: 'balanceOf',
            args: [address],
          })) as bigint
          if (bal > 0n) {
            const share = p.totalSupply > 0n ? Number(bal) / Number(p.totalSupply) : 0
            // Underlying = reserves × bal / totalSupply. BigInt-safe via
            // multiply-then-divide ordering so we don't lose precision
            // for small shares.
            const amount0 = p.totalSupply > 0n ? (p.reserve0 * bal) / p.totalSupply : 0n
            const amount1 = p.totalSupply > 0n ? (p.reserve1 * bal) / p.totalSupply : 0n
            found.push({ ...p, lpBalance: bal, share, amount0, amount1 })
          }
        }
        if (!cancelled) {
          setPositions(found)
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [client, address, pools, poolsLoading])

  return useMemo(
    () => ({ positions, isLoading: isLoading || poolsLoading }),
    [positions, isLoading, poolsLoading],
  )
}

// Small helpers used by the pool list + add-liquidity widgets.
export function isWSRX(addr: Address): boolean {
  return addr.toLowerCase() === DEX[NETWORK].wsrx.toLowerCase()
}

export function formatUnits18(n: bigint, decimals = 4): string {
  // 18-decimal-fixed token formatter — enough precision for the UI tier.
  // Keep outside any component to avoid re-instantiation.
  const whole = n / 10n ** 18n
  const frac = n % 10n ** 18n
  if (frac === 0n) return whole.toString()
  const fracStr = frac.toString().padStart(18, '0').slice(0, decimals)
  return `${whole}.${fracStr}`
}
