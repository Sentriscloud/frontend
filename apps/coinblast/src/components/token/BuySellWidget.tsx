'use client'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { estimateBuy, estimateSell, TRADING_FEE } from '@/lib/bonding-curve'
import { formatNumber, formatPrice } from '@/lib/utils'
import type { Token } from '@/types'
import { useWalletStore } from '@/store/wallet'
import { ArrowDown, Info, ExternalLink, Loader } from 'lucide-react'
import { parseEther, formatEther } from 'viem'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useEffectiveAddress, useSoluxSigner } from '@sentriscloud/wallet-config'
import {
  useCurveState,
  useQuoteBuy,
  useQuoteSell,
  useBuy,
  useSell,
} from '@/lib/useCoinBlastCurve'
import { coinBlastCurveAbi } from '@/lib/coinblast-curve-abi'

interface BuySellWidgetProps {
  token: Token
}

// FactoryToken ABI bits we need to gate sells on allowance.
const erc20Abi = [
  {
    type: 'function',
    stateMutability: 'view',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    stateMutability: 'nonpayable',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const

export function BuySellWidget({ token }: BuySellWidgetProps) {
  // The widget has two modes:
  //   - On-chain mode: when token.curveAddress is set, every estimate +
  //     buy/sell goes through the deployed CoinBlastCurve contract.
  //   - Preview mode: when there's no curve address yet (mock-data rows
  //     from before the launchpad's first deploy), the legacy TS estimator
  //     renders so the chart story still shows.
  const onChain = !!token.curveAddress
  return onChain ? <OnChainWidget token={token} /> : <PreviewWidget token={token} />
}

// ─── On-chain ──────────────────────────────────────────────────────

function OnChainWidget({ token }: BuySellWidgetProps) {
  const curveAddr = token.curveAddress!
  const tokenAddr = token.address as `0x${string}`
  const [tab, setTab] = useState<'buy' | 'sell'>('buy')
  const [amount, setAmount] = useState('')
  const { isConnected, connect, address } = useWalletStore()
  const { source: addrSource, manualAddress } = useEffectiveAddress('coinblast')
  // Real-wallet path wins on isConnected; Solux/manual path takes over
  // when the user has only connected a view-only address. Submit branch
  // dispatches accordingly further down.
  const effectiveAddress: `0x${string}` | undefined = isConnected
    ? (address as `0x${string}` | undefined)
    : (manualAddress as `0x${string}` | undefined) ?? undefined
  const useSoluxPath = !isConnected && addrSource === 'manual' && !!manualAddress

  const curve = useCurveState(curveAddr)
  const isGraduated = curve.graduated === true

  // For BUY: amount is SRX in. For SELL: amount is tokens in.
  // The contract's quoteBuy takes tokens-out; the user enters SRX-in.
  // We probe the curve for the cost of 1 whole token to derive a spot
  // price, then use that to estimate tokensOut for the displayed quote.
  // The submitted buy() does its own exact integration via binary search.
  const amountNum = parseFloat(amount) || 0
  const oneWholeProbe = useQuoteBuy(curveAddr, 1_000_000_000_000_000_000n)
  const probedSpot = oneWholeProbe.grossSrxIn !== undefined
    ? Number(formatEther(oneWholeProbe.grossSrxIn))
    : null

  // Approximate tokensOut for the buy quote. User enters SRX, we divide
  // by spot. The submitted buy() does its own exact integration.
  const estimatedTokensOut = useMemo<bigint>(() => {
    if (tab !== 'buy' || amountNum <= 0 || !probedSpot) return 0n
    const tokens = amountNum / probedSpot
    if (!isFinite(tokens) || tokens <= 0) return 0n
    return parseEther(tokens.toFixed(6))
  }, [tab, amountNum, probedSpot])

  const buyQuote = useQuoteBuy(curveAddr, tab === 'buy' ? estimatedTokensOut : undefined)

  const sellAmountWei = useMemo<bigint>(() => {
    if (tab !== 'sell' || amountNum <= 0) return 0n
    try {
      return parseEther(amount)
    } catch {
      return 0n
    }
  }, [tab, amountNum, amount])
  const sellQuote = useQuoteSell(curveAddr, tab === 'sell' ? sellAmountWei : undefined)

  // Allowance check for sell (curve pulls tokens via transferFrom).
  // Reads against effectiveAddress so Solux-mode users see correct gating.
  const allowanceRead = useReadContract({
    abi: erc20Abi,
    address: tokenAddr,
    functionName: 'allowance',
    args: effectiveAddress ? [effectiveAddress, curveAddr] : undefined,
    query: { enabled: !!effectiveAddress && tab === 'sell' && sellAmountWei > 0n },
  })
  const needsApproval =
    tab === 'sell' &&
    sellAmountWei > 0n &&
    (allowanceRead.data as bigint | undefined) !== undefined &&
    ((allowanceRead.data as bigint) < sellAmountWei)

  const buyHook = useBuy(curveAddr)
  const sellHook = useSell(curveAddr)
  // Separate write+wait for ERC-20 approve so the sell flow can stage:
  // approve → wait → call sell. Approve mining auto-refetches the
  // allowance read, so the user just clicks Sell again once it lands.
  const { writeContract: writeApprove, data: approveTx, isPending: isApproving } = useWriteContract()
  const approveReceipt = useWaitForTransactionReceipt({ hash: approveTx })
  // Solux popup signer for the manual-mode path. signAndSend opens the
  // Solux /sign popup, the user reviews + signs locally, and the raw
  // signed tx broadcasts via wagmi's public client. We track its hash
  // separately and merge into the existing isMining/isMined flow.
  const soluxSigner = useSoluxSigner({
    chainId: 7119,
    from: effectiveAddress ?? '0x0000000000000000000000000000000000000000',
  })
  const [soluxTxHash, setSoluxTxHash] = useState<`0x${string}` | undefined>()
  const soluxReceipt = useWaitForTransactionReceipt({ hash: soluxTxHash })
  const explorerBase = 'https://scan.sentrixchain.com'
  const txHash = buyHook.txHash ?? sellHook.txHash ?? approveTx ?? soluxTxHash
  const isPending = buyHook.isPending || sellHook.isPending || isApproving || soluxSigner.isSigning
  const isMining =
    buyHook.isConfirming ||
    sellHook.isConfirming ||
    approveReceipt.isLoading ||
    soluxReceipt.isLoading
  const isMined =
    buyHook.isConfirmed ||
    sellHook.isConfirmed ||
    approveReceipt.isSuccess ||
    soluxReceipt.isSuccess
  const txError = buyHook.error ?? sellHook.error ?? (soluxSigner.error ? new Error(soluxSigner.error) : null)

  // Refetch allowance once the approve mines so the button label flips
  // from "Approve ..." to "Sell ..." automatically.
  useEffect(() => {
    if (approveReceipt.isSuccess) allowanceRead.refetch?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveReceipt.isSuccess])

  // After mine, refresh quotes and clear the input.
  useEffect(() => {
    if (isMined) setAmount('')
  }, [isMined])

  function handleAction() {
    // Three-way branch:
    //   1. neither connected nor Solux-mode → kick wagmi connect modal
    //   2. Solux-mode → open Solux /sign popup, broadcast via publicClient
    //   3. real wallet connected → existing wagmi useBuy/useSell path
    if (!isConnected && !useSoluxPath) { connect(); return }
    if (isGraduated) return

    if (tab === 'buy') {
      if (amountNum <= 0) return
      if (useSoluxPath) {
        soluxSigner
          .signAndSend({
            to: curveAddr,
            abi: coinBlastCurveAbi,
            functionName: 'buy',
            args: [0n], // minTokensOut=0; refund-dust handles slippage
            value: parseEther(amount),
            label: `Buy ${token.symbol} on CoinBlast`,
          })
          .then(setSoluxTxHash)
          .catch(() => {})
      } else {
        buyHook.submit(amount, 0n)
      }
    } else {
      if (sellAmountWei === 0n) return
      if (needsApproval) {
        if (useSoluxPath) {
          soluxSigner
            .signAndSend({
              to: tokenAddr,
              abi: erc20Abi,
              functionName: 'approve',
              args: [curveAddr, sellAmountWei],
              label: `Approve ${token.symbol} for CoinBlast curve`,
            })
            .then(setSoluxTxHash)
            .catch(() => {})
          return
        }
        writeApprove({
          abi: erc20Abi,
          address: tokenAddr,
          functionName: 'approve',
          args: [curveAddr, sellAmountWei],
        })
        return
      }
      if (useSoluxPath) {
        soluxSigner
          .signAndSend({
            to: curveAddr,
            abi: coinBlastCurveAbi,
            functionName: 'sell',
            args: [sellAmountWei, 0n],
            label: `Sell ${token.symbol} on CoinBlast`,
          })
          .then(setSoluxTxHash)
          .catch(() => {})
      } else {
        sellHook.submit(sellAmountWei, 0n)
      }
    }
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

      {isGraduated && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-3 text-xs text-amber-200">
          This curve has graduated. Trade on the DEX directly — `Router.swapExactSRXForTokens` against the {token.symbol}/WSRX pair.
        </div>
      )}

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

        <div className="flex justify-center">
          <div className="w-8 h-8 bg-[var(--sf2)] rounded-full flex items-center justify-center">
            <ArrowDown className="w-4 h-4 text-[var(--tx-d)]" />
          </div>
        </div>

        <div className="bg-[var(--bk)] rounded-xl p-3 border border-[var(--brd)]">
          <p className="text-xs text-[var(--tx-d)] mb-1">
            {tab === 'buy' ? `You receive (${token.symbol})` : 'You receive (SRX)'}
          </p>
          {tab === 'buy' ? (
            buyQuote.grossSrxIn !== undefined ? (
              <>
                <p className="text-lg font-bold text-[var(--tx)]">
                  ~{formatNumber(Number(formatEther(estimatedTokensOut)), 0)} {token.symbol}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-[var(--tx-d)]">
                  <span>Fee: {Number(formatEther(buyQuote.fee ?? 0n)).toFixed(4)} SRX</span>
                  <span>Pool quote: {Number(formatEther(buyQuote.grossSrxIn)).toFixed(4)} SRX</span>
                </div>
              </>
            ) : (
              <p className="text-[var(--tx-d)] text-sm">{amountNum > 0 ? 'Quoting…' : 'Enter amount above'}</p>
            )
          ) : sellQuote.srxOut !== undefined ? (
            <>
              <p className="text-lg font-bold text-[var(--tx)]">
                {Number(formatEther(sellQuote.srxOut)).toFixed(6)} SRX
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-[var(--tx-d)]">
                <span>Fee: {Number(formatEther(sellQuote.fee ?? 0n)).toFixed(6)} SRX</span>
              </div>
            </>
          ) : (
            <p className="text-[var(--tx-d)] text-sm">{amountNum > 0 ? 'Quoting…' : 'Enter amount above'}</p>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-[var(--tx-d)] bg-[var(--bk)] rounded-xl px-3 py-2 border border-[var(--brd)]">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>
            Spot:{' '}
            <span className="text-[var(--gold)]">
              {probedSpot !== null ? formatPrice(probedSpot) : '—'}
            </span>
            {' '}per {token.symbol} · curve fee 1%
          </span>
        </div>

        <Button
          variant={tab === 'buy' ? 'gold' : 'danger'}
          size="lg"
          className="w-full"
          onClick={handleAction}
          disabled={
            isGraduated ||
            !amountNum ||
            amountNum <= 0 ||
            isPending ||
            isMining
          }
        >
          {!isConnected && !useSoluxPath
            ? 'Connect Wallet'
            : isPending
            ? useSoluxPath ? 'Sign in Solux popup…' : 'Confirm in wallet…'
            : isMining
            ? 'Mining…'
            : tab === 'buy'
            ? useSoluxPath ? `Buy ${token.symbol} with Solux ⌬` : `Buy ${token.symbol}`
            : needsApproval
            ? useSoluxPath ? `Approve ${token.symbol} (Solux)` : `Approve ${token.symbol}`
            : useSoluxPath ? `Sell ${token.symbol} (Solux)` : `Sell ${token.symbol}`}
        </Button>

        {(isPending || isMining) && (
          <div className="flex items-center justify-center gap-2 text-xs text-[var(--tx-m)]">
            <Loader className="w-3 h-3 animate-spin" /> {isPending ? 'awaiting wallet signature' : 'broadcasting on chain'}
          </div>
        )}

        {isMined && txHash && (
          <a
            href={`${explorerBase}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-[11px] text-emerald-400 hover:text-emerald-300"
          >
            ✓ confirmed — view on Scan <ExternalLink className="inline w-3 h-3" />
          </a>
        )}

        {txError && (
          <p className="text-[11px] text-red-400 leading-snug">
            {txError.message?.slice(0, 200) ?? String(txError).slice(0, 200)}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Preview (no curve address yet — mock-data row) ────────────────

function PreviewWidget({ token }: BuySellWidgetProps) {
  const [tab, setTab] = useState<'buy' | 'sell'>('buy')
  const [amount, setAmount] = useState('')
  const { isConnected, connect } = useWalletStore()

  const amountNum = parseFloat(amount) || 0
  const buyEst = tab === 'buy' && amountNum > 0
    ? estimateBuy(amountNum, token.tokensSold, token.totalSupply)
    : null
  const sellEst = tab === 'sell' && amountNum > 0
    ? estimateSell(amountNum, token.tokensSold, token.totalSupply)
    : null

  return (
    <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-4">
      <div className="flex gap-1 p-1 bg-[var(--bk)] rounded-xl mb-4">
        {(['buy', 'sell'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setAmount('') }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              tab === t
                ? t === 'buy' ? 'bg-[var(--gold)] text-[var(--bk)]' : 'bg-red-600 text-white'
                : 'text-[var(--tx-d)] hover:text-[var(--tx)]'
            }`}
          >
            {t === 'buy' ? '🟢 Buy' : '🔴 Sell'}
          </button>
        ))}
      </div>

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
        <div className="flex justify-center">
          <div className="w-8 h-8 bg-[var(--sf2)] rounded-full flex items-center justify-center">
            <ArrowDown className="w-4 h-4 text-[var(--tx-d)]" />
          </div>
        </div>
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
        <div className="flex items-center gap-2 text-xs text-[var(--tx-d)] bg-[var(--bk)] rounded-xl px-3 py-2 border border-[var(--brd)]">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>
            Current price: <span className="text-[var(--gold)]">{formatPrice(token.price)}</span>
            {' '}per {token.symbol}
          </span>
        </div>
        <Button
          variant={tab === 'buy' ? 'gold' : 'danger'}
          size="lg"
          className="w-full"
          onClick={() => { if (!isConnected) connect() }}
          disabled
        >
          {!isConnected ? 'Connect Wallet' : 'Curve not deployed'}
        </Button>
        <p className="text-xs text-center text-[var(--tx-d)]">
          On-chain bonding curve not deployed for this token yet — preview only.
        </p>
      </div>
    </div>
  )
}
