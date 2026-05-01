"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

export function Founder() {
  const t = useTranslations("founder");
  return (
    <section className="px-6 md:px-[60px] py-[80px] border-t border-[var(--brd)]">
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
        className="font-serif italic text-[clamp(15px,1.6vw,18px)] font-light tracking-[.01em] text-[var(--tx-m)] text-center max-w-[640px] mx-auto leading-[1.7]"
      >
        {t("line")}
      </motion.p>
    </section>
  );
}
