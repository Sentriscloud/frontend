"use client";

import { motion } from "framer-motion";
import { Reveal } from "@/components/ui/reveal";
import { GlowCard } from "@/components/ui/glow-card";
import { GradientBlur } from "@/components/ui/grid-bg";
import { SectionHeader } from "./section-header";
import { FEATURES } from "@/data/content";

const ICONS: Record<string, React.ReactNode> = {
  bolt: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  layers: <><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></>,
  wallet: <><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 12h.01M10 12h.01" /><path d="M14 12h4" /></>,
  clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  flame: <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" />,
  lock: <><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></>,
  mempool: <><path d="M16 3h5v5M4 20L21 3" /><path d="M21 16v5h-5M15 15l6 6" /><path d="M4 4l5 5" /></>,
  network: <><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></>,
  check: <><path d="M9 12l2 2 4-4" /><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></>,
};

const CARD_COLORS = [
  { accent: "var(--cyan)", bg: "rgba(122,184,200,.06)", border: "rgba(122,184,200,.15)", glow: "rgba(122,184,200,.08)" },
  { accent: "var(--purple)", bg: "rgba(167,139,250,.06)", border: "rgba(167,139,250,.15)", glow: "rgba(167,139,250,.08)" },
  { accent: "var(--blue)", bg: "rgba(96,165,250,.06)", border: "rgba(96,165,250,.15)", glow: "rgba(96,165,250,.08)" },
  { accent: "var(--teal)", bg: "rgba(45,212,191,.06)", border: "rgba(45,212,191,.15)", glow: "rgba(45,212,191,.08)" },
  { accent: "var(--orange)", bg: "rgba(251,146,60,.06)", border: "rgba(251,146,60,.15)", glow: "rgba(251,146,60,.08)" },
  { accent: "var(--green)", bg: "rgba(126,200,164,.06)", border: "rgba(126,200,164,.15)", glow: "rgba(126,200,164,.08)" },
  { accent: "var(--pink)", bg: "rgba(244,114,182,.06)", border: "rgba(244,114,182,.15)", glow: "rgba(244,114,182,.08)" },
  { accent: "var(--gold)", bg: "rgba(200,168,74,.06)", border: "rgba(200,168,74,.15)", glow: "rgba(200,168,74,.08)" },
  { accent: "var(--lime)", bg: "rgba(163,230,53,.06)", border: "rgba(163,230,53,.15)", glow: "rgba(163,230,53,.08)" },
];

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, delay: i * 0.07, ease: [0.25, 1, 0.5, 1] as const },
  }),
};

export function Features() {
  return (
    <section id="features" className="relative py-[120px] px-6 md:px-[60px]">
      <GradientBlur />
      <Reveal>
        <SectionHeader
          tag="Why Sentrix"
          title="Engineered for"
          titleEm="performance."
          subtitle="Every component built from scratch in Rust. Zero unsafe code. No forks, no shortcuts."
        />
      </Reveal>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-40px" }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {FEATURES.map((f, i) => {
          const c = CARD_COLORS[i % CARD_COLORS.length];
          return (
            <motion.div key={i} custom={i} variants={cardVariants}>
              <GlowCard className="h-full">
                <div className="group bg-gradient-to-br from-[var(--bk)] to-[var(--sf)] p-10 h-full transition-all duration-500 hover:from-[var(--sf)] hover:to-[var(--sf2)] relative overflow-hidden rounded-2xl border border-[var(--brd)] hover:border-transparent"
                  style={{ ["--card-accent" as string]: c.accent }}
                >
                  {/* Animated top-left corner */}
                  <span className="absolute top-0 left-0 w-0 h-px transition-all duration-500 group-hover:w-12 opacity-0 group-hover:opacity-70"
                    style={{ background: c.accent }} />
                  <span className="absolute top-0 left-0 w-px h-0 transition-all duration-500 group-hover:h-12 opacity-0 group-hover:opacity-70"
                    style={{ background: c.accent }} />

                  {/* Hover glow orb */}
                  <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-[60px]"
                    style={{ background: c.accent }} />

                  {/* Shimmer on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden rounded-2xl pointer-events-none">
                    <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_ease-in-out_infinite]"
                      style={{ background: `linear-gradient(90deg, transparent, ${c.bg}, transparent)` }} />
                  </div>

                  {/* Icon with colored background */}
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl mb-6 transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg relative"
                    style={{
                      background: c.bg,
                      border: `1px solid ${c.border}`,
                      boxShadow: `0 0 0 rgba(0,0,0,0)`,
                    }}
                  >
                    <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ boxShadow: `0 0 20px ${c.glow}, inset 0 0 20px ${c.glow}` }} />
                    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="relative z-[1]">
                      {ICONS[f.icon]}
                    </svg>
                  </div>

                  <h3 className="text-[15px] font-medium mb-2.5 tracking-[.03em] transition-colors duration-300 group-hover:text-[var(--tx)]">
                    {f.title}
                  </h3>
                  <p className="text-[13px] text-[var(--tx-m)] leading-[1.75] font-light">
                    {f.desc}
                  </p>

                  {/* Bottom accent line */}
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-0 transition-all duration-500 group-hover:w-2/3 opacity-0 group-hover:opacity-50 rounded-full"
                    style={{ background: `linear-gradient(90deg, transparent, ${c.accent}, transparent)` }} />
                </div>
              </GlowCard>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
