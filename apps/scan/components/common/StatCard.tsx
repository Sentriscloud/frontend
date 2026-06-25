"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { TrendingDown, TrendingUp, RotateCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Split a formatted value (e.g. "14.2K", "3.1s", "12 tx", "14,109 SRX") into a number part
// and a trailing unit so we can render the unit in accent color (landing-style).
function splitValue(value: string): { num: string; unit: string } {
  const m = /^([\d.,\s-]+)(.*)$/.exec(value);
  if (!m) return { num: value, unit: "" };
  return { num: m[1].trim(), unit: m[2].trim() };
}

interface StatCardProps {
  label: ReactNode;
  value: string;
  loading?: boolean;
  /** Fetch failed and there's no data to show. Renders a distinct error+retry state,
   *  not the same dash the card shows for a genuinely empty value. */
  error?: boolean;
  /** Re-run the failed fetch. When set, the error state shows a retry control. */
  onRetry?: () => void;
  /** CSS color (e.g. `var(--gold)`, `var(--green)`) applied to the trailing unit and hover glow. */
  accent?: string;
  /** Title tooltip on the value (useful when long values truncate). */
  title?: string;
  /** Optional time-series (recent window) rendered as a micro sparkline below the number. */
  spark?: number[];
  /** % delta over the spark window (e.g. +5.2 → green up arrow, -1.4 → red down arrow). When
   *  derived from `spark` the caller computes `(last - first) / first * 100` and passes the
   *  raw percent. We render the sign + arrow + colour so the operator doesn't have to. */
  delta?: number | null;
  /** Tiny secondary line under the value — Solana-foundation-style "92.1% circulating" pattern.
   *  Use it to teach what the headline number means ("of 315M SRX cap", "1 of 4 active", etc). */
  subline?: ReactNode;
}

// DECISION: Sparkline uses a Catmull-Rom-like smoothing so the line reads as a gentle curve
// instead of a jagged polyline. Gradient fill + soft drop-shadow so it doesn't look dead.
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const W = 100;
  const H = 28;
  const pad = 2;
  const usableH = H - pad * 2;
  const step = W / Math.max(1, data.length - 1);

  const points = data.map((v, i) => ({
    x: i * step,
    y: pad + usableH - ((v - min) / range) * usableH,
  }));

  // Smooth curve: cardinal spline-ish — each segment uses a control point pulled toward the
  // neighbor to round the corners without overshoot.
  const path = points.reduce((acc, p, i, arr) => {
    if (i === 0) return `M${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    const prev = arr[i - 1];
    const cx = (prev.x + p.x) / 2;
    return `${acc} Q${cx.toFixed(2)},${prev.y.toFixed(2)} ${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  }, "");

  const fill = `${path} L ${W},${H} L 0,${H} Z`;
  const last = points[points.length - 1];
  const gradId = `spark-${color.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-7 overflow-visible" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      {last && <circle cx={last.x} cy={last.y} r="2" fill={color} opacity="0.95" />}
    </svg>
  );
}

// DECISION: the landing-style stat card is the brand's signature numeric treatment —
// Playfair serif number, tinted em-unit, animated gold corner lines on hover. One primitive
// so every page (home + detail summary rows) reads from the same vocabulary instead of
// shadcn's grey `text-lg font-semibold font-mono`.
export function StatCard({ label, value, loading = false, error = false, onRetry, accent = "var(--gold)", title, spark, delta, subline }: StatCardProps) {
  const tc = useTranslations("common");
  const { num, unit } = splitValue(value);
  const showDelta = delta != null && Number.isFinite(delta) && Math.abs(delta) >= 0.05;
  const deltaUp = (delta ?? 0) >= 0;

  return (
    <div className="card-lift group relative overflow-hidden bg-[color-mix(in_oklab,var(--card)_60%,transparent)] hover:bg-[var(--card)] border border-[var(--brd)] rounded-2xl px-5 py-6 md:px-6 md:py-7 min-w-0">
      {/* Animated corner lines */}
      <span
        className="absolute top-0 left-0 h-px w-0 group-hover:w-[60px] transition-all duration-500 opacity-0 group-hover:opacity-70"
        style={{ background: `linear-gradient(to right, ${accent}, transparent)` }}
      />
      <span
        className="absolute top-0 left-0 w-px h-0 group-hover:h-full transition-all duration-500 opacity-0 group-hover:opacity-70"
        style={{ background: `linear-gradient(to bottom, ${accent}, transparent)` }}
      />

      {/* Eyebrow label ABOVE the number — landing-style editorial hierarchy.
          Delta chip docks to the right of the eyebrow (top-right of the card)
          so it doesn't crowd the headline number — Etherscan/Solscan pattern.
          On <375px viewports the wide letter-spacing was clipping labels mid-
          word ("LIVE _" / "BLOCK_" / "TOTAL_") — drop the spacing on small
          screens, restore at sm+. */}
      <div className="flex items-center justify-between gap-2 mb-3 min-w-0">
        <div className="font-mono text-[10px] text-[var(--tx-d)] tracking-[.12em] sm:tracking-[.22em] uppercase group-hover:text-[var(--tx-m)] transition-colors truncate flex-1">
          {label}
        </div>
        {showDelta && !loading && !error && (
          <span
            className="inline-flex items-center gap-0.5 font-mono text-[10px] tracking-wide rounded-md px-1.5 py-0.5"
            style={{
              color: deltaUp ? "var(--green)" : "var(--red)",
              background: `color-mix(in oklab, ${deltaUp ? "var(--green)" : "var(--red)"} 10%, transparent)`,
            }}
          >
            {deltaUp ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
            {deltaUp ? "+" : ""}{(delta as number).toFixed(1)}%
          </span>
        )}
      </div>

      <div
        className="font-serif font-light tracking-tight leading-none truncate"
        style={{ fontSize: "clamp(26px, 3.8vw, 46px)" }}
        title={title ?? value}
      >
        {loading ? (
          <Skeleton className="h-9 w-24" />
        ) : error ? (
          <button
            type="button"
            onClick={onRetry}
            disabled={!onRetry}
            title={tc("retry")}
            className="inline-flex items-center gap-1.5 font-mono text-[15px] leading-none text-[var(--red)] hover:opacity-80 transition-opacity disabled:cursor-default"
          >
            {tc("failed")}
            <RotateCw className="h-3.5 w-3.5" />
          </button>
        ) : (
          <>
            <span>{num}</span>
            {unit && (
              <em
                className="not-italic ml-1 text-[0.7em] transition-all duration-500 group-hover:[text-shadow:0_0_16px_currentColor]"
                style={{ color: accent }}
              >
                {unit}
              </em>
            )}
          </>
        )}
      </div>
      {subline && !loading && !error && (
        <div className="mt-1.5 text-[11px] font-mono text-[var(--tx-d)] truncate">
          {subline}
        </div>
      )}
      {spark && spark.length > 1 && !loading && !error && (
        <div className="mt-3 -mx-1">
          <Sparkline data={spark} color={accent} />
        </div>
      )}
    </div>
  );
}
