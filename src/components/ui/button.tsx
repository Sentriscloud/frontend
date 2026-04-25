"use client";

import { motion } from "framer-motion";

interface ButtonProps {
  children: React.ReactNode;
  href?: string;
  variant?: "primary" | "secondary";
  className?: string;
  target?: string;
}

export function Button({ children, href = "#", variant = "primary", className = "", target }: ButtonProps) {
  const base = "relative inline-flex items-center justify-center px-9 py-3.5 text-[12px] font-medium tracking-[.15em] uppercase font-sans overflow-hidden group transition-all duration-300 rounded-full";

  const variants = {
    primary: `${base} bg-[var(--gold)] text-[var(--bk)] hover:shadow-[0_0_30px_rgba(200,168,74,.25)]`,
    secondary: `${base} border border-[var(--brd2)] text-[var(--tx-m)] hover:border-[var(--gold)] hover:text-[var(--gold)] hover:shadow-[0_0_20px_rgba(200,168,74,.08)]`,
  };

  return (
    <motion.a
      href={href}
      target={target}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`${variants[variant]} ${className}`}
    >
      {/* Shine sweep on hover */}
      <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/[.12] to-transparent skew-x-[-20deg]" />
      <span className="relative z-[1]">{children}</span>
    </motion.a>
  );
}
