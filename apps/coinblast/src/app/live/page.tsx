'use client'

// Live trade feed — hybrid push + poll.
//
// Push: eth_subscribe(logs) on the union of every known curve address,
// filtered by the Buy/Sell topic0 hashes. Each matching log increments a
// `tick` counter that the indexer fetcher uses as a refetch trigger,
// dropping perceived latency from the polling cadence (3 s) down to the
// chain RPC's WS push window (~50–200 ms). The indexer pull stays the
// source of truth — it's already correctly enriched with token metadata,
// price, fee — so we coalesce the WS signal with a re-fetch instead of
// decoding the log client-side.
//
// Poll: kept at 3 s as a backstop for the WS reconnect window and the
// initial mount before the subscription is registered. If the chain RPC
// is unreachable for a while the page degrades to plain polling
// gracefully.
//
// Empty state is real today (zero trades on chain) — the page should
// look healthy, not broken, in that case. We show a "waiting for the
// next trade" hint with the polling cadence so the operator's not left
// guessing why nothing's moving.

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useBlockNumber } from 'wagmi'
import { useTrades, type IndexerTrade } from '@/lib/useCoinblastIndexer'
import { useTokens } from '@/lib/useCoinblastIndexer'
import { useEthSubscribeLogs, TOPIC } from '@/lib/ws'
import { formatAddress } from '@/lib/utils'
import { TokenAvatar } from '@/components/ui/TokenAvatar'
import { ArrowDown, ArrowUp, GraduationCap, Radio } from 'lucide-react'
import { formatEther } from 'viem'

const POLL_MS = 3000

// Approximate Sentrix block time. The indexer stores `block_number`
// rather than wall-clock so we estimate "X secs ago" relative to the
// current head — close enough for a live feed.
const SENTRIX_BLOCK_TIME_SEC = 1

function relativeFromBlock(blockNum: bigint, headBlock: bigint): string {
  if (headBlock === 0n) return ''
  const diffBlocks = headBlock - blockNum
  if (diffBlocks < 0n) return 'just now'
  const diffSec = Number(diffBlocks) * SENTRIX_BLOCK_TIME_SEC
  if (diffSec < 5) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  return `${Math.floor(diffSec / 86400)}d ago`
}

interface RowProps {
  trade: IndexerTrade
  symbol: string | undefined
  imageUrl: string | undefined
  tokenAddress: string | undefined
  headBlock: bigint
  isFresh: boolean
}

