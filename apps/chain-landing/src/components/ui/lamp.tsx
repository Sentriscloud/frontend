"use client";

import { motion } from "framer-motion";

export function Lamp({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {/* Layer 1: very wide ultra-soft ambient */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.5 }}
        className="absolute inset-x-0 -top-[200px] h-[600px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(200,168,74,.06) 0%, transparent 70%)",
        }}
      />

      {/* Layer 2: focused center glow */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0.4 }}
        whileInView={{ opacity: 1, scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, delay: 0.1, ease: "easeOut" }}
        className="absolute inset-x-0 -top-[100px] h-[500px] pointer-events-none origin-top"
        style={{
          background: "radial-gradient(ellipse 40% 60% at 50% 0%, rgba(200,168,74,.08) 0%, transparent 70%)",
        }}
      />

      {/* Layer 3: tight bright core */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0.2 }}
        whileInView={{ opacity: 1, scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
        className="absolute inset-x-0 -top-[50px] h-[300px] pointer-events-none origin-top"
        style={{
          background: "radial-gradient(ellipse 25% 50% at 50% 0%, rgba(200,168,74,.1) 0%, transparent 60%)",
        }}
      />

      {/* Glow line — soft expanding */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        whileInView={{ scaleX: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
        className="absolute top-0 inset-x-[15%] h-px origin-center"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(200,168,74,.3), rgba(200,168,74,.5), rgba(200,168,74,.3), transparent)",
        }}
      />

      {/* Blur orb — ultra soft, no hard edges */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.5, delay: 0.4 }}
        className="absolute -top-[80px] left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none rounded-[50%]"
        style={{ background: "rgba(200,168,74,.03)", filter: "blur(100px)" }}
      />

      <div className="relative pt-[80px]">{children}</div>
    </div>
  );
}
