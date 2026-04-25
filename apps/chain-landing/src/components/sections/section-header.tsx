"use client";

import { motion } from "framer-motion";

export function SectionHeader({ tag, title, titleEm, subtitle }: { tag: string; title: string; titleEm: string; subtitle?: string }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
        className="font-mono text-[10px] text-[var(--gold)] tracking-[.25em] uppercase mb-5 flex items-center gap-3"
      >
        <span className="w-7 h-px bg-[var(--gold)]" />
        {tag}
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.9, delay: 0.1, ease: [0.25, 1, 0.5, 1] }}
        className="font-serif text-[clamp(36px,5vw,68px)] font-light tracking-[.02em] leading-none mb-6"
      >
        {title}<br /><em className="not-italic text-[var(--gold)]">{titleEm}</em>
      </motion.h2>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 1, 0.5, 1] }}
          className="text-[15px] text-[var(--tx-m)] max-w-[520px] leading-[1.7] mb-[60px] font-light"
        >
          {subtitle}
        </motion.p>
      )}
    </>
  );
}

export function Divider() {
  return <div className="h-px bg-gradient-to-r from-transparent via-[var(--brd2)] to-transparent mx-6 md:mx-[60px]" />;
}
