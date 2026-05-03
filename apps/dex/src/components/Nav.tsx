'use client'

// Shared top nav for the DEX. Re-used across /, /pools, /pools/[pair],
// /add, /positions, /remove/[pair]. Sticky-on-scroll, dark backdrop,
// links highlight the active route. WalletConnect lives at the right
// end so the user can manage their wallet from any page.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useChainId } from 'wagmi'
import { ArrowRightLeft, Droplet, Plus, Wallet as WalletIcon } from 'lucide-react'
import { WalletConnect } from '@/components/wallet/WalletConnect'

const TABS: { href: string; label: string; icon: React.ReactNode; matches: (p: string) => boolean }[] = [
  {
    href: '/',
    label: 'Swap',
    icon: <ArrowRightLeft className="w-3.5 h-3.5" />,
    matches: (p) => p === '/',
  },
  {
    href: '/pools',
    label: 'Pools',
    icon: <Droplet className="w-3.5 h-3.5" />,
    matches: (p) => p.startsWith('/pools'),
  },
  {
    href: '/add',
    label: 'Add',
    icon: <Plus className="w-3.5 h-3.5" />,
    matches: (p) => p.startsWith('/add') || p.startsWith('/remove'),
  },
  {
    href: '/positions',
    label: 'Positions',
    icon: <WalletIcon className="w-3.5 h-3.5" />,
    matches: (p) => p.startsWith('/positions'),
  },
]

export function Nav() {
  const pathname = usePathname()
  const chainId = useChainId()
  const net: 'mainnet' | 'testnet' = chainId === 7120 ? 'testnet' : 'mainnet'

  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-[var(--bk)]/80 border-b border-[var(--brd)]">
      <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="text-lg sm:text-xl font-semibold tracking-tight truncate"
            style={{ color: 'var(--gold)' }}
          >
            Sentrix DEX
          </Link>
          <span className="hidden sm:inline text-[10px] uppercase tracking-[.18em] text-[var(--tx-d)]">
            v2 · {net === 'testnet' ? 'testnet 7120' : 'mainnet 7119'}
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          {TABS.map((t) => {
            const active = t.matches(pathname)
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium tracking-wide transition-all ${
                  active
                    ? 'bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--brd2)]'
                    : 'text-[var(--tx-d)] hover:text-[var(--tx)] hover:bg-[var(--sf)] border border-transparent'
                }`}
              >
                {t.icon}
                {t.label}
              </Link>
            )
          })}
        </nav>

        <WalletConnect />
      </div>

      {/* Mobile tab strip — collapses below the wallet row at <md so the
          nav doesn't overflow on phone widths. */}
      <div className="md:hidden border-t border-[var(--brd)] bg-[var(--bk)]/60">
        <div className="max-w-5xl mx-auto px-5 py-1.5 flex items-center gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const active = t.matches(pathname)
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  active
                    ? 'bg-[var(--gold)]/10 text-[var(--gold)]'
                    : 'text-[var(--tx-d)] hover:text-[var(--tx)]'
                }`}
              >
                {t.icon}
                {t.label}
              </Link>
            )
          })}
        </div>
      </div>
    </header>
  )
}
