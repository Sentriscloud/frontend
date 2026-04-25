import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sentrix Faucet — Get Free SRX',
  description: 'Get free SRX tokens for testing on Sentrix Chain. 10 SRX per request, 1 request per 24 hours.',
  keywords: ['Sentrix', 'faucet', 'SRX', 'testnet', 'free tokens'],
  openGraph: {
    title: 'Sentrix Faucet',
    description: 'Get free SRX for testing on Sentrix Chain.',
    siteName: 'Sentrix Faucet',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  )
}
