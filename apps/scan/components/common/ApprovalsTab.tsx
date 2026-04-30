"use client";

import { useEffect, useState } from "react";
import { encodeFunctionData, type Abi, parseAbi } from "viem";
import { ShieldOff, Loader2, AlertTriangle } from "lucide-react";
import { createClient, type NetworkId, getChain } from "@/lib/chain";
import { resolveAbi } from "@/lib/abi-resolver";
import { Address } from "./Address";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "./EmptyState";

interface ApprovalsTabProps {
  network: NetworkId;
  address: string;
}

// keccak256("Approval(address,address,uint256)")
const APPROVAL_TOPIC0 = "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925";

// Minimal ABI for ERC-20 approve + symbol + decimals + allowance reads.
// Used as fallback when the token contract is not verified on Sourcify
// (the events are still standard ERC-20, the calls work the same).
const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function allowance(address owner, address spender) view returns (uint256)",
]);

interface Approval {
  token: `0x${string}`;
  spender: `0x${string}`;
  allowance: bigint;
  blockNumber: bigint;
  symbol?: string;
  decimals?: number;
}

// Window.ethereum global lives in WriteContract.tsx; we just consume it here.

// Etherscan-style "Token Approvals" tab. Auditing what spenders can pull
// what amounts from this address is the #1 thing security-conscious users
// look for after a phishing scare. Without it, scan misses that diligence
// step entirely.
//
// Approach: pull every Approval(address indexed owner, address indexed
// spender, uint256 value) event where topic[1] = padded(addr), group by
// (token, spender), keep only the latest, hide value=0 entries. We re-read
// the live `allowance(owner, spender)` to confirm — the latest event might
// have been replaced by a non-Approval write path.
//
// Revoke is a one-click `approve(spender, 0)` using whatever EIP-1193
// wallet is injected. Same connect pattern as WriteContract — no wagmi.

