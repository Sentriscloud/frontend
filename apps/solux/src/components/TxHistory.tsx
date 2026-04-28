'use client';

import { useState, useEffect } from 'react';
import { useWalletStore, useSettingsStore } from '@/lib/store';
import { getTransactionHistory } from '@/lib/api';
import type { TxHistoryItem } from '@/types';
import TxDetail from './TxDetail';
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Coins, Layers, Inbox } from 'lucide-react';

const TOKEN_OP_ADDRESS = '0x0000000000000000000000000000000000000000';
const STAKING_ADDRESS = '0x0000000000000000000000000000000000000100';
const SENTRI = 100_000_000;

export default function TxHistory({ onBack, inline = false }: { onBack?: () => void; inline?: boolean }) {
  const { address } = useWalletStore();
  const { hideBalances, network } = useSettingsStore();
  const [txs, setTxs] = useState<TxHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TxHistoryItem | null>(null);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    // Clear stale tx list immediately so the previous network's history
    // doesn't flash while the new network's data loads.
    setTxs([]);
    setLoading(true);
    getTransactionHistory(address, 50)
      .then((data) => { if (!cancelled) setTxs(data.transactions || []); })
      .catch(() => { if (!cancelled) setTxs([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [address, network]);

  const truncate = (s: string) => s.length > 14 ? s.slice(0, 6) + '…' + s.slice(-4) : s;

  const timeAgo = (ts: number) => {
    const diff = Math.floor(Date.now() / 1000) - ts;
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className={`flex justify-center px-5 ${inline ? 'pt-6 pb-32' : 'min-h-screen py-8'}`}>
      <div className="w-full max-w-sm">
        {!inline && onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 mb-6 text-[13px] text-[var(--tx-m)] hover:text-[var(--tx)] transition-colors animate-fade-up"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        )}

        <h1 className="text-[22px] font-bold text-[var(--tx)] mb-6 animate-fade-up delay-1 px-1">
          Activity
        </h1>

        <div className="animate-fade-up delay-2">
          {loading ? (
            <div className="px-1 py-12 text-center">
              <div className="w-6 h-6 rounded-full mx-auto mb-3 animate-spin border-2 border-[var(--brd)] border-t-[var(--gold)]" />
              <p className="text-[12px] text-[var(--tx-d)]">Loading…</p>
            </div>
          ) : txs.length === 0 ? (
            <div className="rounded-2xl bg-[var(--sf)] border border-[var(--brd)] py-16 text-center">
              <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center bg-[var(--gold-bg)]">
                <Inbox className="w-6 h-6 text-[var(--gold)]" />
              </div>
              <p className="text-[15px] font-semibold text-[var(--tx)]">No transactions yet</p>
              <p className="text-[13px] text-[var(--tx-m)] mt-1.5 px-8 leading-relaxed">
                Your sends, receives, and rewards will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-1 max-h-[72vh] overflow-y-auto">
              {txs.map((tx) => {
                const isTokenOp = tx.to === TOKEN_OP_ADDRESS && tx.direction === 'out';
                const isStaking = tx.to.toLowerCase() === STAKING_ADDRESS;
                const isReward  = tx.direction === 'reward';
                const isOut     = tx.direction === 'out';

                const Icon  = isTokenOp ? Layers : isStaking ? Coins : isReward ? Coins : isOut ? ArrowUpRight : ArrowDownLeft;
                const tone  = isTokenOp || isStaking || isReward ? 'gold' : isOut ? 'red' : 'green';
                const discTint = tone === 'gold' ? '' : tone === 'red' ? 'tint-red' : 'tint-green';
                const label = isTokenOp ? 'Token op' : isStaking ? 'Staking' : isReward ? 'Reward' : isOut ? 'Sent' : 'Received';
                const counter = isOut ? tx.to : tx.from;
                const amt   = isTokenOp ? tx.fee : tx.amount;
                const sign  = isOut || isTokenOp ? '−' : '+';

                return (
                  <button
                    key={tx.txid}
                    onClick={() => setSelected(tx)}
                    className="w-full flex items-center justify-between px-2 py-3 rounded-xl hover:bg-[rgba(255,255,255,0.04)] transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`action-disc ${discTint}`} style={{ width: 40, height: 40 }}>
                        <Icon className="w-[18px] h-[18px]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-[var(--tx)]">{label}</p>
                        <p className="text-[12px] text-[var(--tx-m)] mt-0.5 truncate">
                          {truncate(counter)} · {timeAgo(tx.block_timestamp)}
                        </p>
                      </div>
                    </div>
                    <p className={`text-[14px] font-semibold tab-num shrink-0 pl-3 ${
                      tone === 'gold' ? 'text-[var(--gold)]' :
                      tone === 'red'  ? 'text-[var(--red)]'  :
                                        'text-[var(--green)]'
                    }`}>
                      {hideBalances ? '••••' : `${sign}${(amt / SENTRI).toLocaleString(undefined, { maximumFractionDigits: 4 })}`}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selected && (
        <TxDetail tx={selected} onClose={() => setSelected(null)} walletAddress={address} />
      )}
    </div>
  );
}
