"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { STATS } from "@/data/content";

// Same gold-only palette discipline as Features / Tokens / Ecosystem.
const STAT_COLORS = [
  { accent: "var(--gold)",   glow: "rgba(200,168,74,.15)" },
  { accent: "var(--gold-l)", glow: "rgba(240,208,128,.15)" },
  { accent: "var(--gold-d)", glow: "rgba(138,111,42,.15)" },
  { accent: "var(--gold)",   glow: "rgba(200,168,74,.15)" },
];

function Counter({ value, duration = 2 }: { value: string; duration?: number }) {
  const num = parseInt(value);
  const isNum = !isNaN(num);
  // Initial state covers the non-numeric case directly — avoids the
  // setState-in-effect pattern that React 19 lint flags.
  const [display, setDisplay] = useState(() => (isNum ? "0" : value));
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView || !isNum) return;
    let start = 0;
    const step = num / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= num) {
        setDisplay(String(num));
        clearInterval(timer);
      } else {
        setDisplay(String(Math.floor(start)));
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [inView, num, isNum, duration]);

  return <span ref={ref}>{display}</span>;
}

export function Stats() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 md:px-[60px] py-10">
      {STATS.map((s, i) => {
        const c = STAT_COLORS[i % STAT_COLORS.length];
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: i * 0.1, ease: [0.25, 1, 0.5, 1] }}
            whileHover={{ y: -4, transition: { duration: 0.3 } }}
            className="group relative overflow-hidden bg-gradient-to-br from-[var(--bk)] to-[var(--sf)] px-8 md:px-11 py-12 transition-all duration-500 hover:from-[var(--sf)] hover:to-[var(--sf2)] rounded-2xl border border-[var(--brd)] hover:border-transparent"
          >
            {/* Animated corner line */}
            <span className="absolute top-0 left-0 w-px h-0 transition-all duration-600 group-hover:h-full opacity-0 group-hover:opacity-60"
              style={{ background: `linear-gradient(to bottom, ${c.accent}, transparent)` }} />
            <span className="absolute top-0 left-0 h-px w-0 transition-all duration-600 group-hover:w-[60px] opacity-0 group-hover:opacity-60"
              style={{ background: `linear-gradient(to right, ${c.accent}, transparent)` }} />

            {/* Glow */}
            <div className="absolute -top-10 -left-10 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-[40px]"
              style={{ background: c.accent }} />

            <div className="font-serif text-[40px] md:text-[52px] font-light tracking-tight leading-none mb-3 transition-all duration-500">
              <Counter value={s.value} /><em className="not-italic transition-all duration-500" style={{ color: c.accent }}>
                <span className="group-hover:[text-shadow:0_0_20px_currentColor]">{s.unit}</span>
              </em>
            </div>
            <div className="font-mono text-[9px] text-[var(--tx-d)] tracking-[.22em] uppercase transition-colors duration-300 group-hover:text-[var(--tx-m)]">
              {s.label}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
