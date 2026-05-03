"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SITE } from "@/data/content";
import { useLatestBlock } from "@/lib/ws";

interface ChainInfo {
  total_blocks: number;
  height: number;
  total_minted_srx: number;
  total_burned_srx: number;
  mempool_size: number;
  active_validators: number;
  deployed_tokens: number;
  next_block_reward_srx: number;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

export function LiveChain() {
  const [data, setData] = useState<ChainInfo | null>(null);
  const [tick, setTick] = useState(0);
  // WS subscription drives live block height; new heads also trigger
  // the REST refetch so the other stats (burned, mempool, validators)
  // stay fresh without an additional poll cycle.
  const wsHead = useLatestBlock("wss://rpc.sentrixchain.com/ws");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${SITE.api}/chain/info`);
        if (res.ok) setData(await res.json());
      } catch { /* silent */ }
    };
    fetchData();
    // 30s slow REST poll as a backstop for WS reconnect windows.
    const interval = setInterval(() => {
      fetchData();
      setTick((t) => t + 1);
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  // When WS emits a new head, also pull fresh /chain/info so non-header
  // stats (mempool, burned, validators) advance with the block.
  // Extracting wsHead.number to a local lets us depend on it directly
  // instead of `wsHead?.number` inside deps array — keeps
  // exhaustive-deps lint clean without re-firing on unrelated wsHead
  // identity changes.
  const wsHeadNumber = wsHead?.number;
  useEffect(() => {
    if (!wsHeadNumber) return;
    fetch(`${SITE.api}/chain/info`).then((r) => r.ok ? r.json() : null).then((d) => d && setData(d)).catch(() => {});
  }, [wsHeadNumber]);

  if (!data) return null;

  const liveHeight = Math.max(data.height, wsHead?.number ?? 0);
  const stats = [
    { label: "Block Height", value: formatNum(liveHeight) },
    { label: "Total Minted", value: formatNum(data.total_minted_srx) + " SRX" },
    { label: "Total Burned", value: data.total_burned_srx.toFixed(4) + " SRX" },
    { label: "Validators", value: String(data.active_validators) },
    { label: "Tokens Deployed", value: String(data.deployed_tokens) },
    { label: "Mempool", value: String(data.mempool_size) + " tx" },
    { label: "Block Reward", value: data.next_block_reward_srx + " SRX" },
  ];

  return (
    <div className="border-y border-[var(--brd)] bg-[var(--sf)] py-5 px-6 md:px-[60px]">
      <div className="text-center mb-5">
        <span className="font-mono text-[11px] text-[var(--tx-m)] tracking-[.2em] uppercase font-medium">Live Chain Data</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.05 }}
            className="group"
          >
            <div className="mb-1">
              <span className="font-mono text-[9px] text-[var(--tx-d)] tracking-[.15em] uppercase">{s.label}</span>
            </div>
            <motion.div
              key={`${s.value}-${tick}`}
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 1 }}
              className="font-mono text-[14px] text-[var(--gold)] tracking-[.02em]"
            >
              {s.value}
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
