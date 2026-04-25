'use client'
import { useWalletStore } from '@/store/wallet'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { TokenCard } from '@/components/token/TokenCard'
import { MOCK_TOKENS } from '@/lib/mock-data'
import { formatNumber, formatAddress, formatTimestamp } from '@/lib/utils'
import { Wallet, TrendingUp, Coins } from 'lucide-react'

// Mock portfolio for demo
const MOCK_HOLDINGS = [
  { token: MOCK_TOKENS[0], amount: 15_000_000, avgBuyPrice: 0.000095 },
  { token: MOCK_TOKENS[2], amount: 8_500_000, avgBuyPrice: 0.000098 },
  { token: MOCK_TOKENS[3], amount: 500_000, avgBuyPrice: 0.0001 },
]

const MOCK_CREATED = [MOCK_TOKENS[0]]

const MOCK_TX_HISTORY = [
  { type: 'buy', token: MOCK_TOKENS[0], amount: 5_000_000, paid: 475, timestamp: Date.now() / 1000 - 3600 * 12 },
  { type: 'buy', token: MOCK_TOKENS[2], amount: 8_500_000, paid: 833, timestamp: Date.now() / 1000 - 86400 * 2 },
  { type: 'sell', token: MOCK_TOKENS[1], amount: 1_000_000, received: 101, timestamp: Date.now() / 1000 - 86400 * 3 },
  { type: 'buy', token: MOCK_TOKENS[3], amount: 500_000, paid: 50, timestamp: Date.now() / 1000 - 86400 * 4 },
]

export default function PortfolioPage() {
  const { isConnected, address, connect } = useWalletStore()

  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto px-4 pt-[96px] pb-20 text-center">
        <div className="w-20 h-20 bg-[var(--sf)] border border-[var(--brd)] rounded-full flex items-center justify-center mx-auto mb-6">
          <Wallet className="w-10 h-10 text-[var(--tx-d)]" />
        </div>
        <h2 className="text-2xl font-black text-[var(--tx)] mb-3">Connect your wallet</h2>
        <p className="text-[var(--tx-m)] mb-8 max-w-md mx-auto">
          Connect your MetaMask wallet to Sentrix Chain to view your portfolio, holdings, and transaction history.
        </p>
        <Button variant="gold" size="lg" onClick={connect}>
          <Wallet className="w-5 h-5" />
          Connect Wallet
        </Button>
        <p className="text-xs text-[var(--tx-d)] mt-4">Chain ID 7119 · SRX native token</p>
      </div>
    )
  }

  const totalValue = MOCK_HOLDINGS.reduce((sum, h) => sum + h.amount * h.token.price, 0)
  const totalInvested = MOCK_HOLDINGS.reduce((sum, h) => sum + h.amount * h.avgBuyPrice, 0)
  const totalPnL = totalValue - totalInvested
  const pnlPct = totalInvested > 0 ? ((totalPnL / totalInvested) * 100) : 0

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

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Portfolio Value', value: `${formatNumber(totalValue, 2)} SRX`, icon: <Coins className="w-4 h-4 text-[var(--gold)]" /> },
          { label: 'Total Invested', value: `${formatNumber(totalInvested, 2)} SRX`, icon: <Wallet className="w-4 h-4 text-[var(--tx-m)]" /> },
          {
            label: 'P&L',
            value: `${totalPnL >= 0 ? '+' : ''}${formatNumber(totalPnL, 2)} SRX`,
            sub: `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%`,
            color: totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400',
            icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
          },
          { label: 'Tokens Held', value: MOCK_HOLDINGS.length.toString(), icon: <Coins className="w-4 h-4 text-[var(--gold-l)]" /> },
        ].map((card) => (
          <div key={card.label} className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              {card.icon}
              <span className="text-xs text-[var(--tx-d)]">{card.label}</span>
            </div>
            <p className={`font-bold ${card.color ?? 'text-[var(--tx)]'}`}>{card.value}</p>
            {card.sub && <p className={`text-xs ${card.color ?? 'text-[var(--tx-d)]'}`}>{card.sub}</p>}
          </div>
        ))}
      </div>

      {/* Holdings table */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-[var(--tx)] mb-4">Holdings</h2>
        <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--brd)] text-xs text-[var(--tx-d)]">
                  <th className="text-left px-4 py-3">Token</th>
                  <th className="text-right px-4 py-3">Balance</th>
                  <th className="text-right px-4 py-3">Price</th>
                  <th className="text-right px-4 py-3">Value</th>
                  <th className="text-right px-4 py-3">Avg Buy</th>
                  <th className="text-right px-4 py-3">P&L</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_HOLDINGS.map((h) => {
                  const value = h.amount * h.token.price
                  const cost = h.amount * h.avgBuyPrice
                  const pnl = value - cost
                  const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0
                  return (
                    <tr key={h.token.address} className="border-b border-[var(--brd)]/50 hover:bg-[var(--sf2)]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img src={h.token.imageUrl} alt="" className="w-8 h-8 rounded-lg bg-[var(--sf2)]" />
                          <div>
                            <p className="text-[var(--tx)] font-medium">{h.token.name}</p>
                            <p className="text-[var(--tx-d)] text-xs font-mono">{h.token.symbol}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--tx)]">{formatNumber(h.amount, 0)}</td>
                      <td className="px-4 py-3 text-right text-[var(--tx)] text-xs">{h.token.price.toFixed(8)}</td>
                      <td className="px-4 py-3 text-right text-[var(--tx)]">{formatNumber(value, 2)} SRX</td>
                      <td className="px-4 py-3 text-right text-[var(--tx-d)] text-xs">{h.avgBuyPrice.toFixed(8)}</td>
                      <td className="px-4 py-3 text-right">
                        <p className={pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {pnl >= 0 ? '+' : ''}{formatNumber(pnl, 2)} SRX
                        </p>
                        <p className={`text-xs ${pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
                        </p>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Created tokens */}
      {MOCK_CREATED.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-bold text-[var(--tx)] mb-4">Tokens I Created</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MOCK_CREATED.map((token) => (
              <TokenCard key={token.address} token={token} />
            ))}
          </div>
        </section>
      )}

      {/* Transaction history */}
      <section>
        <h2 className="text-lg font-bold text-[var(--tx)] mb-4">Transaction History</h2>
        <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--brd)] text-xs text-[var(--tx-d)]">
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Token</th>
                  <th className="text-right px-4 py-3">Amount</th>
                  <th className="text-right px-4 py-3">SRX</th>
                  <th className="text-right px-4 py-3">Time</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_TX_HISTORY.map((tx, i) => (
                  <tr key={i} className="border-b border-[var(--brd)]/50 hover:bg-[var(--sf2)]">
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${tx.type === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {tx.type === 'buy' ? '▲ BUY' : '▼ SELL'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <img src={tx.token.imageUrl} alt="" className="w-6 h-6 rounded bg-[var(--sf2)]" />
                        <span className="text-[var(--tx)]">{tx.token.symbol}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--tx-m)]">{formatNumber(tx.amount, 0)}</td>
                    <td className="px-4 py-3 text-right text-[var(--tx)]">
                      {tx.type === 'buy'
                        ? `${formatNumber(tx.paid ?? 0, 2)} paid`
                        : `${formatNumber(tx.received ?? 0, 2)} received`}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--tx-d)] text-xs">
                      {formatTimestamp(tx.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
