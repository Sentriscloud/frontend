"use client";

import { useEffect, useState } from "react";
import { Activity, Radio, Users, Clock } from "lucide-react";
import { Address } from "@/components/common/Address";
import { useNetwork, useNetworkFromQuery } from "@/lib/network-context";
import { fetchSentrixStatusExtended, type SentrixStatusExtended } from "@/lib/api";
import { formatNumber } from "@/lib/format";

// Sentinel — operator dashboard. Distinct from the rest of scan: dual-tone
// black-and-emerald HUD instead of the gold editorial palette so an operator
// glancing at the page can read consensus health at a glance without parsing
// the same brand surface they'd see on an explorer view. Refreshes every 5 s
// against /sentrix_status_extended which is a single state.read snapshot —
// no per-validator round-trip, won't ratelimit-burst the chain RPC.
//
// Don't hardcode validator names — render whatever the chain returns at
// validators.top[]. Operator names get resolved via lib/labels.tsx the same
// way the rest of scan handles them, so adding/removing/renaming a validator
// reflects here within one cycle.
const POLL_MS = 5000;

const HEALTH_TONE: Record<string, { ring: string; text: string; label: string }> = {
  green: { ring: "ring-emerald-500/40", text: "text-emerald-400", label: "OPERATIONAL" },
  yellow: { ring: "ring-amber-500/40", text: "text-amber-400", label: "DEGRADED" },
  red: { ring: "ring-red-500/40", text: "text-red-400", label: "ALERT" },
};

