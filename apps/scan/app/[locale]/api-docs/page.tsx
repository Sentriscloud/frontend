"use client";

import { useState } from "react";
import { Code, Copy, ExternalLink, Check } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DetailCard } from "@/components/common/DetailCard";
import { useNetwork, useNetworkFromQuery } from "@/lib/network-context";
import { cn } from "@/lib/utils";

// DECISION: hand-curated API docs page rather than Mintlify or Swagger UI.
// Adding Mintlify pulls in a CDN-hosted iframe + auth flow we don't want
// to maintain, and the API surface here is small enough that listing
// endpoints + an inline curl example per endpoint reads better than the
// generated swagger UI sprawl.
//
// Three sections — REST (the native Sentrix surface), JSON-RPC (the EVM
// surface that any tooling already speaks), WebSocket (the live-updates
// surface). Each row carries a copy-curl button.

interface RestEndpoint {
  method: "GET" | "POST";
  path: string;
  summary: string;
  example?: string;
}

const REST: RestEndpoint[] = [
  // chain
  { method: "GET", path: "/chain/info", summary: "Chain headline (height, supply, validator count, mempool size)." },
  { method: "GET", path: "/chain/blocks?page=N&limit=M", summary: "Paginated block list (limit ≤100; in-memory window = last 1000 blocks)." },
  { method: "GET", path: "/chain/blocks/{height}", summary: "Block detail by height — includes transactions + justification." },
  { method: "GET", path: "/sentrix_status", summary: "Node status: chain ID, consensus mode, version, sync info." },
  { method: "GET", path: "/health", summary: "Health probe — returns 200 OK while node is responsive." },
  { method: "GET", path: "/metrics", summary: "Prometheus scrape — chain + system metrics. IP-restricted to scrapers; public hits return 403." },
  // accounts
  { method: "GET", path: "/accounts/{address}", summary: "Account balance + nonce + tx count." },
  { method: "GET", path: "/accounts/top?limit=N", summary: "Top accounts by balance (richlist)." },
  { method: "GET", path: "/address/{address}/history?page=N", summary: "Per-address tx history (paginated)." },
  // tx
  { method: "GET", path: "/transactions/{txid}", summary: "Transaction detail — wraps tx + block context." },
  { method: "POST", path: "/transactions", summary: "Submit a signed native tx. Body: TxRequest (txid + signature + payload)." },
  { method: "GET", path: "/mempool", summary: "Live pending transactions snapshot." },
  // tokens
  { method: "GET", path: "/tokens", summary: "List of deployed SRC-20 tokens." },
  { method: "GET", path: "/tokens/{address}", summary: "Token detail (name, symbol, total supply, holder count)." },
  { method: "GET", path: "/tokens/{address}/holders?limit=N", summary: "Top holders for a given token." },
  { method: "POST", path: "/tokens/deploy", summary: "Deploy a new SRC-20 token (signed)." },
  { method: "POST", path: "/tokens/transfer", summary: "Native SRC-20 transfer (signed)." },
  { method: "POST", path: "/tokens/burn", summary: "Native SRC-20 burn (signed)." },
  // staking
  { method: "GET", path: "/staking/validators", summary: "Active + jailed validator set with stake breakdown. Per-validator detail is filtered client-side from this list (no per-address endpoint yet)." },
  { method: "GET", path: "/staking/delegations/{address}", summary: "All delegations FROM an account." },
  // epoch
  { method: "GET", path: "/epoch/current", summary: "Most recent finalized epoch (number, block range, accrued rewards). Note: this lags the live chain tip — it returns the latest closed epoch, not an in-progress one." },
  // stats
  { method: "GET", path: "/stats/daily", summary: "Daily aggregates (txs, active addresses, supply delta)." },
  { method: "GET", path: "/chain/performance?range=24h", summary: "Block-time + TPS series across a window." },
];

interface RpcMethod {
  ns: "eth_" | "net_" | "web3_" | "sentrix_" | "debug_" | "txpool_";
  name: string;
  summary: string;
}

