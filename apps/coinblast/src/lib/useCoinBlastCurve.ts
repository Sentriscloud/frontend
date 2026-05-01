"use client";

// Wagmi-backed wrappers around CoinBlastCurve. Components import these
// hooks instead of calling the TS estimator in bonding-curve.ts — when a
// real on-chain curve address is wired up, settlement matches the
// contract exactly (binary-search + curve-cost integration). The TS
// estimator stays around for the mock-data path until every Token row
// has a `curveAddress`.

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { coinBlastCurveAbi } from "./coinblast-curve-abi";

type Address = `0x${string}`;

interface CurveState {
  tokensSold: bigint | undefined;
  srxRaised: bigint | undefined;
  graduated: boolean | undefined;
  curveSupply: bigint | undefined;
  graduationSrxThreshold: bigint | undefined;
  feeBps: bigint | undefined;
  isLoading: boolean;
}

/// Read everything the BuySellWidget + TokenCard render off-chain.
export function useCurveState(address: Address | undefined): CurveState {
  const enabled = !!address;
  const args = { abi: coinBlastCurveAbi, address: address as Address, query: { enabled } };

  const tokensSold = useReadContract({ ...args, functionName: "tokensSold" });
  const srxRaised = useReadContract({ ...args, functionName: "srxRaised" });
  const graduated = useReadContract({ ...args, functionName: "graduated" });
  const curveSupply = useReadContract({ ...args, functionName: "curveSupply" });
  const graduationSrxThreshold = useReadContract({
    ...args,
    functionName: "graduationSrxThreshold",
  });
  const feeBps = useReadContract({ ...args, functionName: "feeBps" });

  return {
    tokensSold: tokensSold.data as bigint | undefined,
    srxRaised: srxRaised.data as bigint | undefined,
    graduated: graduated.data as boolean | undefined,
    curveSupply: curveSupply.data as bigint | undefined,
    graduationSrxThreshold: graduationSrxThreshold.data as bigint | undefined,
    feeBps: feeBps.data as bigint | undefined,
    isLoading:
      tokensSold.isLoading ||
      srxRaised.isLoading ||
      graduated.isLoading ||
      curveSupply.isLoading,
  };
}

/// Quote a buy of `tokensOut` (in token-wei). Returns the SRX cost
/// (gross — already includes fee) and the fee component separately.
export function useQuoteBuy(address: Address | undefined, tokensOut: bigint | undefined) {
  const enabled = !!address && tokensOut !== undefined && tokensOut > 0n;
  const result = useReadContract({
    abi: coinBlastCurveAbi,
    address: address as Address,
    functionName: "quoteBuy",
    args: tokensOut !== undefined ? [tokensOut] : undefined,
    query: { enabled },
  });
  const data = result.data as readonly [bigint, bigint] | undefined;
  return {
    grossSrxIn: data?.[0],
    fee: data?.[1],
    isLoading: result.isLoading,
    error: result.error,
  };
}

/// Quote a sell of `tokensIn` (in token-wei). Returns the SRX received
/// (net of fee) and the fee component separately.
export function useQuoteSell(address: Address | undefined, tokensIn: bigint | undefined) {
  const enabled = !!address && tokensIn !== undefined && tokensIn > 0n;
  const result = useReadContract({
    abi: coinBlastCurveAbi,
    address: address as Address,
    functionName: "quoteSell",
    args: tokensIn !== undefined ? [tokensIn] : undefined,
    query: { enabled },
  });
  const data = result.data as readonly [bigint, bigint] | undefined;
  return {
    srxOut: data?.[0],
    fee: data?.[1],
    isLoading: result.isLoading,
    error: result.error,
  };
}

/// Buy hook. Returns a `submit(srxAmountStr, minTokensOut?)` callback
/// plus the wagmi tx state so the UI can render pending / confirmed.
export function useBuy(address: Address | undefined) {
  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: txHash });

  function submit(srxAmount: string, minTokensOut: bigint = 0n) {
    if (!address) throw new Error("Curve address required");
    writeContract({
      abi: coinBlastCurveAbi,
      address: address as Address,
      functionName: "buy",
      args: [minTokensOut],
      value: parseEther(srxAmount),
    });
  }

  return {
    submit,
    txHash,
    isPending,
    isConfirming: receipt.isLoading,
    isConfirmed: receipt.isSuccess,
    error: error ?? receipt.error,
  };
}

/// Sell hook. Caller must have already approved the curve to pull
/// `tokensIn` of the curve's token (see ERC-20 approve flow).
export function useSell(address: Address | undefined) {
  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: txHash });

  function submit(tokensIn: bigint, minSrxOut: bigint = 0n) {
    if (!address) throw new Error("Curve address required");
    writeContract({
      abi: coinBlastCurveAbi,
      address: address as Address,
      functionName: "sell",
      args: [tokensIn, minSrxOut],
    });
  }

  return {
    submit,
    txHash,
    isPending,
    isConfirming: receipt.isLoading,
    isConfirmed: receipt.isSuccess,
    error: error ?? receipt.error,
  };
}
