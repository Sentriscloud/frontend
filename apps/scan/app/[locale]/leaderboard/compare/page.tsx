"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { GitCompare, ArrowLeftRight } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Address } from "@/components/common/Address";
import { useNetwork } from "@/lib/network-context";
import { fetchAccountBalance, fetchToken, fetchValidators, type AccountBalance, type TokenData, type ValidatorData } from "@/lib/api";
import { formatNumber } from "@/lib/format";

type CompareType = "address" | "validator" | "token";

const TYPE_LABELS: Record<CompareType, string> = {
  address:   "Address",
  validator: "Validator",
  token:     "Token",
};

const PLURALS: Record<CompareType, string> = {
  address:   "addresses",
  validator: "validators",
  token:     "tokens",
};

export default function ComparePage() {
  return (
    <Suspense fallback={<Skeleton className="h-48 w-full" />}>
      <CompareInner />
    </Suspense>
  );
}

function CompareInner() {
  const { network } = useNetwork();
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [type, setType] = useState<CompareType>((sp.get("type") as CompareType) || "address");
  const [a, setA] = useState(sp.get("a") ?? "");
  const [b, setB] = useState(sp.get("b") ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set("type", type);
    if (a) params.set("a", a);
    if (b) params.set("b", b);
    router.replace(`${pathname}?${params.toString()}`);
  }

  function swap() {
    setA(b);
    setB(a);
  }

  const canCompare = a && b && a !== b;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-pink-500" />
            Side-by-side comparison
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <form onSubmit={submit} className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Type:</span>
              {(Object.keys(TYPE_LABELS) as CompareType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`text-xs px-3 py-1 rounded-md border transition-colors ${
                    type === t
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto] gap-2 items-center">
              <input
                type="text"
                placeholder={`First ${TYPE_LABELS[type].toLowerCase()} (0x...)`}
                value={a}
                onChange={(e) => setA(e.target.value)}
                className="w-full h-9 px-3 text-sm bg-muted/40 border border-border rounded-md font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              <button type="button" onClick={swap} className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-border hover:bg-muted" aria-label="Swap">
                <ArrowLeftRight className="h-4 w-4" />
              </button>
              <input
                type="text"
                placeholder={`Second ${TYPE_LABELS[type].toLowerCase()} (0x...)`}
                value={b}
                onChange={(e) => setB(e.target.value)}
                className="w-full h-9 px-3 text-sm bg-muted/40 border border-border rounded-md font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              <Button type="submit" size="sm" disabled={!canCompare}>Compare</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {canCompare ? (
        type === "address" ? <AddressCompare network={network} a={a} b={b} />
        : type === "validator" ? <ValidatorCompare network={network} a={a} b={b} />
        : <TokenCompare network={network} a={a} b={b} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={GitCompare}
              title={`Enter two ${PLURALS[type]} to compare`}
              hint="Paste a 0x... value into each field and hit Compare."
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CompareShell({ left, right, rows }: {
  left: React.ReactNode;
  right: React.ReactNode;
  rows: { label: string; a: React.ReactNode; b: React.ReactNode }[];
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-2 border-b border-border">
          <div className="p-4 border-r border-border">{left}</div>
          <div className="p-4">{right}</div>
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border/60">
            {rows.map((r) => (
              <tr key={r.label}>
                <td className="px-4 py-2.5 text-xs text-muted-foreground w-40">{r.label}</td>
                <td className="px-4 py-2.5 font-mono">{r.a}</td>
                <td className="px-4 py-2.5 font-mono border-l border-border/60">{r.b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function AddressCompare({ network, a, b }: { network: "mainnet" | "testnet"; a: string; b: string }) {
  const [data, setData] = useState<{ a: AccountBalance | null; b: AccountBalance | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchAccountBalance(network, a), fetchAccountBalance(network, b)]).then(([A, B]) => {
      if (!cancelled) setData({ a: A, b: B });
    });
    return () => { cancelled = true; };
  }, [network, a, b]);

  if (!data) return <Skeleton className="h-48 w-full" />;

  return (
    <CompareShell
      left={<Address address={a} className="text-sm" />}
      right={<Address address={b} className="text-sm" />}
      rows={[
        { label: "Balance",  a: data.a ? `${formatNumber(data.a.balance)} SRX` : "—", b: data.b ? `${formatNumber(data.b.balance)} SRX` : "—" },
        { label: "Nonce",    a: data.a?.nonce ?? "—",  b: data.b?.nonce ?? "—" },
        { label: "Tx count", a: data.a?.tx_count ?? "—", b: data.b?.tx_count ?? "—" },
      ]}
    />
  );
}

function ValidatorCompare({ network, a, b }: { network: "mainnet" | "testnet"; a: string; b: string }) {
  const [list, setList] = useState<ValidatorData[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchValidators(network).then((v) => { if (!cancelled) setList(v); });
    return () => { cancelled = true; };
  }, [network]);

  if (!list) return <Skeleton className="h-48 w-full" />;
  const A = list.find((v) => v.address.toLowerCase() === a.toLowerCase());
  const B = list.find((v) => v.address.toLowerCase() === b.toLowerCase());

  return (
    <CompareShell
      left={<div><p className="text-sm font-medium">{A?.name ?? "Unknown"}</p><Address address={a} muted className="text-xs" /></div>}
      right={<div><p className="text-sm font-medium">{B?.name ?? "Unknown"}</p><Address address={b} muted className="text-xs" /></div>}
      rows={[
        { label: "Stake",    a: A?.stake !== undefined ? `${formatNumber(A.stake)} SRX` : "—", b: B?.stake !== undefined ? `${formatNumber(B.stake)} SRX` : "—" },
        { label: "Uptime",   a: A?.uptime !== undefined ? `${A.uptime.toFixed(2)}%` : "—",     b: B?.uptime !== undefined ? `${B.uptime.toFixed(2)}%` : "—" },
        { label: "Blocks",   a: A?.blocks_produced !== undefined ? formatNumber(A.blocks_produced) : "—", b: B?.blocks_produced !== undefined ? formatNumber(B.blocks_produced) : "—" },
        { label: "Status",   a: A?.status ?? "—", b: B?.status ?? "—" },
      ]}
    />
  );
}

function TokenCompare({ network, a, b }: { network: "mainnet" | "testnet"; a: string; b: string }) {
  const [data, setData] = useState<{ a: TokenData | null; b: TokenData | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchToken(network, a), fetchToken(network, b)]).then(([A, B]) => {
      if (!cancelled) setData({ a: A, b: B });
    });
    return () => { cancelled = true; };
  }, [network, a, b]);

  if (!data) return <Skeleton className="h-48 w-full" />;

  return (
    <CompareShell
      left={<div><p className="text-sm font-medium">{data.a?.name ?? "Unknown"} <span className="text-muted-foreground">({data.a?.symbol ?? "?"})</span></p><Address address={a} muted className="text-xs" /></div>}
      right={<div><p className="text-sm font-medium">{data.b?.name ?? "Unknown"} <span className="text-muted-foreground">({data.b?.symbol ?? "?"})</span></p><Address address={b} muted className="text-xs" /></div>}
      rows={[
        { label: "Supply",    a: data.a ? formatNumber(data.a.total_supply) : "—", b: data.b ? formatNumber(data.b.total_supply) : "—" },
        { label: "Holders",   a: data.a?.holders ?? "—",                            b: data.b?.holders ?? "—" },
        { label: "Transfers", a: data.a?.transfers ?? "—",                          b: data.b?.transfers ?? "—" },
        { label: "Decimals",  a: data.a?.decimals ?? "—",                           b: data.b?.decimals ?? "—" },
      ]}
    />
  );
}
