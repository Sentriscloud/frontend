"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Eye } from "lucide-react";
import { encodeFunctionData, decodeFunctionResult, type Abi, type AbiFunction } from "viem";
import { useSourcifyFiles, partitionSourceFiles } from "@/lib/sourcify";
import { createClient, type NetworkId } from "@/lib/chain";
import { DetailCard } from "./DetailCard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ReadContractProps {
  network: NetworkId;
  address: string;
}

// DECISION: Read Contract is the #1 missed Etherscan parity feature; this
// builds it on top of the SourcifyViewer's ABI extraction. Flow:
//
//   1. Pull Sourcify files (already cached by the SourcifyViewer hook).
//   2. Parse ABI from metadata.json.
//   3. Filter to view + pure functions only — non-mutating reads.
//   4. Render one accordion row per function with one input field per
//      argument; on submit encode → eth_call → decode → pretty-print.
//
// We deliberately don't import wagmi here — Read needs zero wallet, just
// the public client we already use elsewhere. Wagmi gets pulled in when
// Phase C ships Write Contract.

export function ReadContract({ network, address }: ReadContractProps) {
  const { files, status, loading } = useSourcifyFiles(network, address);
  const { metadata } = useMemo(() => partitionSourceFiles(files), [files]);
  const abi = useMemo(() => parseAbi(metadata?.content), [metadata]);

  if (loading) {
    return (
      <DetailCard title="Read Contract">
        <div className="py-2 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-32 w-full" />
        </div>
      </DetailCard>
    );
  }

  if (status === "none" || !abi) {
    // SourcifyViewer above already shows the "verify your contract" CTA;
    // here we stay quiet so the page doesn't repeat the same nudge twice.
    return null;
  }

  const readFns = abi.filter(
    (e): e is AbiFunction =>
      e.type === "function" && (e.stateMutability === "view" || e.stateMutability === "pure"),
  );

  if (readFns.length === 0) {
    return (
      <DetailCard title="Read Contract">
        <p className="py-3 text-sm text-muted-foreground">
          This contract has no view / pure functions to read.
        </p>
      </DetailCard>
    );
  }

  return (
    <DetailCard
      title={
        <span className="inline-flex items-center gap-2">
          <Eye className="h-4 w-4" /> Read Contract
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {readFns.length} function{readFns.length === 1 ? "" : "s"}
          </span>
        </span>
      }
    >
      <div className="py-2 space-y-1">
        {readFns.map((fn, i) => (
          <FunctionRow
            key={`${fn.name ?? "fn"}-${i}`}
            fn={fn}
            abi={abi}
            address={address}
            network={network}
          />
        ))}
      </div>
    </DetailCard>
  );
}

function FunctionRow({
  fn,
  abi,
  address,
  network,
}: {
  fn: AbiFunction;
  abi: Abi;
  address: string;
  network: NetworkId;
}) {
  const [open, setOpen] = useState(false);
  const [args, setArgs] = useState<string[]>(() => fn.inputs.map(() => ""));
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sigPreview =
    fn.inputs.length === 0
      ? `${fn.name}()`
      : `${fn.name}(${fn.inputs.map((i) => `${i.type} ${i.name ?? ""}`.trim()).join(", ")})`;

  async function run() {
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const parsed = fn.inputs.map((input, idx) => parseArg(input.type, args[idx] ?? ""));
      const data = encodeFunctionData({
        abi,
        functionName: fn.name as string,
        args: parsed as unknown[],
      });
      const client = createClient(network);
      const raw = await client.call({
        to: address as `0x${string}`,
        data,
      });
      if (!raw.data || raw.data === "0x") {
        setResult("(empty response)");
      } else {
        const decoded = decodeFunctionResult({
          abi,
          functionName: fn.name as string,
          data: raw.data,
        });
        setResult(formatResult(decoded));
      }
    } catch (e) {
      setError((e as Error).message ?? "call failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="border border-border/60 rounded-md">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/40 transition-colors"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        <span className="font-mono text-xs truncate">{sigPreview}</span>
        <span className="ml-auto text-[10px] text-muted-foreground">{fn.stateMutability}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border/60">
          {fn.inputs.length > 0 && (
            <div className="space-y-1.5">
              {fn.inputs.map((input, idx) => (
                <label key={idx} className="block text-xs">
                  <span className="text-muted-foreground">
                    {input.name || `arg${idx}`} <span className="font-mono">({input.type})</span>
                  </span>
                  <input
                    type="text"
                    value={args[idx] ?? ""}
                    onChange={(e) => {
                      const next = [...args];
                      next[idx] = e.target.value;
                      setArgs(next);
                    }}
                    placeholder={placeholderFor(input.type)}
                    className="mt-0.5 w-full font-mono text-xs px-2 py-1.5 rounded border border-border bg-background focus:outline-none focus:border-[var(--gold)]"
                  />
                </label>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={run}
              disabled={running}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                running
                  ? "bg-muted text-muted-foreground"
                  : "bg-[var(--gold)] text-black hover:opacity-90",
              )}
            >
              {running && <Loader2 className="h-3 w-3 animate-spin" />}
              {running ? "Running…" : "Query"}
            </button>
            {result !== null && (
              <span className="text-[10px] text-green-500 font-mono">OK</span>
            )}
          </div>
          {result !== null && (
            <div className="text-xs">
              <p className="text-muted-foreground mb-1">Result:</p>
              <pre className="font-mono text-[11px] bg-muted/40 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
                {result}
              </pre>
            </div>
          )}
          {error && (
            <div className="text-xs text-red-500">
              <p className="mb-1">Error:</p>
              <pre className="font-mono text-[11px] bg-red-500/10 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
                {error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function parseAbi(metadataContent: string | undefined): Abi | null {
  if (!metadataContent) return null;
  try {
    const meta = JSON.parse(metadataContent);
    return Array.isArray(meta?.output?.abi) ? (meta.output.abi as Abi) : null;
  } catch {
    return null;
  }
}

function parseArg(type: string, raw: string): unknown {
  const v = raw.trim();
  if (type === "bool") return v === "true" || v === "1";
  if (type.startsWith("uint") || type.startsWith("int")) {
    if (!v) return 0n;
    return BigInt(v);
  }
  if (type === "address") return v as `0x${string}`;
  if (type === "string") return v;
  if (type.endsWith("[]")) {
    if (!v) return [];
    try {
      return JSON.parse(v);
    } catch {
      return v.split(",").map((s) => s.trim());
    }
  }
  // bytes / bytes32 / etc
  return v as `0x${string}`;
}

function placeholderFor(type: string): string {
  if (type === "address") return "0x...";
  if (type.startsWith("uint")) return "123";
  if (type === "bool") return "true / false";
  if (type === "string") return "hello";
  if (type.endsWith("[]")) return "[..., ...]";
  return "0x...";
}

function formatResult(decoded: unknown): string {
  if (decoded === undefined || decoded === null) return "(empty)";
  if (typeof decoded === "bigint") return decoded.toString();
  if (Array.isArray(decoded)) {
    return decoded
      .map((d) => (typeof d === "bigint" ? d.toString() : JSON.stringify(d)))
      .join("\n");
  }
  if (typeof decoded === "object") {
    return JSON.stringify(
      decoded,
      (_, v) => (typeof v === "bigint" ? v.toString() : v),
      2,
    );
  }
  return String(decoded);
}
