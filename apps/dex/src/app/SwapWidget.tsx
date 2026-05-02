"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useBalance,
  useChainId,
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { formatUnits, maxUint256, parseUnits } from "viem";
import { ArrowDown, Loader, ExternalLink, AlertTriangle, ChevronDown, ChevronUp, Wallet } from "lucide-react";
import { useEffectiveAddress, useSoluxSigner } from "@sentriscloud/wallet-config";
import { DEX, TOKENS, ROUTER_ABI, ERC20_ABI, FACTORY_ABI, PAIR_ABI, type Token } from "@/lib/contracts";

// Sentrix EVM uses 18 decimals on the wei boundary, same as every other EVM
// chain. Reserve a small buffer when a user clicks "Max" on native SRX so
// they still have room for the swap's gas. 0.005 SRX is enough for a normal
// swap (gas_used ~250k * gas_price 1e10 wei = 2.5e15 wei = 0.0025 SRX) with
// margin for approve flows and fee fluctuations.
const NATIVE_GAS_RESERVE_WEI = parseUnits("0.005", 18);

// Supported chains. Anything outside this set => wrong-network state and
// the swap CTA is disabled. Catches the case where wagmi reports an
// arbitrary chainId (e.g. user kept Ethereum mainnet selected from a
// previous session) and the UI silently aims at Sentrix-mainnet contracts.
function isSupportedChain(c: number | undefined): c is 7119 | 7120 {
  return c === 7119 || c === 7120;
}

// Default to mainnet for the unconnected preview view so the SGC/SRX rail
// renders before the wallet attaches; once connected the chain switch in
// useChainId drives the real config.
function netFromChainId(chainId: number | undefined): "mainnet" | "testnet" {
  return chainId === 7120 ? "testnet" : "mainnet";
}

