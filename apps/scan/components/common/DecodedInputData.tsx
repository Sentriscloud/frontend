"use client";

import { useEffect, useState } from "react";
import { decodeFunctionData, type Abi } from "viem";
import { resolveAbi } from "@/lib/abi-resolver";
import type { NetworkId } from "@/lib/chain";
import { Skeleton } from "@/components/ui/skeleton";

interface DecodedInputDataProps {
  network: NetworkId;
  to: string;
  inputData: string;
}

interface Decoded {
  functionName: string;
  args: readonly unknown[];
  signature: string;
}

// Etherscan-style decoded input — when the destination contract is verified
// on Sourcify, run viem's `decodeFunctionData` against its ABI and surface
// the function name + named args. The raw hex still shows below this card
// (caller controls layout); this only supplements it.
//
// Returns null when no ABI is available or when the input doesn't decode
// (e.g. fallback function, malformed calldata) — caller can branch on the
// `null` render to skip rendering the card entirely.

export function DecodedInputData({ network, to, inputData }: DecodedInputDataProps) {
  const [decoded, setDecoded] = useState<Decoded | null>(null);
  const [abi, setAbi] = useState<Abi | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const a = await resolveAbi(network, to);
      if (cancelled) return;
      setAbi(a);
      if (!a) return;
      try {
        const result = decodeFunctionData({
          abi: a,
          data: inputData as `0x${string}`,
        });
        // Pull the matching function entry to build a printable signature.
        const fn = a.find(
          (e) => e.type === "function" && e.name === result.functionName,
        ) as { name: string; inputs: { name?: string; type: string }[] } | undefined;
        const sig = fn
          ? `${fn.name}(${fn.inputs.map((i) => `${i.type} ${i.name ?? ""}`.trim()).join(", ")})`
          : `${result.functionName}(...)`;
        setDecoded({
          functionName: result.functionName,
          args: (result.args ?? []) as readonly unknown[],
          signature: sig,
        });
      } catch {
        setDecoded(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [network, to, inputData]);

  if (abi === undefined) {
    return (
      <div className="space-y-2 mb-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }
  if (!abi || !decoded) return null;

  return (
    <div className="mb-4 rounded-md border border-[var(--gold)]/30 bg-[color-mix(in_oklab,var(--gold)_4%,transparent)] p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono tracking-[.2em] uppercase text-[var(--gold)]">
          Decoded Function Call
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">
          via verified ABI
        </span>
      </div>
      <p className="font-mono text-xs break-all">{decoded.signature}</p>
      {decoded.args.length > 0 && (
        <div className="pt-1 border-t border-border/40">
          <table className="w-full text-xs">
            <tbody>
              {decoded.args.map((v, i) => {
                const fn = (abi as readonly { type: string; name?: string; inputs?: { name?: string; type: string }[] }[]).find(
                  (e) => e.type === "function" && e.name === decoded.functionName,
                );
                const input = fn?.inputs?.[i];
                return (
                  <tr key={i}>
                    <td className="text-muted-foreground pr-3 align-top whitespace-nowrap py-0.5">
                      {input?.name || `arg${i}`}{" "}
                      <span className="font-mono">({input?.type ?? "?"})</span>
                    </td>
                    <td className="font-mono break-all py-0.5">{stringify(v)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function stringify(v: unknown): string {
  if (typeof v === "bigint") return v.toString();
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map((x) => (typeof x === "bigint" ? x.toString() : JSON.stringify(x))).join(", ");
  if (v === null || v === undefined) return "—";
  return JSON.stringify(v, (_, x) => (typeof x === "bigint" ? x.toString() : x));
}
