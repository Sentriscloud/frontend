'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { estimateBuy, estimateSell, TRADING_FEE } from '@/lib/bonding-curve'
import { formatNumber, formatPrice } from '@/lib/utils'
import type { Token } from '@/types'
import { useWalletStore } from '@/store/wallet'
import { ArrowDown, Info } from 'lucide-react'

interface BuySellWidgetProps {
  token: Token
}

export function BuySellWidget({ token }: BuySellWidgetProps) {
  const [tab, setTab] = useState<'buy' | 'sell'>('buy')
  const [amount, setAmount] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const { isConnected, connect } = useWalletStore()

  const amountNum = parseFloat(amount) || 0

  const buyEst = tab === 'buy' && amountNum > 0
    ? estimateBuy(amountNum, token.tokensSold, token.totalSupply)
    : null

  const sellEst = tab === 'sell' && amountNum > 0
    ? estimateSell(amountNum, token.tokensSold, token.totalSupply)
    : null

  const handleAction = () => {
    if (!isConnected) { connect(); return }
    setShowConfirm(true)
  }

  return (
    <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-4">
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--bk)] rounded-xl mb-4">
        {(['buy', 'sell'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setAmount('') }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              tab === t
                ? t === 'buy'
                  ? 'bg-[var(--gold)] text-[var(--bk)]'
                  : 'bg-red-600 text-white'
                : 'text-[var(--tx-d)] hover:text-[var(--tx)]'
            }`}
          >
            {t === 'buy' ? '🟢 Buy' : '🔴 Sell'}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="space-y-3">
        <Input
          label={tab === 'buy' ? 'Pay (SRX)' : `Sell (${token.symbol})`}
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          suffix={tab === 'buy' ? 'SRX' : token.symbol}
          min="0"
        />

        {/* Arrow */}
        <div className="flex justify-center">
          <div className="w-8 h-8 bg-[var(--sf2)] rounded-full flex items-center justify-center">
            <ArrowDown className="w-4 h-4 text-[var(--tx-d)]" />
          </div>
        </div>

        {/* Estimate output */}
        <div className="bg-[var(--bk)] rounded-xl p-3 border border-[var(--brd)]">
          <p className="text-xs text-[var(--tx-d)] mb-1">
            {tab === 'buy' ? `You receive (${token.symbol})` : 'You receive (SRX)'}
          </p>
          {tab === 'buy' && buyEst ? (
            <>
              <p className="text-lg font-bold text-[var(--tx)]">
                {formatNumber(buyEst.tokensOut, 0)} {token.symbol}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-[var(--tx-d)]">
                <span>Fee: {formatNumber(buyEst.fee, 4)} SRX ({(TRADING_FEE * 100).toFixed(0)}%)</span>
                <span>Impact: ~{buyEst.priceImpact.toFixed(2)}%</span>
              </div>
            </>
          ) : tab === 'sell' && sellEst ? (
            <>
              <p className="text-lg font-bold text-[var(--tx)]">
                {formatNumber(sellEst.srxOut, 4)} SRX
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-[var(--tx-d)]">
                <span>Fee: {formatNumber(sellEst.fee, 4)} SRX</span>
                <span>Impact: ~{sellEst.priceImpact.toFixed(2)}%</span>
              </div>
            </>
          ) : (
            <p className="text-[var(--tx-d)] text-sm">Enter amount above</p>
          )}
        </div>

        {/* Current price info */}
        <div className="flex items-center gap-2 text-xs text-[var(--tx-d)] bg-[var(--bk)] rounded-xl px-3 py-2 border border-[var(--brd)]">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>
            Current price: <span className="text-[var(--gold)]">{formatPrice(token.price)}</span>
            {' '}per {token.symbol}
          </span>
        </div>

        {/* Action button */}
        <Button
          variant={tab === 'buy' ? 'gold' : 'danger'}
          size="lg"
          className="w-full"
          onClick={handleAction}
          disabled={!amountNum || amountNum <= 0}
        >
          {!isConnected
            ? 'Connect Wallet'
            : tab === 'buy'
            ? `Buy ${token.symbol}`
            : `Sell ${token.symbol}`}
        </Button>

        <p className="text-xs text-center text-[var(--tx-d)]">
          Contracts deploying in Voyager — UI preview
        </p>
      </div>

      {/* Confirm dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-[var(--tx)] mb-2">
              {tab === 'buy' ? 'Confirm Buy' : 'Confirm Sell'}
            </h3>
            <div className="space-y-2 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-[var(--tx-d)]">You pay:</span>
                <span className="text-[var(--tx)] font-medium">
                  {amount} {tab === 'buy' ? 'SRX' : token.symbol}
                </span>
              </div>
              {tab === 'buy' && buyEst && (
                <div className="flex justify-between">
                  <span className="text-[var(--tx-d)]">You receive:</span>
                  <span className="text-[var(--tx)] font-medium">
                    {formatNumber(buyEst.tokensOut, 0)} {token.symbol}
                  </span>
                </div>
              )}
              {tab === 'sell' && sellEst && (
                <div className="flex justify-between">
                  <span className="text-[var(--tx-d)]">You receive:</span>
                  <span className="text-[var(--tx)] font-medium">
                    {formatNumber(sellEst.srxOut, 4)} SRX
                  </span>
                </div>
              )}
            </div>
            <div className="bg-[var(--gold)]/8 border border-[var(--brd2)] rounded-lg px-3 py-2 mb-4">
              <p className="text-[var(--tx-m)] text-xs">
                ⚠️ CoinBlast contracts are deploying in the Voyager update. Transactions are not live yet.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant={tab === 'buy' ? 'gold' : 'danger'}
                className="flex-1"
                onClick={() => setShowConfirm(false)}
              >
                Coming Soon
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
