"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Lamp } from "@/components/ui/lamp";
import { Button } from "@/components/ui/button";
import { DotGrid } from "@/components/ui/grid-bg";
import { SITE } from "@/data/content";

export function CTA() {
  const t = useTranslations("cta");
  return (
    <section className="relative py-[60px] px-6 md:px-[60px] text-center overflow-hidden">
      <DotGrid className="opacity-30" />
      <Lamp>
        <div className="relative">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.3 }} className="font-mono text-[10px] text-[var(--gold)] tracking-[.25em] uppercase mb-5 flex items-center justify-center gap-3">
            <span className="w-7 h-px bg-[var(--gold)]" />
            {t("tag")}
            <span className="w-7 h-px bg-[var(--gold)]" />
          </motion.div>

          <motion.h2 initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.4 }} className="font-serif text-[clamp(36px,6vw,68px)] font-light tracking-[.02em] leading-none mb-6">
            {t("headingLine1")}<br /><em className="not-italic text-[var(--gold)]">{t("headingLine2")}</em>
          </motion.h2>

          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.5 }} className="text-[15px] text-[var(--tx-m)] max-w-[520px] mx-auto leading-[1.7] font-light mb-10">
            {t("subheading")}
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.6 }} className="flex gap-4 flex-wrap justify-center">
            <Button href={SITE.explorer} target="_blank">{t("exploreChain")}</Button>
            <Button href={SITE.github} variant="secondary" target="_blank">{t("viewSource")}</Button>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.7 }} className="flex justify-center gap-8 mt-[60px] flex-wrap">
            {[
              { labelKey: "linkExplorer", href: SITE.explorer, icon: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></> },
              { labelKey: "linkApi", href: SITE.api, icon: <><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></> },
              { labelKey: "linkRpc", href: SITE.rpc, icon: <><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></> },
              { labelKey: "linkGithub", href: SITE.github, icon: <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /> },
            ].map((l) => {
              const label = t(l.labelKey);
              const isGithub = l.labelKey === "linkGithub";
              return (
                <a key={l.labelKey} href={l.href} target="_blank" className="flex items-center gap-2.5 text-[13px] font-light text-[var(--tx-d)] tracking-[.05em] hover:text-[var(--gold)] transition-colors">
                  <svg width={16} height={16} viewBox="0 0 24 24" fill={isGithub ? "var(--gold)" : "none"} stroke={isGithub ? "none" : "var(--gold)"} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">{l.icon}</svg>
                  {label}
                </a>
              );
            })}
          </motion.div>
        </div>
      </Lamp>
    </section>
  );
}
