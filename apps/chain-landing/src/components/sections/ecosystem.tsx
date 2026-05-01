"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "./section-header";
import { ECOSYSTEM } from "@/data/content";

// Single-accent gold across ecosystem cards. Three intensity tiers
// cycle so adjacent products stay differentiable; previously rotated
// blue/green/purple/orange/pink which read as multi-brand confetti.
const ECO_COLORS = [
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

export function Ecosystem() {
  const t = useTranslations("section.ecosystem");
  return (
    <section id="ecosystem" className="py-[120px] px-6 md:px-[60px]">
      <Reveal>
        <SectionHeader
          tag={t("tag")}
          title={t("title")}
          titleEm={t("titleEm")}
          subtitle={t("subtitle")}
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
