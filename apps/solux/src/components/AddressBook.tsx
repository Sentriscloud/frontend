'use client';

import { useState } from 'react';
import { useAddressBookStore } from '@/lib/store';
import { isValidAddress } from '@/lib/crypto';
import { useEscape } from '@/lib/useEscape';
import { ArrowLeft, Plus, BookOpen, Trash2, X, Edit3, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AddressBook({ onBack }: { onBack: () => void }) {
  const { entries, add, remove } = useAddressBookStore();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [addr, setAddr] = useState('');
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');

  const reset = () => { setAddr(''); setLabel(''); setNote(''); setShowAdd(false); setEditing(null); };
  useEscape(showAdd, reset);

  const startEdit = (a: string) => {
    const e = entries.find((x) => x.address === a);
    if (!e) return;
    setAddr(e.address);
    setLabel(e.label);
    setNote(e.note ?? '');
    setEditing(a);
    setShowAdd(true);
  };

  const save = () => {
    const cleanAddr = addr.trim().toLowerCase();
    const cleanLabel = label.trim();
    if (!isValidAddress(cleanAddr)) { toast.error('Invalid address'); return; }
    if (!cleanLabel) { toast.error('Label required'); return; }
    add(cleanAddr, cleanLabel, note.trim() || undefined);
    toast.success(editing ? 'Entry updated' : 'Entry added');
    reset();
  };

  const truncate = (s: string) => s.slice(0, 8) + '…' + s.slice(-6);

  return (
    <div className="min-h-screen flex justify-center px-5 py-8">
      <div className="w-full max-w-sm">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 mb-6 text-[13px] text-[var(--tx-m)] hover:text-[var(--tx)] transition-colors animate-fade-up"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-end justify-between mb-6 animate-fade-up delay-1">
          <h1 className="text-[22px] font-bold text-[var(--tx)]">Address book</h1>
          <button
            onClick={() => setShowAdd(true)}
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--gold)] text-[#3a2a0e] hover:bg-[var(--gold-l)] transition-colors active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        <div className="rounded-2xl bg-[var(--sf)] border border-[var(--brd)] overflow-hidden animate-fade-up delay-2">
          {entries.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center bg-[var(--gold-bg)]">
                <BookOpen className="w-5 h-5 text-[var(--gold)]" />
              </div>
              <p className="text-[14px] font-semibold text-[var(--tx)]">No saved recipients</p>
              <p className="text-[12px] text-[var(--tx-m)] mt-1.5">Tap + to add an address with a label</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--brd)]">
              {entries.map((e) => (
                <div key={e.address} className="px-4 py-3.5 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-[var(--tx)]">{e.label}</p>
                    <p className="text-[12px] font-mono text-[var(--tx-m)] truncate mt-0.5">{truncate(e.address)}</p>
                    {e.note && (
                      <p className="text-[12px] text-[var(--tx-m)] mt-1 italic">{e.note}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(e.address)}
                      aria-label="Edit"
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--sf-2)] transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[var(--tx-m)]" />
                    </button>
                    <button
                      onClick={() => { remove(e.address); toast.success('Removed'); }}
                      aria-label="Delete"
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--red-bg)] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-[var(--red)]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-[12px] mt-5 text-[var(--tx-m)] animate-fade-up delay-3">
          Stored locally · Never sent on-chain
        </p>
      </div>

      {/* Add / Edit sheet */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70">
          <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden bg-[var(--sf)] border border-[var(--brd)] animate-fade-up">
            <div className="flex items-start justify-between px-6 pt-6 pb-3">
              <h2 className="text-[20px] font-bold text-[var(--tx)] tracking-tight">
                {editing ? 'Edit recipient' : 'Add recipient'}
              </h2>
              <button onClick={reset} aria-label="Close" className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--sf-2)] transition-colors -mr-1.5">
                <X className="w-4 h-4 text-[var(--tx-m)]" />
              </button>
            </div>

            <div className="px-5 pb-6 space-y-4">
              <div>
                <label className="text-[13px] font-medium text-[var(--tx-2)] block mb-2">Address</label>
                <input
                  value={addr}
                  onChange={(e) => setAddr(e.target.value)}
                  placeholder="0x…"
                  disabled={!!editing}
                  className="w-full rounded-lg p-3 text-xs font-mono bg-[var(--bk-2)] border border-[var(--brd)] text-[var(--tx)] placeholder:text-[var(--tx-d)] focus:outline-none focus:border-[var(--gold-d)] transition-colors disabled:opacity-60"
                />
              </div>
              <div>
                <label className="text-[13px] font-medium text-[var(--tx-2)] block mb-2">Label</label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Cold storage, Faucet wallet, etc"
                  className="w-full rounded-lg p-3 text-sm bg-[var(--bk-2)] border border-[var(--brd)] text-[var(--tx)] placeholder:text-[var(--tx-d)] focus:outline-none focus:border-[var(--gold-d)] transition-colors"
                />
              </div>
              <div>
                <label className="text-[13px] font-medium text-[var(--tx-2)] block mb-2">Note (optional)</label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Anything you want to remember"
                  className="w-full rounded-lg p-3 text-sm bg-[var(--bk-2)] border border-[var(--brd)] text-[var(--tx)] placeholder:text-[var(--tx-d)] focus:outline-none focus:border-[var(--gold-d)] transition-colors"
                />
              </div>
              <button
                onClick={save}
                className="w-full py-3 rounded-lg text-sm font-semibold bg-[var(--gold)] text-[var(--bk)] hover:bg-[var(--gold-l)] transition-colors active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                {editing ? 'Save changes' : 'Add to address book'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