const RPC: RpcMethod[] = [
  // EVM standard
  { ns: "eth_", name: "eth_chainId", summary: "Returns the chain ID (7119 mainnet, 7120 testnet)." },
  { ns: "eth_", name: "eth_blockNumber", summary: "Latest block height." },
  { ns: "eth_", name: "eth_getBlockByNumber", summary: "Block detail (full EVM-shape with mixHash / stateRoot / receiptsRoot)." },
  { ns: "eth_", name: "eth_getBalance", summary: "Account balance (18-decimal wei view)." },
  { ns: "eth_", name: "eth_getTransactionByHash", summary: "Transaction detail." },
  { ns: "eth_", name: "eth_getTransactionReceipt", summary: "Receipt with logs + status (1=success, 0=revert)." },
  { ns: "eth_", name: "eth_call", summary: "Execute a read-only call against the EVM state." },
  { ns: "eth_", name: "eth_estimateGas", summary: "Gas estimate for a candidate tx." },
  { ns: "eth_", name: "eth_sendRawTransaction", summary: "Submit a signed RLP-encoded EVM tx." },
  { ns: "eth_", name: "eth_getLogs", summary: "Event log filter (by address + topics + block range)." },
  { ns: "eth_", name: "eth_gasPrice", summary: "Current base fee (EIP-1559)." },
  { ns: "eth_", name: "eth_feeHistory", summary: "Recent base-fee history for fee oracles." },
  { ns: "eth_", name: "eth_getCode", summary: "Contract bytecode at a given address." },
  { ns: "eth_", name: "eth_getStorageAt", summary: "Storage slot read." },
  { ns: "eth_", name: "eth_getTransactionCount", summary: "Account nonce." },
  { ns: "eth_", name: "eth_subscribe", summary: "WebSocket-only — see WS section below." },
  // sentrix native
  { ns: "sentrix_", name: "sentrix_getFinalizedHeight", summary: "BFT-finalized height — safe-to-rely-on tip." },
  { ns: "sentrix_", name: "sentrix_getValidatorSet", summary: "Active validator set with stakes." },
  { ns: "sentrix_", name: "sentrix_getEpochInfo", summary: "Current epoch metadata." },
  { ns: "sentrix_", name: "sentrix_getJailEvents", summary: "Recent jail / unjail events." },
  { ns: "sentrix_", name: "sentrix_getDelegations", summary: "Per-address delegations." },
  { ns: "sentrix_", name: "sentrix_estimateRewards", summary: "Pending claimable rewards." },
  // misc
  { ns: "net_", name: "net_version", summary: "Network ID as decimal string." },
  { ns: "web3_", name: "web3_clientVersion", summary: "Node software version." },
];

const WS_CHANNELS: Array<{ name: string; method: "eth_subscribe"; summary: string }> = [
  { name: "newHeads", method: "eth_subscribe", summary: "New block headers as they finalize." },
  { name: "logs", method: "eth_subscribe", summary: "Filtered log stream — second param is the filter object." },
  { name: "newPendingTransactions", method: "eth_subscribe", summary: "Mempool admission events." },
  { name: "syncing", method: "eth_subscribe", summary: "Sync-status changes." },
  { name: "sentrix_finalized", method: "eth_subscribe", summary: "Sentrix-native: BFT-finalized block notification." },
  { name: "sentrix_validatorSet", method: "eth_subscribe", summary: "Sentrix-native: validator-set rotation events." },
  { name: "sentrix_tokenOps", method: "eth_subscribe", summary: "Sentrix-native: SRC-20 Mint/Burn/Transfer/Approve/Deploy." },
  { name: "sentrix_stakingOps", method: "eth_subscribe", summary: "Sentrix-native: Delegate/Undelegate/ClaimRewards/AddSelfStake/Unjail." },
  { name: "sentrix_jail", method: "eth_subscribe", summary: "Sentrix-native: per-validator jail/unjail events." },
];

