import type { Metadata } from 'next'
import Script from 'next/script'
import { PrivyProviderDynamic } from './_components/privy-provider-dynamic'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sentrix Faucet — Free SRX',
  description:
    'Get free SRX tokens for testing or new-wallet onboarding on Sentrix Chain. Manual address entry, 24h cooldown, Cloudflare-protected on mainnet.',
  keywords: ['Sentrix', 'faucet', 'SRX', 'testnet', 'mainnet', 'onboarding', 'free tokens'],
  metadataBase: new URL('https://faucet.sentrixchain.com'),
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/brand/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/brand/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
    ],
    apple: '/brand/apple-touch-icon.png',
    shortcut: '/favicon.ico',
  },
  openGraph: {
    title: 'Sentrix Faucet',
    description: 'Free SRX for builders and new wallets on Sentrix Chain.',
    siteName: 'Sentrix Faucet',
    type: 'website',
    url: 'https://faucet.sentrixchain.com',
    images: [{ url: '/brand/og-image.png', width: 1200, height: 630, alt: 'Sentrix Faucet' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sentrix Faucet',
    description: 'Free SRX for builders and new wallets on Sentrix Chain.',
    images: ['/brand/og-image.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const turnstileEnabled = Boolean(
    process.env.NEXT_PUBLIC_TESTNET_TURNSTILE_SITE_KEY ||
    process.env.NEXT_PUBLIC_MAINNET_TURNSTILE_SITE_KEY
  )

  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen">
        <PrivyProviderDynamic>
          {children}
        </PrivyProviderDynamic>
        {turnstileEnabled && (
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js"
            async
            defer
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  )
}
