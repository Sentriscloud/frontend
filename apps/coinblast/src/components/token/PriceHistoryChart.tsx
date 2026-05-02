'use client'

// TradingView Lightweight Charts candlestick chart for a single curve.
// Builds OHLC + volume buckets from cb_trades; the indexer returns trades
// in block-ASC order so we can stream them straight in. We don't have
// per-trade timestamps in the indexer schema, so we derive trade times
// from block_number using the chain tip as anchor — Sentrix runs 1s
// blocks, so block delta == seconds delta.
//
// Empty state stays inside the chart frame so the card height is stable
// whether there's 0 trades or 500.

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  createChart,
  createTextWatermark,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts'
import { useBlockNumber } from 'wagmi'
import { formatEther } from 'viem'
import { useTradesByCurve, type IndexerTrade } from '@/lib/useCoinblastIndexer'

type Timeframe = '1m' | '5m' | '15m' | '1h' | '1d'

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1h', '1d']

const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
  '1d': 86400,
}

interface Props {
  curveAddress: string | undefined
}

interface Candle {
  time: UTCTimestamp
  open: number
  high: number
  low: number
  close: number
  volume: number
}

function buildCandles(
  trades: IndexerTrade[],
  tipBlock: bigint,
  bucketSec: number,
): Candle[] {
  // Lowered from `< 2` to `< 1` so a curve with a single buy still
  // renders as a one-bucket doji candle (open=close=that-price). Empty
  // chart on a real trade reads as broken; one tick reads as "just
  // started, here's the entry price".
  if (tipBlock === 0n || trades.length < 1) return []
  const now = Math.floor(Date.now() / 1000)

  // 1s blocks on Sentrix → tradeTime ≈ now - (tipBlock - tradeBlock).
  // The skew vs real wall-clock is bounded by chain drift (sub-second
  // for healthy 4-of-4 mainnet) which is well below the smallest 1m
  // bucket, so it doesn't shuffle candles into wrong buckets.
  const points = trades
    .filter((t) => t.type !== 'graduated' && t.token_amount !== '0')
    .map((t) => {
      const tradeBlock = BigInt(t.block_number)
      const ageSec = Number(tipBlock - tradeBlock)
      const time = Math.max(0, now - ageSec)
      const srx = Number(formatEther(BigInt(t.srx_amount)))
      const tok = Number(formatEther(BigInt(t.token_amount)))
      const price = tok > 0 ? srx / tok : 0
      return { time, srx, price }
    })
    .filter((p) => p.price > 0)
    .sort((a, b) => a.time - b.time)

  if (points.length < 1) return []

  const buckets = new Map<
    number,
    { o: number; h: number; l: number; c: number; v: number }
  >()
  for (const p of points) {
    const bucket = Math.floor(p.time / bucketSec) * bucketSec
    const cur = buckets.get(bucket)
    if (!cur) {
      buckets.set(bucket, { o: p.price, h: p.price, l: p.price, c: p.price, v: p.srx })
    } else {
      cur.h = Math.max(cur.h, p.price)
      cur.l = Math.min(cur.l, p.price)
      cur.c = p.price
      cur.v += p.srx
    }
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([time, c]) => ({
      time: time as UTCTimestamp,
      open: c.o,
      high: c.h,
      low: c.l,
      close: c.c,
      volume: c.v,
    }))
}

export function PriceHistoryChart({ curveAddress }: Props) {
  const { trades, isLoading, error } = useTradesByCurve(curveAddress, 500)
  const { data: tipBlock } = useBlockNumber({ watch: true, chainId: 7119 })
  const [tf, setTf] = useState<Timeframe>('1m')

  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null)

  const candles = useMemo(
    () => buildCandles(trades, tipBlock ?? 0n, TIMEFRAME_SECONDS[tf]),
    [trades, tipBlock, tf],
  )

  // Init the chart once. setData lives in a separate effect so timeframe
  // / data changes don't tear down + recreate the canvas (which would
  // flicker + reset the user's zoom on every poll).
  useEffect(() => {
    if (!containerRef.current) return
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#030712' },
        textColor: '#9CA3AF',
      },
      grid: {
        vertLines: { color: '#1F2937' },
        horzLines: { color: '#1F2937' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#1F2937',
      },
      rightPriceScale: { borderColor: '#1F2937' },
      width: containerRef.current.clientWidth,
      height: 380,
    })
    chartRef.current = chart

    candleRef.current = chart.addSeries(CandlestickSeries, {
      upColor: '#10B981',
      downColor: '#EF4444',
      borderUpColor: '#10B981',
      borderDownColor: '#EF4444',
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
    })

    volumeRef.current = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    })
    // Pin the volume bars to the bottom 25% of the pane so they don't
    // collide with the candles.
    chart.priceScale('').applyOptions({
      scaleMargins: { top: 0.78, bottom: 0 },
    })

    // Watermark — required by the lightweight-charts license.
    const pane = chart.panes()[0]
    if (pane) {
      createTextWatermark(pane, {
        horzAlign: 'center',
        vertAlign: 'center',
        lines: [
          {
            text: 'Powered by TradingView',
            color: 'rgba(255,255,255,0.05)',
            fontSize: 32,
            fontStyle: 'bold',
          },
        ],
      })
    }

    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
        })
      }
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      candleRef.current = null
      volumeRef.current = null
    }
  }, [])

  // Push data on every change (timeframe flip, new trades, fresh tip).
  useEffect(() => {
    if (!candleRef.current || !volumeRef.current) return
    candleRef.current.setData(
      candles.map((c) => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    )
    volumeRef.current.setData(
      candles.map((c) => ({
        time: c.time,
        value: c.volume,
        color:
          c.close >= c.open ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)',
      })),
    )
    if (candles.length > 0) chartRef.current?.timeScale().fitContent()
  }, [candles])

  const showOverlay =
    !curveAddress || !!error || isLoading || trades.length === 0 || candles.length === 0

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1">
          {TIMEFRAMES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTf(t)}
              className={`text-xs px-2.5 py-1 rounded-md font-mono transition-colors ${
                tf === t
                  ? 'bg-[var(--gold)]/15 text-[var(--gold)] border border-[var(--gold)]/30'
                  : 'text-[var(--tx-d)] hover:text-[var(--tx)] border border-transparent'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-[var(--tx-d)] uppercase tracking-wider">
          SRX pair
        </span>
      </div>
      <div className="relative rounded-md overflow-hidden">
        <div ref={containerRef} className="h-[380px] w-full bg-[#030712]" />
        {showOverlay && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#030712]/90 backdrop-blur-sm">
            {!curveAddress ? (
              <p className="text-xs text-[var(--tx-d)]">No curve attached.</p>
            ) : error ? (
              <p className="text-xs text-red-400">
                Indexer error: {error.message}
              </p>
            ) : isLoading ? (
              <p className="text-xs text-[var(--tx-d)]">Loading trades…</p>
            ) : (
              <div className="flex flex-col items-center gap-1 text-center text-xs text-[var(--tx-d)]">
                <p className="text-3xl">📈</p>
                <p className="font-semibold text-[var(--tx-m)]">
                  No trading data yet
                </p>
                <p>Chart fills in as the curve is traded.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
