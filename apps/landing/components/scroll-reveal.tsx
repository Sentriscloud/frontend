"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

type Props = HTMLMotionProps<"div"> & {
  children: ReactNode;
  delay?: number;
};

/**
 * Subtle in-view reveal. Starts at opacity 0.6 (still readable) and animates
 * to 1 — so SSR / no-JS content remains visible, and "AI scroll-spam" feel is
 * dialled down. Don't use on hero / above-the-fold content.
 */
export function ScrollReveal({ children, delay = 0, ...rest }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0.6, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
