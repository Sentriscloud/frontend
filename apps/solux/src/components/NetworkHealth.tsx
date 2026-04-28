'use client';

import { useEffect, useState } from 'react';
import { getChainInfo, getFinalizedHeight } from '@/lib/api';
import { usePolling } from '@/lib/usePolling';
import { useSettingsStore, NETWORKS } from '@/lib/store';
import { useLatestBlock, useLatestFinalized } from '@/lib/ws';

type Health = 'healthy' | 'lagging' | 'unreachable';

interface State {
  health: Health;
  height: number | null;
  finalized: number | null;
  mempool: number | null;
  validators: number | null;
}

function deriveWsUrl(apiUrl: string): string {
  const u = new URL(apiUrl);
  const host = u.host.replace(/^api\./, 'rpc.').replace(/^testnet-api\./, 'testnet-rpc.');
  return `wss://${host}/ws`;
}

export default function NetworkHealth() {
  const network = useSettingsStore((s) => s.network);
  const wsUrl = deriveWsUrl(NETWORKS[network].apiUrl);
  const wsHead = useLatestBlock(wsUrl);
  const wsFinalized = useLatestFinalized(wsUrl);
  const [state, setState] = useState<State>({
    health: 'unreachable', height: null, finalized: null, mempool: null, validators: null,
  });
  const [showDetail, setShowDetail] = useState(false);

  // Reset to "unreachable" placeholder when network changes — avoids
  // flashing stale mainnet stats while testnet data arrives.
  useEffect(() => {
    setState({ health: 'unreachable', height: null, finalized: null, mempool: null, validators: null });
  }, [network]);

  // Slow REST poll keeps mempool + validators (which aren't on the WS
  // newHeads / finalized streams) fresh, and backstops the WS stream
  // during reconnect windows. Drops 5s → 30s now that WS handles the
  // hot fields (height + finalized).
  usePolling(async () => {
    let aborted = false;
    try {
      const [info, fh] = await Promise.all([
        getChainInfo(),
        getFinalizedHeight().catch(() => null),
      ]);
      if (aborted) return;
      const finalized = fh?.finalized_height ?? null;
      const lag = finalized !== null ? info.height - finalized : 0;
      const health: Health = lag > 30 ? 'lagging' : 'healthy';
      setState({
        health,
        height: info.height,
        finalized,
        mempool: info.mempool_size,
        validators: info.active_validators,
      });
    } catch {
      if (aborted) return;
      setState((s) => ({ ...s, health: 'unreachable' }));
    }
    return () => { aborted = true; };
  }, 30_000);

  // Apply WS-fresh values + recompute health on every WS tick.
  useEffect(() => {
    if (wsHead?.number == null && wsFinalized == null) return;
    setState((prev) => {
      const height = wsHead?.number ?? prev.height;
      const finalized = wsFinalized ?? prev.finalized;
      const lag = (height !== null && finalized !== null) ? Math.max(0, height - finalized) : 0;
      const health: Health = (height !== null) ? (lag > 30 ? 'lagging' : 'healthy') : prev.health;
      return { ...prev, height, finalized, health };
    });
  }, [wsHead?.number, wsFinalized]);

  const dotColor =
    state.health === 'healthy'    ? 'bg-[var(--green)]' :
    state.health === 'lagging'    ? 'bg-[var(--gold)]'  :
                                     'bg-[var(--red)]';

  const label =
    state.health === 'healthy'    ? 'Healthy' :
    state.health === 'lagging'    ? 'Lagging' :
                                     'Offline';

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetail((v) => !v)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--sf)] border border-[var(--brd)] hover:bg-[var(--sf-2)] transition-colors"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor} ${state.health === 'healthy' ? 'animate-pulse-live' : ''}`} />
        <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--tx-m)]">
          {label}
        </span>
        {state.height !== null && (
          <span className="text-[9px] font-mono text-[var(--tx-d)] tab-num">
            #{state.height.toLocaleString()}
          </span>
        )}
      </button>

      {showDetail && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDetail(false)}
          />
          <div className="absolute top-full mt-2 right-0 z-50 w-56 rounded-lg bg-[var(--sf)] border border-[var(--brd)] p-3 shadow-2xl animate-fade-up">
            <div className="text-[12px] font-medium text-[var(--tx-m)] mb-2">Sentrix Mainnet</div>
            <div className="space-y-1.5 text-[11px] font-mono">
              <Stat label="Status"   value={label}                                 tone={state.health} />
              <Stat label="Tip"      value={state.height !== null ? `#${state.height.toLocaleString()}` : '—'} />
              <Stat label="Final"    value={state.finalized !== null ? `#${state.finalized.toLocaleString()}` : '—'} />
              <Stat label="Lag"      value={state.height !== null && state.finalized !== null ? `${state.height - state.finalized} blk` : '—'} />
              <Stat label="Mempool"  value={state.mempool !== null ? `${state.mempool}` : '—'} />
              <Stat label="Validators" value={state.validators !== null ? `${state.validators}` : '—'} />
            </div>
            {state.health === 'unreachable' && (
              <p className="text-[10px] text-[var(--red)] mt-3 leading-relaxed">
                Cannot reach API. Check your connection or visit{' '}
                <a href="https://sentrixchain.com" target="_blank" rel="noopener noreferrer" className="underline">
                  sentrixchain.com
                </a>{' '}
                for status.
              </p>
            )}
            {state.health === 'lagging' && (
              <p className="text-[10px] text-[var(--gold-l)] mt-3 leading-relaxed">
                Finality is more than 30 blocks behind the tip. New transactions may take longer to confirm.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: Health }) {
  const valueClass =
    tone === 'lagging'      ? 'text-[var(--gold)]' :
    tone === 'unreachable'  ? 'text-[var(--red)]'  :
    tone === 'healthy'      ? 'text-[var(--green)]':
                              'text-[var(--tx)]';
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-[var(--tx-d)]">{label}</span>
      <span className={`tab-num ${valueClass}`}>{value}</span>
    </div>
  );
}
