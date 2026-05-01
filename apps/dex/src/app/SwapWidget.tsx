"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useBalance,
  useChainId,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { formatUnits, parseUnits } from "viem";
import { ArrowDown, Loader, ExternalLink } from "lucide-react";
import { useEffectiveAddress } from "@sentriscloud/wallet-config";
import { DEX, TOKENS, ROUTER_ABI, ERC20_ABI, type Token } from "@/lib/contracts";

// Choose chain config + token list dynamically — wagmi tells us which
// chain the wallet is on; default to mainnet for the unconnected view
// so the SGC/WSRX preview still renders sensibly.
function netFromChainId(chainId: number | undefined): "mainnet" | "testnet" {
  return chainId === 7120 ? "testnet" : "mainnet";
}

export function SwapWidget() {
  const chainId = useChainId();
  const { address: account, isConnected } = useAccount();
  const { source: addrSource } = useEffectiveAddress("dex");
  const net = netFromChainId(chainId);
  const cfg = DEX[net];
  const tokens = TOKENS[net];

  const [tokenIn, setTokenIn] = useState<Token>(tokens[0]);
  const [tokenOut, setTokenOut] = useState<Token>(tokens[1]);
  const [amountIn, setAmountIn] = useState<string>("");
  const [slippage, setSlippage] = useState<number>(0.5); // %

  // Re-pin tokens when the chain switches so we don't keep mainnet
  // addresses around after the user flipped to testnet (or vice-versa).
  useEffect(() => {
    setTokenIn(tokens[0]);
    setTokenOut(tokens[1]);
  }, [tokens]);

  // Path the router walks. Native SRX swaps go through WSRX as the
  // wrapper hop, so the path always starts/ends with WSRX when one
  // side is native. ERC-20 ↔ ERC-20 also routes through WSRX since
  // there's no direct pair yet (single-hop pools only on this version).
  const path = useMemo<`0x${string}`[]>(() => {
    const inAddr = tokenIn.address === "native" ? cfg.wsrx : tokenIn.address;
    const outAddr = tokenOut.address === "native" ? cfg.wsrx : tokenOut.address;
    if (inAddr === outAddr) return [];
    return [inAddr as `0x${string}`, outAddr as `0x${string}`];
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
    args: amountInWei > 0n && path.length === 2 ? [amountInWei, path] : undefined,
    query: { enabled: amountInWei > 0n && path.length === 2 },
  });
  const amountOutWei = (quote.data as readonly bigint[] | undefined)?.[1] ?? 0n;
  const amountOutDisplay = amountOutWei > 0n ? formatUnits(amountOutWei, tokenOut.decimals) : "";
  const amountOutMin = useMemo<bigint>(() => {
    if (amountOutWei === 0n) return 0n;
    const bps = BigInt(Math.floor(slippage * 100)); // slippage as bps
    return amountOutWei - (amountOutWei * bps) / 10_000n;
  }, [amountOutWei, slippage]);

  // Native + token balances (only when a wallet is connected)
  const nativeBal = useBalance({ address: account, chainId, query: { enabled: isConnected } });
  const tokenBal = useReadContract({
    abi: ERC20_ABI,
    address: tokenIn.address !== "native" ? (tokenIn.address as `0x${string}`) : undefined,
    functionName: "balanceOf",
    args: account ? [account] : undefined,
    query: { enabled: isConnected && tokenIn.address !== "native" },
  });
  const balanceWei: bigint =
    tokenIn.address === "native"
      ? nativeBal.data?.value ?? 0n
      : ((tokenBal.data as bigint | undefined) ?? 0n);
  const balanceDisplay = formatUnits(balanceWei, tokenIn.decimals);

  // For ERC-20 input, we need allowance ≥ amountIn before swap. Native
  // input skips this entirely (msg.value path).
  const allowance = useReadContract({
    abi: ERC20_ABI,
    address: tokenIn.address !== "native" ? (tokenIn.address as `0x${string}`) : undefined,
    functionName: "allowance",
    args: account ? [account, cfg.router] : undefined,
    query: { enabled: isConnected && tokenIn.address !== "native" },
  });
  const allowanceWei = (allowance.data as bigint | undefined) ?? 0n;
  const needsApproval = tokenIn.address !== "native" && amountInWei > allowanceWei;

  // Tx hooks
  const { writeContract, data: txHash, isPending, error: txError, reset } = useWriteContract();
  const { isLoading: isMining, isSuccess: isMined } = useWaitForTransactionReceipt({ hash: txHash });

  function flip() {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn(amountOutDisplay);
    reset();
  }

  function handleSwap() {
    if (!account || amountInWei === 0n || path.length !== 2) return;
    reset();
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);
    if (needsApproval) {
      // Approve first; user re-clicks Swap after approval lands.
      writeContract({
        abi: ERC20_ABI,
        address: tokenIn.address as `0x${string}`,
        functionName: "approve",
        args: [cfg.router, amountInWei],
      });
      return;
    }
    if (tokenIn.address === "native") {
      writeContract({
        abi: ROUTER_ABI,
        address: cfg.router,
        functionName: "swapExactSRXForTokens",
        args: [amountOutMin, path, account, deadline],
        value: amountInWei,
      });
    } else if (tokenOut.address === "native") {
      writeContract({
        abi: ROUTER_ABI,
        address: cfg.router,
        functionName: "swapExactTokensForSRX",
        args: [amountInWei, amountOutMin, path, account, deadline],
      });
    } else {
      writeContract({
        abi: ROUTER_ABI,
        address: cfg.router,
        functionName: "swapExactTokensForTokens",
        args: [amountInWei, amountOutMin, path, account, deadline],
      });
    }
  }

  // Refresh quotes + balances when the swap mines.
  useEffect(() => {
    if (isMined) {
      quote.refetch?.();
      nativeBal.refetch?.();
      tokenBal.refetch?.();
      allowance.refetch?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMined]);

  const explorerBase =
    chainId === 7120 ? "https://scan.sentrixchain.com/?network=testnet" : "https://scan.sentrixchain.com";

  return (
    <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-2xl p-5 max-w-md w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--tx)]">Swap</h2>
        <SlippageControl slippage={slippage} onChange={setSlippage} />
      </div>

      <TokenSide
        label="From"
        token={tokenIn}
        tokens={tokens}
        onPick={setTokenIn}
        amount={amountIn}
        onAmount={setAmountIn}
        balance={balanceDisplay}
        showMax={isConnected}
        onMax={() => setAmountIn(formatUnits(balanceWei, tokenIn.decimals))}
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
        tokens={tokens.filter((t) => t.symbol !== tokenIn.symbol)}
        onPick={setTokenOut}
        amount={amountOutDisplay}
        onAmount={() => {}}
        balance={undefined}
        showMax={false}
        onMax={() => {}}
        editable={false}
      />

      <div className="mt-3 mb-3 text-[11px] text-[var(--tx-m)] flex justify-between">
        <span>Min received ({slippage.toFixed(2)}% slippage)</span>
        <span className="font-mono">
          {amountOutMin > 0n
            ? `${parseFloat(formatUnits(amountOutMin, tokenOut.decimals)).toFixed(6)} ${tokenOut.symbol}`
            : "—"}
        </span>
      </div>

      {!isConnected ? (
        <div className="flex flex-col items-center gap-2">
          <ConnectButton showBalance={false} accountStatus="address" chainStatus="icon" />
          {addrSource === "manual" && (
            <p className="text-[11px] text-amber-300/80 leading-snug text-center max-w-xs">
              Solux is view-only on this surface. Swap needs a signing wallet (MetaMask, Rabby, etc.) — your
              Solux address will keep showing balances either way.
            </p>
          )}
        </div>
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
          disabled={amountInWei === 0n || amountInWei > balanceWei}
          className="w-full py-3 rounded-xl bg-[var(--gold)] text-[var(--bk)] font-semibold text-sm hover:bg-[var(--gold-l)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {amountInWei === 0n
            ? "Enter an amount"
            : amountInWei > balanceWei
            ? `Insufficient ${tokenIn.symbol}`
            : needsApproval
            ? `Approve ${tokenIn.symbol}`
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
      {txError && (
        <p className="mt-2 text-[11px] text-red-400 leading-snug">
          {txError.message.slice(0, 200)}
        </p>
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
          className="flex-1 bg-transparent outline-none text-2xl font-semibold text-[var(--tx)] placeholder:text-[var(--tx-d)] tab-num"
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
                    key={t.symbol}
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
