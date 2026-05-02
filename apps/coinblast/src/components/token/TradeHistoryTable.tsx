'use client'

// Paginated trade history for a single curve. Reads cb_trades via the
// indexer proxy. 25/page (the spec). Empty + error states intentionally
// stay inside the card so the page doesn't reflow when data arrives.

import { useState } from 'react'
import { useTradesByCurve } from '@/lib/useCoinblastIndexer'
import { formatAddress } from '@/lib/utils'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, GraduationCap } from 'lucide-react'
import { formatEther } from 'viem'

const PAGE_SIZE = 25

interface Props {
  curveAddress: string | undefined
}

export function TradeHistoryTable({ curveAddress }: Props) {
  const { trades, isLoading, error } = useTradesByCurve(curveAddress, 200)
  const [page, setPage] = useState(0)

  if (!curveAddress) return null
  if (error) {
    return (
      <p className="text-xs text-red-400 py-6 text-center">
        Indexer error: {error.message}
      </p>
    )
  }
  if (isLoading) {
    return (
      <p className="text-xs text-[var(--tx-d)] py-6 text-center">Loading trades…</p>
    )
  }
  if (trades.length === 0) {
    return (
      <p className="text-xs text-[var(--tx-d)] py-6 text-center">
        No trades yet — be the first to buy on the curve.
      </p>
    )
  }

  // Reverse so the table reads newest-first regardless of how the API
  // returned them. Indexer returns ASC for /by-curve/ (chart-friendly);
  // a table wants DESC.
  const ordered = [...trades].reverse()
  const totalPages = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const slice = ordered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[var(--tx-d)] text-xs border-b border-[var(--brd)]">
              <th className="text-left pb-2">Type</th>
              <th className="text-right pb-2">SRX</th>
              <th className="text-right pb-2">Tokens</th>
              <th className="text-right pb-2">By</th>
              <th className="text-right pb-2">Block</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((t) => {
              const isBuy = t.type === 'buy'
              const isGrad = t.type === 'graduated'
              const srx = Number(formatEther(BigInt(t.srx_amount))).toLocaleString(undefined, {
                maximumFractionDigits: 4,
              })
              const tok = Number(formatEther(BigInt(t.token_amount))).toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })
              return (
                <tr key={t.id} className="border-b border-[var(--brd)]/50 hover:bg-[var(--sf2)]">
                  <td className="py-2.5">
                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        isGrad
                          ? 'text-amber-300'
                          : isBuy
                            ? 'text-emerald-400'
                            : 'text-red-400'
                      }`}
                    >
                      {isGrad ? (
                        <>
                          <GraduationCap className="w-3 h-3" /> GRAD
                        </>
                      ) : isBuy ? (
                        <>
                          <ArrowUp className="w-3 h-3" /> BUY
                        </>
                      ) : (
                        <>
                          <ArrowDown className="w-3 h-3" /> SELL
                        </>
                      )}
                    </span>
                  </td>
                  <td className="text-right text-[var(--tx)] py-2.5 tabular-nums">{srx}</td>
                  <td className="text-right text-[var(--tx-m)] py-2.5 tabular-nums">{tok}</td>
                  <td className="text-right font-mono text-xs text-[var(--tx-d)] py-2.5">
                    {formatAddress(t.trader_address, 4)}
                  </td>
                  <td className="text-right text-[var(--tx-d)] text-xs py-2.5 tabular-nums">
                    {t.block_number}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-xs text-[var(--tx-d)]">
          <span>
            Page {safePage + 1} / {totalPages} · {ordered.length} trades
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="p-1.5 rounded-md border border-[var(--brd)] hover:border-[var(--brd2)] disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="p-1.5 rounded-md border border-[var(--brd)] hover:border-[var(--brd2)] disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
