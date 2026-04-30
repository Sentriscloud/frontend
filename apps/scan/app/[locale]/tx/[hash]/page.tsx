"use client";

import { use, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Address } from "@/components/common/Address";
import { BlockHeight } from "@/components/common/BlockHeight";
import { Timestamp } from "@/components/common/Timestamp";
import { InfoRow } from "@/components/common/InfoRow";
import { StatusBadge } from "@/components/common/StatusBadge";
import { RailBadge, classifyRail } from "@/components/common/RailBadge";
import { FinalityBadge, classifyFinality } from "@/components/common/FinalityBadge";
import { TxLogs } from "@/components/common/TxLogs";
import { TokenTransfers } from "@/components/common/TokenTransfers";
import { DecodedInputData } from "@/components/common/DecodedInputData";
import { InternalTxsPlaceholder } from "@/components/common/InternalTxsPlaceholder";
import { Copyable } from "@/components/common/Copyable";
import { PageHeader } from "@/components/common/PageHeader";
import { useNetwork } from "@/lib/network-context";
import { useTransaction, useStats } from "@/lib/hooks";

export default function TxDetailPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = use(params);
  const { network, setNetwork } = useNetwork();
  const searchParams = useSearchParams();

  // Honour `?network=mainnet|testnet` if present — deeplinks from Solux + the
  // chain-landing site pass this so the lookup hits the right chain even if the
  // viewer's cookie is set to the other network. Without this, a testnet tx
  // link from Solux on a fresh browser would 404 because cookie defaults to
  // mainnet (live-discovered 2026-04-28: faucet drip on testnet rendered
  // "Transaction not found" when clicked from Solux).
  useEffect(() => {
    const param = searchParams.get("network");
    if ((param === "mainnet" || param === "testnet") && param !== network) {
      setNetwork(param);
    }
  }, [searchParams, network, setNetwork]);

  // Try the currently-selected network first; the parallel cross-network
  // probe below catches the case where the user's cookie is on the wrong
  // chain for this tx — instead of a silent 404 we render a "tx is on
  // <other> network" prompt with a one-click switch.
  const { data: tx, loading } = useTransaction(network, hash);
  const otherNetwork = network === "mainnet" ? "testnet" : "mainnet";
  const { data: txOther } = useTransaction(otherNetwork, hash);
  // BFT finality is "did a descendant block land?" — we only need the chain
  // tip to compute that; we already have everything else from the tx body.
  const { data: stats } = useStats(network);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!tx) {
    if (txOther) {
      // Found on the other network — keep the user oriented and offer a one-
      // click switch instead of a dead "not found" wall.
      return (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <p className="text-muted-foreground">
                This transaction lives on{" "}
                <strong className="text-primary">
                  {otherNetwork === "mainnet" ? "Mainnet" : "Testnet"}
                </strong>
                , but you&apos;re viewing{" "}
                {network === "mainnet" ? "Mainnet" : "Testnet"}.
              </p>
              <p className="text-xs font-mono text-muted-foreground break-all">{hash}</p>
              <button
                onClick={() => setNetwork(otherNetwork)}
                className="text-primary hover:underline text-sm inline-block"
              >
                Switch to {otherNetwork === "mainnet" ? "Mainnet" : "Testnet"} →
              </button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Transaction not found</p>
            <p className="text-xs font-mono text-muted-foreground mt-2 break-all">{hash}</p>
            <Link href="/" className="text-primary hover:underline text-sm mt-4 inline-block">Back to home</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const success = tx.status !== "failed";

  // Rail classification doubles as a tx-shape teaching aid — Sentrix has
  // four rails (EVM / Native / SRC-20 / Staking) and "user sent SRX, why
  // does the receipt look weird" tickets stem from not knowing which rail
  // they're staring at. classifyRail() centralises the heuristic so the
  // tx detail page agrees with the address page agrees with the home feed.
  const rail = classifyRail({ to_address: tx.to, data: tx.input_data ?? null });
  // BFT finality: pending if no block, finalized if a descendant block has
  // already landed, justified if we're at the tip with the precommit set.
  // We don't have the per-block "hasJustification" field on the tx detail
  // body shape, so assume true for any block past the Voyager activation
  // height — every Voyager block ships one.
  const finality = classifyFinality({
    txBlockHeight: tx.block_height ?? null,
    latestHeight: stats?.height ?? null,
    hasJustification: tx.block_height != null && tx.block_height >= 579_047,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
      <PageHeader
        icon={ArrowUpDown}
        eyebrow="Transaction"
        title={`${tx.id.slice(0, 10)}...${tx.id.slice(-6)}`}
        mono
        tone="muted"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <RailBadge rail={rail} size="md" />
            <FinalityBadge finality={finality} size="md" />
            <StatusBadge status={success ? "success" : "failed"} size="md" />
          </div>
        }
      />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="internal">Internal</TabsTrigger>
          <TabsTrigger value="input">Input Data</TabsTrigger>
          <TabsTrigger value="raw">Raw JSON</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Summary — identity + placement */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="eyebrow">Summary</CardTitle></CardHeader>
            <CardContent className="px-6 py-0">
              <InfoRow
                label="Transaction Hash"
                value={
                  <span className="inline-flex items-center gap-2 font-mono break-all">
                    {tx.id}
                    <Copyable text={tx.id} bare />
                  </span>
                }
              />
              <InfoRow
                label="Status"
                value={
                  <span className="inline-flex items-center gap-2 flex-wrap">
                    <StatusBadge status={success ? "success" : "failed"} />
                    <FinalityBadge finality={finality} />
                  </span>
                }
                hint="BFT finality: Pending → Included → Justified (2/3+1 stake-weighted precommits) → Finalized (descendant block also justified)."
              />
              <InfoRow
                label="Rail"
                value={<RailBadge rail={rail} />}
                hint={
                  rail === "evm" ? "EVM transaction — runs in the embedded revm interpreter."
                    : rail === "token" ? "SRC-20 token operation — applied at the protocol level, not via revm."
                    : rail === "stake" ? "Native staking operation — applied directly against the stake registry."
                    : "Native SRX transfer between two accounts."
                }
              />
              {tx.block_height !== undefined && (
                <InfoRow label="Block" value={<BlockHeight height={tx.block_height} prefix="#" />} />
              )}
              <InfoRow label="Timestamp" value={<Timestamp timestamp={tx.timestamp} absolute />} last />
            </CardContent>
          </Card>

          {/* Transfer — the money flow */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="eyebrow">Transfer</CardTitle></CardHeader>
            <CardContent className="px-6 py-0">
              <InfoRow label="From" value={<Address address={tx.from} truncate={false} />} />
              <InfoRow label="To" value={<Address address={tx.to} truncate={false} />} />
              <InfoRow label="Value" value={<span className="font-mono font-semibold">{tx.amount} SRX</span>} />
              <InfoRow label="Fee" value={<span className="font-mono">{tx.fee} SRX</span>} last={!tx.signature} />
              {tx.signature ? (
                <InfoRow
                  label="Signature"
                  value={
                    <span className="inline-flex items-center gap-2 font-mono break-all text-xs text-muted-foreground">
                      {tx.signature}
                      <Copyable text={tx.signature} bare />
                    </span>
                  }
                  last
                />
              ) : null}
            </CardContent>
          </Card>

          {/* Token Transfers — Etherscan-style summary panel above Logs.
              Renders nothing if no ERC-20 Transfer events were emitted. */}
          <TokenTransfers network={network} txHash={tx.id} />

          {/* Execution — render only when EVM-ish metadata is present */}
          {(tx.gas_used !== undefined || tx.gas_price !== undefined || tx.nonce !== undefined || tx.tx_type || tx.contract_address) && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="eyebrow">Execution</CardTitle></CardHeader>
              <CardContent className="px-6 py-0">
                {tx.tx_type && (
                  <InfoRow
                    label="Type"
                    value={
                      <span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                        {tx.tx_type}
                      </span>
                    }
                  />
                )}
                {tx.nonce !== undefined && (
                  <InfoRow label="Nonce" value={<span className="font-mono">{tx.nonce}</span>} />
                )}
                {tx.gas_used !== undefined && (
                  <InfoRow label="Gas Used" value={<span className="font-mono">{tx.gas_used.toLocaleString()}</span>} />
                )}
                {tx.gas_price !== undefined && (
                  <InfoRow label="Gas Price" value={<span className="font-mono">{tx.gas_price}</span>} />
                )}
                {tx.contract_address && (
                  <InfoRow label="Contract" value={<Address address={tx.contract_address} truncate={false} />} last />
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="logs">
          <TxLogs network={network} txHash={tx.id} />
        </TabsContent>

        <TabsContent value="internal">
          <InternalTxsPlaceholder />
        </TabsContent>

        <TabsContent value="input">
          <Card>
            <CardContent className="p-6">
              {tx.input_data && tx.input_data !== "0x" ? (
                <div className="space-y-3">
                  {tx.to && tx.input_data.length >= 10 && (
                    <DecodedInputData network={network} to={tx.to} inputData={tx.input_data} />
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Raw input data</p>
                    <Copyable text={tx.input_data} bare />
                  </div>
                  <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-auto max-h-96 break-all whitespace-pre-wrap">
                    {tx.input_data}
                  </pre>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No input data for this transaction.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="raw">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">Full transaction JSON</p>
                <Copyable text={JSON.stringify(tx, null, 2)} bare />
              </div>
              <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-auto max-h-[32rem]">
                {JSON.stringify(tx, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
