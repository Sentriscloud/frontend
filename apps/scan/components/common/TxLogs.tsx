"use client";

import { useEffect, useMemo, useState } from "react";
import { decodeEventLog, type Abi, type Log as ViemLog } from "viem";
import { FileCode, Loader2 } from "lucide-react";
import { createClient, type NetworkId } from "@/lib/chain";
import { Address } from "./Address";
import { Copyable } from "./Copyable";
import { DetailCard } from "./DetailCard";
import { EmptyState } from "./EmptyState";
import { Skeleton } from "@/components/ui/skeleton";

interface TxLogsProps {
  network: NetworkId;
  txHash: string;
}

type ReceiptLog = ViemLog & {
  address: `0x${string}`;
  topics: readonly `0x${string}`[];
  data: `0x${string}`;
  logIndex: number;
};

interface DecodedLog {
  log: ReceiptLog;
  decoded:
    | { eventName: string | undefined; args: Record<string, unknown> | unknown[] }
    | null;
  abiSource: "verified" | "none";
}

const SOURCIFY_URL = "https://verify.sentrixchain.com";
const CHAIN_FOR_NETWORK: Record<NetworkId, string> = { mainnet: "7119", testnet: "7120" };

// In-memory ABI cache keyed by `${network}:${address}` so the page doesn't
// re-fetch the same Sourcify metadata for every log emitted by the same
// contract within one tx (very common — a single token transfer typically
// emits 1-3 logs from the same contract).
const abiCache = new Map<string, Abi | null>();

async function resolveAbi(network: NetworkId, address: string): Promise<Abi | null> {
  const key = `${network}:${address.toLowerCase()}`;
  if (abiCache.has(key)) return abiCache.get(key) ?? null;
  try {
    const res = await fetch(
      `${SOURCIFY_URL}/files/any/${CHAIN_FOR_NETWORK[network]}/${address}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) {
      abiCache.set(key, null);
      return null;
    }
    const body = await res.json();
    const meta = body?.files?.find?.((f: { name: string }) => f.name?.toLowerCase() === "metadata.json");
    if (!meta?.content) {
      abiCache.set(key, null);
      return null;
    }
    const parsed = JSON.parse(meta.content);
    const abi = Array.isArray(parsed?.output?.abi) ? (parsed.output.abi as Abi) : null;
    abiCache.set(key, abi);
    return abi;
  } catch {
    abiCache.set(key, null);
    return null;
  }
}

export function TxLogs({ network, txHash }: TxLogsProps) {
  const [logs, setLogs] = useState<ReceiptLog[] | null>(null);
  const [decoded, setDecoded] = useState<DecodedLog[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const client = createClient(network);
        const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` });
        if (cancelled) return;
        const list = (receipt.logs as unknown as ReceiptLog[]) ?? [];
        setLogs(list);

        // Resolve ABI for every unique log emitter, then attempt decode.
        const uniqueAddrs = Array.from(new Set(list.map((l) => l.address.toLowerCase())));
        const abis = new Map<string, Abi | null>();
        await Promise.all(
          uniqueAddrs.map(async (a) => {
            abis.set(a, await resolveAbi(network, a));
          }),
        );
        if (cancelled) return;

        const out: DecodedLog[] = list.map((log) => {
          const abi = abis.get(log.address.toLowerCase());
          if (!abi) return { log, decoded: null, abiSource: "none" };
          try {
            const ev = decodeEventLog({
              abi,
              data: log.data,
              topics: log.topics as [signature: `0x${string}`, ...args: `0x${string}`[]],
            });
            return {
              log,
              decoded: { eventName: ev.eventName, args: ev.args as Record<string, unknown> | unknown[] },
              abiSource: "verified",
            };
          } catch {
            return { log, decoded: null, abiSource: "verified" };
          }
        });
        setDecoded(out);
      } catch (e) {
        if (cancelled) return;
        setError((e as Error).message ?? "failed to fetch receipt");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [network, txHash]);

  if (loading) {
    return (
      <DetailCard title="Logs">
        <div className="py-2 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-24 w-full" />
        </div>
      </DetailCard>
    );
  }
  if (error) {
    return (
      <DetailCard title="Logs">
        <p className="py-3 text-sm text-red-500">Failed to fetch receipt: {error}</p>
      </DetailCard>
    );
  }
  if (!logs || logs.length === 0) {
    return (
      <DetailCard title="Logs">
        <EmptyState title="No logs" hint="This transaction did not emit any events." />
      </DetailCard>
    );
  }

  return (
    <DetailCard
      title={
        <span className="inline-flex items-center gap-2">
          <FileCode className="h-4 w-4" /> Logs
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {logs.length} event{logs.length === 1 ? "" : "s"}
          </span>
        </span>
      }
    >
      <div className="py-2 space-y-3">
        {(decoded ?? []).map((d, i) => (
          <LogRow key={`${d.log.transactionHash}:${d.log.logIndex}:${i}`} dec={d} />
        ))}
      </div>
    </DetailCard>
  );
}

function LogRow({ dec }: { dec: DecodedLog }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/60 bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-mono text-muted-foreground">#{dec.log.logIndex}</span>
          <Address address={dec.log.address} />
        </div>
        {dec.decoded ? (
          <span className="text-xs font-mono text-[var(--gold)]">{dec.decoded.eventName ?? "(anonymous)"}</span>
        ) : (
          <span className="text-[10px] text-muted-foreground">{dec.abiSource === "verified" ? "decode failed" : "raw (unverified)"}</span>
        )}
      </div>
      <div className="px-3 py-2 text-xs space-y-2">
        {dec.decoded ? (
          <DecodedView args={dec.decoded.args} />
        ) : (
          <RawView log={dec.log} />
        )}
      </div>
    </div>
  );
}

function DecodedView({ args }: { args: Record<string, unknown> | unknown[] }) {
  const entries = Array.isArray(args)
    ? args.map((v, i) => [String(i), v] as const)
    : Object.entries(args);
  return (
    <table className="w-full text-xs">
      <tbody>
        {entries.map(([k, v]) => (
          <tr key={k}>
            <td className="text-muted-foreground pr-3 align-top whitespace-nowrap">{k}</td>
            <td className="font-mono break-all">{stringify(v)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RawView({ log }: { log: ReceiptLog }) {
  return (
    <>
      {log.topics.map((t, i) => (
        <div key={i} className="flex gap-2 items-start">
          <span className="text-muted-foreground shrink-0">topic{i}:</span>
          <span className="font-mono break-all flex-1">{t}</span>
          <Copyable text={t} bare />
        </div>
      ))}
      {log.data && log.data !== "0x" && (
        <div className="flex gap-2 items-start">
          <span className="text-muted-foreground shrink-0">data:</span>
          <span className="font-mono break-all flex-1">{log.data}</span>
          <Copyable text={log.data} bare />
        </div>
      )}
    </>
  );
}

function stringify(v: unknown): string {
  if (typeof v === "bigint") return v.toString();
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map((x) => (typeof x === "bigint" ? x.toString() : JSON.stringify(x))).join(", ");
  if (v === null || v === undefined) return "—";
  return JSON.stringify(v, (_, x) => (typeof x === "bigint" ? x.toString() : x));
}

// Cache shape for next session that wants to invalidate.
export function _resetTxLogsAbiCache() {
  abiCache.clear();
}

// `useEffect` is intentionally unused if a caller imports a non-hook path —
// suppress lint by re-export.
export const _internal = { resolveAbi };
