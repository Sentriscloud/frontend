'use client';

import { useState, useEffect } from 'react';
import { useWalletStore, useNotificationStore } from '@/lib/store';
import { useEscape } from '@/lib/useEscape';
import {
  Bell, X, Trash2, Check, Send, ArrowDownLeft, Coins, AlertCircle,
  Layers,
} from 'lucide-react';
import type { NotificationKind } from '@/lib/store';

const SENTRI = 100_000_000;

export default function NotificationBell() {
  const { address } = useWalletStore();
  const { byAddress, markAllRead, clear } = useNotificationStore();

  const [open, setOpen] = useState(false);
  const list = address ? (byAddress[address.toLowerCase()] ?? []) : [];
  const unread = list.filter((n) => !n.read).length;

  // Mark all as read when panel opens
  useEffect(() => {
    if (open && address && unread > 0) {
      // small delay so user sees the unread state briefly before clearing dots
      const t = setTimeout(() => markAllRead(address), 400);
      return () => clearTimeout(t);
    }
  }, [open, address, unread, markAllRead]);

  useEscape(open, () => setOpen(false));

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Notifications"
        className="relative w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--sf)] border border-[var(--brd)] hover:bg-[var(--sf-2)] transition-colors"
      >
        <Bell className="w-4 h-4 text-[var(--tx-m)]" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--gold)] ring-2 ring-[var(--bk)]" />
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden bg-[var(--sf)] border border-[var(--brd)] animate-fade-up max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[var(--brd)] sticky top-0 bg-[var(--sf)]">
              <h2 className="text-[20px] font-bold text-[var(--tx)] tracking-tight">Notifications</h2>
              <div className="flex items-center gap-1">
                {list.length > 0 && address && (
                  <button
                    onClick={() => clear(address)}
                    aria-label="Clear all"
                    className="text-[12px] font-medium px-2.5 py-1.5 rounded-lg hover:bg-[var(--sf-2)] transition-colors text-[var(--tx-m)] flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Clear
                  </button>
                )}
                <button onClick={() => setOpen(false)} aria-label="Close" className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--sf-2)] transition-colors">
                  <X className="w-4 h-4 text-[var(--tx-m)]" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {list.length === 0 ? (
                <div className="px-5 py-14 text-center">
                  <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center bg-[var(--gold-bg)]">
                    <Bell className="w-5 h-5 text-[var(--gold)]" />
                  </div>
                  <p className="text-[14px] font-semibold text-[var(--tx)]">No notifications</p>
                  <p className="text-[12px] text-[var(--tx-m)] mt-1.5">
                    Tx confirmations and block rewards appear here
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--brd)]">
                  {list.map((n) => (
                    <NotificationRow key={n.id} kind={n.kind} title={n.title} body={n.body} amount={n.amount} txid={n.txid} createdAt={n.createdAt} read={n.read} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NotificationRow({
  kind, title, body, amount, txid, createdAt, read,
}: {
  kind: NotificationKind;
  title: string;
  body?: string;
  amount?: number;
  txid?: string;
  createdAt: number;
  read: boolean;
}) {
  const Icon =
    kind === 'tx-received'  ? ArrowDownLeft :
    kind === 'tx-broadcast' ? Send :
    kind === 'tx-confirmed' ? Send :
    kind === 'tx-finalized' ? Check :
    kind === 'tx-expired'   ? AlertCircle :
    kind === 'staking'      ? Coins :
                              Layers;

  const tone =
    kind === 'tx-received'  ? 'green' :
    kind === 'tx-expired'   ? 'red'   :
    kind === 'tx-finalized' ? 'gold'  :
                              'gold';

  const toneClasses = {
    green: 'bg-[var(--green-bg)] text-[var(--green)]',
    gold:  'bg-[var(--gold-bg)] text-[var(--gold)]',
    red:   'bg-[var(--red-bg)] text-[var(--red)]',
  } as const;

  const timeAgo = (ts: number) => {
    // Date.now() is intentionally impure — fresh "ago" text per render.
    // eslint-disable-next-line react-hooks/purity
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="px-4 py-3 flex gap-3">
      <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${toneClasses[tone]}`}>
        <Icon className="w-4 h-4" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm text-[var(--tx)] font-medium truncate">
            {title}
            {!read && <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-[var(--gold)] align-middle" />}
          </p>
          <span className="text-[10px] font-mono text-[var(--tx-d)] shrink-0">{timeAgo(createdAt)}</span>
        </div>
        {body && (
          <p className="text-[11px] text-[var(--tx-m)] mt-0.5 leading-snug">{body}</p>
        )}
        {amount !== undefined && (
          <p className="text-[11px] font-mono text-[var(--gold)] mt-1 tab-num">
            {(amount / SENTRI).toLocaleString(undefined, { maximumFractionDigits: 4 })} SRX
          </p>
        )}
        {txid && (
          <p className="text-[10px] font-mono text-[var(--tx-d)] mt-0.5 truncate">
            {txid.slice(0, 14)}…{txid.slice(-6)}
          </p>
        )}
      </div>
    </div>
  );
}
