"use client";

import { motion } from "framer-motion";
import { SectionHeader } from "./section-header";
import { Reveal } from "@/components/ui/reveal";
import { SECURITY_CARDS } from "@/data/content";

const ICONS: Record<string, React.ReactNode> = {
  key: <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />,
  lock: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></>,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  arrow: <><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></>,
  check: <><path d="M9 12l2 2 4-4" /><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></>,
  shieldCheck: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></>,
};

// Same gold-only palette discipline. Cards rotate 3 intensity tiers.
const SEC_COLORS = [
  { accent: "var(--gold)",   bg: "rgba(200,168,74,.05)", border: "rgba(200,168,74,.15)", glow: "rgba(200,168,74,.08)" },
  { accent: "var(--gold-l)", bg: "rgba(240,208,128,.05)", border: "rgba(240,208,128,.15)", glow: "rgba(240,208,128,.08)" },
  { accent: "var(--gold-d)", bg: "rgba(138,111,42,.06)",  border: "rgba(138,111,42,.18)",  glow: "rgba(138,111,42,.10)"  },
  { accent: "var(--gold)",   bg: "rgba(200,168,74,.05)", border: "rgba(200,168,74,.15)", glow: "rgba(200,168,74,.08)" },
  { accent: "var(--gold-l)", bg: "rgba(240,208,128,.05)", border: "rgba(240,208,128,.15)", glow: "rgba(240,208,128,.08)" },
  { accent: "var(--gold-d)", bg: "rgba(138,111,42,.06)",  border: "rgba(138,111,42,.18)",  glow: "rgba(138,111,42,.10)"  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, delay: i * 0.09, ease: [0.25, 1, 0.5, 1] as const },
  }),
};

export function Security() {
  return (
    <section id="security" className="py-[120px] px-6 md:px-[60px]">
      <Reveal>
        <SectionHeader
          tag="Cryptographic Stack"
          title="Security"
          titleEm="first."
          subtitle="Every layer of Sentrix is protected by industry-standard cryptographic primitives. Zero compromises."
        />
      </Reveal>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-40px" }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-[60px]"
      >
        {SECURITY_CARDS.map((card, i) => {
          const c = SEC_COLORS[i % SEC_COLORS.length];
          return (
            <motion.div
              key={i}
              custom={i}
              variants={cardVariants}
              whileHover={{ y: -4, transition: { duration: 0.3 } }}
              className="group bg-gradient-to-br from-[var(--bk)] to-[var(--sf)] px-10 py-9 transition-all duration-500 hover:from-[var(--sf)] hover:to-[var(--sf2)] relative overflow-hidden rounded-2xl border border-[var(--brd)] hover:border-transparent"
            >
              {/* Corner accents */}
              <span className="absolute bottom-0 right-0 w-0 h-px transition-all duration-500 group-hover:w-10 opacity-0 group-hover:opacity-50"
                style={{ background: c.accent }} />
              <span className="absolute bottom-0 right-0 w-px h-0 transition-all duration-500 group-hover:h-10 opacity-0 group-hover:opacity-50"
                style={{ background: c.accent }} />

              {/* Glow */}
              <div className="absolute -bottom-12 -right-12 w-28 h-28 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-[40px]"
                style={{ background: c.accent }} />

              <h4 className="text-[14px] font-medium mb-2.5 flex items-center gap-2.5 transition-colors duration-300 group-hover:text-[var(--tx)]">
                <div className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-500 group-hover:scale-110"
                  style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    {ICONS[card.icon]}
                  </svg>
                </div>
                {card.title}
              </h4>
              <p className="text-[13px] text-[var(--tx-m)] leading-[1.75] font-light">{card.desc}</p>
              <div className="font-mono text-[10px] mt-3 py-1.5 px-2.5 inline-block transition-all duration-300 rounded-md"
                style={{
                  color: c.accent,
                  background: c.bg,
                  borderLeft: `2px solid ${c.border}`,
                }}>
                {card.mono}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
