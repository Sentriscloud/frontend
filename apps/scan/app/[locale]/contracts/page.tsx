"use client";

import { Link } from "@/i18n/navigation";
import { FileCode, ExternalLink, Search, CheckCircle2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { DetailCard } from "@/components/common/DetailCard";
import { Address } from "@/components/common/Address";
import { useNetwork, useNetworkFromQuery } from "@/lib/network-context";
import { useSourcifyStatus } from "@/lib/sourcify";
import { fetchRecentContracts, type RecentContract } from "@/lib/api";

// DECISION: until our self-hosted Sourcify exposes the
// `getPaginatedContractAddresses` API (currently disabled at our verifier
// instance), the verified-contracts list is built from a hand-maintained
// canonical-contracts seed plus any address users care to look up via the
// search box on this page. Once the indexer's `addresses` table is
// caught up, we'll switch the seed to a dynamic feed of `is_contract = true`
// rows ordered by deployment height.
//
// The seed pulls the canonical-contracts addresses from
// `sentrix-labs/canonical-contracts@v1.0.0`. We keep the same labels
// the canonical addresses registry already uses elsewhere in the explorer.

interface CanonicalEntry {
  name: string;
  description: string;
  // Bridge-side / testnet-only contracts can leave the other network blank;
  // the row hides on the network where the address is absent.
  mainnet?: `0x${string}`;
  testnet?: `0x${string}`;
}

const CANONICAL: CanonicalEntry[] = [
  {
    name: "WSRX",
    description: "Wrapped SRX — ERC-20 wrapper backed 1:1 by native SRX. Required for DeFi.",
    mainnet: "0x4693b113e523A196d9579333c4ab8358e2656553",
    testnet: "0x85d5E7694AF31C2Edd0a7e66b7c6c92C59fF949A",
  },
  {
    name: "Multicall3",
    description: "Standard multicall (mds1/multicall) for batched read + write calls.",
    mainnet: "0xFd4b34b5763f54a580a0d9f7997A2A993ef9ceE9",
    testnet: "0x7900826De548425c6BE56caEbD4760AB0155Cd54",
  },
  {
    name: "TokenFactory",
    description:
      "Deploys minimal ERC-20 tokens via a single function call. v1.1.0 adds input validation (zero-supply / empty-name / oversize-symbol guards) and rejects ERC-20 transfers to address(0) per spec. v1.0.0 is still on-chain (immutable) but deprecated — frontends should use v1.1.0.",
    mainnet: "0x53C3838e18703c763564Bb983694CF117B33D366",
    testnet: "0xaE2a8512f0de635F8E90069e2877098c9e0baEc7",
  },
  {
    name: "SentrixSafe",
    description: "Minimal multi-sig wallet (Gnosis Safe v1.4.1-derived). Currently 1-of-1 with the Sentrix Labs authority.",
    mainnet: "0x6272dC0C842F05542f9fF7B5443E93C0642a3b26",
    testnet: "0xc9D7a61D7C2F428F6A055916488041fD00532110",
  },
  {
    name: "SentrixV2 Factory",
    description:
      "Native AMM factory (UniswapV2-equivalent). CREATE2 pair deployer with feeToSetter pinned to the Sentrix Labs authority.",
    mainnet: "0xC5344f0DDE0B9916217449Ad9222e446475aD936",
    testnet: "0x8565392086cbA8D39cBba1F6f60ad1F1A17651C7",
  },
  {
    name: "SentrixV2 Router02",
    description:
      "Native AMM router. Adds liquidity, removes liquidity, swaps along the constant-product curve. Includes UniV2 fee-on-transfer + permit-gated removeLiquidity helpers.",
    mainnet: "0xAb67E171c0DE0Cd6dD6fE87E5E399C091F9c9dE8",
    testnet: "0x2bF73491733c3b87D72b16d4f7151dA294b55cB0",
  },
  {
    name: "sUSDC (bridged)",
    description:
      "Synthetic USDC minted on Sentrix when USDC is locked on Base Sepolia via Hyperlane v3. HypERC20Capped router — 6 decimals, per-tx/daily/total mint caps enforced on inbound bridge messages. Pair: Base USDC collateral 0x8c8C05D6B689C8BBb4f106AbB6E916e928a61e70.",
    testnet: "0x58758796A7D0124585499D589f89ec2336Aa49f7",
  },
];

export default function ContractsPage() {
  const { network } = useNetwork();
  useNetworkFromQuery();
  const [lookup, setLookup] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = lookup.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(v)) {
      setSubmitted(null);
      return;
    }
    setSubmitted(v.toLowerCase());
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileCode}
        eyebrow="EVM · VERIFIED CONTRACTS"
        title={`Verified contracts — ${network === "mainnet" ? "Mainnet" : "Testnet"}`}
      />
      <p className="text-xs text-muted-foreground -mt-3">
        EVM rail only. Native-side primitives (SRC-20, StakingOps) run at the protocol level — see the{" "}
        <Link href="/native" className="underline hover:text-foreground">Native dashboard</Link>.
      </p>

      {/* ── Quick lookup ──────────────────────────── */}
      <DetailCard title="Check verification status">
        <form onSubmit={onSubmit} className="py-2 flex gap-2 flex-wrap">
          <input
            value={lookup}
            onChange={(e) => setLookup(e.target.value)}
            placeholder="0x... contract address"
            className="flex-1 min-w-0 font-mono text-sm px-3 py-2 rounded-md border border-border bg-background focus:outline-none focus:border-[var(--gold)]"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm bg-[var(--gold)] text-black hover:opacity-90 transition-opacity"
          >
            <Search className="h-3.5 w-3.5" />
            Check
          </button>
        </form>
        {submitted && <LookupResult network={network} address={submitted} />}
      </DetailCard>

      {/* ── Canonical seed ──────────────────────── */}
      <DetailCard
        title={
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" /> Canonical contracts
          </span>
        }
      >
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
                <th className="px-6 py-2 font-medium">Contract</th>
                <th className="px-6 py-2 font-medium hidden md:table-cell">Description</th>
                <th className="px-6 py-2 font-medium">Address ({network})</th>
                <th className="px-6 py-2 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {CANONICAL.map((c) => (
                <CanonicalRow
                  key={c.name}
                  entry={c}
                  network={network}
                />
              ))}
            </tbody>
          </table>
        </div>
      </DetailCard>

      {/* ── Recently deployed (indexer-backed) ───── */}
      <RecentlyDeployed network={network} />

      {/* ── Verify your own ─────────────────────── */}
      <DetailCard title="Verify your own contract">
        <div className="text-sm leading-relaxed py-2 space-y-3">
          <p className="text-muted-foreground">
            Sentrix runs a self-hosted Sourcify verifier at{" "}
            <a
              href="https://verify.sentrixchain.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--gold)] hover:underline"
            >
              verify.sentrixchain.com
            </a>
            . Both Foundry and Hardhat speak it via the standard \`--verifier sourcify\` flag.
          </p>
          <pre className="font-mono text-xs bg-muted/40 rounded p-3 overflow-x-auto">
{`# Foundry
forge verify-contract \\
  --verifier sourcify \\
  --verifier-url https://verify.sentrixchain.com \\
  --chain ${network === "mainnet" ? "7119" : "7120"} \\
  <ADDRESS> contracts/MyToken.sol:MyToken

