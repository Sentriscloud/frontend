"use client";

// Cross-app Solux SIGNING — companion to solux-connect.tsx. The connect
// hook hands the consumer the user's address (view-only); this hook
// hands the consumer a signing primitive: build a tx, call signAndSend,
// Solux pops up, user reviews, signs, the raw tx is broadcast via the
// app's existing wagmi public client.
//
// Why this hook + a popup rather than a wagmi connector: a wagmi
// connector pretends to be a synchronous signer, but a popup-based
// review is asynchronous and requires a user gesture per tx — the two
// lifecycles fight. By staying *outside* wagmi's writeContract path the
// consumer has explicit control of when Solux is invoked.
//
// Trust model:
//   - Solux origin (https://solux.sentriscloud.com) is hard-coded; we
//     reject postMessages from anywhere else.
//   - The signed raw tx is opaque bytes — we don't trust Solux to give
//     us anything *but* a signed envelope; the public client validates
//     when broadcasting.

import { useCallback, useEffect, useRef, useState } from "react";
import { encodeFunctionData, type Abi, type Hex } from "viem";
import { usePublicClient } from "wagmi";

const SOLUX_ORIGIN = "https://solux.sentriscloud.com";
const POPUP_FEATURES = "width=460,height=620,popup=yes,noopener=no,noreferrer=no";

interface SignResultMessage {
  type: "sentrix:sign-result";
  origin: string;
  rawTx: `0x${string}` | null;
  error?: string;
}

export interface SoluxSignAndSendArgs {
  /** Recipient — for contract calls, the contract address. */
  to: `0x${string}`;
  /** Optional ABI + function shorthand: pass these and we'll encode for you. */
  abi?: Abi;
  functionName?: string;
  args?: readonly unknown[];
  /** Or pass raw calldata directly (skips abi encoding). */
  data?: `0x${string}`;
  /** msg.value in wei. Defaults to 0. */
  value?: bigint;
  /** Optional human-readable hint shown in the Solux review screen. */
  label?: string;
}

export interface UseSoluxSignerReturn {
  /**
   * Build, prompt Solux to sign, broadcast. Resolves with the tx hash
   * once the broadcast succeeds — does not wait for inclusion. Use the
   * returned hash with wagmi's useWaitForTransactionReceipt to track.
   */
  signAndSend: (args: SoluxSignAndSendArgs) => Promise<`0x${string}`>;
  isSigning: boolean;
  error: string | null;
  /** Clear the last error so the UI can retry. */
  reset: () => void;
}

/**
 * Hook: open Solux signing popup, broadcast the signed raw tx via the
 * app's wagmi public client. The consumer is responsible for telling
 * the user there's a popup if it gets blocked.
 */
export function useSoluxSigner(opts: { chainId: number; from: `0x${string}` }): UseSoluxSignerReturn {
  const publicClient = usePublicClient({ chainId: opts.chainId });
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);
  const resolveRef = useRef<((rawTx: `0x${string}`) => void) | null>(null);
  const rejectRef = useRef<((err: Error) => void) | null>(null);

  // Single global message listener — the popup sends one postMessage and
  // closes. We multiplex via the in-flight resolveRef.
  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      if (ev.origin !== SOLUX_ORIGIN) return;
      const data = ev.data as SignResultMessage | undefined;
      if (!data || data.type !== "sentrix:sign-result") return;
      if (typeof window !== "undefined" && data.origin !== window.location.origin) {
        rejectRef.current?.(new Error("Origin mismatch in Solux response."));
        return;
      }
      if (data.rawTx) {
        resolveRef.current?.(data.rawTx);
      } else {
        rejectRef.current?.(new Error(data.error ?? "Solux denied the signing request."));
      }
      try { popupRef.current?.close(); } catch { /* already closed */ }
      resolveRef.current = null;
      rejectRef.current = null;
    }
    if (typeof window !== "undefined") {
      window.addEventListener("message", onMessage);
      return () => window.removeEventListener("message", onMessage);
    }
  }, []);

  const signAndSend = useCallback(async (args: SoluxSignAndSendArgs): Promise<`0x${string}`> => {
    if (!publicClient) throw new Error("No public client for chain " + opts.chainId);
    setError(null);
    setIsSigning(true);
    try {
      // Encode calldata if the consumer gave us an ABI shortcut. Either
      // (abi + functionName + args) or `data` raw — never both.
      const data: Hex =
        args.data ??
        (args.abi && args.functionName !== undefined
          ? encodeFunctionData({ abi: args.abi, functionName: args.functionName, args: args.args })
          : "0x");

      // Pull live nonce + EIP-1559 fee suggestions from the chain so the
      // popup can review with real numbers and the broadcast doesn't trip
      // on a stale nonce. Burn one extra RPC call but UX is more important.
      const [nonce, fees] = await Promise.all([
        publicClient.getTransactionCount({ address: opts.from, blockTag: "pending" }),
        publicClient.estimateFeesPerGas().catch(() => null),
      ]);
      const gas = await publicClient.estimateGas({
        account: opts.from,
        to: args.to,
        data,
        value: args.value ?? 0n,
      }).catch(() => 21_000n);

      // Encode envelope as base64-JSON because URL-encoded JSON of bigints
      // is messy. Numbers go as decimal strings — the popup parses them
      // back to bigints before viem signs.
      const envelope = {
        chainId: opts.chainId,
        to: args.to,
        data,
        value: (args.value ?? 0n).toString(),
        gas: gas.toString(),
        maxFeePerGas: fees?.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: fees?.maxPriorityFeePerGas?.toString(),
        nonce,
        label: args.label,
      };
      const reqB64 = btoa(JSON.stringify(envelope));
      const url = `${SOLUX_ORIGIN}/sign?origin=${encodeURIComponent(window.location.origin)}&req=${reqB64}`;

      // Open popup synchronously inside the user gesture so browsers
      // don't block it. The Promise resolves once Solux postMessages back.
      const popup = window.open(url, "sentrix-solux-sign", POPUP_FEATURES);
      if (!popup) throw new Error("Popup blocked. Allow popups and retry.");
      popupRef.current = popup;

      const rawTx = await new Promise<`0x${string}`>((resolve, reject) => {
        resolveRef.current = resolve;
        rejectRef.current = reject;
        // Watch for user closing popup without responding.
        const watchClose = setInterval(() => {
          if (popup.closed && resolveRef.current) {
            clearInterval(watchClose);
            const r = rejectRef.current;
            resolveRef.current = null;
            rejectRef.current = null;
            r?.(new Error("Solux popup closed without signing."));
          }
        }, 400);
        // Belt-and-braces 5-min timeout.
        setTimeout(() => {
          clearInterval(watchClose);
          if (resolveRef.current) {
            const r = rejectRef.current;
            resolveRef.current = null;
            rejectRef.current = null;
            r?.(new Error("Solux signing timed out."));
          }
        }, 5 * 60_000);
      });

      // Broadcast. Returns tx hash; caller waits for the receipt.
      const txHash = await publicClient.sendRawTransaction({ serializedTransaction: rawTx });
      return txHash;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Solux signing failed.";
      setError(msg);
      throw e;
    } finally {
      setIsSigning(false);
    }
  }, [publicClient, opts.chainId, opts.from]);

  const reset = useCallback(() => setError(null), []);

  return { signAndSend, isSigning, error, reset };
}
