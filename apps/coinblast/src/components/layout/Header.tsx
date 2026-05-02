'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { WalletConnect } from '@/components/wallet/WalletConnect'
import { useEffect, useState } from 'react'

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/explore', label: 'Explore' },
  { href: '/live', label: 'Live' },
  { href: '/create', label: 'Launch' },
  { href: '/portfolio', label: 'Portfolio' },
]

// Ticker tape removed 2026-05-01 along with mock-data — rendering empty
// from on-chain reads (zero curves deployed) made the marquee read as a
// blank stripe. Re-add when the launchpad has live tokens to scroll
// through (CoinBlastCurve `Buy`/`Sell` events, or aggregated 24h % via
// the indexer).

export function Header() {
  const pathname = usePathname()
  const [hidden, setHidden] = useState(false)
  const [lastY, setLastY] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setHidden(y > lastY && y > 80)
      setLastY(y)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [lastY])

  return (
    <>
      {/* Top nav — fixed + slides up on scroll-down. Wrapped on its own
          so the transition transform doesn't drag the mobile bottom
          tabs along with it (transform creates a containing block,
          which would re-anchor any nested fixed-position child to
          this element, sliding it offscreen on scroll-hide). */}
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-transform duration-300',
          hidden && '-translate-y-full'
        )}
      >
        <div
          className="border-b border-[var(--brd)]"
          style={{ background: 'rgba(12,12,16,0.92)', backdropFilter: 'blur(20px)' }}
        >
        <div className="max-w-7xl mx-auto px-6 h-[60px] flex items-center justify-between gap-6">
          {/* Logo — canonical Sentrix mark + CoinBlast wordmark (sub-brand
              pairs with the parent Sentrix mark, no longer the rocket icon). */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <img
              src="/brand/sentrix-mark.svg"
              alt="Sentrix"
              width={26}
              height={26}
              className="object-contain"
            />
            <span className="font-serif text-sm tracking-[.25em] uppercase text-[var(--tx)] group-hover:text-[var(--gold)] transition-colors hidden sm:block">
              Coin<span className="text-[var(--gold)]">Blast</span>
            </span>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => {
              const active = pathname === item.href
              const isLaunch = item.href === '/create'
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'px-4 py-1.5 text-[11px] font-medium tracking-[.1em] uppercase rounded-full transition-all duration-200',
                    active
                      ? 'text-[var(--gold)] bg-[var(--gold)]/10 border border-[var(--brd2)]'
                      : isLaunch
                        ? 'text-[var(--gold)] hover:bg-[var(--gold)]/10'
                        : 'text-[var(--tx-d)] hover:text-[var(--tx)] hover:bg-[var(--sf)]'
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <WalletConnect />
        </div>
      </div>
      </header>

      {/* Mobile bottom tabs — sibling of <header>, NOT child. Keeping it
          out of the scroll-hide transform tree means it stays anchored
          to the viewport bottom while the user scrolls (the previous
          nesting made it disappear with the top bar on scroll-down).
          `pb-[env(safe-area-inset-bottom)]` lifts the strip above
          iPhone home-bar territory; pages already pad their content
          with `pb-20` so nothing slips beneath it. */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 flex border-t border-[var(--brd)] z-50"
        style={{
          background: 'rgba(12,12,16,0.95)',
          backdropFilter: 'blur(20px)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {NAV.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                // 44px min-height matches the iOS HIG touch target floor —
                // py-3 alone hit 40px on the smallest viewports.
                'flex-1 py-3 min-h-[44px] flex items-center justify-center text-center text-[10px] font-medium tracking-[.1em] uppercase transition-colors',
                active
                  ? 'text-[var(--gold)]'
                  : item.href === '/create'
                    ? 'text-[var(--gold)]/70 hover:text-[var(--gold)]'
                    : 'text-[var(--tx-d)] hover:text-[var(--tx)]'
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </>
  )
}
