import { SentrixLogo } from "@/components/ui/logo";
import { SITE } from "@/data/content";

const COLUMNS = [
  {
    heading: "Ecosystem",
    links: [
      { label: "Explorer",     href: SITE.explorer },
      { label: "Faucet",       href: SITE.faucet },
      { label: "Solux Wallet", href: SITE.solux },
      { label: "CoinBlast",    href: SITE.coinblast },
    ],
  },
  {
    heading: "Build",
    links: [
      { label: "Docs",       href: SITE.docs },
      { label: "Whitepaper", href: SITE.whitepaper },
      { label: "RPC",        href: SITE.rpc },
      { label: "Testnet RPC", href: SITE.testnetRpc },
      { label: "GitHub",     href: SITE.github },
      { label: "Releases",   href: SITE.releases },
      { label: "Brand kit",  href: SITE.brandKit },
    ],
  },
  {
    heading: "Community",
    links: [
      { label: "Telegram", href: SITE.telegram },
      { label: "Twitter",  href: SITE.twitter },
      { label: "Security", href: `mailto:${SITE.email}` },
    ],
  },
];

const SOCIALS = [
  {
    label: "Twitter / X",
    href: SITE.twitter,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.84L1.254 2.25H8.08l4.258 5.63 5.907-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: "Telegram",
    href: SITE.telegram,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]" aria-hidden="true">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
  },
  {
    label: "GitHub",
    href: SITE.github,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]" aria-hidden="true">
        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
      </svg>
    ),
  },
];

export function Footer() {
  return (
    <footer className="border-t border-[var(--brd)] bg-[var(--sf)]">

      {/* ── Top bar: logo + socials ─────────────────────────── */}
      <div className="px-6 md:px-[60px] pt-12 pb-8 flex items-center justify-between gap-6 flex-wrap">
        <div className="flex items-center gap-2.5 text-[var(--gold-dk)]">
          <SentrixLogo size={28} />
          <span className="font-serif text-[16px] font-light tracking-[.04em] uppercase text-[var(--gold-dk)] leading-none">
            SENTRIX
          </span>
        </div>

        <div className="flex items-center gap-3">
          {SOCIALS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target={s.href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              aria-label={s.label}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-[var(--brd)] text-[var(--tx-d)] hover:text-[var(--gold)] hover:border-[var(--brd2)] transition-colors"
            >
              {s.icon}
            </a>
          ))}
        </div>
      </div>

      {/* ── 3-column link grid ──────────────────────────────── */}
      <div className="px-6 md:px-[60px] pb-12 grid grid-cols-1 sm:grid-cols-3 gap-8">
        {COLUMNS.map((col) => (
          <div key={col.heading}>
            <p className="text-[11px] font-medium tracking-[.12em] uppercase text-[var(--tx-m)] mb-4">
              {col.heading}
            </p>
            <ul className="flex flex-col gap-3">
              {col.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.href.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="text-[13px] font-light text-[var(--tx-d)] hover:text-[var(--gold)] transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* ── Copyright bar ───────────────────────────────────── */}
      <div className="border-t border-[var(--brd)] px-6 md:px-[60px] py-5">
        <span className="text-[11px] text-[var(--tx-d)] font-light">
          &copy; 2026 SentrisCloud. All rights reserved.
        </span>
      </div>

    </footer>
  );
}