function TradeRow({ trade, symbol, imageUrl, tokenAddress, headBlock, isFresh }: RowProps) {
  const isBuy = trade.type === 'buy'
  const isGrad = trade.type === 'graduated'
  const srx = Number(formatEther(BigInt(trade.srx_amount))).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  })
  const tokens = Number(formatEther(BigInt(trade.token_amount))).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })

  const accent = isGrad
    ? 'border-l-amber-400'
    : isBuy
      ? 'border-l-emerald-500'
      : 'border-l-red-500'
  const badgeBg = isGrad
    ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
    : isBuy
      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
      : 'bg-red-500/15 text-red-400 border-red-500/40'

  return (
    <Link
      href={tokenAddress ? `/token/${tokenAddress}` : `#`}
      className={`flex items-center gap-3 px-4 py-3 border-b border-[var(--brd)] last:border-0 border-l-2 ${accent} hover:bg-[var(--sf2)] transition-colors ${isFresh ? 'animate-fade-up' : ''}`}
    >
      <div className="w-8 h-8 shrink-0 rounded-md overflow-hidden bg-[var(--sf2)]">
        <TokenAvatar
          address={trade.curve_address}
          symbol={symbol ?? '??'}
          imageUrl={imageUrl}
          fluid
          className="!rounded-none"
        />
      </div>
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-sm font-bold text-[var(--tx)] truncate">
          {symbol ?? formatAddress(trade.curve_address)}
        </span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${badgeBg}`}>
          {isGrad ? (
            <>
              <GraduationCap className="w-3 h-3" /> Grad
            </>
          ) : isBuy ? (
            <>
              <ArrowUp className="w-3 h-3" /> Buy
            </>
          ) : (
            <>
              <ArrowDown className="w-3 h-3" /> Sell
            </>
          )}
        </span>
      </div>
      <div className="text-right hidden sm:block min-w-0">
        <p className="text-sm font-semibold text-[var(--tx)] tabular-nums">
          {srx} <span className="text-[var(--tx-d)] text-xs">SRX</span>
        </p>
        <p className="text-[11px] text-[var(--tx-d)] tabular-nums">
          {tokens} {symbol ?? ''}
        </p>
      </div>
      <div className="text-right shrink-0 min-w-[100px]">
        <p className="font-mono text-[11px] text-[var(--tx-m)]">
          {formatAddress(trade.trader_address, 4)}
        </p>
        <p className="text-[10px] text-[var(--tx-d)]">
          {relativeFromBlock(BigInt(trade.block_number), headBlock)}
        </p>
      </div>
    </Link>
  )
}

export default function LivePage() {
  const { tokens } = useTokens()

  // Build the WS-subscribe filter from every known curve address. We pass
  // ALL curves up front rather than a per-token re-subscribe pattern —
  // the chain RPC handles the multi-address filter server-side, and the
  // page only re-runs the effect when the curve set actually changes
  // (token list pulls happen at most once per mount).
  const curveAddresses = useMemo(
    () =>
      tokens
        .map((t) => t.curve_address as `0x${string}`)
        .filter((a): a is `0x${string}` => typeof a === 'string' && a.startsWith('0x')),
    [tokens],
  )
  const subOpts = useMemo(
    () =>
      curveAddresses.length > 0
        ? {
            address: curveAddresses,
            // Match topic0 ∈ {Buy, Sell}. Graduations are rarer; the
            // 3-second poll picks them up without a separate sub.
            topics: [[TOPIC.buy, TOPIC.sell]],
          }
        : null,
    [curveAddresses],
  )
  const { tick: wsTick } = useEthSubscribeLogs(subOpts)

  const { trades, isLoading, error } = useTrades({
    pollMs: POLL_MS,
    limit: 50,
    refetchTick: wsTick,
  })

  // Chain tip for relative-time math. Without this, the row's "X secs
  // ago" was computed against the highest *trade* block, which made
  // the freshest trade always read "just now" even hours after it
  // landed. wagmi auto-refreshes on each new head, so this stays
  // current with no manual polling.
  const { data: tipBlock } = useBlockNumber({ watch: true, chainId: 7119 })

  // Index tokens by curve address for the row lookup. Recomputes on
  // every tokens change; dataset is tiny (one row per curve) so the
  // memo is honestly defensive more than necessary.
  const byCurve = useMemo(() => {
    const m = new Map<string, { symbol: string; tokenAddress: string }>()
    for (const t of tokens) {
      m.set(t.curve_address.toLowerCase(), {
        symbol: t.symbol,
        tokenAddress: t.token_address,
      })
    }
    return m
  }, [tokens])

  // Track new-row arrivals so we can briefly highlight them. The head
  // block itself comes from useBlockNumber above — we don't need a
  // separate state for it.
  const prevTradeIdsRef = useRef<Set<string>>(new Set())
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set())
  const headBlock = tipBlock ?? 0n

  useEffect(() => {
    if (trades.length === 0) return
    const prev = prevTradeIdsRef.current
    const fresh = new Set<string>()
    for (const t of trades) {
      if (!prev.has(t.id)) fresh.add(t.id)
    }
    if (fresh.size > 0) {
      setFreshIds(fresh)
      // Auto-clear the freshness flag after the highlight has played
      // so newer poll cycles don't double-highlight the same row.
      const clear = setTimeout(() => setFreshIds(new Set()), 1500)
      prevTradeIdsRef.current = new Set(trades.map((t) => t.id))
      return () => clearTimeout(clear)
    }
    prevTradeIdsRef.current = new Set(trades.map((t) => t.id))
  }, [trades])

  return (
    <div className="max-w-4xl mx-auto px-4 pt-[96px] pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-[var(--tx)] flex items-center gap-2">
          Live Trades
        </h1>
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-[var(--tx-d)]">
          <Radio className="w-3 h-3" /> polling every {POLL_MS / 1000}s
        </span>
      </div>

      <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl overflow-hidden">
        {error ? (
          <div className="px-4 py-12 text-center text-sm text-red-400">
            Indexer unreachable — {error.message}
          </div>
        ) : isLoading && trades.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-[var(--tx-d)]">
            Loading…
          </div>
        ) : trades.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-3xl mb-2">🔇</p>
            <p className="text-[var(--tx)] font-semibold mb-1">No trades yet</p>
            <p className="text-xs text-[var(--tx-d)]">
              Waiting for the next on-chain Buy / Sell — feed updates every {POLL_MS / 1000}s.
            </p>
          </div>
        ) : (
          trades.map((trade) => {
            const meta = byCurve.get(trade.curve_address.toLowerCase())
            return (
              <TradeRow
                key={trade.id}
                trade={trade}
                symbol={meta?.symbol}
                imageUrl={undefined}
                tokenAddress={meta?.tokenAddress ?? trade.curve_address}
                headBlock={headBlock}
                isFresh={freshIds.has(trade.id)}
              />
            )
          })
        )}
      </div>
    </div>
  )
}
