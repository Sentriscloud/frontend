'use client';

import { useState } from 'react';
import { useWalletStore } from '@/lib/store';
import { decryptVault, type Vault } from '@/lib/vault';
import { Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UnlockScreen({ vault }: { vault: Extract<Vault, { kind: 'encrypted' }> }) {
  const { unlock, clearWallet } = useWalletStore();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const truncate = (s: string) => s.slice(0, 6) + '…' + s.slice(-4);

  const handleUnlock = async () => {
    if (!password) return;
    setSubmitting(true);
    setError(null);
    try {
      const pt = await decryptVault(vault, password);
      unlock({
        privateKey: pt.privateKey,
        address: vault.address,
        mnemonic: pt.mnemonic ?? null,
        activeIndex: pt.activeIndex ?? 0,
      });
    } catch {
      setError('Wrong password');
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = () => {
    if (!window.confirm('Remove wallet from this device? Make sure you have your recovery phrase saved.')) return;
    clearWallet();
    toast.success('Wallet removed');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10 animate-fade-up">
          <div className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center bg-[var(--gold-bg)] text-[var(--gold)]">
            <Lock className="w-5 h-5" />
          </div>
          <h1 className="font-serif text-3xl text-[var(--tx)] tracking-tight mb-2">Welcome back</h1>
          <p className="text-[13px] font-mono text-[var(--tx-m)]">{truncate(vault.address)}</p>
        </div>

        <div className="space-y-3 animate-fade-up delay-1">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              placeholder="Enter password"
              className="w-full rounded-xl p-4 pr-11 text-[15px] bg-[var(--sf)] border border-[var(--brd)] text-[var(--tx)] placeholder:text-[var(--tx-d)] focus:outline-none focus:border-[var(--gold-d)] transition-colors"
              autoComplete="current-password"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleUnlock(); }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-[var(--tx-m)] hover:text-[var(--tx)] transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <p className="text-[12px] text-[var(--red)] text-center">{error}</p>
          )}

          <button
            onClick={handleUnlock}
            disabled={submitting || !password}
            className="w-full py-3.5 rounded-xl text-[14px] font-semibold bg-[var(--gold)] text-[var(--bk)] hover:bg-[var(--gold-l)] transition-colors active:scale-[0.99] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {submitting ? 'Unlocking…' : 'Unlock'}
          </button>
        </div>

        <div className="mt-10 text-center animate-fade-up delay-2">
          <button
            onClick={handleRemove}
            className="text-[12px] text-[var(--tx-m)] hover:text-[var(--red)] transition-colors"
          >
            Forgot password? Remove wallet
          </button>
        </div>
      </div>
    </div>
  );
}
