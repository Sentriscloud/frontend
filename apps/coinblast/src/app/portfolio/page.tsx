'use client'
import { useWalletStore } from '@/store/wallet'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { TokenCard } from '@/components/token/TokenCard'
import { formatAddress } from '@/lib/utils'
import type { Token } from '@/types'
import { Wallet, Coins } from 'lucide-react'

// Holdings + tx history are read on-chain once the launchpad ships
// (per-curve `tokensSold` for balances, Buy/Sell event logs for history).
// Until then the connected-wallet view stays empty.
const HOLDINGS: Array<{ token: Token; amount: number; avgBuyPrice: number }> = []
const CREATED: Token[] = []
const TX_HISTORY: Array<{
  type: 'buy' | 'sell'
  token: Token
  amount: number
  paid?: number
  received?: number
  timestamp: number
}> = []

export default function PortfolioPage() {
  const { isConnected, address, connect } = useWalletStore()

  if (!isConnected) {
    const valueProps = [
      'Holdings across every CoinBlast token',
      'Buy / sell history pulled live from chain',
      'Tokens you created, with curve progress + fees earned',
    ]
    return (
      <div className="max-w-md mx-auto px-4 pt-[96px] pb-20 text-center">
        <h1 className="sr-only">Your Portfolio</h1>
        <div className="w-20 h-20 bg-[var(--sf)] border border-[var(--brd)] rounded-full flex items-center justify-center mx-auto mb-6">
          <Wallet className="w-10 h-10 text-[var(--tx-d)]" />
        </div>
        <h2 className="text-2xl font-black text-[var(--tx)] mb-3">Connect your wallet</h2>
        <p className="text-[var(--tx-m)] mb-6">
          Connect on Sentrix Chain to see your activity here:
        </p>
        <ul className="text-left text-sm text-[var(--tx-m)] space-y-2 mb-8 mx-auto max-w-xs">
          {valueProps.map((line) => (
            <li key={line} className="flex items-start gap-2">
              <span className="text-[var(--gold)] mt-0.5">·</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <Button variant="gold" size="lg" onClick={connect}>
          <Wallet className="w-5 h-5" />
          Connect Wallet
        </Button>
        <p className="text-xs text-[var(--tx-d)] mt-4">Chain ID 7119 · SRX native token</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pt-[96px] pb-10">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div>
          <Badge variant="gold" className="mb-3">Portfolio</Badge>
          <h1 className="text-3xl font-black text-[var(--tx)]">My Portfolio</h1>
          <p className="text-[var(--tx-d)] font-mono text-sm mt-1">{formatAddress(address!, 8)}</p>
        </div>
      </div>

      {HOLDINGS.length === 0 && CREATED.length === 0 && TX_HISTORY.length === 0 ? (
        <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-10 text-center">
          <Coins className="w-10 h-10 text-[var(--tx-d)] mx-auto mb-4" />
          <h2 className="text-lg font-bold text-[var(--tx)] mb-2">No on-chain activity yet</h2>
          <p className="text-sm text-[var(--tx-m)] max-w-md mx-auto">
            The launchpad has no live tokens to trade. Once the bonding-curve contracts ship,
            holdings and trade history for this address show up here automatically.
          </p>
        </div>
      ) : (
        <>
          {/* Holdings table */}
          <section className="mb-10">
            <h2 className="text-lg font-bold text-[var(--tx)] mb-4">Holdings</h2>
            <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-6 text-sm text-[var(--tx-d)]">
              No tokens held.
            </div>
          </section>

          {CREATED.length > 0 && (
            <section className="mb-10">
              <h2 className="text-lg font-bold text-[var(--tx)] mb-4">Tokens I Created</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {CREATED.map((token) => (
                  <TokenCard key={token.address} token={token} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