export default function SentinelPage() {
  const { network } = useNetwork();
  useNetworkFromQuery();
  const [data, setData] = useState<SentrixStatusExtended | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      try {
        const next = await fetchSentrixStatusExtended(network);
        if (!alive) return;
        if (next) {
          setData(next);
          setError(null);
        } else {
          setError("RPC unreachable");
        }
      } catch {
        if (!alive) return;
        setError("RPC unreachable");
      } finally {
        if (alive) timer = setTimeout(tick, POLL_MS);
      }
    }

    tick();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [network]);

  const tone = data ? HEALTH_TONE[data.health] ?? HEALTH_TONE.yellow : HEALTH_TONE.yellow;
  const tps = data && data.sync_info.block_time_avg_recent_seconds > 0
    ? 1 / data.sync_info.block_time_avg_recent_seconds
    : 0;
  const quorum = data ? data.validators.active_count : 0;
  const totalValidators = data ? data.validators.top.length : 0;
  const totalStake = data ? data.validators.total_active_stake_sentri / 1e8 : 0;

  return (
    <div className="bg-black min-h-screen -mx-4 -my-8 px-4 lg:px-6 py-8 font-mono">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-baseline justify-between flex-wrap gap-3 pb-4 border-b border-emerald-500/20">
          <div>
            <p className="text-[10px] tracking-[.32em] text-emerald-500/60 mb-1">SENTRIX SENTINEL</p>
            <h1 className="text-3xl text-emerald-400 tracking-tight">
              {network === "mainnet" ? "MAINNET 7119" : "TESTNET 7120"}
            </h1>
          </div>
          <div className={`flex items-center gap-2 text-[11px] ${tone.text}`}>
            <span className={`inline-block h-2 w-2 rounded-full ${tone.text === 'text-emerald-400' ? 'bg-emerald-400' : tone.text === 'text-amber-400' ? 'bg-amber-400' : 'bg-red-400'} animate-pulse`} />
            {data ? tone.label : "CONNECTING"}
            {error && <span className="text-red-400 ml-2">· {error}</span>}
          </div>
        </div>

        {/* HUD tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Hud
            label="HEIGHT"
            value={data ? formatNumber(data.sync_info.latest_block_height) : "—"}
            icon={Activity}
            sub={data?.sync_info.latest_block_hash ? `0x${data.sync_info.latest_block_hash.slice(0, 8)}…${data.sync_info.latest_block_hash.slice(-4)}` : ""}
          />
          <Hud
            label="THROUGHPUT"
            value={data ? `${tps.toFixed(2)} tps` : "—"}
            icon={Radio}
            sub={data ? `block time ${data.sync_info.block_time_avg_recent_seconds.toFixed(2)}s` : ""}
          />
          <Hud
            label="QUORUM"
            value={data ? `${quorum}/${totalValidators}` : "—"}
            icon={Users}
            sub={data ? `${formatNumber(totalStake)} SRX bonded` : ""}
          />
          <Hud
            label="LATENCY"
            value={data ? `${data.sync_info.chain_age_seconds}s` : "—"}
            icon={Clock}
            sub={data ? `uptime ${formatUptime(data.uptime_seconds)}` : ""}
          />
        </div>

        {/* Validator cluster + auxiliary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className={`lg:col-span-2 border border-emerald-500/20 rounded-md ring-1 ${tone.ring} bg-emerald-500/[0.02]`}>
            <div className="px-4 py-2 border-b border-emerald-500/20 text-[10px] tracking-[.32em] text-emerald-500/60">
              VALIDATOR CLUSTER
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] tracking-[.2em] text-emerald-500/40">
                  <th className="px-4 py-2 font-normal">#</th>
                  <th className="px-4 py-2 font-normal">ADDRESS</th>
                  <th className="px-4 py-2 font-normal text-right">STAKE</th>
                  <th className="px-4 py-2 font-normal text-right">SHARE</th>
                  <th className="px-4 py-2 font-normal text-right">STATE</th>
                </tr>
              </thead>
              <tbody>
                {data?.validators.top.map((v, i) => {
                  const stake = v.stake_sentri / 1e8;
                  const share = totalStake > 0 ? (stake / totalStake) * 100 : 0;
                  return (
                    <tr key={v.address} className="border-t border-emerald-500/10 hover:bg-emerald-500/[0.04]">
                      <td className="px-4 py-2 text-emerald-500/40">{i + 1}</td>
                      <td className="px-4 py-2">
                        <Address address={v.address} className="text-emerald-400" />
                      </td>
                      <td className="px-4 py-2 text-right text-emerald-300 tabular-nums">
                        {formatNumber(stake)}
                      </td>
                      <td className="px-4 py-2 text-right text-emerald-500/60 tabular-nums">
                        {share.toFixed(1)}%
                      </td>
                      <td className="px-4 py-2 text-right">
                        {v.active ? (
                          <span className="text-emerald-400 text-[10px]">ACTIVE</span>
                        ) : (
                          <span className="text-amber-400 text-[10px]">INACTIVE</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!data && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-emerald-500/30 text-[11px]">
                      awaiting first response
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Side panel: mempool + supply */}
          <div className="space-y-3">
            <div className="border border-emerald-500/20 rounded-md p-4 bg-emerald-500/[0.02]">
              <div className="text-[10px] tracking-[.32em] text-emerald-500/60 mb-2">MEMPOOL</div>
              <div className="text-2xl text-emerald-300 tabular-nums">
                {data ? formatNumber(data.mempool.size) : "—"}
              </div>
              <div className="text-[10px] text-emerald-500/40 mt-1">pending tx</div>
            </div>
            <div className="border border-emerald-500/20 rounded-md p-4 bg-emerald-500/[0.02]">
              <div className="text-[10px] tracking-[.32em] text-emerald-500/60 mb-2">SUPPLY</div>
              <div className="space-y-1 text-[11px]">
                <SupplyRow label="MINTED" value={data ? data.supply.minted_sentri / 1e8 : null} />
                <SupplyRow label="BURNED" value={data ? data.supply.burned_sentri / 1e8 : null} />
                <SupplyRow
                  label="CIRCULATING"
                  value={data ? data.supply.circulating_sentri / 1e8 : null}
                  emphasis
                />
              </div>
            </div>
            <div className="border border-emerald-500/20 rounded-md p-4 bg-emerald-500/[0.02]">
              <div className="text-[10px] tracking-[.32em] text-emerald-500/60 mb-2">RUNTIME</div>
              <div className="space-y-1 text-[11px] text-emerald-500/70">
                <div className="flex justify-between">
                  <span>VERSION</span>
                  <span className="text-emerald-300">{data?.version.version ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>CONSENSUS</span>
                  <span className="text-emerald-300">{data?.consensus ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>TOKENS</span>
                  <span className="text-emerald-300">{data ? formatNumber(data.ecosystem.deployed_tokens) : "—"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-[10px] tracking-[.2em] text-emerald-500/30 pt-4 text-center">
          REFRESH {POLL_MS / 1000}s · /sentrix_status_extended
        </div>
      </div>
    </div>
  );
}

function Hud({ label, value, icon: Icon, sub }: { label: string; value: string; icon: typeof Activity; sub?: string }) {
  return (
    <div className="border border-emerald-500/20 rounded-md p-4 bg-emerald-500/[0.02] hover:bg-emerald-500/[0.04] transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] tracking-[.32em] text-emerald-500/60">{label}</span>
        <Icon className="h-3 w-3 text-emerald-500/40" />
      </div>
      <div className="text-3xl text-emerald-300 tabular-nums tracking-tight">{value}</div>
      {sub && <div className="text-[10px] text-emerald-500/40 mt-1 truncate">{sub}</div>}
    </div>
  );
}

function SupplyRow({ label, value, emphasis = false }: { label: string; value: number | null; emphasis?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-emerald-500/70">{label}</span>
      <span className={emphasis ? "text-emerald-300 tabular-nums" : "text-emerald-400/80 tabular-nums"}>
        {value !== null ? formatNumber(value) : "—"}
      </span>
    </div>
  );
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
