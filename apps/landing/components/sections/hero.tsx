"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowDown } from "lucide-react";

import { site } from "@/content/site";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden pt-40 pb-32 md:pt-48 md:pb-44">
      {/* Background ornament: emerald glow + grid */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[60rem] w-[60rem] -translate-x-1/2 rounded-full bg-(--color-emerald-900) opacity-20 blur-3xl" />
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,var(--color-canvas)_70%)]"
        />
        <svg
          className="absolute inset-0 h-full w-full opacity-[0.07]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" className="text-(--color-ink)" />
        </svg>
      </div>

      <div className="container-page">
        <motion.span
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="eyebrow"
        >
          The SentrisCloud company
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="display mt-8 max-w-4xl text-5xl text-(--color-ink) md:text-7xl lg:text-8xl"
        >
          Products built on{" "}
          <span className="text-(--color-emerald-500)">Sentrix Chain</span>.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 max-w-2xl text-base leading-relaxed text-(--color-ink-3) md:text-lg"
        >
          {site.description}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-12 flex flex-wrap items-center gap-4"
        >
          <Link
            href="#products"
            className="inline-flex items-center gap-2 rounded-full bg-(--color-emerald-500) px-7 py-3.5 text-sm font-medium text-(--color-canvas) transition-transform duration-200 hover:-translate-y-0.5"
          >
            Explore products
            <ArrowDown size={14} />
          </Link>
          <a
            href="https://sentrixchain.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-(--color-line) px-7 py-3.5 text-sm font-medium text-(--color-ink-2) transition-colors hover:border-(--color-emerald-700) hover:text-(--color-ink)"
          >
            About the chain
          </a>
        </motion.div>
      </div>
    </section>
  );
}
