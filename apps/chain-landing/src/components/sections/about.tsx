"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { ABOUT_POINTS } from "@/data/content";

const AboutCoin = dynamic(() => import("@/components/3d/about-coin").then((m) => m.AboutCoin), { ssr: false });

export function About() {
  const t = useTranslations("section.about");
  return (
    <section
      id="about"
      className="about-section py-[120px] px-6 md:px-[60px] grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20 items-center border-t border-b border-[var(--brd)]"
    >
      {/* 3D Coin */}
      <div className="relative h-[260px] md:h-[420px]">
        <AboutCoin />
      </div>

      {/* About Points */}
      <div className="flex flex-col gap-7">
        <div className="font-mono text-[10px] text-[var(--gold)] tracking-[.25em] uppercase flex items-center gap-3">
          <span className="w-7 h-px bg-[var(--gold)]" />
          {t("tag")}
        </div>
        <h2 className="font-serif text-[clamp(36px,5vw,68px)] font-light tracking-[.02em] leading-none mb-2">
          {t("title")}<br />
          <em className="not-italic text-[var(--gold)]">{t("titleEm")}</em>
        </h2>

        {ABOUT_POINTS.map((p, i) => (
          <motion.div
            key={p.num}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.7, delay: i * 0.1, ease: [0.25, 1, 0.5, 1] }}
            className="group flex gap-5 py-4 border-b border-[var(--brd)] transition-all duration-300 hover:pl-2"
          >
            <span className="font-mono text-[11px] text-[var(--gold-dk)] tracking-[.1em] mt-1 shrink-0 w-7 h-7 flex items-center justify-center border border-[rgba(200,168,74,.12)] transition-all duration-300 group-hover:text-[var(--gold)] group-hover:border-[rgba(200,168,74,.3)] group-hover:bg-[rgba(200,168,74,.04)]">
              {p.num}
            </span>
            <div>
              <div className="text-[15px] font-medium mb-1.5 tracking-[.02em] transition-colors duration-300 group-hover:text-[var(--gold-l)]">
                {p.title}
              </div>
              <div className="text-[13px] text-[var(--tx-m)] leading-[1.75] font-light">
                {p.desc}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