export function SwapWidget() {
  const chainId = useChainId();
  const supported = isSupportedChain(chainId);
  const { address: account, isConnected } = useAccount();
  const { source: addrSource, manualAddress } = useEffectiveAddress("dex");
  // "Effective" address for balance / allowance reads. Real-wallet path
  // wins when isConnected; Solux/manual path fills in when the user has
  // connected only a view-only address.
  const effectiveAddress: `0x${string}` | undefined = isConnected
    ? (account as `0x${string}` | undefined)
    : (manualAddress as `0x${string}` | undefined) ?? undefined;
  const net = netFromChainId(chainId);
  const cfg = DEX[net];
  const tokens = TOKENS[net];
  const publicClient = usePublicClient();

  const [tokenIn, setTokenIn] = useState<Token>(tokens[0]);
  const [tokenOut, setTokenOut] = useState<Token>(tokens[1]);
  const [amountIn, setAmountIn] = useState<string>("");
  const [slippage, setSlippage] = useState<number>(0.5); // %
  const [deadlineMin, setDeadlineMin] = useState<number>(30);
  const [approveMax, setApproveMax] = useState<boolean>(true); // approve MaxUint256 by default
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [simError, setSimError] = useState<string | null>(null);

  // Re-pin tokens when the chain switches so we don't keep mainnet
  // addresses around after the user flipped to testnet (or vice-versa).
  useEffect(() => {
    setTokenIn(tokens[0]);
    setTokenOut(tokens[1]);
  }, [tokens]);

  // Path the router walks. SRX (native) gets wrapped via WSRX. ERC-20 ↔ ERC-20
  // routes through WSRX as a hop because there are no direct ERC-20 ↔ ERC-20
  // pools yet — the path is [in, WSRX, out], 3 elements. Native ↔ ERC-20 is
  // 2 elements ([WSRX, ERC20] or [ERC20, WSRX]). Fix 2026-05-02: previous
  // implementation always emitted 2 elements which would have silently broken
  // ERC-20 ↔ ERC-20 the moment a second ERC-20 was listed.
  const path = useMemo<`0x${string}`[]>(() => {
    const inAddr = tokenIn.address === "native" ? cfg.wsrx : tokenIn.address;
    const outAddr = tokenOut.address === "native" ? cfg.wsrx : tokenOut.address;
    if (inAddr === outAddr) return [];
    const isInNative = tokenIn.address === "native";
    const isOutNative = tokenOut.address === "native";
    if (isInNative || isOutNative) {
      return [inAddr as `0x${string}`, outAddr as `0x${string}`];
    }
    // ERC-20 ↔ ERC-20 — bridge through WSRX.
    return [inAddr as `0x${string}`, cfg.wsrx, outAddr as `0x${string}`];
  }, [tokenIn, tokenOut, cfg.wsrx]);

  // Quote: getAmountsOut(amountIn, path) — returns [amountIn, …, amountOut].
  const amountInWei = useMemo<bigint>(() => {
    const v = Number(amountIn);
    if (!isFinite(v) || v <= 0) return 0n;
    try {
      return parseUnits(amountIn, tokenIn.decimals);
    } catch {
      return 0n;
    }
  }, [amountIn, tokenIn.decimals]);

  const quote = useReadContract({
    abi: ROUTER_ABI,
    address: cfg.router,
    functionName: "getAmountsOut",
    args: amountInWei > 0n && path.length >= 2 ? [amountInWei, path] : undefined,
    query: {
      enabled: amountInWei > 0n && path.length >= 2,
      // Re-quote every 10s so the displayed rate doesn't go stale while the
      // user pauses on the page. Mining-time and approve flow already
      // refetch via the `isMined` effect; this covers the idle case.
      refetchInterval: 10_000,
    },
  });
  const amountsOut = quote.data as readonly bigint[] | undefined;
  const amountOutWei = amountsOut?.[amountsOut.length - 1] ?? 0n;
  const amountOutDisplay = amountOutWei > 0n ? formatUnits(amountOutWei, tokenOut.decimals) : "";
  const amountOutMin = useMemo<bigint>(() => {
    if (amountOutWei === 0n) return 0n;
    const bps = BigInt(Math.floor(slippage * 100)); // slippage as bps
    return amountOutWei - (amountOutWei * bps) / 10_000n;
  }, [amountOutWei, slippage]);

  // ── Price impact — single-hop only ─────────────────────────────────────
  // Fetch the pair (in,out) and compare actual fill rate vs spot rate.
  // For multi-hop (ERC20→WSRX→ERC20) we'd need both reserves; show "—" so
  // we don't lie. Single-hop covers SRX↔SGC and any future {SRX, X} pairs
  // which is the dominant pattern today.
  const isSingleHop = path.length === 2;
  const pairLookup = useReadContract({
    abi: FACTORY_ABI,
    address: cfg.factory,
    functionName: "getPair",
    args: isSingleHop ? [path[0], path[1]] : undefined,
    query: { enabled: isSingleHop },
  });
  const pairAddr = (pairLookup.data as `0x${string}` | undefined) ?? undefined;
  const reserves = useReadContract({
    abi: PAIR_ABI,
    address: pairAddr && pairAddr !== "0x0000000000000000000000000000000000000000" ? pairAddr : undefined,
    functionName: "getReserves",
    query: { enabled: !!pairAddr && pairAddr !== "0x0000000000000000000000000000000000000000", refetchInterval: 10_000 },
  });
  const token0 = useReadContract({
    abi: PAIR_ABI,
    address: pairAddr && pairAddr !== "0x0000000000000000000000000000000000000000" ? pairAddr : undefined,
    functionName: "token0",
    query: { enabled: !!pairAddr && pairAddr !== "0x0000000000000000000000000000000000000000" },
  });

  // priceImpact = 1 - (effectiveRate / spotRate) where spotRate = reserveOut/reserveIn.
  // Compute everything in BigInt then drop to float at the very end so we
  // don't lose precision on small impacts.
  const priceImpact: number | null = useMemo(() => {
    if (!isSingleHop || amountInWei === 0n || amountOutWei === 0n) return null;
    const r = reserves.data as readonly [bigint, bigint, number] | undefined;
    const t0 = token0.data as `0x${string}` | undefined;
    if (!r || !t0) return null;
    const inIsToken0 = t0.toLowerCase() === path[0].toLowerCase();
    const reserveIn = inIsToken0 ? r[0] : r[1];
    const reserveOut = inIsToken0 ? r[1] : r[0];
    if (reserveIn === 0n || reserveOut === 0n) return null;
    // spotOut = amountIn * reserveOut / reserveIn (zero-impact, zero-fee)
    const spotOut = (amountInWei * reserveOut) / reserveIn;
    if (spotOut === 0n) return null;
    // impact = (spotOut - amountOut) / spotOut, clamped >= 0
    const numerator = spotOut > amountOutWei ? spotOut - amountOutWei : 0n;
    // Multiply by 1e6 first to keep 4 fractional decimals when we divide.
    const pctScaled = (numerator * 1_000_000n) / spotOut;
    return Number(pctScaled) / 10_000; // returns percent with 4 decimals
  }, [isSingleHop, amountInWei, amountOutWei, reserves.data, token0.data, path]);

  const priceImpactSeverity: "ok" | "warn" | "high" | "block" = useMemo(() => {
    if (priceImpact == null) return "ok";
    if (priceImpact >= 15) return "block";
    if (priceImpact >= 5) return "high";
    if (priceImpact >= 1) return "warn";
    return "ok";
  }, [priceImpact]);

  // Effective rate display — "1 SRX = N SGC" for the current input/output.
  const effectiveRateDisplay: string | null = useMemo(() => {
    if (amountInWei === 0n || amountOutWei === 0n) return null;
    const inN = Number(formatUnits(amountInWei, tokenIn.decimals));
    const outN = Number(formatUnits(amountOutWei, tokenOut.decimals));
    if (inN <= 0) return null;
    const rate = outN / inN;
    if (!isFinite(rate)) return null;
    const pretty = rate < 0.0001 ? rate.toExponential(3) : rate.toFixed(rate < 1 ? 6 : rate < 1000 ? 4 : 2);
    return `1 ${tokenIn.symbol} = ${pretty} ${tokenOut.symbol}`;
  }, [amountInWei, amountOutWei, tokenIn, tokenOut]);

  // Native + token balances. Reads track effectiveAddress so a user
  // connected only via Solux still sees their balance + max button.
  const nativeBal = useBalance({
    address: effectiveAddress,
    chainId,
    query: { enabled: !!effectiveAddress },
  });
  const tokenBal = useReadContract({
    abi: ERC20_ABI,
    address: tokenIn.address !== "native" ? (tokenIn.address as `0x${string}`) : undefined,
    functionName: "balanceOf",
    args: effectiveAddress ? [effectiveAddress] : undefined,
    query: { enabled: !!effectiveAddress && tokenIn.address !== "native" },
  });
  const balanceWei: bigint =
    tokenIn.address === "native"
      ? nativeBal.data?.value ?? 0n
      : ((tokenBal.data as bigint | undefined) ?? 0n);
  const balanceDisplay = formatUnits(balanceWei, tokenIn.decimals);

  // ERC-20 allowance against router.
  const allowance = useReadContract({
    abi: ERC20_ABI,
    address: tokenIn.address !== "native" ? (tokenIn.address as `0x${string}`) : undefined,
    functionName: "allowance",
    args: effectiveAddress ? [effectiveAddress, cfg.router] : undefined,
    query: { enabled: !!effectiveAddress && tokenIn.address !== "native" },
  });
  const allowanceWei = (allowance.data as bigint | undefined) ?? 0n;
  const needsApproval = tokenIn.address !== "native" && amountInWei > allowanceWei;

  // Tx hooks (real wallet path).
  const { writeContract, data: wagmiTxHash, isPending: isWagmiPending, error: wagmiError, reset: resetWagmi } = useWriteContract();
  const soluxSigner = useSoluxSigner({
    chainId: chainId ?? 7119,
    from: effectiveAddress ?? "0x0000000000000000000000000000000000000000",
  });
  const [soluxTxHash, setSoluxTxHash] = useState<`0x${string}` | undefined>();
  const txHash = wagmiTxHash ?? soluxTxHash;
  const isPending = isWagmiPending || soluxSigner.isSigning;
  const txError = wagmiError ?? (soluxSigner.error ? new Error(soluxSigner.error) : null);
  const { isLoading: isMining, isSuccess: isMined } = useWaitForTransactionReceipt({ hash: txHash });

  function reset() {
    resetWagmi();
    setSoluxTxHash(undefined);
    soluxSigner.reset();
    setSimError(null);
  }

  function flip() {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    // Clear amount on flip — auto-filling the previous output as new input
    // misled users who didn't notice they suddenly "had" 10k SGC.
    setAmountIn("");
    reset();
  }

  // Pre-submit simulation. Surfacing the revert reason inline saves the
  // user from confirming a swap in their wallet only to watch it bounce
  // (slippage breach, deadline expiry, insufficient liquidity, etc).
  async function simulateSwap(args: {
    fn: "swapExactSRXForTokens" | "swapExactTokensForSRX" | "swapExactTokensForTokens";
    callArgs: readonly unknown[];
    value?: bigint;
  }): Promise<true | string> {
    if (!publicClient || !effectiveAddress) return true; // no client = best-effort
    try {
      await publicClient.simulateContract({
        abi: ROUTER_ABI,
        address: cfg.router,
        functionName: args.fn,
        // viem types are strict per overload; cast at the boundary.
        args: args.callArgs as unknown as readonly [bigint, `0x${string}`[], `0x${string}`, bigint],
        account: effectiveAddress,
        value: args.value,
      });
      return true;
    } catch (e: unknown) {
      const msg = (e as { shortMessage?: string; message?: string }).shortMessage
        ?? (e as Error).message
        ?? "Simulation failed";
      return msg;
    }
  }

  async function handleSwap() {
    if (!effectiveAddress || amountInWei === 0n || path.length < 2) return;
    if (priceImpactSeverity === "block") {
      setSimError("Price impact > 15% — swap blocked. Reduce size or add liquidity.");
      return;
    }
    reset();
    const deadline = BigInt(Math.floor(Date.now() / 1000) + Math.max(60, deadlineMin * 60));
    const useSoluxPath = !isConnected && addrSource === "manual";

    // ── Approve branch (ERC-20 input only) ──────────────────────────
    if (needsApproval) {
      // approve `MaxUint256` by default so subsequent swaps with the same
      // token-in skip the approve popup entirely. Toggle in advanced
      // settings drops back to per-swap exact approval for users who
      // prefer minimal allowance.
      const approveAmount = approveMax ? maxUint256 : amountInWei;
      if (useSoluxPath) {
        soluxSigner
          .signAndSend({
            to: tokenIn.address as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [cfg.router, approveAmount],
            label: `Approve ${tokenIn.symbol} for SentrixV2 Router`,
          })
          .then(setSoluxTxHash)
          .catch(() => { /* error already in soluxSigner.error */ });
      } else {
        writeContract({
          abi: ERC20_ABI,
          address: tokenIn.address as `0x${string}`,
          functionName: "approve",
          args: [cfg.router, approveAmount],
        });
      }
      return;
    }

    // ── Swap branch ─────────────────────────────────────────────────
    const swapLabel = `Swap ${tokenIn.symbol} → ${tokenOut.symbol}`;
    let fn: "swapExactSRXForTokens" | "swapExactTokensForSRX" | "swapExactTokensForTokens";
    let callArgs: readonly unknown[];
    let value: bigint | undefined;
    if (tokenIn.address === "native") {
      fn = "swapExactSRXForTokens";
      callArgs = [amountOutMin, path, effectiveAddress, deadline] as const;
      value = amountInWei;
    } else if (tokenOut.address === "native") {
      fn = "swapExactTokensForSRX";
      callArgs = [amountInWei, amountOutMin, path, effectiveAddress, deadline] as const;
    } else {
      fn = "swapExactTokensForTokens";
      callArgs = [amountInWei, amountOutMin, path, effectiveAddress, deadline] as const;
    }

    // Simulate first so the user gets a typed revert reason ("Slippage
    // exceeded", "TRANSFER_FROM_FAILED", etc) without spending gas. Skip
    // for the Solux path since the popup handles its own simulation.
    if (!useSoluxPath) {
      const sim = await simulateSwap({ fn, callArgs, value });
      if (sim !== true) {
        setSimError(sim);
        return;
      }
    }

    if (useSoluxPath) {
      const params = value !== undefined
        ? { to: cfg.router, abi: ROUTER_ABI, functionName: fn, args: callArgs, value, label: swapLabel }
        : { to: cfg.router, abi: ROUTER_ABI, functionName: fn, args: callArgs, label: swapLabel };
      // viem-style typing on signAndSend's args is loose; widen at call site.
      (soluxSigner.signAndSend as (p: typeof params) => Promise<`0x${string}`>)(params)
        .then(setSoluxTxHash)
        .catch(() => {});
    } else {
      const writeParams = value !== undefined
        ? { abi: ROUTER_ABI, address: cfg.router, functionName: fn, args: callArgs, value }
        : { abi: ROUTER_ABI, address: cfg.router, functionName: fn, args: callArgs };
      (writeContract as (p: typeof writeParams) => void)(writeParams);
    }
  }

  // Refresh quotes + balances when the swap mines.
  useEffect(() => {
    if (isMined) {
      quote.refetch?.();
      nativeBal.refetch?.();
      tokenBal.refetch?.();
      allowance.refetch?.();
      reserves.refetch?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMined]);

  const explorerBase =
    chainId === 7120 ? "https://scan.sentrixchain.com/?network=testnet" : "https://scan.sentrixchain.com";

  // Network gate — render the swap UI but disable submission when chain
  // is unsupported. Avoids the silent "no code at address" failure where
  // the user thinks they're swapping on Sentrix but is actually on
  // Ethereum mainnet with stale chainId.
  const networkOk = !isConnected || supported;

  return (
    <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-2xl p-5 max-w-md w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--tx)]">Swap</h2>
        <SlippageControl slippage={slippage} onChange={setSlippage} />
      </div>

      <TokenSide
        label="From"
        token={tokenIn}
        tokens={tokens.filter((t) => t.address !== tokenOut.address)}
        onPick={setTokenIn}
        amount={amountIn}
        onAmount={setAmountIn}
        balance={balanceDisplay}
        showMax={isConnected}
        onMax={() => {
          // Reserve gas when paying in native — full-balance Max would
          // leave nothing to pay the swap's transaction fee.
          if (tokenIn.address === "native") {
            const usable = balanceWei > NATIVE_GAS_RESERVE_WEI ? balanceWei - NATIVE_GAS_RESERVE_WEI : 0n;
            setAmountIn(formatUnits(usable, tokenIn.decimals));
          } else {
            setAmountIn(formatUnits(balanceWei, tokenIn.decimals));
          }
        }}
        editable
      />

      <div className="flex justify-center my-1.5">
        <button
          onClick={flip}
          className="w-8 h-8 rounded-full bg-[var(--bk)] border border-[var(--brd)] hover:border-[var(--gold)] flex items-center justify-center text-[var(--tx-m)] hover:text-[var(--gold)] transition-colors"
          aria-label="Flip swap direction"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      </div>

      <TokenSide
        label="To (estimated)"
        token={tokenOut}
        tokens={tokens.filter((t) => t.address !== tokenIn.address)}
        onPick={setTokenOut}
        amount={amountOutDisplay}
        onAmount={() => {}}
        balance={undefined}
        showMax={false}
        onMax={() => {}}
        editable={false}
      />

      {/* Rate + min-received summary. The rate line is the headline (so a
          user can sanity-check before signing); the min-received row is
          the slippage commitment they're actually authorizing. */}
      <div className="mt-3 mb-1 space-y-1 text-[11px]">
        {effectiveRateDisplay && (
          <div className="flex justify-between text-[var(--tx-m)]">
            <span>Rate</span>
            <span className="font-mono">{effectiveRateDisplay}</span>
          </div>
        )}
        <div className="flex justify-between text-[var(--tx-m)]">
          <span>Min received ({slippage.toFixed(2)}% slip)</span>
          <span className="font-mono">
            {amountOutMin > 0n
              ? `${parseFloat(formatUnits(amountOutMin, tokenOut.decimals)).toFixed(6)} ${tokenOut.symbol}`
              : "—"}
          </span>
        </div>
        <div className="flex justify-between text-[var(--tx-m)]">
          <span>Route</span>
          <span className="font-mono text-[10px]">
            {path.length === 0
              ? "—"
              : path.length === 2
              ? `${tokenIn.symbol} → ${tokenOut.symbol}`
              : `${tokenIn.symbol} → WSRX → ${tokenOut.symbol}`}
          </span>
        </div>
        {priceImpact != null && (
          <div className="flex justify-between">
            <span className="text-[var(--tx-m)]">Price impact</span>
            <span
              className={`font-mono ${
                priceImpactSeverity === "block"
                  ? "text-red-400"
                  : priceImpactSeverity === "high"
                  ? "text-orange-400"
                  : priceImpactSeverity === "warn"
                  ? "text-yellow-400"
                  : "text-emerald-400"
              }`}
            >
              {priceImpact < 0.01 ? "<0.01" : priceImpact.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* Price-impact warning banner — show for warn/high; block hides
          the swap CTA below entirely (handled in handleSwap). */}
      {priceImpactSeverity === "high" && (
        <div className="mt-2 mb-2 flex items-start gap-2 px-2.5 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-[11px] text-orange-300 leading-snug">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>High price impact ({priceImpact!.toFixed(2)}%). You will lose value to slippage.</span>
        </div>
      )}
      {priceImpactSeverity === "block" && (
        <div className="mt-2 mb-2 flex items-start gap-2 px-2.5 py-1.5 rounded-lg bg-red-500/15 border border-red-500/40 text-[11px] text-red-300 leading-snug">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            Price impact ≥15% ({priceImpact!.toFixed(2)}%). Swap blocked — reduce amount or wait
            for deeper liquidity.
          </span>
        </div>
      )}

      {/* Advanced — deadline + approve-max — collapsed by default to keep
          the surface lean for the common case. */}
      <button
        onClick={() => setShowAdvanced((v) => !v)}
        className="mt-2 mb-2 w-full text-[10px] text-[var(--tx-d)] hover:text-[var(--tx-m)] flex items-center justify-center gap-1"
      >
        {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        Advanced
      </button>
      {showAdvanced && (
        <div className="mb-2 space-y-2 px-3 py-2 rounded-lg border border-[var(--brd)] bg-[var(--bk)]/50">
          <label className="flex items-center justify-between text-[11px] text-[var(--tx-m)]">
            <span>Deadline</span>
            <span className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                max={60}
                value={deadlineMin}
                onChange={(e) => setDeadlineMin(Math.max(1, Math.min(60, Number(e.target.value) || 30)))}
                className="w-12 px-1.5 py-0.5 bg-[var(--sf)] border border-[var(--brd)] rounded text-right font-mono text-[11px]"
              />
              <span className="text-[10px]">min</span>
            </span>
          </label>
          <label className="flex items-center justify-between text-[11px] text-[var(--tx-m)] cursor-pointer">
            <span>Approve max (one-time)</span>
            <input
              type="checkbox"
              checked={approveMax}
              onChange={(e) => setApproveMax(e.target.checked)}
              className="accent-[var(--gold)]"
            />
          </label>
        </div>
      )}

      {/* Network gate banner — visible whenever a wallet is connected
          to a non-Sentrix chain. Replaces the swap CTA with a hard stop
          so the user can't fire writeContract at the wrong target. */}
      {isConnected && !supported && (
        <div className="mb-2 flex items-start gap-2 px-2.5 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-[11px] text-yellow-300 leading-snug">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            Wrong network (chain {chainId ?? "?"}). Switch to Sentrix mainnet (7119) or testnet (7120).
          </span>
        </div>
      )}

      {!isConnected && addrSource !== "manual" ? (
        <PrivySignInButton />
      ) : !isConnected && addrSource === "manual" ? (
        // Solux signing path — popup-based signer instead of injected wallet.
        isPending ? (
          <button disabled className="w-full py-3 rounded-xl bg-[var(--gold)]/30 text-[var(--bk)] font-semibold text-sm flex items-center justify-center gap-2">
            <Loader className="w-4 h-4 animate-spin" /> Sign in Solux popup…
          </button>
        ) : isMining ? (
          <a
            href={`${explorerBase}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 rounded-xl bg-[var(--gold)]/30 text-[var(--bk)] font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Loader className="w-4 h-4 animate-spin" /> Mining…
          </a>
        ) : (
          <button
            onClick={handleSwap}
            disabled={
              amountInWei === 0n ||
              amountInWei > balanceWei ||
              priceImpactSeverity === "block"
            }
            className="w-full py-3 rounded-xl bg-[var(--gold)] text-[var(--bk)] font-semibold text-sm hover:bg-[var(--gold-l)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {amountInWei === 0n
              ? "Enter an amount"
              : amountInWei > balanceWei
              ? `Insufficient ${tokenIn.symbol}`
              : needsApproval
              ? `Approve ${tokenIn.symbol} (Solux)`
              : `Swap with Solux ⌬`}
          </button>
        )
      ) : isPending ? (
        <button disabled className="w-full py-3 rounded-xl bg-[var(--gold)]/30 text-[var(--bk)] font-semibold text-sm flex items-center justify-center gap-2">
          <Loader className="w-4 h-4 animate-spin" /> Confirm in wallet…
        </button>
      ) : isMining ? (
        <a
          href={`${explorerBase}/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 rounded-xl bg-[var(--gold)]/30 text-[var(--bk)] font-semibold text-sm flex items-center justify-center gap-2"
        >
          <Loader className="w-4 h-4 animate-spin" /> Mining…
        </a>
      ) : (
        <button
          onClick={handleSwap}
          disabled={
            !networkOk ||
            amountInWei === 0n ||
            amountInWei > balanceWei ||
            priceImpactSeverity === "block"
          }
          className="w-full py-3 rounded-xl bg-[var(--gold)] text-[var(--bk)] font-semibold text-sm hover:bg-[var(--gold-l)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {!networkOk
            ? "Switch network"
            : amountInWei === 0n
            ? "Enter an amount"
            : amountInWei > balanceWei
            ? `Insufficient ${tokenIn.symbol}`
            : needsApproval
            ? `Approve ${tokenIn.symbol}${approveMax ? " (max)" : ""}`
            : `Swap ${tokenIn.symbol} for ${tokenOut.symbol}`}
        </button>
      )}

      {isMined && txHash && (
        <a
          href={`${explorerBase}/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block text-center text-[11px] text-emerald-400 hover:text-emerald-300"
        >
          ✓ Swap confirmed — view on Scan <ExternalLink className="inline w-3 h-3" />
        </a>
      )}
      {(simError || txError) && (
        <ExpandableError text={simError ?? txError?.message ?? "Unknown error"} />
      )}
    </div>
  );
}

// Show the first 200 chars by default, expand to full on click. Keeps the
// failure-state surface tight on the common case (slippage breach, deadline
// expiry — all <200 chars) without truncating the rare long structured
// revert from a custom error.
function ExpandableError({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 200;
  const display = expanded || !isLong ? text : `${text.slice(0, 200)}…`;
  return (
    <div className="mt-2 text-[11px] text-red-400 leading-snug">
      <p className="break-words font-mono">{display}</p>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-[10px] text-red-300 hover:text-red-200 underline"
        >
          {expanded ? "Show less" : "Show full error"}
        </button>
      )}
    </div>
  );
}

function TokenSide(props: {
  label: string;
  token: Token;
  tokens: ReadonlyArray<Token>;
  onPick: (t: Token) => void;
  amount: string;
  onAmount: (s: string) => void;
  balance: string | undefined;
  showMax: boolean;
  onMax: () => void;
  editable: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-[var(--bk)] rounded-xl border border-[var(--brd)] p-3">
      <div className="flex items-center justify-between text-[11px] text-[var(--tx-m)] mb-1.5">
        <span>{props.label}</span>
        {props.balance !== undefined && (
          <span>
            Balance: <span className="font-mono">{parseFloat(props.balance).toFixed(4)}</span>
            {props.showMax && (
              <button
                onClick={props.onMax}
                className="ml-1.5 px-1.5 py-0.5 rounded bg-[var(--gold)]/15 text-[var(--gold)] text-[10px] uppercase tracking-wider"
              >
                Max
              </button>
            )}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.0"
          readOnly={!props.editable}
          value={props.amount}
          onChange={(e) => props.onAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          className={`flex-1 bg-transparent outline-none text-2xl font-semibold placeholder:text-[var(--tx-d)] tab-num ${
            props.editable ? "text-[var(--tx)]" : "text-[var(--tx-m)] cursor-default"
          }`}
        />
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--sf-2)] hover:bg-[var(--sf-3)] border border-[var(--brd)] text-sm font-semibold text-[var(--tx)]"
          >
            {props.token.symbol}
            <ArrowDown className="w-3.5 h-3.5 text-[var(--tx-m)]" />
          </button>
          {open && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-40 w-48 bg-[var(--sf-2)] border border-[var(--brd)] rounded-lg overflow-hidden">
                {props.tokens.map((t) => (
                  <button
                    key={t.address === "native" ? "native" : t.address}
                    onClick={() => {
                      props.onPick(t);
                      setOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--sf-3)] flex flex-col"
                  >
                    <span className="text-[var(--tx)] font-semibold">{t.symbol}</span>
                    <span className="text-[10px] text-[var(--tx-m)]">{t.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Sign-in CTA inside the swap card. Mirrors WalletConnect's Privy hook —
// the swap card has its own button so a user who skipped past the
// header sign-in still has a primary CTA where they're already looking
// (the swap pane). Solux + watch-address peers stay on the header
// component (WalletConnect) so we don't double the button surface.
function PrivySignInButton() {
  const { ready, login } = usePrivy();
  return (
    <button
      type="button"
      onClick={() => ready && login()}
      disabled={!ready}
      className="w-full py-3 rounded-xl bg-[var(--gold)] text-[var(--bk)] font-semibold text-sm hover:bg-[var(--gold-l)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
    >
      <Wallet className="w-4 h-4" />
      {ready ? "Sign in to swap" : "Loading…"}
    </button>
  );
}

function SlippageControl({ slippage, onChange }: { slippage: number; onChange: (n: number) => void }) {
  const presets = [0.1, 0.5, 1.0];
  return (
    <div className="flex items-center gap-1">
      {presets.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-2 py-0.5 rounded text-[10px] font-mono ${
            slippage === p ? "bg-[var(--gold)]/20 text-[var(--gold)]" : "text-[var(--tx-m)] hover:text-[var(--tx)]"
          }`}
        >
          {p}%
        </button>
      ))}
    </div>
  );
}
