import type { Metadata, Viewport } from 'next'
import { PrivyProviderDynamic } from './_components/privy-provider-dynamic'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CookieConsent } from '@/components/layout/CookieConsent'

// Absolute base for OpenGraph + Twitter card image URLs. Without this,
// Slack / Twitter / Telegram unfurls fall back to the relative URL (which
// they ignore) and the preview comes up blank on Windows + iOS clients.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://coinblast.sentriscloud.com'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'CoinBlast — Launch Your Coin',
  description:
    'Launch your coin in seconds. No coding. No pre-sale. Fair for everyone. Powered by Sentrix Chain.',
  keywords: ['CoinBlast', 'coin launchpad', 'bonding curve', 'SRX', 'fair launch'],
  // Next 15 auto-detects icon.png / apple-icon.png / favicon.ico in the
  // app dir, but pinning the manifest keeps Lighthouse + Windows tile
  // installs from falling back to the wrong asset.
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/icon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
    shortcut: '/favicon.ico',
  },
  openGraph: {
    title: 'CoinBlast',
    description: 'Launch your coin in seconds. Fair for everyone.',
    siteName: 'CoinBlast',
    type: 'website',
    url: SITE_URL,
    images: [{ url: '/icon-512.png', width: 512, height: 512 }],
  },
  twitter: {
    card: 'summary',
    title: 'CoinBlast',
    description: 'Launch your coin in seconds. Fair for everyone.',
    images: ['/icon-512.png'],
  },
}

// Viewport export — Next 15 wants this separate from `metadata`. The
// dark theme color paints the Edge / Chrome address bar + Windows tile
// chrome. `viewportFit: cover` lets us pull layout into iPhone notch
// territory; pages opt back out via env(safe-area-inset-*) padding.
export const viewport: Viewport = {
  themeColor: '#0A0A0F',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen flex flex-col">
        <PrivyProviderDynamic>
          <Header />
          <main className="flex-1 relative z-[1]">
            {children}
          </main>
          <Footer />
          <CookieConsent />
        </PrivyProviderDynamic>
      </body>
    </html>
  )
}
