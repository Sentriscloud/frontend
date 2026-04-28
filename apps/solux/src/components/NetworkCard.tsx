'use client';

import { useEffect, useState } from 'react';
import { useSettingsStore, NETWORKS } from '@/lib/store';
import { getChainInfo, getFinalizedHeight } from '@/lib/api';
import { ExternalLink } from 'lucide-react';
import SrxMark from './SrxMark';

// Mini "Sentrix Chain status" card for the dashboard. Fills the empty
// space below activity with a live readout of block height + active
// validators + finalized lag — gives the dashboard "this wallet talks
// to a real chain" presence instead of trailing into negative space.
//
// Polls every 12s. Failures render as "—" without crashing — the
// dashboard is the home screen, it must not error out on a flaky RPC.

interface ChainStats {
  height: number | null;
  finalized: number | null;
  activeValidators: number | null;
  chainId: number | null;
}

export default function NetworkCard() {
  const { network } = useSettingsStore();
  const net = NETWORKS[network];
  const [stats, setStats] = useState<ChainStats>({
    height: null, finalized: null, activeValidators: null, chainId: null,
  });

  useEffect(() => {
    let cancelled = false;
    setStats({ height: null, finalized: null, activeValidators: null, chainId: null });

    const fetchStats = async () => {
      try {
        const [info, fh] = await Promise.all([
          getChainInfo().catch(() => null),
          getFinalizedHeight().catch(() => null),
        ]);
        if (cancelled) return;
        setStats({
          height: info?.height ?? null,
          finalized: fh?.finalized_height ?? null,
          activeValidators: info?.active_validators ?? null,
          chainId: info?.chain_id ?? null,
        });
      } catch { /* render dashes */ }
    };

    fetchStats();
    const id = setInterval(fetchStats, 12_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [network]);

  const lag = stats.height !== null && stats.finalized !== null
    ? Math.max(0, stats.height - stats.finalized)
    : null;

  return (
    <section className="mt-7 mb-1 animate-fade-up delay-4">
      <div className="relative rounded-2xl bg-[var(--sf)] border border-[var(--brd)] overflow-hidden">
        {/* Brand watermark — subtle SrxMark floating top-right */}
        <div aria-hidden className="absolute -top-8 -right-10 w-40 h-40 text-[var(--gold)] opacity-[0.05] pointer-events-none">
          <SrxMark className="w-full h-full" />
        </div>

        <div className="relative px-5 py-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse-live" />
              <h3 className="text-[14px] font-semibold text-[var(--tx)]">
                Sentrix {net.label}
              </h3>
            </div>
            <a
              href={`https://scan.sentrixchain.com${network === 'testnet' ? '?network=testnet' : ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] font-medium text-[var(--gold)] hover:text-[var(--gold-l)] transition-colors flex items-center gap-1"
            >
              Explorer <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Stat
              label="Block"
              value={stats.height !== null ? `#${stats.height.toLocaleString()}` : '—'}
            />
            <Stat
              label="Finalized"
              value={lag !== null ? (lag === 0 ? 'live' : `−${lag}`) : '—'}
              tone={lag === 0 ? 'green' : 'tx'}
            />
            <Stat
              label="Validators"
              value={stats.activeValidators !== null ? String(stats.activeValidators) : '—'}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, tone = 'tx' }: { label: string; value: string; tone?: 'tx' | 'green' }) {
  const color = tone === 'green' ? 'var(--green)' : 'var(--tx)';
  return (
    <div>
      <p className="text-[11px] text-[var(--tx-m)] mb-1">{label}</p>
      <p className="text-[14px] font-semibold tab-num" style={{ color }}>{value}</p>
    </div>
  );
}
