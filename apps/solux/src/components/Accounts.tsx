'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWalletStore } from '@/lib/store';
import { mnemonicToPrivateKey, privateKeyToAddress } from '@/lib/crypto';
import { getAddressInfo } from '@/lib/api';
import { ArrowLeft, Plus, Check, Loader2, Wallet, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

const SENTRI = 100_000_000;

interface Acc {
  index: number;
  address: string;
  balance: number | null;
}

export default function Accounts({ onBack }: { onBack: () => void }) {
  const { mnemonic, activeIndex, switchAccount, clearWallet } = useWalletStore();
  const [accounts, setAccounts] = useState<Acc[]>([]);
  const [busy, setBusy] = useState(false);
  // Pre-derive accounts 0..maxIndex on mount so user sees the active one
  // plus any previously generated; persisted maxIndex would require store
  // changes — for now derive 0..activeIndex to cover what user has used.

  const deriveRange = useCallback(async (from: number, to: number) => {
    if (!mnemonic) return [];
    const out: Acc[] = [];
    for (let i = from; i <= to; i++) {
      const pk = await mnemonicToPrivateKey(mnemonic, `m/44'/60'/0'/0/${i}`);
      const addr = privateKeyToAddress(pk);
      out.push({ index: i, address: addr, balance: null });
    }
    return out;
  }, [mnemonic]);

  useEffect(() => {
    if (!mnemonic) return;
    let cancelled = false;
    deriveRange(0, activeIndex).then(async (accs) => {
      if (cancelled) return;
      setAccounts(accs);
      // Lazy-load balances
      const withBalance = await Promise.all(accs.map(async (a) => {
        try {
          const info = await getAddressInfo(a.address);
          return { ...a, balance: info?.balance_sentri ?? Math.round((info?.balance_srx ?? 0) * SENTRI) };
        } catch {
          return a;
        }
      }));
      if (!cancelled) setAccounts(withBalance);
    });
    return () => { cancelled = true; };
  }, [mnemonic, activeIndex, deriveRange]);

  const addAccount = async () => {
    if (!mnemonic) return;
    setBusy(true);
    try {
      const nextIndex = accounts.length > 0 ? Math.max(...accounts.map((a) => a.index)) + 1 : 1;
      const pk = await mnemonicToPrivateKey(mnemonic, `m/44'/60'/0'/0/${nextIndex}`);
      const addr = privateKeyToAddress(pk);
      const newAcc: Acc = { index: nextIndex, address: addr, balance: null };
      setAccounts((prev) => [...prev, newAcc]);
      // Auto-switch to the freshly added account
      switchAccount(pk, addr, nextIndex);
      toast.success(`Added account #${nextIndex}`);
      // Fetch balance after
      try {
        const info = await getAddressInfo(addr);
        const bal = info?.balance_sentri ?? Math.round((info?.balance_srx ?? 0) * SENTRI);
        setAccounts((prev) => prev.map((a) => a.index === nextIndex ? { ...a, balance: bal } : a));
      } catch { /* ignore */ }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to derive');
    } finally {
      setBusy(false);
    }
  };

  const switchTo = async (acc: Acc) => {
    if (!mnemonic) return;
    if (acc.index === activeIndex) return;
    setBusy(true);
    try {
      const pk = await mnemonicToPrivateKey(mnemonic, `m/44'/60'/0'/0/${acc.index}`);
      switchAccount(pk, acc.address, acc.index);
      toast.success(`Switched to account #${acc.index}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Switch failed');
    } finally {
      setBusy(false);
    }
  };

  const truncate = (s: string) => s.slice(0, 8) + '…' + s.slice(-6);
  const formatBal = (sentri: number) =>
    (sentri / SENTRI).toLocaleString(undefined, { maximumFractionDigits: 4 });

  if (!mnemonic) {
    return (
      <div className="min-h-screen flex justify-center px-5 py-8">
        <div className="w-full max-w-sm">
          <button
            onClick={onBack}
            className="flex items-center gap-2 mb-6 text-xs font-mono uppercase tracking-wider text-[var(--tx-m)] hover:text-[var(--tx)] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="mb-6">
            <div className="eyebrow">Multi-account</div>
            <h1 className="font-serif text-3xl text-[var(--tx)] mt-1">Accounts</h1>
          </div>
          <div className="rounded-xl bg-[var(--sf)] border border-[var(--brd)] p-6 text-center">
            <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center bg-[var(--bk-2)] border border-[var(--brd)]">
              <Wallet className="w-5 h-5 text-[var(--tx-d)]" />
            </div>
            <p className="text-sm text-[var(--tx-2)]">No seed phrase loaded</p>
            <p className="text-[11px] text-[var(--tx-d)] mt-2 leading-relaxed max-w-[260px] mx-auto">
              Multi-account derivation requires a wallet imported via seed phrase or created with one. Wallets imported via raw private key or keystore JSON have no derivation tree.
            </p>
            <button
              onClick={() => {
                if (confirm('Lock current wallet and import a new one? You can re-import this wallet later if you have your seed phrase, private key, or keystore.')) {
                  clearWallet();
                  toast.success('Wallet locked');
                }
              }}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--gold)] text-[var(--bk)] hover:bg-[var(--gold-l)] transition-colors text-xs font-mono uppercase tracking-wider"
            >
              <Lock className="w-3.5 h-3.5" /> Lock &amp; import new
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex justify-center px-5 py-8">
      <div className="w-full max-w-sm">
        <button
          onClick={onBack}
          className="flex items-center gap-2 mb-6 text-xs font-mono uppercase tracking-wider text-[var(--tx-m)] hover:text-[var(--tx)] transition-colors animate-fade-up"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        <div className="flex items-end justify-between mb-6 animate-fade-up delay-1">
          <div>
            <div className="eyebrow">Multi-account</div>
            <h1 className="font-serif text-3xl text-[var(--tx)] mt-1">Accounts</h1>
          </div>
          <button
            onClick={addAccount}
            disabled={busy}
            className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--gold)] text-[var(--bk)] hover:bg-[var(--gold-l)] transition-colors active:scale-[0.99] disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>

        <p className="text-xs text-[var(--tx-m)] mb-4 leading-relaxed animate-fade-up delay-2">
          Each account is derived from the same seed phrase. Path: <span className="font-mono text-[var(--tx-2)]">m/44&apos;/60&apos;/0&apos;/0/N</span>
        </p>

        <div className="rounded-xl bg-[var(--sf)] border border-[var(--brd)] divide-y divide-[var(--brd)] overflow-hidden animate-fade-up delay-2">
          {accounts.map((acc) => {
            const isActive = acc.index === activeIndex;
            return (
              <button
                key={acc.index}
                onClick={() => switchTo(acc)}
                disabled={busy || isActive}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
                  isActive ? 'bg-[var(--gold-bg)]' : 'hover:bg-[var(--sf-2)]'
                }`}
              >
                <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  isActive
                    ? 'bg-[var(--gold)] text-[var(--bk)]'
                    : 'bg-[var(--gold-bg)] border border-[var(--gold-bg-s)] text-[var(--gold)]'
                }`}>
                  <span className="text-xs font-mono font-bold tab-num">#{acc.index}</span>
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--tx)] font-mono">{truncate(acc.address)}</p>
                  <p className="text-[10px] font-mono text-[var(--tx-d)] mt-0.5">
                    {acc.balance !== null ? `${formatBal(acc.balance)} SRX` : '—'}
                  </p>
                </div>
                {isActive && (
                  <span className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-[var(--gold-d)] shrink-0">
                    <Check className="w-3 h-3" /> Active
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="text-center text-[10px] mt-5 text-[var(--tx-d)] font-mono uppercase tracking-wider animate-fade-up delay-3">
          {accounts.length} account{accounts.length !== 1 ? 's' : ''} · Same seed phrase
        </p>
      </div>
    </div>
  );
}
