'use client';

import { useState, useEffect } from 'react';
import { useWalletStore } from '@/lib/store';
import { getTransactionHistory } from '@/lib/api';
import type { TxHistoryItem } from '@/types';
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Coins, Inbox, Layers } from 'lucide-react';

const TOKEN_OP_ADDRESS = '0x0000000000000000000000000000000000000000';

export default function TxHistory({ onBack }: { onBack: () => void }) {
  const { address } = useWalletStore();
  const [txs, setTxs] = useState<TxHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    getTransactionHistory(address)
      .then((data) => setTxs(data.transactions || []))
      .catch(() => setTxs([]))
      .finally(() => setLoading(false));
  }, [address]);

  const truncate = (s: string) => s.length > 14 ? s.slice(0, 8) + '...' + s.slice(-4) : s;

  const timeAgo = (ts: number) => {
    const diff = Math.floor(Date.now() / 1000) - ts;
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const SENTRI = 100_000_000;

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ background: '#030712' }}>
      <div className="w-full max-w-sm">
        <button onClick={onBack} className="flex items-center gap-2 mb-5 text-sm font-medium transition-colors active:scale-95" style={{ color: '#8494A7' }}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="rounded-2xl overflow-hidden" style={{ background: '#0D1426', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid #0F1A2E' }}>
            <h2 className="text-lg font-bold" style={{ color: '#F1F5F9' }}>Transactions</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 rounded-full animate-spin mx-auto" style={{ border: '2px solid rgba(255,255,255,0.08)', borderTopColor: '#10b981' }} />
              <p className="text-sm mt-3" style={{ color: '#7A8A9A' }}>Loading...</p>
            </div>
          ) : txs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: '#0F1A2E' }}>
                <Inbox className="w-8 h-8" style={{ color: '#5A6A7A' }} />
              </div>
              <p className="font-semibold text-sm" style={{ color: '#8494A7' }}>No transactions yet</p>
              <p className="text-xs mt-1" style={{ color: '#5A6A7A' }}>Send or receive to get started</p>
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              {txs.map((tx, i) => {
                const isTokenOp = tx.to === TOKEN_OP_ADDRESS && tx.direction === 'out';
                return (
                  <div
                    key={tx.txid}
                    className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-white/[0.04]"
                    style={{ borderBottom: i < txs.length - 1 ? '1px solid #0F1A2E' : 'none' }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{
                          background: isTokenOp ? 'rgba(168,85,247,0.12)' :
                                     tx.direction === 'in' ? 'rgba(16,185,129,0.12)' :
                                     tx.direction === 'reward' ? 'rgba(245,158,11,0.12)' : 'rgba(244,63,94,0.12)',
                        }}
                      >
                        {isTokenOp ? <Layers className="w-4 h-4" style={{ color: '#7c3aed' }} /> :
                         tx.direction === 'in' ? <ArrowDownLeft className="w-4 h-4" style={{ color: '#10b981' }} /> :
                         tx.direction === 'reward' ? <Coins className="w-4 h-4" style={{ color: '#F59E0B' }} /> :
                         <ArrowUpRight className="w-4 h-4" style={{ color: '#EF4444' }} />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: '#F1F5F9' }}>
                          {isTokenOp ? 'Token Transfer' :
                           tx.direction === 'reward' ? 'Block Reward' :
                           tx.direction === 'in' ? `From ${truncate(tx.from)}` :
                           `To ${truncate(tx.to)}`}
                        </p>
                        <p className="text-xs" style={{ color: '#5A6A7A' }}>{timeAgo(tx.block_timestamp)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {isTokenOp ? (
                        <>
                          <p className="text-sm font-bold" style={{ color: '#7c3aed' }}>-{(tx.fee / SENTRI).toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
                          <p className="text-xs" style={{ color: '#5A6A7A' }}>SRX fee</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-bold" style={{ color: tx.direction === 'out' ? '#EF4444' : '#10b981' }}>
                            {tx.direction === 'out' ? '-' : '+'}
                            {(tx.amount / SENTRI).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                          </p>
                          <p className="text-xs" style={{ color: '#5A6A7A' }}>SRX</p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
