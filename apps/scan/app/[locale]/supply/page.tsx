"use client";

import { useMemo } from "react";
import { Coins, Lock, ShieldCheck } from "lucide-react";
import dynamic from "next/dynamic";
import { PageHeader } from "@/components/common/PageHeader";
import { DetailCard } from "@/components/common/DetailCard";
import { InfoRow } from "@/components/common/InfoRow";
import { StatCard } from "@/components/common/StatCard";
import { Address } from "@/components/common/Address";
import { Skeleton } from "@/components/ui/skeleton";
import { useNetwork } from "@/lib/network-context";
import { useStats, useValidators } from "@/lib/hooks";
import { formatSRX, formatNumber } from "@/lib/format";

// DECISION: dedicated /supply page so listing platforms (CG / CMC / DefiLlama)
// + due-diligence reviewers can deep-link to a single canonical breakdown URL
// instead of fishing across 3 different docs pages. Mirrors the layout
// Etherscan exposes at /stat/supply but Sentrix-aware:
//   - Max supply is the post-tokenomics-v2 cap (315M) once the fork is past;
//   - "Locked / Premine" surface the four canonical premine wallets so the
//     20% disclosed premine is publicly auditable;
//   - "Bonded" surfaces the live total stake from the validator endpoint;
//   - "Burnt" pulls from the chain.info supply tracker.

const SupplyDonut = dynamic(() => import("./donut").then((m) => m.SupplyDonut), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />,
});

interface PremineEntry {
  label: string;
  address: string;
  /** Disclosed premine size in SRX (from the Sentrix Labs canonical addresses register). */
  amount: number;
}

const PREMINE_WALLETS: PremineEntry[] = [
  {
    label: "Founder (vesting 1y cliff + 4y linear)",
    address: "0x5b5b06688dcdbe532353ac610aaff41af825279d",
    amount: 21_000_000,
  },
  {
    label: "Sentrix Ecosystem Fund",
    address: "0xeb70fdefd00fdb768dec06c478f450c351499f14",
    amount: 21_000_000,
  },
  {
    label: "Validator Incentive Pool",
    address: "0x328d56b8174697ef6c9e40e19b7663797e16fa47",
    amount: 10_500_000,
  },
  {
    label: "Strategic Reserve",
    address: "0x2578cad17e3e56c2970a5b5eab45952439f5ba97",
    amount: 10_500_000,
  },
];

const PREMINE_TOTAL = PREMINE_WALLETS.reduce((s, e) => s + e.amount, 0);

