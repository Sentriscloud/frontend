import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SentrixLogo } from "@/components/common/Logo";

export function Footer() {
  const t = useTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--brd)] mt-auto">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <div className="flex items-center gap-2.5">
              <SentrixLogo size={26} />
              <span className="font-serif text-[16px] font-light tracking-[.22em] uppercase text-[var(--gold)]">
                SENTRI<span className="text-[var(--gold-l)] font-normal">X</span>
                <span className="ml-1.5 text-[10px] tracking-[.15em] text-[var(--tx-d)] font-sans">Scan</span>
              </span>
            </div>
            <p className="text-[12px] text-[var(--tx-m)] leading-relaxed font-light max-w-xs">
              Block explorer for Sentrix Chain (SRX). Blocks, transactions, validators, and SRC-20 tokens — all in one place.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-mono text-[10px] tracking-[.22em] uppercase text-[var(--tx-d)]">Explorer</h3>
            <nav className="flex flex-col gap-2 text-[12px]">
              <Link href="/" prefetch={false} className="text-[var(--tx-m)] hover:text-[var(--gold)] transition-colors">Home</Link>
              <Link href="/blocks" prefetch={false} className="text-[var(--tx-m)] hover:text-[var(--gold)] transition-colors">Blocks</Link>
              <Link href="/validators" prefetch={false} className="text-[var(--tx-m)] hover:text-[var(--gold)] transition-colors">Validators</Link>
              <Link href="/tokens" prefetch={false} className="text-[var(--tx-m)] hover:text-[var(--gold)] transition-colors">Tokens</Link>
              <Link href="/leaderboard/account/holders" prefetch={false} className="text-[var(--tx-m)] hover:text-[var(--gold)] transition-colors">Leaderboard</Link>
            </nav>
          </div>

          <div className="space-y-3">
            <h3 className="font-mono text-[10px] tracking-[.22em] uppercase text-[var(--tx-d)]">Network</h3>
            <div className="flex flex-col gap-2 text-[12px]">
              <div className="flex items-center justify-between">
                <span className="text-[var(--tx-m)]">Mainnet</span>
                <span className="font-mono text-[11px] text-[var(--gold)]">7119</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--tx-m)]">Testnet</span>
                <span className="font-mono text-[11px] text-[var(--gold)]">7120</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--tx-m)]">Currency</span>
                <span className="font-mono text-[11px] text-[var(--gold)]">SRX</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-mono text-[10px] tracking-[.22em] uppercase text-[var(--tx-d)]">Resources</h3>
            <nav className="flex flex-col gap-2 text-[12px]">
              <a href="https://sentrix.sentriscloud.com" target="_blank" rel="noopener noreferrer" className="text-[var(--tx-m)] hover:text-[var(--gold)] transition-colors">
                {t("chain")}
              </a>
              <a href="https://github.com/sentrix-labs" target="_blank" rel="noopener noreferrer" className="text-[var(--tx-m)] hover:text-[var(--gold)] transition-colors">
                {t("github")}
              </a>
              <a href="https://t.me/SentrixCommunity" target="_blank" rel="noopener noreferrer" className="text-[var(--tx-m)] hover:text-[var(--gold)] transition-colors">
                Telegram
              </a>
            </nav>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[var(--brd)] flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[10px] tracking-[.1em] uppercase text-[var(--tx-d)]">{t("copyright", { year })}</p>
          <p className="text-[10px] font-mono tracking-[.1em] text-[var(--tx-d)]">v0.2.0</p>
        </div>
      </div>
    </footer>
  );
}
