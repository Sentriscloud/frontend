import type { Metadata } from 'next'
import { SentrixWalletProvider } from '@sentriscloud/wallet-config'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'CoinBlast — Launch Your Coin',
  description: 'Launch your coin in seconds. No coding. No pre-sale. Fair for everyone. Powered by Sentrix Chain.',
  keywords: ['CoinBlast', 'coin launchpad', 'bonding curve', 'SRX', 'fair launch'],
  openGraph: {
    title: 'CoinBlast',
    description: 'Launch your coin in seconds. Fair for everyone.',
    siteName: 'CoinBlast',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen flex flex-col">
        <SentrixWalletProvider
          appName="CoinBlast"
          appDescription="Launch your coin in seconds. Fair for everyone."
          appUrl="https://coinblast.sentrixchain.com"
          mainnetOnly
        >
          <Header />
          <main className="flex-1 relative z-[1]">
            {children}
          </main>
          <Footer />
        </SentrixWalletProvider>
      </body>
    </html>
  )
}
