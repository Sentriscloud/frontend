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
import { useEthSubscribeFinalized } from '@/lib/ws'
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

// Default slippage tolerance for buy/sell — 1%. Industry-standard sane
// default. Users can adjust 0.1-10% via SlippageControl. Anything > 5%
// triggers an Uniswap-style "expert mode" confirmation modal before the
// trade fires (a sandwich-attacker drains exactly this much, so 6%+
// without an explicit double-confirm is a footgun). 10% hard cap — past
// that the curve depth doesn't justify the worst-case loss.
// 2026-05-07: was effectively infinite (minOut=0n hardcoded) —
// sandwich-attack window for any meaningful launch volume.
const DEFAULT_SLIPPAGE_PCT = 1.0
const SLIPPAGE_PRESETS = [0.5, 1.0, 5.0] as const
const MAX_SLIPPAGE_PCT = 10
const HIGH_SLIPPAGE_PCT = 5

function OnChainWidget({ token }: BuySellWidgetProps) {
  const curveAddr = token.curveAddress!
  const tokenAddr = token.address as `0x${string}`
  const [tab, setTab] = useState<'buy' | 'sell'>('buy')
  const [amount, setAmount] = useState('')
  const [slippagePct, setSlippagePct] = useState<number>(DEFAULT_SLIPPAGE_PCT)
  // Two-step confirmation when slippage > 5%. handleAction defers the
  // real submit, opens the modal, and resumes once the user explicitly
  // acknowledges the loss surface.
  const [pendingHighSlippage, setPendingHighSlippage] = useState(false)
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

  // Apply slippage tolerance to the displayed expected-out → minimum
  // amount we'll accept on-chain. BigInt arithmetic with bps to avoid
  // float precision loss on large amounts.
  // 2026-05-07: closes the MEV sandwich gap — pre-fix args were
  // hardcoded 0n, accepting any output. The contract's bonding-curve
  // refund-dust mechanism only refunds overshoot rounding; it does
  // NOT protect against frontrun price moves between submit + execute.
  const slippageBps = BigInt(Math.floor(slippagePct * 100))
  const minTokensOut: bigint = estimatedTokensOut === 0n
    ? 0n
    : estimatedTokensOut - (estimatedTokensOut * slippageBps) / 10_000n

  const sellAmountWei = useMemo<bigint>(() => {
    if (tab !== 'sell' || amountNum <= 0) return 0n
    try {
      return parseEther(amount)
    } catch {
      return 0n
    }
  }, [tab, amountNum, amount])
  const sellQuote = useQuoteSell(curveAddr, tab === 'sell' ? sellAmountWei : undefined)

  // Same slippage logic for sell — minSrxOut = quote × (1 - slippage).
  const minSrxOut = useMemo<bigint>(() => {
    const out = sellQuote.srxOut
    if (out === undefined || out === 0n) return 0n
    return out - (out * slippageBps) / 10_000n
  }, [sellQuote.srxOut, slippageBps])

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

  // BFT-finalized indicator. Mining = "block produced + receipt available";
  // BFT finality = "2/3+1 stake-weighted supermajority precommit landed",
  // which closes a ~1-block reorg window unique to BFT chains. The
  // sentrix_finalized WS push fires within ~1 s of the next block after
  // mining; we capture the mined receipt's blockNumber and flip the badge
  // once finality crosses that height.
  const finalizedEvent = useEthSubscribeFinalized()
  const minedBlockNumber: bigint | null =
    (buyHook.receipt?.blockNumber as bigint | undefined) ??
    (sellHook.receipt?.blockNumber as bigint | undefined) ??
    (approveReceipt.data?.blockNumber as bigint | undefined) ??
    (soluxReceipt.data?.blockNumber as bigint | undefined) ??
    null
  const isBftFinalized =
    isMined && minedBlockNumber !== null && finalizedEvent !== null
      ? finalizedEvent.height >= Number(minedBlockNumber)
      : false

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

    // High-slippage gate. Anything past 5% deserves an explicit ack
    // before we hit the chain — sandwich-bots happily extract the full
    // tolerance. Confirmed users skip the modal next time within the
    // same session by leaving slippage where it is.
    if (slippagePct > HIGH_SLIPPAGE_PCT && !pendingHighSlippage) {
      setPendingHighSlippage(true)
      return
    }
    setPendingHighSlippage(false)

    if (tab === 'buy') {
      if (amountNum <= 0) return
      // minTokensOut applies the user's slippage tolerance to the
      // displayed expected output. Pre-fix this was hardcoded 0n,
      // making every buy sandwich-able with no min-out floor.
      if (useSoluxPath) {
        soluxSigner
          .signAndSend({
            to: curveAddr,
            abi: coinBlastCurveAbi,
            functionName: 'buy',
            args: [minTokensOut],
            value: parseEther(amount),
            label: `Buy ${token.symbol} on CoinBlast`,
          })
          .then(setSoluxTxHash)
          .catch(() => {})
      } else {
        buyHook.submit(amount, minTokensOut)
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
      // minSrxOut applies slippage tolerance to the displayed quote.
      if (useSoluxPath) {
        soluxSigner
          .signAndSend({
            to: curveAddr,
            abi: coinBlastCurveAbi,
            functionName: 'sell',
            args: [sellAmountWei, minSrxOut],
            label: `Sell ${token.symbol} on CoinBlast`,
          })
          .then(setSoluxTxHash)
          .catch(() => {})
      } else {
        sellHook.submit(sellAmountWei, minSrxOut)
      }
    }
  }

  return (
    <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-4">
      {/* Slippage control */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] uppercase tracking-wider font-mono text-[var(--tx-d)]">Slippage</span>
        <div className="flex gap-1">
          {SLIPPAGE_PRESETS.map((s) => (
            <button
              key={s}
              onClick={() => setSlippagePct(s)}
              className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                slippagePct === s
                  ? 'bg-[var(--gold)] text-[var(--bk)]'
                  : 'bg-[var(--bk)] text-[var(--tx-d)] hover:text-[var(--tx)]'
              }`}
            >
              {s}%
            </button>
          ))}
          <input
            type="number"
            min="0.1"
            max={MAX_SLIPPAGE_PCT}
            step="0.1"
            value={slippagePct}
            onChange={(e) => {
              const v = parseFloat(e.target.value)
              // Clamp at MAX_SLIPPAGE_PCT (10%). A hard cap matters more
              // than UX nudges — we don't want anyone fat-fingering 50%
              // and instantly getting sandwiched for half the trade.
              if (isFinite(v) && v >= 0.1 && v <= MAX_SLIPPAGE_PCT) setSlippagePct(v)
            }}
            className="w-12 px-1 py-1 rounded-md text-[11px] font-mono bg-[var(--bk)] border border-[var(--brd)] text-[var(--tx)] focus:outline-none focus:border-[var(--gold-d)] text-center"
          />
        </div>
      </div>
      {slippagePct > HIGH_SLIPPAGE_PCT && (
        <div className="mb-3 px-2 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200">
          ⚠ High slippage: {slippagePct}%. Front-runners can extract this much.
        </div>
      )}

      {/* Expert-mode modal — only shown after handleAction defers a
          high-slippage submit. Forces a second click before the trade
          fires, mirroring Uniswap's expert-mode UX. */}
      {pendingHighSlippage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPendingHighSlippage(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-sm w-full rounded-2xl bg-[var(--sf)] border border-amber-500/40 p-5 space-y-3"
          >
            <h3 className="text-base font-semibold text-amber-300">High slippage confirmation</h3>
            <p className="text-sm text-[var(--tx)]">
              You set slippage to <span className="font-mono">{slippagePct}%</span>. A front-running
              bot can extract <span className="font-mono">~{slippagePct}%</span> of this trade. Are
              you sure?
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setPendingHighSlippage(false)}
                className="flex-1 py-2 rounded-lg bg-[var(--bk)] border border-[var(--brd)] text-sm text-[var(--tx)] hover:bg-[var(--sf2)]"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                className="flex-1 py-2 rounded-lg bg-amber-500 text-[var(--bk)] text-sm font-semibold hover:bg-amber-400"
              >
                I understand, trade
              </button>
            </div>
          </div>
        </div>
      )}

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
            {isBftFinalized
              ? <>✓ BFT finalized — view on Scan <ExternalLink className="inline w-3 h-3" /></>
              : <>✓ confirmed · awaiting BFT finality… <ExternalLink className="inline w-3 h-3" /></>
            }
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
