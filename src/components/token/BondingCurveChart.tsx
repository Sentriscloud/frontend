'use client'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts'
import { generateCurveData, GRADUATION_THRESHOLD } from '@/lib/bonding-curve'
import type { Token } from '@/types'

interface BondingCurveChartProps {
  token: Token
}

// Custom tooltip
function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number; name: string }>
  label?: number
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0d1526] border border-[#1e2d4a] rounded-lg p-3 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label?.toFixed(1)}% sold</p>
      <p className="text-white font-semibold">{payload[0].value.toFixed(8)} SRX</p>
    </div>
  )
}

export function BondingCurveChart({ token }: BondingCurveChartProps) {
  const data = generateCurveData(token.totalSupply, token.tokensSold)
  const currentPct = (token.tokensSold / token.totalSupply) * 100

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="soldGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="unsoldGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1e2d4a" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#1e2d4a" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" />

          <XAxis
            dataKey="pct"
            tickFormatter={(v) => `${v.toFixed(0)}%`}
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={{ stroke: '#1e2d4a' }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => v.toExponential(1)}
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={{ stroke: '#1e2d4a' }}
            tickLine={false}
            width={60}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Sold area (blue) */}
          <Area
            type="monotone"
            dataKey={(d) => d.isSold ? d.price : null}
            stroke="#2563eb"
            strokeWidth={2}
            fill="url(#soldGrad)"
            name="Sold"
            connectNulls={false}
          />

          {/* Unsold area (dim) */}
          <Area
            type="monotone"
            dataKey={(d) => !d.isSold ? d.price : null}
            stroke="#1e2d4a"
            strokeWidth={1.5}
            fill="url(#unsoldGrad)"
            name="Available"
            strokeDasharray="4 2"
            connectNulls={false}
          />

          {/* Current position */}
          <ReferenceLine
            x={currentPct}
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="3 3"
            label={{ value: 'Now', position: 'top', fill: '#f59e0b', fontSize: 11 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="flex items-center justify-between text-xs text-slate-500 mt-2 px-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-blue-500 inline-block" /> Sold
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-slate-600 inline-block border-dashed" /> Available
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-amber-400 inline-block" /> Current price
          </span>
        </div>
        <span>Graduation: {GRADUATION_THRESHOLD.toLocaleString()} SRX mcap</span>
      </div>
    </div>
  )
}
