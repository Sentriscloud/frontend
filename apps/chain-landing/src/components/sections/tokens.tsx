"use client";

import { motion } from "framer-motion";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "./section-header";
import { TOKENS } from "@/data/content";

const TOKEN_COLORS = [
  { accent: "var(--gold)", bg: "rgba(200,168,74,.05)", border: "rgba(200,168,74,.12)", glow: "rgba(200,168,74,.15)", gradient: "from-[rgba(200,168,74,.08)] to-transparent" },
  { accent: "var(--cyan)", bg: "rgba(122,184,200,.05)", border: "rgba(122,184,200,.12)", glow: "rgba(122,184,200,.15)", gradient: "from-[rgba(122,184,200,.08)] to-transparent" },
  { accent: "var(--green)", bg: "rgba(126,200,164,.05)", border: "rgba(126,200,164,.12)", glow: "rgba(126,200,164,.15)", gradient: "from-[rgba(126,200,164,.08)] to-transparent" },
];

const cardVariants = {
  hidden: { opacity: 0, y: 24, rotateX: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: { duration: 0.7, delay: i * 0.15, ease: [0.25, 1, 0.5, 1] as const },
  }),
};

export function Tokens() {
  return (
    <section id="tokens" className="py-[120px] px-6 md:px-[60px]">
      <Reveal>
        <SectionHeader
          tag="Token Economy"
          title="Three tokens,"
          titleEm="one ecosystem."
          subtitle="A balanced economy where each token serves a distinct purpose, creating sustainable value and organic demand."
        />
      </Reveal>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-40px" }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-[60px]"
        style={{ perspective: "1000px" }}
      >
        {TOKENS.map((t, i) => {
          const c = TOKEN_COLORS[i];
          return (
            <motion.div
              key={i}
              custom={i}
              variants={cardVariants}
              className="group relative bg-gradient-to-br from-[var(--bk)] to-[var(--sf)] p-11 transition-all duration-500 hover:from-[var(--sf)] hover:to-[var(--sf2)] overflow-hidden rounded-2xl border border-[var(--brd)] hover:border-transparent"
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
            >
              {/* Top gradient line */}
              <span className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-60 transition-all duration-500"
                style={{ background: `linear-gradient(90deg, transparent, ${c.accent}, transparent)` }} />

              {/* Corner glow orb */}
              <div className="absolute -top-16 -left-16 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-[50px]"
                style={{ background: c.accent }} />

              {/* Floating symbol */}
              <div className="font-serif text-[48px] font-light leading-none mb-2 transition-all duration-500 group-hover:animate-[float_3s_ease-in-out_infinite]"
                style={{ color: c.accent, textShadow: `0 0 0 transparent` }}
              >
                <span className="group-hover:[text-shadow:0_0_30px_currentColor] transition-all duration-500">{t.symbol}</span>
              </div>
              <div className="text-[17px] font-medium mb-1 tracking-[.02em]">{t.name}</div>
              <div className="font-mono text-[9px] tracking-[.2em] uppercase mb-[18px] pb-1 border-b transition-colors duration-300"
                style={{ color: c.accent, borderColor: c.border }}>
                {t.type}
              </div>

              <p className="text-[13px] text-[var(--tx-m)] leading-[1.75] font-light mb-6 group-hover:text-[var(--tx)] transition-colors duration-300">
                {t.desc}
              </p>

              <div className="font-mono text-[11px] pt-3.5 border-t tracking-[.06em] transition-colors duration-300"
                style={{ color: c.accent, borderColor: c.border }}>
                {t.supply}
              </div>

              {/* Bottom glow */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-px opacity-0 group-hover:opacity-40 transition-opacity duration-500"
                style={{ background: c.accent, boxShadow: `0 0 20px ${c.glow}` }} />
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
