import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-[var(--brd)] mt-20 relative z-[1]">
      <div className="max-w-7xl mx-auto px-6 md:px-[60px] py-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[var(--gold)]/15 border border-[var(--brd2)] flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L12 4v6l-5 3L2 10V4l5-3z" stroke="var(--gold)" strokeWidth="1.5" fill="none" />
                <path d="M7 4v6M4 5.5l3 1.5 3-1.5" stroke="var(--gold)" strokeWidth="1" />
              </svg>
            </div>
            <div>
              <div className="font-serif text-sm tracking-[.25em] uppercase text-[var(--tx)]">
                Coin<span className="text-[var(--gold)]">Blast</span>
              </div>
              <div className="text-xs text-[var(--tx-d)] mt-0.5">Powered by Sentrix Chain</div>
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-5 text-sm text-[var(--tx-d)]">
            <Link href="https://scan.sentrixchain.com" target="_blank"
              className="hover:text-[var(--gold)] transition-colors">Explorer</Link>
            <Link href="https://solux.sentriscloud.com" target="_blank"
              className="hover:text-[var(--gold)] transition-colors">Wallet</Link>
            <Link href="https://api.sentrixchain.com" target="_blank"
              className="hover:text-[var(--gold)] transition-colors">API</Link>
            <Link href="https://sentrixchain.com" target="_blank"
              className="hover:text-[var(--gold)] transition-colors">About</Link>
            <Link href="https://github.com/sentrix-labs/sentrix" target="_blank"
              className="hover:text-[var(--gold)] transition-colors">GitHub</Link>
            <Link href="https://t.me/SentrixChain" target="_blank"
              className="hover:text-[var(--gold)] transition-colors">Telegram</Link>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--brd)] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[var(--tx-d)]">
          <p>© 2026 SentrisCloud. BUSL-1.1 License.</p>
          <p>Chain ID: 7119 · 1 SRX per launch · 1% trading fee</p>
        </div>
      </div>
    </footer>
  )
}
