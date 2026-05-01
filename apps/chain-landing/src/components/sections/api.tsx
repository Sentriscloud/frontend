"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "./section-header";
import { API_CARDS } from "@/data/content";

const API_COLORS = [
  { accent: "var(--green)", bg: "rgba(126,200,164,.05)", border: "rgba(126,200,164,.12)", glow: "rgba(126,200,164,.08)", method: "var(--green)" },
  { accent: "var(--purple)", bg: "rgba(167,139,250,.05)", border: "rgba(167,139,250,.12)", glow: "rgba(167,139,250,.08)", method: "var(--purple)" },
  { accent: "var(--cyan)", bg: "rgba(122,184,200,.05)", border: "rgba(122,184,200,.12)", glow: "rgba(122,184,200,.08)", method: "var(--cyan)" },
];

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, delay: i * 0.12, ease: [0.25, 1, 0.5, 1] as const },
  }),
};

export function Api() {
  const t = useTranslations("section.api");
  return (
    <section id="api" className="py-[120px] px-6 md:px-[60px]">
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
        className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-[60px]"
      >
        {API_CARDS.map((card, i) => {
          const c = API_COLORS[i % API_COLORS.length];
          return (
            <motion.div
              key={i}
              custom={i}
              variants={cardVariants}
              whileHover={{ y: -6, transition: { duration: 0.3 } }}
              className="group bg-gradient-to-br from-[var(--bk)] to-[var(--sf)] p-9 transition-all duration-500 hover:from-[var(--sf)] hover:to-[var(--sf2)] relative overflow-hidden rounded-2xl border border-[var(--brd)] hover:border-transparent"
            >
              {/* Top gradient line */}
              <span className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-40 transition-all duration-500"
                style={{ background: `linear-gradient(90deg, transparent, ${c.accent}, transparent)` }} />

              {/* Glow orb */}
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-[50px]"
                style={{ background: c.accent }} />

              <h3 className="text-[17px] font-medium mb-1.5 transition-colors duration-300 group-hover:text-[var(--tx)]">
                {card.title}
              </h3>
              <div className="font-mono text-[10px] tracking-[.15em] uppercase mb-5 pb-3 transition-colors duration-300"
                style={{ color: c.accent, borderBottom: `1px solid ${c.border}` }}>
                {card.count}
              </div>

              <div className="flex flex-col gap-[5px] mb-4">
                {card.items.map((item, j) => (
                  <div key={j} className="font-mono text-[11px] text-[var(--tx-d)] py-[7px] px-3 tracking-[.02em] transition-all duration-300 hover:text-[var(--tx-m)] rounded-md"
                    style={{
                      background: `linear-gradient(to right, ${c.bg}, transparent)`,
                      borderLeft: `1px solid ${c.border}`,
                    }}>
                    {"method" in item && (
                      <span className="font-medium mr-1.5" style={{ color: c.method }}>{item.method}</span>
                    )}
                    {item.path}
                  </div>
                ))}
              </div>

              {"more" in card && card.more && (
                <div className="font-mono text-[11px] text-center pt-3 tracking-[.1em] transition-colors duration-300"
                  style={{ color: c.accent }}>
                  {card.more}
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
