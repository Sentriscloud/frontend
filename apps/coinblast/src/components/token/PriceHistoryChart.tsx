'use client'

// Price-over-time chart for a single curve. Uses cb_trades from the
// indexer to plot srx-per-token (= srxAmount / tokenAmount) over the
// trade timeline. Distinct from the existing BondingCurveChart, which
// renders the *theoretical* curve (a function of supply, not history).
//
// Empty state stays inside the card so the layout doesn't shift when
// trades arrive — the card is always the same height whether there
// are 0 or 1000 points.

import { useMemo } from 'react'
import { useTradesByCurve } from '@/lib/useCoinblastIndexer'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatEther } from 'viem'

interface Props {
  curveAddress: string | undefined
}

interface Point {
  t: number          // sequential trade index for the X axis
  block: number      // block number for tooltip
  price: number      // SRX per token, expressed in whole-SRX units
  type: 'buy' | 'sell' | 'graduated'
}

export function PriceHistoryChart({ curveAddress }: Props) {
  const { trades, isLoading, error } = useTradesByCurve(curveAddress, 200)

  const points = useMemo<Point[]>(() => {
    return trades
      .filter((t) => t.type !== 'graduated' && t.token_amount !== '0')
      .map((t, i) => {
        // SRX per token at trade time: (srx 1e18 wei) / (tokens 1e18 wei)
        // → unitless ratio of SRX:TOKEN, both 18-decimal so the scaling
        // cancels. Use BigInt division then small-decimals shift to
        // keep precision below 1.
        const srx = Number(formatEther(BigInt(t.srx_amount)))
        const tok = Number(formatEther(BigInt(t.token_amount)))
        return {
          t: i,
          block: Number(t.block_number),
          price: tok > 0 ? srx / tok : 0,
          type: t.type,
        }
      })
  }, [trades])

  if (!curveAddress) {
    return (
      <div className="h-[260px] flex items-center justify-center text-xs text-[var(--tx-d)]">
        No curve attached.
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-[260px] flex items-center justify-center text-xs text-red-400">
        Indexer error: {error.message}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="h-[260px] flex items-center justify-center text-xs text-[var(--tx-d)]">
        Loading trades…
      </div>
    )
  }

  if (points.length === 0) {
    return (
      <div className="h-[260px] flex flex-col items-center justify-center text-center text-xs text-[var(--tx-d)] gap-1">
        <p className="text-3xl">📈</p>
        <p className="font-semibold text-[var(--tx-m)]">No price history yet</p>
        <p>The chart fills in as the curve is traded.</p>
      </div>
    )
  }

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="t"
            tick={{ fill: 'var(--tx-d)', fontSize: 10 }}
            axisLine={{ stroke: 'var(--brd)' }}
            tickLine={{ stroke: 'var(--brd)' }}
            label={{ value: 'trade #', position: 'insideBottomRight', offset: -2, fill: 'var(--tx-d)', fontSize: 10 }}
          />
          <YAxis
            tick={{ fill: 'var(--tx-d)', fontSize: 10 }}
            axisLine={{ stroke: 'var(--brd)' }}
            tickLine={{ stroke: 'var(--brd)' }}
            tickFormatter={(v: number) => v.toExponential(1)}
            width={60}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--sf)',
              border: '1px solid var(--brd2)',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: 'var(--tx-d)' }}
            itemStyle={{ color: 'var(--tx)' }}
            formatter={(value) => {
              // Recharts widens value to ValueType (number | string |
              // (number|string)[]). Narrow it back; non-numeric values
              // never reach this chart since `dataKey` is the numeric
              // `price` field.
              const n = typeof value === 'number' ? value : Number(value)
              return [Number.isFinite(n) ? n.toExponential(3) + ' SRX' : '—', 'Price']
            }}
            labelFormatter={(_label, payload) => {
              const p = payload?.[0]?.payload as Point | undefined
              return p ? `Trade #${p.t} · block ${p.block}` : ''
            }}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke="#10B981"
            strokeWidth={2}
            fill="url(#priceFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
