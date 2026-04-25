"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ValidatorChart({ data }: { data: { hour: string; count: number }[] }) {
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id="v-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.45} />
              <stop offset="60%" stopColor="var(--gold)" stopOpacity={0.1} />
              <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
            </linearGradient>
            <filter id="v-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--brd)" strokeDasharray="3 6" />
          <XAxis dataKey="hour" fontSize={10} stroke="var(--tx-d)" tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis fontSize={10} stroke="var(--tx-d)" tickLine={false} axisLine={false} width={32} />
          <Tooltip
            cursor={{ stroke: "var(--gold)", strokeOpacity: 0.3, strokeWidth: 1 }}
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--brd)",
              borderRadius: 10,
              fontSize: 12,
            }}
            formatter={(value) => [`${value} blocks`, "Produced"]}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="var(--gold)"
            strokeWidth={3}
            fill="url(#v-grad)"
            connectNulls
            isAnimationActive={false}
            dot={{ r: 2, fill: "var(--gold)", stroke: "var(--bk)", strokeWidth: 1 }}
            activeDot={{ r: 5, fill: "var(--gold)", stroke: "var(--bk)", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
