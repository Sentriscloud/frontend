'use client'

// Tiny price sparkline for token cards in /explore + homepage. Same data
// source as the full PriceHistoryChart but rendered as a 100×30 inline
// SVG with no axes, no tooltips, and no animations — purely a "is this
// token alive" eye-cue. Hidden when the curve has fewer than two trades
// (one point isn't a chart) or no curveAddress at all.

import { useMemo } from 'react'
import { useTradesByCurve } from '@/lib/useCoinblastIndexer'
import { formatEther } from 'viem'

interface Props {
  curveAddress: string | undefined
  width?: number
  height?: number
}

export function CardSparkline({ curveAddress, width = 100, height = 30 }: Props) {
  // 30 trades is plenty for a card-sized sparkline; bigger pulls cost
  // bandwidth on a grid render with 50+ cards.
  const { trades, isLoading, error } = useTradesByCurve(curveAddress, 30)

  const path = useMemo<{ d: string; rising: boolean } | null>(() => {
    if (!trades || trades.length < 2) return null
    const points = trades
      .filter((t) => t.type !== 'graduated' && t.token_amount !== '0')
      .map((t) => {
        const srx = Number(formatEther(BigInt(t.srx_amount)))
        const tok = Number(formatEther(BigInt(t.token_amount)))
        return tok > 0 ? srx / tok : 0
      })
      .filter((p) => Number.isFinite(p) && p > 0)
    if (points.length < 2) return null
    const min = Math.min(...points)
    const max = Math.max(...points)
    const range = max - min || max || 1
    // Map points into 0..width with a 1px top/bottom margin so the
    // stroke isn't clipped at the edges.
    const m = 1
    const innerH = height - m * 2
    const stepX = points.length > 1 ? width / (points.length - 1) : 0
    const d = points
      .map((p, i) => {
        const x = i * stepX
        const y = m + innerH * (1 - (p - min) / range)
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
      })
      .join(' ')
    return { d, rising: points[points.length - 1] >= points[0] }
  }, [trades, width, height])

  if (!curveAddress || isLoading || error || !path) {
    // Reserve the same footprint either way so card height doesn't
    // wobble between "no chart" and "chart loaded".
    return <div style={{ width, height }} aria-hidden />
  }

  const stroke = path.rising ? '#10B981' : '#ef4444'

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-label="Recent price trend"
      role="img"
    >
      <path
        d={path.d}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
