"use client";

import { Link, useRouter, usePathname } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, useRef, useEffect } from "react";
import {
  Search, Sun, Moon, Menu, X, Globe, Check, ChevronDown, Loader2,
  Users, Coins, Shield, FileCode, Fish, GitCompare,
  Home as HomeIcon, Blocks as BlocksIcon, BarChart3,
  Cpu, Boxes, Layers, Inbox, GitFork, PieChart, Fuel,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useNetwork } from "@/lib/network-context";
import { SentrixLogo } from "@/components/common/Logo";
import { NetworkHealth } from "@/components/common/NetworkHealth";
import { SearchAutocomplete } from "@/components/common/SearchAutocomplete";
import { pushRecentSearch } from "@/lib/search-index";
import { validateAndResolveSearch } from "@/lib/search-validate";
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
  const [searching, setSearching] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [lbOpen, setLbOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const lbRef = useRef<HTMLDivElement>(null);
  const evmRef = useRef<HTMLDivElement>(null);
  const nativeRef = useRef<HTMLDivElement>(null);
  const chainRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [evmOpen, setEvmOpen] = useState(false);
  const [nativeOpen, setNativeOpen] = useState(false);
  const [chainOpen, setChainOpen] = useState(false);

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
      if (evmRef.current && !evmRef.current.contains(t)) setEvmOpen(false);
      if (nativeRef.current && !nativeRef.current.contains(t)) setNativeOpen(false);
      if (chainRef.current && !chainRef.current.contains(t)) setChainOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q || searching) return;
    setSearching(true);
    try {
      const result = await validateAndResolveSearch(network, q);
      if (result.kind === "not_found") {
        toast.error(result.reason);
        return;
      }
      const labels: Record<typeof result.kind, string> = {
        block: `Block ${q}`,
        tx: `Tx ${q.slice(0, 10)}…`,
        address: `Address ${q.slice(0, 10)}…`,
        tokens: `"${q}"`,
      };
      pushRecentSearch({ q, label: labels[result.kind], href: result.href });
      // Cross-network hit — tell the user the lookup landed them on the
      // other network. Without this they end up on testnet pages with
      // no idea why, which was the reviewer's confusion.
      if (result.onNetwork !== network) {
        toast.success(
          `Found on ${result.onNetwork === "mainnet" ? "Mainnet" : "Testnet"} — switching network.`,
        );
      }
      router.push(
        // Cast: search-validate now returns plain `string` so the router
        // accepts arbitrary `?network=…` query strings the typed-routes
        // union doesn't enumerate.
        result.href as Parameters<typeof router.push>[0],
      );
      setQuery("");
      setMobileOpen(false);
    } catch (err) {
      toast.error("Search failed — try again");
      console.error("search failure", err);
    } finally {
      setSearching(false);
    }
  }

  function switchLocale(next: string) {
    if (next === locale) return;
    router.replace(pathname, { locale: next as "id" | "en" });
    setLangOpen(false);
  }

  // Etherscan / Solscan-style nav: short top row + dropdown groups. Sentrix
  // runs EVM and native at the protocol level, so the two rails get their
  // own dropdown columns of related sub-pages, mirroring how Etherscan
  // groups "Tokens" and "Blockchain". Single direct links stay only for
  // Home — every other destination lives inside a dropdown so the top row
  // doesn't get crowded.
  const NAV_LINKS: { href: "/"; key: keyof IntlMessages["nav"] }[] = [
    { href: "/", key: "home" },
  ];

  const EVM_ITEMS = [
    { href: "/evm" as const,        label: "EVM Dashboard", icon: Cpu,      color: "text-[var(--cyan)]",   hint: "Latest EVM-rail activity" },
    { href: "/contracts" as const,  label: "Contracts",     icon: FileCode, color: "text-[var(--cyan)]",   hint: "Verified Solidity sources" },
    { href: "/tokens" as const,     label: "ERC-20 Tokens", icon: Coins,    color: "text-[var(--gold)]",   hint: "Token list — filter to EVM" },
  ] as const;

  const NATIVE_ITEMS = [
    { href: "/native" as const,     label: "Native Dashboard", icon: Boxes,    color: "text-[var(--green)]",  hint: "SRX transfers + StakingOps + SRC-20" },
    { href: "/validators" as const, label: "Validators",       icon: Shield,   color: "text-[var(--purple)]", hint: "Active set, stake, jail state" },
    { href: "/accounts" as const,   label: "Top Accounts",     icon: Users,    color: "text-[var(--cyan)]",   hint: "Richlist by SRX balance" },
    { href: "/epochs" as const,     label: "Epochs",           icon: Layers,   color: "text-[var(--purple)]", hint: "Reward distribution + rotation" },
    { href: "/tokens" as const,     label: "SRC-20 Tokens",    icon: Coins,    color: "text-[var(--gold)]",   hint: "Token list — filter to Native" },
    { href: "/supply" as const,     label: "Supply",           icon: PieChart, color: "text-[var(--gold)]",   hint: "315M cap + halving curve" },
  ] as const;

  const CHAIN_ITEMS = [
    { href: "/blocks" as const,    label: "Blocks",     icon: BlocksIcon, color: "text-[var(--gold)]",  hint: "Block-by-block tx breakdown" },
    { href: "/mempool" as const,   label: "Mempool",    icon: Inbox,      color: "text-[var(--cyan)]",  hint: "Pending transactions" },
    { href: "/forks" as const,     label: "Forks",      icon: GitFork,    color: "text-[var(--pink)]",  hint: "Fork-gate activations" },
    { href: "/analytics" as const, label: "Analytics",  icon: BarChart3,  color: "text-[var(--cyan)]",  hint: "Network performance + history" },
    { href: "/gas" as const,       label: "Gas",        icon: Fuel,       color: "text-[var(--gold)]",  hint: "Fee tracker" },
  ] as const;

  const LEADERBOARD_ITEMS = [
    { href: "/leaderboard/account/holders", label: "Account",   icon: Users,      color: "text-[var(--cyan)]" },
    { href: "/leaderboard/token/holders",   label: "Token",     icon: Coins,      color: "text-[var(--gold)]" },
    { href: "/leaderboard/validator/stake", label: "Validator", icon: Shield,     color: "text-[var(--purple)]" },
    { href: "/leaderboard/contract/calls",  label: "Contract",  icon: FileCode,   color: "text-[var(--cyan)]" },
    { href: "/leaderboard/whale/recent",    label: "Whale",     icon: Fish,       color: "text-[var(--green)]" },
    { href: "/leaderboard/compare",         label: "Compare",   icon: GitCompare, color: "text-[var(--pink)]" },
  ] as const;
  const leaderboardActive = pathname.startsWith("/leaderboard");
  const evmActive = pathname.startsWith("/evm") || pathname.startsWith("/contracts");
  const nativeActive = pathname.startsWith("/native") || pathname.startsWith("/validators") || pathname.startsWith("/epochs") || pathname.startsWith("/supply");
  const chainActive = pathname.startsWith("/blocks") || pathname.startsWith("/mempool") || pathname.startsWith("/forks") || pathname.startsWith("/analytics") || pathname.startsWith("/gas");
  // Search bar shown globally — including home — per spec 2026-05-02.
  // Home still has its own hero search; both coexist (header is the
  // always-visible "any page" entry point, hero is the editorial one).


  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 backdrop-blur-[20px] ${
        scrolled
          ? "border-b border-[var(--brd)] bg-[var(--bk)]/90"
          : "border-b border-transparent bg-[var(--bk)]/60"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 lg:px-6 h-16 flex items-center gap-4">
        {/* Logo — pearl-dots mark + SENTRIX wordmark, visually balanced. */}
        <Link href="/" className="flex items-center gap-2 text-[var(--gold)] shrink-0">
          <SentrixLogo size={28} />
          <span className="hidden sm:inline font-serif text-[18px] font-light tracking-[.04em] uppercase text-[var(--gold)] leading-none">
            SENTRIX
            <span className="ml-1.5 text-[10px] tracking-[.05em] text-[var(--tx-d)] font-sans normal-case">Scan</span>
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

          {/* EVM dropdown */}
          <RailDropdown
            ref={evmRef}
            label="EVM"
            active={evmActive}
            open={evmOpen}
            onToggle={() => setEvmOpen(!evmOpen)}
            onClose={() => setEvmOpen(false)}
            items={EVM_ITEMS}
          />

          {/* Native dropdown */}
          <RailDropdown
            ref={nativeRef}
            label="Native"
            active={nativeActive}
            open={nativeOpen}
            onToggle={() => setNativeOpen(!nativeOpen)}
            onClose={() => setNativeOpen(false)}
            items={NATIVE_ITEMS}
          />

          {/* Chain dropdown — blocks, mempool, forks, analytics, gas */}
          <RailDropdown
            ref={chainRef}
            label="Chain"
            active={chainActive}
            open={chainOpen}
            onToggle={() => setChainOpen(!chainOpen)}
            onClose={() => setChainOpen(false)}
            items={CHAIN_ITEMS}
          />

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

        {/* Search — global. Visible on every page including home (hero
            still has its own editorial search; the two coexist). Surfaces
            from md+ breakpoint instead of lg+ so tablets see it without
            opening the mobile menu. Dropdown shows a typed-hint so the
            user knows what the raw input maps to (block / tx / address)
            and can jump without submitting. */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md hidden md:flex relative">
          <div className="relative w-full">
            {searching ? (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--gold)] animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--tx-d)]" />
            )}
            <input
              ref={searchRef}
              type="text"
              placeholder={t("search_placeholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={searching}
              className="w-full h-9 pl-9 pr-12 text-[12px] bg-[color-mix(in_oklab,var(--foreground)_3%,transparent)] border border-[var(--brd)] rounded-full tracking-[.05em] placeholder:text-[var(--tx-d)] focus:outline-none focus:border-[var(--gold)] focus:bg-[color-mix(in_oklab,var(--gold)_4%,transparent)] transition-all disabled:opacity-60"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[var(--tx-d)] border border-[var(--brd)] rounded px-1.5 py-0.5 hidden xl:inline-block">
              ⌘K
            </kbd>
          </div>
          <SearchAutocomplete query={query} onPick={() => { setQuery(""); searchRef.current?.blur(); }} />
        </form>

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

          {/* Live network-health dot — colour reflects time since the chain
              head last advanced. Sits next to the network switcher so the
              user has both "which network" and "is it healthy" answered
              in one glance. */}
          <NetworkHealth />

          {/* Network — segmented control so both options are always visible.
              The "Main"/"Test" labels used to be sm:+ only, which made the
              toggle read as two undecorated dots on phones (chainlist
              reviewer complaint: "tidak ada cara switch ke testnet").
              Labels now show on every breakpoint; chain ID stays lg:+ to
              avoid crowding small screens. */}
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
              <span>Main</span>
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
              <span>Test</span>
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
              {searching ? (
                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--gold)] animate-spin" />
              ) : (
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--tx-d)]" />
              )}
              <input
                type="text"
                placeholder={t("search_placeholder")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={searching}
                className="w-full h-9 pl-9 pr-4 text-[12px] bg-[color-mix(in_oklab,var(--foreground)_3%,transparent)] border border-[var(--brd)] rounded-full focus:outline-none focus:border-[var(--gold)] disabled:opacity-60"
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
            {[
              { title: "EVM", items: EVM_ITEMS },
              { title: "Native", items: NATIVE_ITEMS },
              { title: "Chain", items: CHAIN_ITEMS },
              { title: "Leaderboard", items: LEADERBOARD_ITEMS },
            ].map((group) => (
              <div key={group.title} className="pt-3 mt-1">
                <p className="py-2 text-[10px] tracking-[.2em] uppercase text-[var(--tx-d)]">
                  {group.title}
                </p>
                {group.items.map(({ href, label, icon: Icon, color }) => (
                  <Link
                    key={href}
                    href={href as Parameters<typeof Link>[0]["href"]}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 py-3 text-[12px] tracking-[.1em] uppercase text-[var(--tx-m)] hover:text-[var(--gold)] border-b border-[var(--brd)]"
                  >
                    <Icon className={`h-3.5 w-3.5 ${color}`} />
                    {label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

// Reusable rail dropdown — used by EVM / Native / Chain in the desktop
// nav. Same pattern as the Leaderboard dropdown but with an item shape
// that includes a per-item hint subtitle. forwardRef so the click-outside
// handler in the parent can bind to the wrapping div.
import { forwardRef } from "react";

interface RailDropdownItem {
  readonly href: string;
  readonly label: string;
  readonly icon: React.ElementType;
  readonly color: string;
  readonly hint?: string;
}

interface RailDropdownProps {
  label: string;
  active: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  items: readonly RailDropdownItem[];
}

const RailDropdown = forwardRef<HTMLDivElement, RailDropdownProps>(function RailDropdown(
  { label, active, open, onToggle, onClose, items },
  ref,
) {
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={onToggle}
        className={`inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-light tracking-[.1em] uppercase transition-all duration-200 rounded-full border ${
          active
            ? "text-[var(--gold)] bg-[color-mix(in_oklab,var(--gold)_6%,transparent)] border-[color-mix(in_oklab,var(--gold)_15%,transparent)]"
            : "text-[var(--tx-d)] border-transparent hover:text-[var(--gold)]"
        }`}
      >
        {label}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-2 w-64 bg-[var(--bk)]/95 backdrop-blur-xl border border-[var(--brd)] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,.3)] py-1.5 z-50">
          {items.map(({ href, label: itemLabel, icon: Icon, color, hint }) => (
            <Link
              key={href}
              href={href as Parameters<typeof Link>[0]["href"]}
              onClick={onClose}
              className="flex items-start gap-3 px-3 py-2 text-[11px] tracking-[.1em] uppercase text-[var(--tx-m)] hover:text-[var(--gold)] hover:bg-[color-mix(in_oklab,var(--gold)_5%,transparent)] transition-colors"
            >
              <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${color}`} />
              <span className="flex flex-col gap-0.5">
                <span>{itemLabel}</span>
                {hint && (
                  <span className="text-[10px] normal-case tracking-normal text-[var(--tx-d)]">
                    {hint}
                  </span>
                )}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
});

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
