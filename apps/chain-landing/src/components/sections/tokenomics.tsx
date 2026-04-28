"use client";

import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "./section-header";
import { TOKENOMICS_BARS, TOKENOMICS_CARDS } from "@/data/content";

const ICONS: Record<string, React.ReactNode> = {
  flame: <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" />,
  clock: <><path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" /></>,
  trend: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></>,
  info: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6" /><path d="M12 18h.01" /></>,
};

const BAR_COLORS = [
  { color: "var(--gold)", bg: "rgba(200,168,74,.05)", fill: "linear-gradient(90deg, rgba(200,168,74,.2), var(--gold))" },
  { color: "var(--cyan)", bg: "rgba(122,184,200,.05)", fill: "linear-gradient(90deg, rgba(122,184,200,.2), var(--cyan))" },
  { color: "var(--purple)", bg: "rgba(167,139,250,.05)", fill: "linear-gradient(90deg, rgba(167,139,250,.2), var(--purple))" },
  { color: "var(--green)", bg: "rgba(126,200,164,.05)", fill: "linear-gradient(90deg, rgba(126,200,164,.2), var(--green))" },
  { color: "var(--blue)", bg: "rgba(96,165,250,.05)", fill: "linear-gradient(90deg, rgba(96,165,250,.2), var(--blue))" },
];

// Info cards under the allocation bars — gold-only. The bars themselves
// keep categorical colors (data-viz convention for allocation segments)
// since they distinguish premine destinations, not brand surfaces.
const CARD_COLORS = [
  { accent: "var(--gold)",   bg: "rgba(200,168,74,.05)", border: "rgba(200,168,74,.15)" },
  { accent: "var(--gold-l)", bg: "rgba(240,208,128,.05)", border: "rgba(240,208,128,.15)" },
  { accent: "var(--gold-d)", bg: "rgba(138,111,42,.06)",  border: "rgba(138,111,42,.18)"  },
  { accent: "var(--gold)",   bg: "rgba(200,168,74,.05)", border: "rgba(200,168,74,.15)" },
];

export function Tokenomics() {
  return (
    <section id="tokenomics" className="tknm-section py-[120px] px-6 md:px-[60px] border-t border-b border-[var(--brd)]">
      <Reveal>
        <SectionHeader
          tag="Tokenomics"
          title="Supply"
          titleEm="distribution."
          subtitle="Hard-capped at 315 million SRX. Transparent allocation with built-in deflation and halving schedule."
        />
      </Reveal>

      <Reveal delay={0.15}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
        {/* Distribution Bars */}
        <div className="flex flex-col gap-6">
          {TOKENOMICS_BARS.map((b, i) => {
            const bc = BAR_COLORS[i % BAR_COLORS.length];
            return (
              <div key={i} className="group">
                <div className="flex justify-between mb-2">
                  <span className="text-[13px] text-[var(--tx-m)] font-light">{b.label}</span>
                  <span className="font-mono text-[12px] transition-colors duration-300" style={{ color: bc.color }}>{b.value}</span>
                </div>
                <div className="h-[6px] rounded-full overflow-hidden" style={{ background: bc.bg }}>
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${b.pct}%`, background: bc.fill, boxShadow: `0 0 12px ${bc.bg}` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Mechanism Cards */}
        <div className="flex flex-col gap-3">
          {TOKENOMICS_CARDS.map((c, i) => {
            const cc = CARD_COLORS[i % CARD_COLORS.length];
            return (
              <div
                key={i}
                className="group p-6 border transition-all duration-500 relative overflow-hidden bg-gradient-to-br from-[var(--bk)] to-[var(--sf)] hover:from-[var(--sf)] hover:to-[var(--sf2)] rounded-xl hover:border-transparent"
                style={{ borderColor: "var(--brd)" }}
              >
                <span className="absolute left-0 top-0 bottom-0 w-0.5 opacity-0 group-hover:opacity-60 transition-opacity duration-500"
                  style={{ background: cc.accent }} />
                <div className="absolute -top-8 -left-8 w-20 h-20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-[30px]"
                  style={{ background: cc.accent }} />
                <h4 className="text-[14px] font-medium mb-2 flex items-center gap-2.5">
                  <div className="w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-500"
                    style={{ background: cc.bg, border: `1px solid ${cc.border}` }}>
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={cc.accent} strokeWidth={1.5} strokeLinecap="round">
                      {ICONS[c.icon]}
                    </svg>
                  </div>
                  {c.title}
                </h4>
                <p className="text-[12.5px] text-[var(--tx-m)] leading-[1.7] font-light">{c.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
      </Reveal>

      <Reveal delay={0.3}>
        <div className="mt-16 text-center">
          <a
            href="/docs/tokenomics"
            className="inline-flex items-center gap-2 text-[12px] tracking-[.1em] uppercase text-[var(--gold)] hover:text-[var(--gold-l)] transition-colors"
          >
            Full tokenomics breakdown
            <span aria-hidden>→</span>
          </a>
        </div>
      </Reveal>
    </section>
  );
}
