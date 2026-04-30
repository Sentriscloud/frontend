"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface Segment {
  label: string;
  value: number;
  color: string;
}

interface SupplyDonutProps {
  segments: Segment[];
}

export function SupplyDonut({ segments }: SupplyDonutProps) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const data = segments.map((s) => ({
    name: s.label,
    value: s.value,
    pct: ((s.value / total) * 100).toFixed(1),
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={68}
          outerRadius={108}
          paddingAngle={2}
          stroke="var(--bg)"
          strokeWidth={2}
        >
          {segments.map((s, i) => (
            <Cell key={`cell-${i}`} fill={s.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "var(--bg-elev)",
            border: "1px solid var(--brd)",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value, _name, item) => {
            const num = typeof value === "number" ? value : Number(value ?? 0);
            const payload = item as { payload?: { pct?: string; name?: string } };
            const pct = payload.payload?.pct ?? "0";
            const name = payload.payload?.name ?? "";
            return [`${num.toLocaleString()} SRX (${pct}%)`, name];
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