export default function SupplyPage() {
  const { network } = useNetwork();
  const { data: stats, loading: statsLoading } = useStats(network);
  const { data: validators } = useValidators(network);

  // Bonded = sum of all validator stake (self_stake + total_delegated). The
  // /validators endpoint returns these per-validator, so the dashboard sums.
  const bonded = useMemo(() => {
    if (!validators) return 0;
    // ValidatorData.stake is total bonded (self + delegations) per the
    // /validators endpoint shape — see `lib/api.ts` interface ValidatorData.
    return validators.reduce((sum, v) => sum + (v.stake ?? 0), 0);
  }, [validators]);

  const max = stats?.max_supply_srx ?? 315_000_000;
  const minted = stats?.total_minted_srx ?? 0;
  const burnt = stats?.total_burned_srx ?? 0;
  // Prefer the backend-computed circulating supply when available — the API
  // started returning `circulating_supply_srx` directly (verified live
  // 2026-05-02), which reflects the on-chain locked-state instead of the
  // static PREMINE_TOTAL constant we'd been subtracting manually. Falls
  // back to the manual calc if the field isn't present on older nodes.
  const circulatingApprox =
    stats?.circulating_supply_srx ?? Math.max(0, minted - burnt - PREMINE_TOTAL);
  const remainingToMint = Math.max(0, max - minted);

  const segments = [
    { label: "Circulating (approx)", value: circulatingApprox, color: "var(--green)" },
    { label: "Premine / Locked", value: PREMINE_TOTAL, color: "var(--gold)" },
    { label: "Bonded (Staked)", value: bonded, color: "var(--blue)" },
    { label: "Remaining to Mint", value: remainingToMint, color: "var(--tx-d)" },
    { label: "Burnt", value: burnt, color: "var(--pink)" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Coins}
        eyebrow="SRX SUPPLY"
        title={`Supply Breakdown — ${formatSRX(max)} max`}
      />

      {/* ── Headline stat row ─────────────────────────── */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Max supply"
          value={formatSRX(max)}
          loading={statsLoading}
          accent="var(--gold)"
        />
        <StatCard
          label="Total minted"
          value={formatSRX(minted)}
          loading={statsLoading}
          accent="var(--green)"
        />
        <StatCard
          label="Burnt to date"
          value={formatSRX(burnt)}
          loading={statsLoading}
          accent="var(--pink)"
        />
        <StatCard
          label="Bonded (staked)"
          value={formatSRX(bonded)}
          loading={statsLoading}
          accent="var(--blue)"
        />
      </div>

      {/* ── Donut + breakdown ─────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DetailCard title="Distribution">
          <div className="py-4">
            <SupplyDonut segments={segments} />
            <ul className="mt-4 space-y-1.5 text-sm">
              {segments.map((s) => (
                <li key={s.label} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: s.color }}
                    />
                    <span className="text-muted-foreground">{s.label}</span>
                  </span>
                  <span className="font-mono text-xs">{formatSRX(s.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        </DetailCard>

        <DetailCard title="Why these numbers">
          <div className="text-sm leading-relaxed space-y-3 py-1">
            <p>
              <strong>Max supply</strong> is fixed by the on-chain tokenomics-v2 fork at{" "}
              <span className="font-mono text-foreground">315,000,000 SRX</span>. Anything above
              that cannot be minted by any path on the protocol — it&apos;s enforced in{" "}
              <span className="font-mono">crates/sentrix-core/src/blockchain.rs</span>.
            </p>
            <p>
              <strong>Total minted</strong> is what the chain has issued so far across genesis +
              every block reward. <strong>Burnt</strong> is the running fee-burn counter — half
              of every native transaction fee is destroyed instead of credited to the validator.
            </p>
            <p>
              <strong>Bonded</strong> sums every active validator&apos;s self-stake + delegations
              from the staking registry. It&apos;s the live number any delegator-facing
              calculator (APR, slashing exposure) should pin against, not a snapshot.
            </p>
            <p>
              <strong>Premine</strong> below is the disclosed 20% allocation set in genesis. The
              founder slot is on a 1-year cliff + 4-year linear vest; the others were liquid at
              genesis. We surface the wallet addresses so the schedule is auditable on-chain.
            </p>
          </div>
        </DetailCard>
      </div>

      {/* ── Premine breakdown ─────────────────────────── */}
      <DetailCard
        title={
          <span className="inline-flex items-center gap-2">
            <Lock className="h-4 w-4 text-[var(--gold)]" /> Premine wallets ({formatSRX(PREMINE_TOTAL)})
          </span>
        }
      >
        <div className="divide-y divide-border/60">
          {PREMINE_WALLETS.map((w) => (
            <InfoRow
              key={w.address}
              label={w.label}
              value={
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <Address address={w.address} />
                  <span className="font-mono text-xs text-[var(--gold)]">{formatSRX(w.amount)}</span>
                </div>
              }
            />
          ))}
        </div>
      </DetailCard>

      {/* ── Sentinels (no private key) ────────────────── */}
      <DetailCard
        title={
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" /> Protocol sentinels
          </span>
        }
      >
        <div className="text-sm leading-relaxed space-y-2 py-1">
          <p className="text-muted-foreground">
            These addresses hold balance for protocol-level book-keeping and have no private key.
            They appear in tx history when a TokenOp / Stake op routes through them.
          </p>
          <ul className="space-y-1.5">
            <li className="flex items-center gap-2">
              <Address address="0x0000000000000000000000000000000000000000" />
              <span className="text-xs text-muted-foreground">Sentrix Token Op (sentinel)</span>
            </li>
            <li className="flex items-center gap-2">
              <Address address="0x0000000000000000000000000000000000000002" />
              <span className="text-xs text-muted-foreground">Protocol Treasury (Reward Escrow)</span>
            </li>
            <li className="flex items-center gap-2">
              <Address address="0x0000000000000000000000000000000000000100" />
              <span className="text-xs text-muted-foreground">Sentrix Staking (sentinel)</span>
            </li>
          </ul>
        </div>
      </DetailCard>

      {/* ── Numerical reference ────────────────────────── */}
      <DetailCard title="Numerical reference">
        <InfoRow
          label="Max supply (sentri)"
          value={
            <span className="font-mono">
              {(BigInt(max) * 100_000_000n).toString()} sentri
            </span>
          }
          mono
          hint="1 SRX = 100,000,000 sentri (8-decimal native ledger)."
        />
        <InfoRow
          label="Total minted"
          value={`${minted.toLocaleString()} SRX (${formatNumber(minted * 100_000_000)} sentri)`}
        />
        <InfoRow
          label="Mintable headroom"
          value={`${remainingToMint.toLocaleString()} SRX`}
          hint="Max minus total minted. Drains via block reward + halving."
        />
        <InfoRow label="Premine total" value={`${PREMINE_TOTAL.toLocaleString()} SRX`} />
        <InfoRow
          label="Bonded ratio"
          value={
            minted > 0
              ? `${((bonded / minted) * 100).toFixed(2)}%`
              : "—"
          }
          last
          hint="Bonded ÷ Total minted. Higher = more SRX securing the chain."
        />
      </DetailCard>
    </div>
  );
}
