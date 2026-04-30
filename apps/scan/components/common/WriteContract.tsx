"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Wallet, AlertTriangle } from "lucide-react";
import {
  createWalletClient,
  custom,
  encodeFunctionData,
  type Abi,
  type AbiFunction,
} from "viem";
import { useSourcifyFiles, partitionSourceFiles } from "@/lib/sourcify";
import { createClient, getChain, type NetworkId } from "@/lib/chain";
import { DetailCard } from "./DetailCard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface WriteContractProps {
  network: NetworkId;
  address: string;
}

// DECISION: roll-own with viem's WalletClient instead of pulling in
// `wagmi` (the ~150KB convention dep). Read tab uses zero wallet — Write
// needs an injected provider (window.ethereum). We inspect that lazily
// only when the user actually connects a wallet, so the bundle stays the
// same size as Read for visitors who never click "Connect".
//
// Connect flow:
//   1. user clicks Connect → eth_requestAccounts via window.ethereum
//   2. we wrap the provider in viem's `createWalletClient({ transport: custom(window.ethereum) })`
//   3. for each `nonpayable`/`payable` function: encode args → walletClient.sendTransaction
//   4. surface txid + link out to /tx/<hash> on success, raw error on failure
//
// We deliberately do NOT auto-switch the user's network — that's a
// MetaMask-side popup which surprises users. Instead we surface a
// "switch to Sentrix Mainnet" hint when chainId mismatch is detected.

interface InjectedProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: InjectedProvider;
  }
}

export function WriteContract({ network, address }: WriteContractProps) {
  const { files, status, loading } = useSourcifyFiles(network, address);
  const { metadata } = useMemo(() => partitionSourceFiles(files), [files]);
  const abi = useMemo(() => parseAbi(metadata?.content), [metadata]);
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [walletChainId, setWalletChainId] = useState<number | null>(null);

  if (loading) {
    return (
      <DetailCard title="Write Contract">
        <div className="py-2 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-32 w-full" />
        </div>
      </DetailCard>
    );
  }

  if (status === "none" || !abi) return null;

  const writeFns = abi.filter(
    (e): e is AbiFunction =>
      e.type === "function" &&
      (e.stateMutability === "nonpayable" || e.stateMutability === "payable"),
  );

  if (writeFns.length === 0) {
    return (
      <DetailCard title="Write Contract">
        <p className="py-3 text-sm text-muted-foreground">
          This contract has no nonpayable / payable functions to write.
        </p>
      </DetailCard>
    );
  }

  const expectedChainId = getChain(network).id;
  const wrongChain = walletChainId != null && walletChainId !== expectedChainId;

  async function connect() {
    const eth = typeof window !== "undefined" ? window.ethereum : undefined;
    if (!eth) {
      alert("No injected wallet found. Install MetaMask or another EIP-1193 wallet.");
      return;
    }
    try {
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      setAccount(accounts[0] as `0x${string}`);
      const chainHex = (await eth.request({ method: "eth_chainId" })) as string;
      setWalletChainId(parseInt(chainHex, 16));
    } catch (e) {
      alert(`Connect failed: ${(e as Error).message}`);
    }
  }

  return (
    <DetailCard
      title={
        <span className="inline-flex items-center gap-2">
          <Wallet className="h-4 w-4" /> Write Contract
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {writeFns.length} function{writeFns.length === 1 ? "" : "s"}
          </span>
        </span>
      }
      action={
        account ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            {account.slice(0, 6)}…{account.slice(-4)}
          </span>
        ) : (
          <button
            onClick={connect}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-[var(--gold)] text-black hover:opacity-90"
          >
            <Wallet className="h-3 w-3" />
            Connect Wallet
          </button>
        )
      }
    >
      {wrongChain && (
        <div className="py-2 px-3 mb-3 rounded-md border border-yellow-500/30 bg-yellow-500/10 text-yellow-500 text-xs flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Wallet is on chain {walletChainId} but this contract lives on chain {expectedChainId}.
          Switch networks in your wallet before submitting.
        </div>
      )}

      <div className="py-2 space-y-1">
        {writeFns.map((fn, i) => (
          <FunctionRow
            key={`${fn.name ?? "fn"}-${i}`}
            fn={fn}
            abi={abi}
            address={address}
            network={network}
            account={account}
            disabled={!account || wrongChain}
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
  account,
  disabled,
}: {
  fn: AbiFunction;
  abi: Abi;
  address: string;
  network: NetworkId;
  account: `0x${string}` | null;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [args, setArgs] = useState<string[]>(() => fn.inputs.map(() => ""));
  const [value, setValue] = useState("");
  const [running, setRunning] = useState(false);
  const [txid, setTxid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sigPreview =
    fn.inputs.length === 0
      ? `${fn.name}()`
      : `${fn.name}(${fn.inputs.map((i) => `${i.type} ${i.name ?? ""}`.trim()).join(", ")})`;

  async function submit() {
    if (!account) return;
    const eth = window.ethereum;
    if (!eth) return;
    setRunning(true);
    setTxid(null);
    setError(null);
    try {
      const parsed = fn.inputs.map((input, idx) => parseArg(input.type, args[idx] ?? ""));
      const data = encodeFunctionData({
        abi,
        functionName: fn.name as string,
        args: parsed as unknown[],
      });
      const wallet = createWalletClient({
        chain: getChain(network),
        transport: custom(eth),
        account,
      });
      const hash = await wallet.sendTransaction({
        to: address as `0x${string}`,
        data,
        value: fn.stateMutability === "payable" && value ? BigInt(value) : 0n,
      });
      setTxid(hash);
      // Best-effort: poll for receipt to give the user a "mined" signal.
      const client = createClient(network);
      try {
        await client.waitForTransactionReceipt({ hash, timeout: 30_000 });
      } catch {
        /* timeout = chain still working on it; user has the link */
      }
    } catch (e) {
      setError((e as Error).message ?? "tx failed");
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
        <span className="ml-auto text-[10px] text-muted-foreground">
          {fn.stateMutability === "payable" ? "payable" : "nonpayable"}
        </span>
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
                    value={args[idx] ?? ""}
                    onChange={(e) => {
                      const next = [...args];
                      next[idx] = e.target.value;
                      setArgs(next);
                    }}
                    className="mt-0.5 w-full font-mono text-xs px-2 py-1.5 rounded border border-border bg-background focus:outline-none focus:border-[var(--gold)]"
                  />
                </label>
              ))}
            </div>
          )}
          {fn.stateMutability === "payable" && (
            <label className="block text-xs">
              <span className="text-muted-foreground">value (wei)</span>
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0"
                className="mt-0.5 w-full font-mono text-xs px-2 py-1.5 rounded border border-border bg-background focus:outline-none focus:border-[var(--gold)]"
              />
            </label>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={submit}
              disabled={disabled || running}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                disabled || running
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-[var(--gold)] text-black hover:opacity-90",
              )}
            >
              {running && <Loader2 className="h-3 w-3 animate-spin" />}
              {running ? "Submitting…" : "Submit"}
            </button>
            {!account && <span className="text-[10px] text-muted-foreground">Connect a wallet first.</span>}
          </div>
          {txid && (
            <div className="text-xs">
              <p className="text-muted-foreground mb-1">Submitted:</p>
              <a
                href={`/tx/${txid}`}
                className="font-mono text-[11px] text-[var(--gold)] hover:underline break-all"
              >
                {txid}
              </a>
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
  return v as `0x${string}`;
}
