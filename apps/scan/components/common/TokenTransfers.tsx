"use client";

import { useEffect, useState } from "react";
import { decodeEventLog, type Abi, type Log as ViemLog } from "viem";
import { ArrowRight, Coins } from "lucide-react";
import { createClient, type NetworkId } from "@/lib/chain";
import { resolveAbi } from "@/lib/abi-resolver";
import { Address } from "./Address";
import { DetailCard } from "./DetailCard";
import { Skeleton } from "@/components/ui/skeleton";

interface TokenTransfersProps {
  network: NetworkId;
  txHash: string;
}

type ReceiptLog = ViemLog & {
  address: `0x${string}`;
  topics: readonly `0x${string}`[];
  data: `0x${string}`;
  logIndex: number;
};

interface Transfer {
  contract: `0x${string}`;
  from: `0x${string}`;
  to: `0x${string}`;
  value: bigint;
  symbol?: string;
  decimals?: number;
}

// keccak256("Transfer(address,address,uint256)")
const TRANSFER_TOPIC0 = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

// Etherscan-style "Tokens Transferred" panel. Reads the receipt logs we
// already need for the Logs tab, picks out ERC-20 Transfer events, and
// surfaces them above the raw event list as a clean money-flow summary.
// Independent of TxLogs — both can render side-by-side.
//
// We try to enrich with symbol+decimals via Sourcify ABI first; if the
// token isn't verified we fall back to showing the raw value with the
// contract address. Better than nothing.

export function TokenTransfers({ network, txHash }: TokenTransfersProps) {
  const [transfers, setTransfers] = useState<Transfer[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const client = createClient(network);
        const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` });
        if (cancelled) return;
        const logs = (receipt.logs as unknown as ReceiptLog[]) ?? [];

        const transferLogs = logs.filter(
          (l) => l.topics[0]?.toLowerCase() === TRANSFER_TOPIC0,
        );
        if (transferLogs.length === 0) {
          setTransfers([]);
          return;
        }

        // Resolve ABI per unique contract for symbol/decimals enrichment.
        const uniqueAddrs = Array.from(new Set(transferLogs.map((l) => l.address.toLowerCase())));
        const abis = new Map<string, Abi | null>();
        await Promise.all(
          uniqueAddrs.map(async (a) => {
            abis.set(a, await resolveAbi(network, a));
          }),
        );
        if (cancelled) return;

        // For each verified token, read symbol() + decimals() once. Both are
        // pure/view so eth_call is fine; we batch them in parallel.
        const meta = new Map<string, { symbol?: string; decimals?: number }>();
        await Promise.all(
          uniqueAddrs.map(async (a) => {
            const abi = abis.get(a);
            if (!abi) return;
            try {
              const [sym, dec] = await Promise.all([
                client.readContract({ address: a as `0x${string}`, abi, functionName: "symbol" }).catch(() => undefined),
                client.readContract({ address: a as `0x${string}`, abi, functionName: "decimals" }).catch(() => undefined),
              ]);
              meta.set(a, {
                symbol: typeof sym === "string" ? sym : undefined,
                decimals: typeof dec === "number" ? dec : typeof dec === "bigint" ? Number(dec) : undefined,
              });
            } catch {
              /* ignore — fall back to raw display */
            }
          }),
        );
        if (cancelled) return;

        const decoded: Transfer[] = transferLogs
          .map((log) => {
            const abi = abis.get(log.address.toLowerCase());
            if (!abi) {
              // Even without ABI we can decode — Transfer signature is fixed.
              // topics[1] = from (padded), topics[2] = to (padded), data = value (uint256)
              if (log.topics.length < 3 || !log.data) return null;
              const from = (`0x` + log.topics[1].slice(26)) as `0x${string}`;
              const to = (`0x` + log.topics[2].slice(26)) as `0x${string}`;
              const value = BigInt(log.data);
              return { contract: log.address, from, to, value };
            }
            try {
              const ev = decodeEventLog({
                abi,
                data: log.data,
                topics: log.topics as [signature: `0x${string}`, ...args: `0x${string}`[]],
              });
              const args = ev.args as { from?: `0x${string}`; to?: `0x${string}`; value?: bigint } | unknown[];
              const enriched = meta.get(log.address.toLowerCase()) ?? {};
              if (Array.isArray(args)) {
                return {
                  contract: log.address,
                  from: args[0] as `0x${string}`,
                  to: args[1] as `0x${string}`,
                  value: args[2] as bigint,
                  ...enriched,
                };
              }
              return {
                contract: log.address,
                from: args.from as `0x${string}`,
                to: args.to as `0x${string}`,
                value: args.value as bigint,
                ...enriched,
              };
            } catch {
              return null;
            }
          })
          .filter((t): t is Transfer => t !== null);

        setTransfers(decoded);
      } catch {
        if (!cancelled) setTransfers([]);
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
      <DetailCard title="Tokens Transferred">
        <div className="py-2 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-12 w-full" />
        </div>
      </DetailCard>
    );
  }

  if (!transfers || transfers.length === 0) {
    // Don't render the card at all when there are no transfers — keeps
    // the tx detail page tight on plain SRX transfers.
    return null;
  }

  return (
    <DetailCard
      title={
        <span className="inline-flex items-center gap-2">
          <Coins className="h-4 w-4 text-[var(--gold)]" /> Tokens Transferred
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {transfers.length} transfer{transfers.length === 1 ? "" : "s"}
          </span>
        </span>
      }
    >
      <ul className="py-2 space-y-2">
        {transfers.map((t, i) => {
          const formatted =
            t.decimals != null
              ? formatTokenAmount(t.value, t.decimals)
              : t.value.toString();
          return (
            <li
              key={`${t.contract}-${i}`}
              className="flex items-center gap-3 px-3 py-2 rounded-md border border-border/60 bg-muted/20 text-xs"
            >
              <span className="text-[10px] uppercase tracking-[.15em] font-mono text-[var(--tx-d)] shrink-0">
                #{i}
              </span>
              <Address address={t.from} muted showCopy={false} className="text-xs" />
              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
              <Address address={t.to} muted showCopy={false} className="text-xs" />
              <span className="ml-auto font-mono">
                <span className="font-semibold">{formatted}</span>{" "}
                <span className="text-muted-foreground">{t.symbol ?? "TOKEN"}</span>
              </span>
              <Address address={t.contract} muted showCopy={false} className="text-[10px]" />
            </li>
          );
        })}
      </ul>
    </DetailCard>
  );
}

function formatTokenAmount(value: bigint, decimals: number): string {
  if (decimals <= 0) return value.toString();
  const s = value.toString().padStart(decimals + 1, "0");
  const whole = s.slice(0, -decimals);
  const frac = s.slice(-decimals).replace(/0+$/, "");
  return frac ? `${whole}.${frac.slice(0, 6)}` : whole;
}
