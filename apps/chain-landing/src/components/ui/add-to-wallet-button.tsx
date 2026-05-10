"use client";

// One-click "Add Sentrix to Wallet" button. Uses raw EIP-1193 (window.ethereum)
// — no wagmi, no RainbowKit dep. Works with any injected EIP-1193 wallet:
// MetaMask, OKX Wallet, Rabby, Trust Wallet, Phantom (EVM mode), Coinbase
// Wallet extension, etc.
//
// Spec: EIP-3085 wallet_addEthereumChain. The wallet itself decides
// whether the chain already exists (most no-op + return null in that
// case, which we treat as success).

import { useState } from "react";

interface ChainParams {
  chainId: `0x${string}`;
  chainName: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrls: string[];
  blockExplorerUrls: string[];
}

interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

type Status = "idle" | "pending" | "success" | "error" | "no-wallet";

export function AddToWalletButton({
  params,
  label,
  variant = "primary",
}: {
  params: ChainParams;
  label: string;
  variant?: "primary" | "secondary";
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleClick() {
    if (typeof window === "undefined" || !window.ethereum) {
      setStatus("no-wallet");
      return;
    }
    setStatus("pending");
    setErrorMsg(null);
    try {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [params],
      });
      setStatus("success");
      // Reset toast after 4s so the button can be reused.
      setTimeout(() => setStatus("idle"), 4000);
    } catch (err) {
      const e = err as { code?: number; message?: string };
      // 4001 = user rejected; everything else surfaces.
      if (e.code === 4001) {
        setStatus("idle");
        return;
      }
      setStatus("error");
      setErrorMsg(e.message?.slice(0, 140) ?? "Wallet refused the request.");
    }
  }

  // ── Per-state visuals ─────────────────────────────────────────────
  const isPrimary = variant === "primary";
  const baseClasses =
    "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-mono tracking-wide transition-all duration-200 disabled:cursor-wait disabled:opacity-70";
  const variantClasses = isPrimary
    ? "bg-[var(--cyan)]/15 border border-[var(--cyan)]/40 text-[var(--cyan)] hover:bg-[var(--cyan)]/25 hover:border-[var(--cyan)]"
    : "bg-[var(--orange)]/15 border border-[var(--orange)]/40 text-[var(--orange)] hover:bg-[var(--orange)]/25 hover:border-[var(--orange)]";

  return (
    <div className="inline-block">
      <button
        onClick={handleClick}
        disabled={status === "pending"}
        className={`${baseClasses} ${variantClasses}`}
        type="button"
      >
        <span aria-hidden className="text-base leading-none">
          {status === "success" ? "✓" : status === "pending" ? "⋯" : "+"}
        </span>
        {status === "pending"
          ? "Approving in wallet…"
          : status === "success"
          ? "Added to wallet"
          : label}
      </button>
      {status === "error" && (
        <p className="mt-1.5 text-[10px] text-red-400 leading-snug max-w-xs">
          {errorMsg}
        </p>
      )}
      {status === "no-wallet" && (
        <p className="mt-1.5 text-[10px] text-[var(--tx-d)] leading-snug max-w-xs">
          No EIP-1193 wallet detected. Install MetaMask, Rabby, OKX, or
          Phantom — or just copy the RPC details above into your wallet
          manually.
        </p>
      )}
    </div>
  );
}

// Pre-typed param objects so callers don't have to repeat the shape.
export const SENTRIX_MAINNET_ADD_PARAMS: ChainParams = {
  chainId: "0x1bcf",
  chainName: "Sentrix Chain",
  nativeCurrency: { name: "Sentrix", symbol: "SRX", decimals: 18 },
  rpcUrls: ["https://rpc.sentrixchain.com"],
  blockExplorerUrls: ["https://scan.sentrixchain.com"],
};

export const SENTRIX_TESTNET_ADD_PARAMS: ChainParams = {
  chainId: "0x1bd0",
  chainName: "Sentrix Testnet",
  nativeCurrency: { name: "Sentrix", symbol: "SRX", decimals: 18 },
  rpcUrls: ["https://testnet-rpc.sentrixchain.com"],
  blockExplorerUrls: ["https://scan-testnet.sentrixchain.com"],
};
