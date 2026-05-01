"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { SentrixLogo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LocaleToggle } from "@/components/ui/locale-toggle";

const NAV_LINKS = [
  { href: "#about", labelKey: "about" },
  { href: "#features", labelKey: "features" },
  { href: "#tokens", labelKey: "tokens" },
  { href: "#ecosystem", labelKey: "ecosystem" },
  { href: "#roadmap", labelKey: "roadmap" },
  { href: "#validators", labelKey: "validators" },
  { href: "https://docs.sentrixchain.com", labelKey: "docs" },
  { href: "https://t.me/SentrixChain", labelKey: "community" },
] as const;

export function Navbar() {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 50);
      setHidden(y > 200 && y > lastScrollY.current);
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = NAV_LINKS.map(l => l.href.replace("#", ""));
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-100 px-6 md:px-10 lg:px-[60px] py-4 flex items-center justify-between backdrop-blur-[20px] transition-all duration-500 ease-[cubic-bezier(.16,1,.3,1)] ${
        hidden ? "-translate-y-full" : "translate-y-0"
      } ${
        scrolled
          ? "border-b border-[var(--brd)] bg-[var(--bk)]/90 shadow-[0_1px_20px_rgba(0,0,0,.3)]"
          : "border-b border-transparent bg-transparent shadow-none"
      }`}>
        <a href="#" className="flex items-center gap-2.5 text-[var(--gold)] shrink-0">
          <SentrixLogo size={32} />
          <span className="font-serif text-[22px] font-light tracking-[.04em] uppercase text-[var(--gold)] leading-none">
            SENTRIX
          </span>
        </a>

        <div className="hidden xl:flex items-center gap-7">
          {NAV_LINKS.map((l) => {
            const id = l.href.replace("#", "");
            const isActive = active === id;
            return (
              <a
                key={l.href}
                href={l.href}
                target={l.href.startsWith("http") ? "_blank" : undefined}
                rel={l.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className={`relative text-[11px] font-light tracking-[.1em] uppercase transition-all duration-300 px-3 py-1.5 rounded-full ${
                  isActive
                    ? "text-[var(--gold)] bg-[rgba(200,168,74,.06)] border border-[rgba(200,168,74,.12)]"
                    : "text-[var(--tx-d)] hover:text-[var(--gold)] border border-transparent"
                }`}
              >
                {t(l.labelKey)}
              </a>
            );
          })}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <LocaleToggle />
          <ThemeToggle />
          <a href="https://scan.sentrixchain.com" target="_blank" rel="noopener noreferrer" className="hidden md:inline-block border border-[var(--brd2)] text-[var(--gold)] px-5 py-2 text-[10px] font-normal tracking-[.12em] uppercase font-sans rounded-full hover:bg-[rgba(200,168,74,.08)] transition-colors">
            {t("explorer")}
          </a>
          <button onClick={() => setOpen(!open)} className="xl:hidden" aria-label={t("menu")}>
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth={1.5}>
              <line x1="3" y1="7" x2="21" y2="7" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="17" x2="21" y2="17" />
            </svg>
          </button>
        </div>
      </nav>

      {open && (
        <div className="fixed top-[68px] inset-x-0 bottom-0 bg-[var(--bk)]/97 backdrop-blur-[30px] z-99 flex flex-col p-8 xl:hidden animate-[fade-up_.4s_cubic-bezier(.25,1,.5,1)_both]">
          {NAV_LINKS.map((l) => {
            const id = l.href.replace("#", "");
            const isActive = active === id;
            return (
              <a
                key={l.href}
                href={l.href}
                target={l.href.startsWith("http") ? "_blank" : undefined}
                rel={l.href.startsWith("http") ? "noopener noreferrer" : undefined}
                onClick={() => setOpen(false)}
                className={`text-lg font-light tracking-[.1em] uppercase py-4 border-b border-[var(--brd)] transition-colors ${
                  isActive ? "text-[var(--gold)]" : "text-[var(--tx-m)] hover:text-[var(--gold)]"
                }`}
              >
                {isActive && <span className="inline-block w-2 h-px bg-[var(--gold)] mr-3" />}
                {t(l.labelKey)}
              </a>
            );
          })}
        </div>
      )}
    </>
  );
}