# Hardhat (with hardhat-verify plugin)
npx hardhat verify --network sentrix${network === "testnet" ? "Testnet" : ""} <ADDRESS>`}
          </pre>
          <p className="text-xs text-muted-foreground">
            Once verified, the address page&apos;s <strong>Contract</strong> tab renders source +
            ABI + Read Contract automatically.
          </p>
        </div>
      </DetailCard>
    </div>
  );
}

function CanonicalRow({ entry, network }: { entry: CanonicalEntry; network: "mainnet" | "testnet" }) {
  const addr = network === "mainnet" ? entry.mainnet : entry.testnet;
  // Bridge-side / testnet-only contracts have no address on the other
  // network — skip the row entirely instead of rendering a broken link.
  const { match } = useSourcifyStatus(network, addr ?? ("0x" + "00".repeat(20)) as `0x${string}`);
  if (!addr) return null;

  return (
    <tr className="border-b border-border/30 last:border-0 hover:bg-muted/30">
      <td className="px-6 py-3 font-mono text-xs">
        <Link href={`/address/${addr}`} className="text-[var(--gold)] hover:underline">
          {entry.name}
        </Link>
      </td>
      <td className="px-6 py-3 text-xs text-muted-foreground hidden md:table-cell max-w-md">{entry.description}</td>
      <td className="px-6 py-3">
        <Address address={addr} />
      </td>
      <td className="px-6 py-3 text-right">
        <VerifyBadge match={match} address={addr} network={network} />
      </td>
    </tr>
  );
}

function LookupResult({ network, address }: { network: "mainnet" | "testnet"; address: string }) {
  const { match, loading } = useSourcifyStatus(network, address);
  return (
    <div className="text-sm py-3 border-t border-border/60 mt-2 flex items-center gap-3 flex-wrap">
      <Address address={address} />
      <span className="text-muted-foreground text-xs">→</span>
      {loading ? (
        <span className="text-xs text-muted-foreground">checking…</span>
      ) : (
        <VerifyBadge match={match} address={address} network={network} />
      )}
      <Link
        href={`/address/${address}`}
        className="ml-auto text-xs text-[var(--gold)] hover:underline inline-flex items-center gap-1"
      >
        Open address page <ExternalLink className="h-3 w-3" />
      </Link>
    </div>
  );
}

function VerifyBadge({
  match,
  address,
  network,
}: {
  match: "perfect" | "partial" | "none";
  address: string;
  network: "mainnet" | "testnet";
}) {
  if (match === "perfect") {
    return (
      <Link
        href={`/address/${address}?tab=contract` as `/address/${string}`}
        className="inline-flex items-center gap-1 text-xs text-green-500 hover:underline"
      >
        <CheckCircle2 className="h-3 w-3" />
        Verified ({network})
      </Link>
    );
  }
  if (match === "partial") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-yellow-500">
        <CheckCircle2 className="h-3 w-3" />
        Partial match
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">Unverified</span>;
}

// Recently deployed — feeds off the indexer's `/contracts/recent` endpoint,
// which serves `addresses WHERE is_contract = true ORDER BY first_seen_block
// DESC`. Marked `is_contract = true` is set lazily by the contract-detect
// worker (4s tick, eth_getCode probe), so a freshly-deployed contract
// surfaces here within seconds even before the chain-wide backfill has
// reached its block. Complements /contracts/stats which requires indexed
// call history (lags backfill).
function RecentlyDeployed({ network }: { network: "mainnet" | "testnet" }) {
  const [rows, setRows] = useState<RecentContract[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError(null);
    fetchRecentContracts(network, 25)
      .then((r) => {
        if (!cancelled) setRows(r);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [network]);

  return (
    <DetailCard
      title={
        <span className="inline-flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--gold)]" /> Recently deployed
        </span>
      }
    >
      {error ? (
        <p className="text-xs text-muted-foreground py-2">
          Couldn&apos;t reach the indexer right now. Try again in a moment.
        </p>
      ) : rows === null ? (
        <p className="text-xs text-muted-foreground py-2">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">
          No user-deployed contracts indexed on {network} yet.
        </p>
      ) : (
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
                <th className="px-6 py-2 font-medium">Address</th>
                <th className="px-6 py-2 font-medium">First seen</th>
                <th className="px-6 py-2 font-medium">Code hash</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.address}
                  className="border-b border-border/30 last:border-0 hover:bg-muted/30"
                >
                  <td className="px-6 py-3">
                    <Address address={r.address} />
                  </td>
                  <td className="px-6 py-3 text-xs text-muted-foreground font-mono">
                    #{r.first_seen_block.toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-xs text-muted-foreground font-mono break-all max-w-[16rem]">
                    {r.code_hash ? `${r.code_hash.slice(0, 18)}…` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DetailCard>
  );
}