export function ApprovalsTab({ network, address }: ApprovalsTabProps) {
  const [approvals, setApprovals] = useState<Approval[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const client = createClient(network);
        // Pad address to 32 bytes for topic match.
        const padded = ("0x" + "0".repeat(24) + address.slice(2).toLowerCase()) as `0x${string}`;

        // viem's typed `getLogs` wants an event ABI; we want raw topic-only
        // filtering across all contracts, so drop to raw eth_getLogs.
        type RawLog = {
          address: `0x${string}`;
          topics: `0x${string}`[];
          data: `0x${string}`;
          blockNumber: `0x${string}` | null;
        };
        const logs = (await client.request({
          method: "eth_getLogs",
          params: [
            {
              fromBlock: "0x0",
              toBlock: "latest",
              topics: [APPROVAL_TOPIC0, padded],
            },
          ],
        })) as RawLog[];
        if (cancelled) return;

        // Group by (token, spender), keep latest by blockNumber.
        const map = new Map<string, Approval>();
        for (const log of logs) {
          if (log.topics.length < 3 || !log.data) continue;
          const spender = (`0x` + log.topics[2]!.slice(26)) as `0x${string}`;
          const value = BigInt(log.data);
          const key = `${log.address.toLowerCase()}:${spender.toLowerCase()}`;
          const existing = map.get(key);
          const blockNumber = log.blockNumber ? BigInt(log.blockNumber) : 0n;
          if (!existing || existing.blockNumber < blockNumber) {
            map.set(key, {
              token: log.address,
              spender,
              allowance: value,
              blockNumber,
            });
          }
        }

        // Filter to non-zero (active) approvals.
        const active = Array.from(map.values()).filter((a) => a.allowance > 0n);

        // Enrich with symbol/decimals for each unique token.
        const uniqueTokens = Array.from(new Set(active.map((a) => a.token.toLowerCase())));
        const meta = new Map<string, { symbol?: string; decimals?: number; abi: Abi }>();
        await Promise.all(
          uniqueTokens.map(async (a) => {
            const verifiedAbi = await resolveAbi(network, a);
            const abi = verifiedAbi ?? ERC20_ABI;
            try {
              const [sym, dec] = await Promise.all([
                client
                  .readContract({ address: a as `0x${string}`, abi, functionName: "symbol" })
                  .catch(() => undefined),
                client
                  .readContract({ address: a as `0x${string}`, abi, functionName: "decimals" })
                  .catch(() => undefined),
              ]);
              meta.set(a, {
                symbol: typeof sym === "string" ? sym : undefined,
                decimals:
                  typeof dec === "number"
                    ? dec
                    : typeof dec === "bigint"
                      ? Number(dec)
                      : undefined,
                abi,
              });
            } catch {
              meta.set(a, { abi });
            }
          }),
        );
        if (cancelled) return;

        // Re-confirm live allowance — events can lie if the chain
        // exposes non-Approval-event-emitting allowance writes.
        const reconfirmed = await Promise.all(
          active.map(async (a) => {
            const tokenMeta = meta.get(a.token.toLowerCase());
            try {
              const live = (await client.readContract({
                address: a.token,
                abi: tokenMeta?.abi ?? ERC20_ABI,
                functionName: "allowance",
                args: [address as `0x${string}`, a.spender],
              })) as bigint;
              return { ...a, allowance: live, ...tokenMeta };
            } catch {
              return { ...a, ...tokenMeta };
            }
          }),
        );
        if (cancelled) return;

        // After the live re-read, drop any that are now zero.
        setApprovals(reconfirmed.filter((a) => a.allowance > 0n));
      } catch (e) {
        if (!cancelled) setError((e as Error).message ?? "failed to fetch approvals");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [network, address]);

  async function revoke(a: Approval) {
    const eth = typeof window !== "undefined" ? window.ethereum : undefined;
    if (!eth) {
      alert("No injected wallet found. Install MetaMask or another EIP-1193 wallet.");
      return;
    }
    const key = `${a.token.toLowerCase()}:${a.spender.toLowerCase()}`;
    setRevoking(key);
    try {
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      const from = accounts[0];
      if (!from || from.toLowerCase() !== address.toLowerCase()) {
        alert(
          `Wallet account (${from?.slice(0, 8) ?? "?"}…) doesn't match this address. Switch wallet to ${address.slice(0, 8)}… first.`,
        );
        return;
      }
      const chainHex = (await eth.request({ method: "eth_chainId" })) as string;
      const walletChain = parseInt(chainHex, 16);
      const expected = getChain(network).id;
      if (walletChain !== expected) {
        alert(`Wallet on chain ${walletChain}; switch to ${expected} (${network}) before revoking.`);
        return;
      }
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "approve",
        args: [a.spender, 0n],
      });
      const txid = (await eth.request({
        method: "eth_sendTransaction",
        params: [{ from, to: a.token, data }],
      })) as string;
      alert(`Revoke submitted: ${txid}\n\nThe allowance row will refresh once the tx mines.`);
      // Optimistically drop the entry from the visible list.
      setApprovals((prev) =>
        prev?.filter(
          (x) => !(x.token.toLowerCase() === a.token.toLowerCase() && x.spender.toLowerCase() === a.spender.toLowerCase()),
        ) ?? null,
      );
    } catch (e) {
      alert(`Revoke failed: ${(e as Error).message ?? "unknown"}`);
    } finally {
      setRevoking(null);
    }
  }

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-sm text-red-500 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        Failed to load approvals: {error}
      </div>
    );
  }

  if (!approvals || approvals.length === 0) {
    return (
      <EmptyState
        icon={ShieldOff}
        title="No active token approvals"
        hint="When this address grants a spender allowance via approve(), it will show up here so you can audit + revoke."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground bg-muted/30">
            <th className="px-4 py-2.5 font-medium">Token</th>
            <th className="px-4 py-2.5 font-medium">Spender</th>
            <th className="px-4 py-2.5 font-medium text-right">Allowance</th>
            <th className="px-4 py-2.5 font-medium text-right">Last updated</th>
            <th className="px-4 py-2.5 font-medium text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60 row-hover">
          {approvals.map((a) => {
            const key = `${a.token.toLowerCase()}:${a.spender.toLowerCase()}`;
            const isUnlimited = a.allowance >= 2n ** 255n;
            const formatted = isUnlimited
              ? "Unlimited"
              : a.decimals != null
                ? formatTokenAmount(a.allowance, a.decimals)
                : a.allowance.toString();
            return (
              <tr key={key}>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Address address={a.token} muted className="text-xs" />
                    {a.symbol && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--gold)]/10 text-[var(--gold)] font-mono">
                        {a.symbol}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <Address address={a.spender} muted className="text-xs" />
                </td>
                <td className="px-4 py-2.5 text-right font-mono">
                  <span className={isUnlimited ? "text-red-500" : ""}>{formatted}</span>{" "}
                  {a.symbol && !isUnlimited && (
                    <span className="text-muted-foreground">{a.symbol}</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">
                  #{a.blockNumber.toString()}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={() => revoke(a)}
                    disabled={revoking === key}
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border border-red-500/30 text-red-500 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {revoking === key ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <ShieldOff className="h-3 w-3" />
                    )}
                    Revoke
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatTokenAmount(value: bigint, decimals: number): string {
  if (decimals <= 0) return value.toString();
  const s = value.toString().padStart(decimals + 1, "0");
  const whole = s.slice(0, -decimals);
  const frac = s.slice(-decimals).replace(/0+$/, "");
  return frac ? `${whole}.${frac.slice(0, 6)}` : whole;
}
