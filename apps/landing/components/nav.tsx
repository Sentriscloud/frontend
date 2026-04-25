"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";

import { primaryNav } from "@/content/nav";
import { cn } from "@/lib/utils";
import { Logo } from "./ui/logo";
import { ThemeToggle } from "./theme-toggle";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-colors duration-300",
        scrolled
          ? "bg-(--color-canvas)/85 backdrop-blur-md border-b border-(--color-line-2)"
          : "bg-transparent",
      )}
    >
      <div className="container-page flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-3" aria-label="SentrisCloud home">
          <Logo size={26} />
          <span className="text-sm font-medium tracking-tight text-(--color-ink)">SentrisCloud</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {primaryNav.map((link) => (
            <a
              key={link.href}
              href={link.href}
              {...(link.external ? { target: "_blank", rel: "noreferrer" } : {})}
              className="group inline-flex items-center gap-1 text-sm text-(--color-ink-2) transition-colors hover:text-(--color-ink)"
            >
              {link.label}
              {link.external ? (
                <ArrowUpRight
                  size={12}
                  className="text-(--color-ink-4) transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              ) : null}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <a
            href="https://github.com/Sentriscloud"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-(--color-emerald-700) bg-(--color-emerald-900)/30 px-4 py-2 text-sm font-medium text-(--color-emerald-300) transition-colors hover:bg-(--color-emerald-900)/60"
          >
            GitHub
            <ArrowUpRight size={14} />
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="md:hidden hairline inline-flex h-9 w-9 items-center justify-center rounded-full text-(--color-ink-2)"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-(--color-line-2) bg-(--color-canvas) md:hidden">
          <div className="container-page flex flex-col gap-1 py-4">
            {primaryNav.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                {...(link.external ? { target: "_blank", rel: "noreferrer" } : {})}
                className="flex items-center justify-between rounded-md px-3 py-3 text-sm text-(--color-ink-2) hover:bg-(--color-canvas-2)"
              >
                <span>{link.label}</span>
                {link.external ? <ArrowUpRight size={14} className="text-(--color-ink-4)" /> : null}
              </a>
            ))}
            <div className="mt-2 flex items-center gap-3 px-3">
              <ThemeToggle />
              <a
                href="https://github.com/Sentriscloud"
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-(--color-emerald-700) bg-(--color-emerald-900)/30 px-4 py-2 text-sm font-medium text-(--color-emerald-300)"
              >
                GitHub
                <ArrowUpRight size={14} />
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
