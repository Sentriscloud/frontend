"use client";

import { Link, useRouter, usePathname } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, useRef, useEffect } from "react";
import {
  Search, Sun, Moon, Menu, X, Globe, Check, ChevronDown,
  Users, Coins, Shield, FileCode, Fish, GitCompare,
  Home as HomeIcon, Blocks as BlocksIcon, BarChart3,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useNetwork } from "@/lib/network-context";
import { detectSearchType } from "@/lib/format";
import { SentrixLogo } from "@/components/common/Logo";
import { routing } from "@/i18n/routing";

const LOCALE_LABELS: Record<string, { flag: string; label: string }> = {
  id: { flag: "🇮🇩", label: "Bahasa Indonesia" },
  en: { flag: "🇺🇸", label: "English" },
};

export function Header() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const { network, setNetwork } = useNetwork();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [lbOpen, setLbOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const lbRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Scroll state for translucent → solid nav background
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Keyboard shortcuts:
  //   ⌘K / Ctrl-K  → focus search
  //   /             → focus search (dev-tool convention)
  //   g h           → home      (vim-style leader)
  //   g b           → blocks
  //   g v           → validators
  //   g t           → tokens
  //   g l           → leaderboard
  // We ignore shortcuts when typing into an input/textarea so normal typing still works.
  useEffect(() => {
    let leader = false;
    let leaderTimer: ReturnType<typeof setTimeout> | null = null;

    function isTyping(t: EventTarget | null) {
      const el = t as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName?.toLowerCase();
      return tag === "input" || tag === "textarea" || el.isContentEditable;
    }

    function focusSearch() {
      searchRef.current?.focus();
    }

    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        focusSearch();
        return;
      }
      if (isTyping(e.target)) return;

      if (e.key === "/") {
        e.preventDefault();
        focusSearch();
        return;
      }
      if (e.key === "g") {
        leader = true;
        if (leaderTimer) clearTimeout(leaderTimer);
        leaderTimer = setTimeout(() => { leader = false; }, 900);
        return;
      }
      if (leader) {
        const map: Record<string, string> = {
          h: "/",
          b: "/blocks",
          v: "/validators",
          t: "/tokens",
          l: "/leaderboard/account/holders",
        };
        const dest = map[e.key];
        if (dest) {
          e.preventDefault();
          router.push(dest as "/" | "/blocks" | "/validators" | "/tokens" | "/leaderboard/account/holders");
        }
        leader = false;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // router is a stable intl object; safe to omit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const t = e.target as Node;
      if (langRef.current && !langRef.current.contains(t)) setLangOpen(false);
      if (lbRef.current && !lbRef.current.contains(t)) setLbOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    const type = detectSearchType(q);
    if (type === "block") router.push(`/blocks/${q}`);
    else if (type === "tx") router.push(`/tx/${q}`);
    else if (type === "address") router.push(`/address/${q}`);
    else router.push(`/search?q=${encodeURIComponent(q)}`);
    setQuery("");
    setMobileOpen(false);
  }

  function switchLocale(next: string) {
    if (next === locale) return;
    router.replace(pathname, { locale: next as "id" | "en" });
    setLangOpen(false);
  }

  const NAV_LINKS: { href: "/blocks" | "/validators" | "/tokens" | "/" | "/analytics"; key: keyof IntlMessages["nav"] }[] = [
    { href: "/", key: "home" },
    { href: "/blocks", key: "blocks" },
    { href: "/validators", key: "validators" },
    { href: "/tokens", key: "tokens" },
    { href: "/analytics", key: "analytics" },
  ];

  const LEADERBOARD_ITEMS = [
    { href: "/leaderboard/account/holders", label: "Account",   icon: Users,      color: "text-[var(--cyan)]" },
    { href: "/leaderboard/token/holders",   label: "Token",     icon: Coins,      color: "text-[var(--gold)]" },
    { href: "/leaderboard/validator/stake", label: "Validator", icon: Shield,     color: "text-[var(--purple)]" },
    { href: "/leaderboard/contract/calls",  label: "Contract",  icon: FileCode,   color: "text-[var(--cyan)]" },
    { href: "/leaderboard/whale/recent",    label: "Whale",     icon: Fish,       color: "text-[var(--green)]" },
    { href: "/leaderboard/compare",         label: "Compare",   icon: GitCompare, color: "text-[var(--pink)]" },
  ] as const;
  const leaderboardActive = pathname.startsWith("/leaderboard");
  // Home carries its own big editorial search in the hero — hide the header one there so the
  // page doesn't read as having two competing search bars stacked on top of each other.
  const isHome = pathname === "/";

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 backdrop-blur-[20px] ${
        scrolled
          ? "border-b border-[var(--brd)] bg-[var(--bk)]/90"
          : "border-b border-transparent bg-[var(--bk)]/60"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 lg:px-6 h-16 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 text-[var(--gold)] shrink-0">
          <SentrixLogo size={32} />
          <span className="hidden sm:inline font-serif text-[17px] font-light tracking-[.22em] uppercase pr-[.22em]">
            SENTRI<span className="text-[var(--gold-l)] font-normal">X</span>
            <span className="ml-1.5 text-[10px] tracking-[.15em] text-[var(--tx-d)] font-sans uppercase">Scan</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 ml-2">
          {NAV_LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                prefetch={false}
                className={`px-3 py-1.5 text-[11px] font-light tracking-[.1em] uppercase transition-all duration-200 rounded-full border ${
                  active
                    ? "text-[var(--gold)] bg-[color-mix(in_oklab,var(--gold)_6%,transparent)] border-[color-mix(in_oklab,var(--gold)_15%,transparent)]"
                    : "text-[var(--tx-d)] border-transparent hover:text-[var(--gold)]"
                }`}
              >
                {t(l.key)}
              </Link>
            );
          })}

          {/* Leaderboard dropdown */}
          <div className="relative" ref={lbRef}>
            <button
              type="button"
              onClick={() => setLbOpen(!lbOpen)}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-light tracking-[.1em] uppercase transition-all duration-200 rounded-full border ${
                leaderboardActive
                  ? "text-[var(--gold)] bg-[color-mix(in_oklab,var(--gold)_6%,transparent)] border-[color-mix(in_oklab,var(--gold)_15%,transparent)]"
                  : "text-[var(--tx-d)] border-transparent hover:text-[var(--gold)]"
              }`}
            >
              {t("leaderboard")}
              <ChevronDown className={`h-3 w-3 transition-transform ${lbOpen ? "rotate-180" : ""}`} />
            </button>
            {lbOpen && (
              <div className="absolute left-0 top-full mt-2 w-56 bg-[var(--bk)]/95 backdrop-blur-xl border border-[var(--brd)] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,.3)] py-1.5 z-50">
                {LEADERBOARD_ITEMS.map(({ href, label, icon: Icon, color }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setLbOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 text-[11px] tracking-[.1em] uppercase text-[var(--tx-m)] hover:text-[var(--gold)] hover:bg-[color-mix(in_oklab,var(--gold)_5%,transparent)] transition-colors"
                  >
                    <Icon className={`h-3.5 w-3.5 ${color}`} />
                    <span>{label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Search — hidden on home (hero owns the search); dropdown shows a typed-hint so the
            user knows what the raw input maps to (block height / tx hash / address) and can
            jump without submitting the form. */}
        {!isHome && (
          <form onSubmit={handleSearch} className="flex-1 max-w-md hidden lg:flex relative">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--tx-d)]" />
              <input
                ref={searchRef}
                type="text"
                placeholder={t("search_placeholder")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-12 text-[12px] bg-[color-mix(in_oklab,var(--foreground)_3%,transparent)] border border-[var(--brd)] rounded-full tracking-[.05em] placeholder:text-[var(--tx-d)] focus:outline-none focus:border-[var(--gold)] focus:bg-[color-mix(in_oklab,var(--gold)_4%,transparent)] transition-all"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[var(--tx-d)] border border-[var(--brd)] rounded px-1.5 py-0.5 hidden xl:inline-block">
                ⌘K
              </kbd>
            </div>
            <SearchHint query={query} onPick={() => { setQuery(""); searchRef.current?.blur(); }} />
          </form>
        )}
        {isHome && <div className="flex-1 hidden lg:block" />}

        {/* Right controls */}
        <div className="flex items-center gap-2 ml-auto md:ml-0">
          {/* Language */}
          <div className="relative" ref={langRef}>
            <button
              type="button"
              onClick={() => setLangOpen(!langOpen)}
              className="h-8 px-2.5 inline-flex items-center gap-1 text-[11px] tracking-[.1em] uppercase text-[var(--tx-m)] hover:text-[var(--gold)] rounded-full border border-transparent hover:border-[var(--brd)] transition-colors"
              aria-label="Switch language"
            >
              <Globe className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{locale}</span>
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--bk)]/95 backdrop-blur-xl border border-[var(--brd)] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,.3)] py-1 z-50">
                {routing.locales.map((l) => (
                  <button
                    key={l}
                    onClick={() => switchLocale(l)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-[color-mix(in_oklab,var(--gold)_5%,transparent)] text-[var(--tx-m)] hover:text-[var(--gold)]"
                  >
                    <span className="text-base leading-none">{LOCALE_LABELS[l].flag}</span>
                    <span className="flex-1 text-left">{LOCALE_LABELS[l].label}</span>
                    {l === locale && <Check className="h-3.5 w-3.5 text-[var(--gold)]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Network — segmented control so both options are always visible */}
          <div className="inline-flex items-center h-8 p-0.5 rounded-full border border-[var(--brd)] bg-[color-mix(in_oklab,var(--foreground)_3%,transparent)]" role="radiogroup" aria-label="Network">
            <button
              type="button"
              role="radio"
              aria-checked={network === "mainnet"}
              onClick={() => network !== "mainnet" && setNetwork("mainnet")}
              className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[10px] tracking-[.1em] uppercase font-light transition-colors ${
                network === "mainnet"
                  ? "bg-[color-mix(in_oklab,var(--gold)_12%,transparent)] text-[var(--gold)]"
                  : "text-[var(--tx-d)] hover:text-[var(--tx-m)]"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full bg-[var(--green)] ${network === "mainnet" ? "animate-pulse-live" : ""}`} />
              <span className="hidden sm:inline">Main</span>
              <span className="hidden lg:inline text-[9px] font-mono text-[var(--tx-d)]">7119</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={network === "testnet"}
              onClick={() => network !== "testnet" && setNetwork("testnet")}
              className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[10px] tracking-[.1em] uppercase font-light transition-colors ${
                network === "testnet"
                  ? "bg-[color-mix(in_oklab,var(--orange)_14%,transparent)] text-[var(--orange)]"
                  : "text-[var(--tx-d)] hover:text-[var(--tx-m)]"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full bg-[var(--orange)] ${network === "testnet" ? "animate-pulse-live" : ""}`} />
              <span className="hidden sm:inline">Test</span>
              <span className="hidden lg:inline text-[9px] font-mono text-[var(--tx-d)]">7120</span>
            </button>
          </div>

          {/* Theme */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-8 w-8 inline-flex items-center justify-center rounded-full border border-transparent hover:border-[var(--brd)] text-[var(--tx-m)] hover:text-[var(--gold)] transition-colors"
            aria-label="Toggle theme"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </button>

          {/* Mobile menu */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden h-8 w-8 inline-flex items-center justify-center rounded-full text-[var(--gold)]"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--brd)] bg-[var(--bk)]/97 backdrop-blur-[30px] p-5 space-y-3 animate-fade-in">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--tx-d)]" />
              <input
                type="text"
                placeholder={t("search_placeholder")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-4 text-[12px] bg-[color-mix(in_oklab,var(--foreground)_3%,transparent)] border border-[var(--brd)] rounded-full focus:outline-none focus:border-[var(--gold)]"
              />
            </div>
          </form>
          <nav className="flex flex-col">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                prefetch={false}
                onClick={() => setMobileOpen(false)}
                className="py-3 text-[12px] tracking-[.1em] uppercase text-[var(--tx-m)] border-b border-[var(--brd)] hover:text-[var(--gold)]"
              >
                {t(l.key)}
              </Link>
            ))}
            <div className="pt-3 mt-1">
              <p className="py-2 text-[10px] tracking-[.2em] uppercase text-[var(--tx-d)]">
                {t("leaderboard")}
              </p>
              {LEADERBOARD_ITEMS.map(({ href, label, icon: Icon, color }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 py-3 text-[12px] tracking-[.1em] uppercase text-[var(--tx-m)] hover:text-[var(--gold)] border-b border-[var(--brd)]"
                >
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                  {label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

// Search autocomplete — single live hint under the input that shows what the current query
// maps to (block height / tx / address / unknown). Pressing Enter submits the form; clicking
// the hint navigates directly and clears the input.
function SearchHint({ query, onPick }: { query: string; onPick: () => void }) {
  const router = useRouter();
  const q = query.trim();
  if (!q) return null;

  const hint = (() => {
    if (/^\d+$/.test(q)) return { label: "Block", href: `/blocks/${q}`, icon: BlocksIcon };
    if (/^0x[a-fA-F0-9]{64}$/.test(q)) return { label: "Transaction", href: `/tx/${q}`, icon: FileCode };
    if (/^0x[a-fA-F0-9]{40}$/.test(q)) return { label: "Address", href: `/address/${q}`, icon: Users };
    if (/^SRC20_[a-fA-F0-9]{40}$/i.test(q)) return { label: "Token", href: `/tokens/${q}`, icon: Coins };
    return null;
  })();

  if (!hint) {
    return (
      <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--bk)]/95 backdrop-blur-xl border border-[var(--brd)] rounded-lg shadow-[0_10px_40px_rgba(0,0,0,.3)] p-3 z-50 text-xs text-muted-foreground">
        Press Enter to search across blocks, txs, and addresses.
      </div>
    );
  }

  const Icon = hint.icon;

  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        router.push(hint.href as "/blocks/${string}" | "/tx/${string}" | "/address/${string}" | "/tokens/${string}");
        onPick();
      }}
      className="absolute left-0 right-0 top-full mt-1 bg-[var(--bk)]/95 backdrop-blur-xl border border-[var(--brd)] rounded-lg shadow-[0_10px_40px_rgba(0,0,0,.3)] p-3 z-50 flex items-center gap-3 hover:border-[var(--gold)]/40 transition-colors text-left"
    >
      <Icon className="h-4 w-4 text-[var(--gold)]" />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-mono tracking-[.15em] uppercase text-[var(--tx-d)]">{hint.label}</div>
        <div className="text-xs font-mono truncate">{q}</div>
      </div>
      <kbd className="text-[10px] font-mono text-[var(--tx-d)] border border-[var(--brd)] rounded px-1.5 py-0.5">↵</kbd>
    </button>
  );
}

// Mobile bottom nav — 5-slot app-style tabbar so the core destinations stay one tap away
// without opening the hamburger. Hidden on md+; the desktop nav takes over there.
export function MobileBottomNav() {
  const pathname = usePathname();
  const ITEMS = [
    { href: "/" as const, label: "Home", icon: HomeIcon },
    { href: "/blocks" as const, label: "Blocks", icon: BlocksIcon },
    { href: "/validators" as const, label: "Validators", icon: Shield },
    { href: "/tokens" as const, label: "Tokens", icon: Coins },
    { href: "/analytics" as const, label: "Analytics", icon: BarChart3 },
  ];
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--bk)]/95 backdrop-blur-xl border-t border-[var(--brd)] pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] tracking-[.1em] uppercase transition-colors ${
                active ? "text-[var(--gold)]" : "text-[var(--tx-d)] hover:text-[var(--tx-m)]"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
