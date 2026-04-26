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
    <div className={`flex justify-center px-5 ${inline ? 'pt-6 pb-28' : 'min-h-screen py-8'}`}>
      <div className="w-full max-w-sm">
        {!inline && onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 mb-6 text-xs font-mono uppercase tracking-wider text-[var(--tx-m)] hover:text-[var(--tx)] transition-colors animate-fade-up"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        )}

        <div className="mb-6 animate-fade-up delay-1">
          <div className="eyebrow">Ledger</div>
          <h1 className="font-serif text-3xl text-[var(--tx)] mt-1">Activity</h1>
        </div>

        <div className="rounded-xl bg-[var(--sf)] border border-[var(--brd)] overflow-hidden animate-fade-up delay-2">
          {loading ? (
            <div className="p-10 text-center">
              <div className="w-7 h-7 rounded-full mx-auto mb-3 animate-spin border-2 border-[var(--brd)] border-t-[var(--gold)]" />
              <p className="text-xs font-mono uppercase tracking-wider text-[var(--tx-d)]">Loading</p>
            </div>
          ) : txs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center bg-[var(--bk-2)] border border-[var(--brd)]">
                <Inbox className="w-5 h-5 text-[var(--tx-d)]" />
              </div>
              <p className="text-sm text-[var(--tx-2)]">No transactions yet</p>
              <p className="text-[11px] text-[var(--tx-d)] mt-1">Your activity will appear here</p>
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto divide-y divide-[var(--brd)]">
              {txs.map((tx) => {
                const isTokenOp = tx.to === TOKEN_OP_ADDRESS && tx.direction === 'out';
                const isStaking = tx.to.toLowerCase() === STAKING_ADDRESS;
                const isReward  = tx.direction === 'reward';
                const isOut     = tx.direction === 'out';

                const Icon  = isTokenOp ? Layers : isStaking ? Coins : isReward ? Coins : isOut ? ArrowUpRight : ArrowDownLeft;
                const tone  = isTokenOp ? 'gold' : isStaking ? 'gold' : isReward ? 'gold' : isOut ? 'red' : 'green';
                const label = isTokenOp ? 'Token op' : isStaking ? 'Staking' : isReward ? 'Block reward' : isOut ? 'Sent' : 'Received';
                const counter = isOut ? tx.to : tx.from;
                const amt   = isTokenOp ? tx.fee : tx.amount;
                const sign  = isOut || isTokenOp ? '−' : '+';

                return (
                  <button
                    key={tx.txid}
                    onClick={() => setSelected(tx)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--sf-2)] transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        tone === 'gold'  ? 'bg-[var(--gold-bg)]' :
                        tone === 'red'   ? 'bg-[var(--red-bg)]'  :
                                            'bg-[var(--green-bg)]'
                      }`}>
                        <Icon className={`w-4 h-4 ${
                          tone === 'gold'  ? 'text-[var(--gold)]' :
                          tone === 'red'   ? 'text-[var(--red)]'  :
                                              'text-[var(--green)]'
                        }`} />
                      </div>
                      <div>
                        <p className="text-sm text-[var(--tx)]">{label}</p>
                        <p className="text-[10px] font-mono text-[var(--tx-d)] mt-0.5">
                          {truncate(counter)} · {timeAgo(tx.block_timestamp)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-mono tab-num ${
                        tone === 'gold'  ? 'text-[var(--gold)]' :
                        tone === 'red'   ? 'text-[var(--red)]'  :
                                            'text-[var(--green)]'
                      }`}>
                        {hideBalances ? '••••' : `${sign}${(amt / SENTRI).toLocaleString(undefined, { maximumFractionDigits: 4 })}`}
                      </p>
                      <p className="text-[9px] font-mono uppercase tracking-wider text-[var(--tx-d)] mt-0.5">
                        {isTokenOp ? 'fee · srx' : 'srx'}
                      </p>
                    </div>
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