export default function ApiDocsPage() {
  const { network } = useNetwork();
  useNetworkFromQuery();
  const restBase = network === "mainnet" ? "https://rpc.sentrixchain.com" : "https://testnet-rpc.sentrixchain.com";
  const wsBase = network === "mainnet" ? "wss://rpc.sentrixchain.com/ws" : "wss://testnet-rpc.sentrixchain.com/ws";

  return (
    <div className="space-y-6">
      <PageHeader icon={Code} eyebrow="API REFERENCE" title="REST · JSON-RPC · WebSocket" />

      <DetailCard title="Endpoints">
        <div className="py-2 text-sm space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <Endpoint label="REST + JSON-RPC" url={restBase} />
            <Endpoint label="WebSocket" url={wsBase} />
            <Endpoint label="Sourcify (verifier)" url="https://verify.sentrixchain.com" />
            <Endpoint label="Faucet (testnet)" url="https://faucet.sentrixchain.com" />
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            All EVM JSON-RPC methods POST to <code className="font-mono">{restBase}/rpc</code>; native
            REST endpoints below are GET / POST against <code className="font-mono">{restBase}</code>.
          </p>
        </div>
      </DetailCard>

      {/* ── REST ──────────────────────────── */}
      <DetailCard title={`REST API — ${REST.length} endpoints`}>
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
                <th className="px-6 py-2 font-medium">Method</th>
                <th className="px-6 py-2 font-medium">Path</th>
                <th className="px-6 py-2 font-medium">Description</th>
                <th className="px-6 py-2 font-medium text-right">curl</th>
              </tr>
            </thead>
            <tbody>
              {REST.map((e) => (
                <tr key={e.path} className="border-b border-border/30 last:border-0 hover:bg-muted/20">
                  <td className="px-6 py-2.5">
                    <span
                      className={cn(
                        "text-[10px] font-mono px-1.5 py-0.5 rounded border",
                        e.method === "GET"
                          ? "bg-[color-mix(in_oklab,var(--blue)_10%,transparent)] text-[var(--blue)] border-[color-mix(in_oklab,var(--blue)_25%,transparent)]"
                          : "bg-[color-mix(in_oklab,var(--gold)_10%,transparent)] text-[var(--gold)] border-[color-mix(in_oklab,var(--gold)_25%,transparent)]",
                      )}
                    >
                      {e.method}
                    </span>
                  </td>
                  <td className="px-6 py-2.5 font-mono text-xs">{e.path}</td>
                  <td className="px-6 py-2.5 text-xs text-muted-foreground">{e.summary}</td>
                  <td className="px-6 py-2.5 text-right">
                    <CurlBtn cmd={`curl ${e.method === "POST" ? "-X POST -H 'content-type: application/json' --data '{}' " : ""}${restBase}${e.path.split("?")[0].replace(/\{[^}]+\}/g, (m) => m)}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DetailCard>

      {/* ── JSON-RPC ──────────────────────── */}
      <DetailCard title={`JSON-RPC — ${RPC.length} methods`}>
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
                <th className="px-6 py-2 font-medium">Namespace</th>
                <th className="px-6 py-2 font-medium">Method</th>
                <th className="px-6 py-2 font-medium">Description</th>
                <th className="px-6 py-2 font-medium text-right">curl</th>
              </tr>
            </thead>
            <tbody>
              {RPC.map((m) => (
                <tr key={m.name} className="border-b border-border/30 last:border-0 hover:bg-muted/20">
                  <td className="px-6 py-2.5">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground">
                      {m.ns}
                    </span>
                  </td>
                  <td className="px-6 py-2.5 font-mono text-xs">{m.name}</td>
                  <td className="px-6 py-2.5 text-xs text-muted-foreground">{m.summary}</td>
                  <td className="px-6 py-2.5 text-right">
                    <CurlBtn
                      cmd={`curl -X POST -H 'content-type: application/json' --data '{"jsonrpc":"2.0","id":1,"method":"${m.name}","params":[]}' ${restBase}/rpc`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DetailCard>

      {/* ── WebSocket ─────────────────────── */}
      <DetailCard title={`WebSocket subscriptions — ${WS_CHANNELS.length} channels`}>
        <p className="text-xs text-muted-foreground py-2">
          All channels — including the Sentrix-native ones — are subscribed via{" "}
          <code className="font-mono">eth_subscribe</code>. There is no separate{" "}
          <code className="font-mono">sentrix_subscribe</code> method on the chain (common confusion source).
        </p>
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
                <th className="px-6 py-2 font-medium">Channel</th>
                <th className="px-6 py-2 font-medium">Description</th>
                <th className="px-6 py-2 font-medium text-right">JSON-RPC body</th>
              </tr>
            </thead>
            <tbody>
              {WS_CHANNELS.map((c) => (
                <tr key={c.name} className="border-b border-border/30 last:border-0 hover:bg-muted/20">
                  <td className="px-6 py-2.5 font-mono text-xs">{c.name}</td>
                  <td className="px-6 py-2.5 text-xs text-muted-foreground">{c.summary}</td>
                  <td className="px-6 py-2.5 text-right">
                    <CurlBtn cmd={`{"jsonrpc":"2.0","id":1,"method":"eth_subscribe","params":["${c.name}"]}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DetailCard>

      {/* ── SDKs ──────────────────────────── */}
      <DetailCard title="Official SDKs">
        <div className="py-2 text-sm space-y-2">
          <p className="text-muted-foreground">
            <strong>TypeScript:</strong>{" "}
            <code className="font-mono">@sentrix/chain</code> — viem-based EVM client + native REST
            client + WebSocket subscription manager + native-tx wallet (sign + submit Delegate /
            Undelegate / ClaimRewards / SRC-20 ops).
          </p>
          <pre className="font-mono text-xs bg-muted/40 rounded p-3 overflow-x-auto">
{`pnpm add @sentrix/chain viem
import { native, evm, bft, SentrixWallet } from "@sentrix/chain";

const sentrix = native.nativeClient("${network}");
const info = await sentrix.chainInfo();
console.log(\`Height \${info.height}\`);`}
          </pre>
          <p className="text-xs text-muted-foreground">
            Repo:{" "}
            <a
              href="https://github.com/sentriscloud/sdk-ts"
              className="text-[var(--gold)] hover:underline inline-flex items-center gap-1"
              target="_blank"
              rel="noopener noreferrer"
            >
              sentriscloud/sdk-ts <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
      </DetailCard>
    </div>
  );
}

function Endpoint({ label, url }: { label: string; url: string }) {
  return (
    <div className="rounded-md border border-border/60 px-3 py-2 bg-muted/20 flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-[var(--gold)] hover:underline truncate"
      >
        {url}
      </a>
    </div>
  );
}

function CurlBtn({ cmd }: { cmd: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(cmd).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
      className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      title="Copy curl"
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
