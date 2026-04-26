import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sentrix Faucet — Free SRX',
  description:
    'Get free SRX tokens for testing or new-wallet onboarding on Sentrix Chain. Manual address entry, 24h cooldown, Cloudflare-protected on mainnet.',
  keywords: ['Sentrix', 'faucet', 'SRX', 'testnet', 'mainnet', 'onboarding', 'free tokens'],
  openGraph: {
    title: 'Sentrix Faucet',
    description: 'Free SRX for builders and new wallets on Sentrix Chain.',
    siteName: 'Sentrix Faucet',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const turnstileEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)

  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen">
        {children}
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
