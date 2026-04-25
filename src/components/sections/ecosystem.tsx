"use client";

import { motion } from "framer-motion";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "./section-header";
import { ECOSYSTEM } from "@/data/content";

const ECO_COLORS = [
  { accent: "var(--blue)", bg: "rgba(96,165,250,.05)", border: "rgba(96,165,250,.15)", glow: "rgba(96,165,250,.08)" },
  { accent: "var(--green)", bg: "rgba(126,200,164,.05)", border: "rgba(126,200,164,.15)", glow: "rgba(126,200,164,.08)" },
  { accent: "var(--purple)", bg: "rgba(167,139,250,.05)", border: "rgba(167,139,250,.15)", glow: "rgba(167,139,250,.08)" },
  { accent: "var(--orange)", bg: "rgba(251,146,60,.05)", border: "rgba(251,146,60,.15)", glow: "rgba(251,146,60,.08)" },
  { accent: "var(--pink)", bg: "rgba(244,114,182,.05)", border: "rgba(244,114,182,.15)", glow: "rgba(244,114,182,.08)" },
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

export function Ecosystem() {
  return (
    <section id="ecosystem" className="py-[120px] px-6 md:px-[60px]">
      <Reveal>
        <SectionHeader
          tag="Ecosystem"
          title="Powering real"
          titleEm="applications."
          subtitle="Every product in the SentrisCloud suite runs on Sentrix Chain — creating organic, sustained demand for SRX."
        />
      </Reveal>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-40px" }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-[60px]"
      >
        {ECOSYSTEM.map((e, i) => {
          const c = ECO_COLORS[i % ECO_COLORS.length];
          return (
            <motion.div
              key={i}
              custom={i}
              variants={cardVariants}
              whileHover={{ y: -6, transition: { duration: 0.3 } }}
              className="group bg-gradient-to-br from-[var(--bk)] to-[var(--sf)] p-10 transition-all duration-500 hover:from-[var(--sf)] hover:to-[var(--sf2)] relative overflow-hidden rounded-2xl border border-[var(--brd)] hover:border-transparent"
            >
              {/* Corner accents */}
              <span className="absolute top-0 right-0 w-0 h-px transition-all duration-500 group-hover:w-12 opacity-0 group-hover:opacity-60"
                style={{ background: c.accent }} />
              <span className="absolute top-0 right-0 w-px h-0 transition-all duration-500 group-hover:h-12 opacity-0 group-hover:opacity-60"
                style={{ background: c.accent }} />

              {/* Glow orb */}
              <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-[40px]"
                style={{ background: c.accent }} />

              <div className="font-mono text-[9px] tracking-[.2em] uppercase mb-3.5 transition-colors duration-300"
                style={{ color: c.accent }}>
                {e.tag}
              </div>
              <div className="font-serif text-[26px] font-normal mb-3 transition-colors duration-300 group-hover:text-[var(--tx)]">{e.name}</div>
              <p className="text-[13px] text-[var(--tx-d)] leading-[1.7] font-light mb-6">{e.desc}</p>
              <span className="font-mono text-[9px] inline-block px-3 py-1.5 tracking-[.12em] transition-all duration-300 rounded-full"
                style={{
                  color: c.accent,
                  border: `1px solid ${c.border}`,
                  background: c.bg,
                }}>
                {e.badge}
              </span>

              {/* Bottom accent line */}
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-0 transition-all duration-500 group-hover:w-1/2 opacity-0 group-hover:opacity-40 rounded-full"
                style={{ background: `linear-gradient(90deg, transparent, ${c.accent}, transparent)` }} />
            </motion.div>
          );
        })}

        <motion.div custom={ECOSYSTEM.length} variants={cardVariants} className="flex items-center justify-center min-h-[200px] bg-gradient-to-br from-[var(--bk)] to-[var(--sf)] rounded-2xl border border-[var(--brd)] group hover:border-[rgba(200,168,74,.15)] transition-all duration-500">
          <div className="text-center">
            <div className="font-serif text-[36px] text-[rgba(200,168,74,.15)] mb-2.5 group-hover:animate-[float_3s_ease-in-out_infinite] transition-all duration-500 group-hover:text-[rgba(200,168,74,.3)]">&#9671;</div>
            <div className="font-mono text-[9px] text-[var(--tx-d)] tracking-[.15em] group-hover:text-[var(--gold-d)] transition-colors duration-300">MORE COMING</div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
