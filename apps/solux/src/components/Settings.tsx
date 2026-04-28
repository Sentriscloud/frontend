'use client';

import { useState } from 'react';
import { useWalletStore, useSettingsStore, NETWORKS, THEMES, type Network as NetworkId, type Theme } from '@/lib/store';
import { useEscape } from '@/lib/useEscape';
import { encryptKeystore } from '@/lib/keystore';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft, Lock, Eye, EyeOff, Globe, Network, Shield,
  Info, ExternalLink, Building2, AlertTriangle, ChevronRight, X, Check, FileLock2, Download,
  BookOpen, Layers, Palette, Copy, QrCode, Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';

const APP_VERSION = '0.1.0';
const LOCK_OPTIONS: Array<{ minutes: number; label: string }> = [
  { minutes: 0,    label: 'Never' },
  { minutes: 5,    label: '5 minutes' },
  { minutes: 15,   label: '15 minutes' },
  { minutes: 60,   label: '1 hour' },
  { minutes: 1440, label: '24 hours' },
];

type Sheet = 'none' | 'auto-lock' | 'reveal-key' | 'reveal-seed' | 'export-keystore' | 'network' | 'theme' | 'qr';

export default function Settings({
  onBack,
  onOpenAddressBook,
  onOpenAccounts,
  inline = false,
}: {
  onBack?: () => void;
  onOpenAddressBook?: () => void;
  onOpenAccounts?: () => void;
  inline?: boolean;
}) {
  const { address, privateKey, watchOnly, mnemonic, activeIndex, vault, lock, clearWallet } = useWalletStore();
  const {
    autoLockMinutes, hideBalances, network, theme,
    setAutoLockMinutes, setHideBalances, setNetwork, setTheme,
  } = useSettingsStore();
  const activeNet = NETWORKS[network];
  const activeTheme = THEMES[theme];

  const [sheet, setSheet] = useState<Sheet>('none');
  const [revealConfirm, setRevealConfirm] = useState(false);
  const [keyVisible, setKeyVisible] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [seedConfirm, setSeedConfirm] = useState(false);
  const [seedVisible, setSeedVisible] = useState(false);
  const [seedCopied, setSeedCopied] = useState(false);
  const [ksPwd, setKsPwd] = useState('');
  const [ksPwdConfirm, setKsPwdConfirm] = useState('');
  const [ksEncrypting, setKsEncrypting] = useState(false);
  const [addrCopied, setAddrCopied] = useState(false);

  const avatarChar = address ? address.slice(2, 3).toUpperCase() : 'S';
  const truncateLong = (s: string) => s.slice(0, 8) + '…' + s.slice(-6);

  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setAddrCopied(true);
    toast.success('Address copied');
    setTimeout(() => setAddrCopied(false), 1800);
  };

  const copySeed = async () => {
    if (!mnemonic) return;
    await navigator.clipboard.writeText(mnemonic);
    setSeedCopied(true);
    toast.success('Seed phrase copied');
    setTimeout(() => setSeedCopied(false), 2000);
    setTimeout(() => navigator.clipboard.writeText(''), 60_000);
  };

  const exportKeystore = async () => {
    if (!privateKey || !address) return;
    if (ksPwd.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (ksPwd !== ksPwdConfirm) {
      toast.error('Passwords do not match');
      return;
    }
    setKsEncrypting(true);
    try {
      const ks = await encryptKeystore(privateKey, ksPwd);
      const blob = new Blob([JSON.stringify(ks, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.href = url;
      a.download = `solux-keystore-${address.slice(2, 10)}-${ts}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Keystore downloaded');
      setKsPwd('');
      setKsPwdConfirm('');
      setSheet('none');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Encryption failed');
    } finally {
      setKsEncrypting(false);
    }
  };

  // Encrypted wallet: keep the vault, drop the in-memory key — refresh
  // hits the unlock screen. Watch-only or no vault: full wipe (vault is
  // just an address, no value in keeping it locked).
  const lockNow = () => {
    if (vault?.kind === 'encrypted') {
      lock();
      toast.success('Wallet locked');
    } else {
      clearWallet();
      toast.success(watchOnly ? 'Stopped watching' : 'Wallet removed');
    }
  };

  const truncate = (s: string) => s.slice(0, 6) + '…' + s.slice(-4);
  const lockLabel = LOCK_OPTIONS.find((o) => o.minutes === autoLockMinutes)?.label ?? `${autoLockMinutes} min`;

  const copyKey = async () => {
    if (!privateKey) return;
    await navigator.clipboard.writeText(privateKey);
    setKeyCopied(true);
    toast.success('Key copied');
    setTimeout(() => setKeyCopied(false), 2000);
    setTimeout(() => navigator.clipboard.writeText(''), 60_000);
  };

  return (
    <div className={inline ? 'flex justify-center px-5 pt-6 pb-32' : 'min-h-screen flex justify-center px-5 py-8'}>
      <div className="w-full max-w-sm">
        {!inline && onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 mb-6 text-xs font-mono uppercase tracking-wider text-[var(--tx-m)] hover:text-[var(--tx)] transition-colors animate-fade-up"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        )}

        {/* Identity hero — merged from Profile. Avatar uses the same
            gradient-gold disc as Dashboard so the brand reads as one
            single coin face across surfaces. */}
        <div className="text-center mb-7 animate-fade-up">
          <div className="relative inline-block mb-3">
            <div
              className="absolute inset-0 rounded-full -m-2 opacity-60 blur-2xl"
              style={{ background: 'radial-gradient(circle, rgba(244, 199, 94, 0.5) 0%, transparent 70%)' }}
              aria-hidden
            />
            <button
              onClick={() => mnemonic && onOpenAccounts?.()}
              disabled={!mnemonic}
              aria-label={mnemonic ? 'Switch account' : 'Wallet identity'}
              className="grad-avatar relative w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl text-[#3a2a0e] group disabled:cursor-default transition-all active:scale-[0.98]"
            >
              {avatarChar}
              {mnemonic && (
                <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[var(--gold)] ring-[3px] ring-[var(--bk)] flex items-center justify-center text-[var(--bk)] group-hover:bg-[var(--gold-l)] transition-colors">
                  <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                </span>
              )}
            </button>
          </div>
          <p className="text-[12px] font-medium text-[var(--tx-m)] mb-1">
            {watchOnly ? 'Watch-only' : `Account ${activeIndex + 1}`}
          </p>
          <h1 className="text-[24px] font-bold text-[var(--tx)] mb-3 leading-tight">
            {watchOnly ? 'Address watcher' : `Wallet ${activeIndex + 1}`}
          </h1>
          <button
            onClick={copyAddress}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bk-2)] border border-[var(--brd)] text-[12px] font-mono text-[var(--tx-2)] hover:bg-[var(--sf-2)] hover:text-[var(--gold)] hover:border-[var(--gold-bg-s)] transition-all"
          >
            {address ? truncateLong(address) : '—'}
            {addrCopied ? <Check className="w-3 h-3 text-[var(--gold)]" /> : <Copy className="w-3 h-3" />}
          </button>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => setSheet('qr')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--sf)] border border-[var(--brd)] text-[12px] font-semibold text-[var(--tx)] hover:bg-[var(--sf-2)] hover:border-[var(--gold-bg-s)] transition-all active:scale-[0.97]"
            >
              <QrCode className="w-3.5 h-3.5" /> QR
            </button>
            <button
              onClick={lockNow}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--red-bg)] border border-[var(--red)]/30 text-[12px] font-semibold text-[var(--red)] hover:bg-[var(--red)] hover:text-white hover:border-[var(--red)] transition-all active:scale-[0.97]"
            >
              <Lock className="w-3.5 h-3.5" /> {watchOnly ? 'Stop' : 'Lock'}
            </button>
          </div>
        </div>

        {/* Wallet section */}
        <Section label="Wallet" delay={2}>
          <Row
            icon={<Eye className="w-3.5 h-3.5" />}
            title={truncate(address ?? '—')}
            subtitle={watchOnly ? 'Watch-only (no key)' : 'Active address'}
            mono
          />
          <Toggle
            icon={hideBalances ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            title="Privacy mode"
            subtitle="Mask balances and amounts"
            value={hideBalances}
            onChange={setHideBalances}
          />
          {!watchOnly && (
            <Row
              icon={<Lock className="w-3.5 h-3.5" />}
              title="Auto-lock"
              subtitle="Clear key from memory when idle"
              value={lockLabel}
              onClick={() => setSheet('auto-lock')}
              chevron
            />
          )}
          <Row
            icon={<BookOpen className="w-3.5 h-3.5" />}
            title="Address book"
            subtitle="Saved recipients with labels"
            onClick={onOpenAddressBook}
            chevron
          />
          {mnemonic ? (
            <Row
              icon={<Layers className="w-3.5 h-3.5" />}
              title="Accounts"
              subtitle="Add or switch accounts from seed"
              onClick={onOpenAccounts}
              chevron
            />
          ) : (
            <Row
              icon={<Plus className="w-3.5 h-3.5" />}
              title="Add another wallet"
              subtitle="Lock current and import a new seed or key"
              onClick={() => {
                if (confirm('Lock current wallet and import a new one? You can re-import this wallet later if you have your seed phrase, private key, or keystore.')) {
                  lockNow();
                }
              }}
              chevron
            />
          )}
        </Section>

        {/* Security section — watch-only wallet has nothing to back up */}
        {!watchOnly && (
          <Section label="Security" delay={3}>
            <Row
              icon={<FileLock2 className="w-3.5 h-3.5" />}
              title="Export keystore"
              subtitle="Encrypted JSON backup (MetaMask-compatible)"
              onClick={() => { setKsPwd(''); setKsPwdConfirm(''); setSheet('export-keystore'); }}
              chevron
            />
            {mnemonic && (
              <Row
                icon={<Shield className="w-3.5 h-3.5" />}
                title="Reveal seed phrase"
                subtitle="12-word recovery phrase backup"
                onClick={() => { setSeedConfirm(false); setSeedVisible(false); setSheet('reveal-seed'); }}
                chevron
                danger
              />
            )}
            <Row
              icon={<Shield className="w-3.5 h-3.5" />}
              title="Reveal private key"
              subtitle="Show your key for backup"
              onClick={() => { setRevealConfirm(false); setKeyVisible(false); setSheet('reveal-key'); }}
              chevron
              danger
            />
            <Row
              icon={<Lock className="w-3.5 h-3.5" />}
              title="Lock wallet now"
              subtitle="Remove key from this session"
              onClick={lockNow}
              chevron
            />
          </Section>
        )}
        {watchOnly && (
          <Section label="Wallet management" delay={3}>
            <Row
              icon={<Lock className="w-3.5 h-3.5" />}
              title="Stop watching"
              subtitle="Remove this address from the session"
              onClick={lockNow}
              chevron
            />
          </Section>
        )}

        {/* Appearance section */}
        <Section label="Appearance" delay={3}>
          <Row
            icon={<Palette className="w-3.5 h-3.5" />}
            title="Theme"
            subtitle={activeTheme.description}
            value={activeTheme.label}
            onClick={() => setSheet('theme')}
            chevron
          />
        </Section>

        {/* Network section */}
        <Section label="Network" delay={4}>
          <Row
            icon={<Network className="w-3.5 h-3.5" />}
            title={`Sentrix ${activeNet.label}`}
            subtitle={`Chain ID ${activeNet.chainId} · Tap to switch`}
            value={activeNet.label}
            valueClass={activeNet.accent === 'teal' ? 'text-[#5eead4]' : 'text-[var(--gold)]'}
            onClick={() => setSheet('network')}
            chevron
          />
          <Row
            icon={<Globe className="w-3.5 h-3.5" />}
            title="API endpoint"
            subtitle={activeNet.apiUrl.replace('https://', '')}
            href={`${activeNet.apiUrl}/chain/info`}
          />
        </Section>

        {/* About */}
        <Section label="About" delay={4}>
          <Row
            icon={<Info className="w-3.5 h-3.5" />}
            title="Version"
            subtitle="Solux build"
            value={APP_VERSION}
          />
          <Row
            icon={<ExternalLink className="w-3.5 h-3.5" />}
            title="Sentrix Chain"
            subtitle="Protocol website & docs"
            href="https://sentrixchain.com"
          />
          <Row
            icon={<Building2 className="w-3.5 h-3.5" />}
            title="SentrisCloud"
            subtitle="Brand & products"
            href="https://sentriscloud.com"
          />
        </Section>

        <p className="text-center text-[10px] mt-6 mb-2 text-[var(--tx-d)] font-mono uppercase tracking-wider animate-fade-up delay-4">
          Solux · v{APP_VERSION} · Sentrix Chain
        </p>
      </div>

      {/* ── Auto-lock sheet ───────────────────────── */}
      {sheet === 'auto-lock' && (
        <Sheet onClose={() => setSheet('none')} eyebrow="Security" title="Auto-lock timer">
          <p className="text-[13px] text-[var(--tx-m)] leading-relaxed">
            After this much idle time, your key is removed from memory. The encrypted vault stays on this device — you&apos;ll just need to enter your password again.
          </p>
          <div className="rounded-xl bg-[var(--bk-2)] border border-[var(--brd)] divide-y divide-[var(--brd)]">
            {LOCK_OPTIONS.map((opt) => (
              <button
                key={opt.minutes}
                onClick={() => { setAutoLockMinutes(opt.minutes); setSheet('none'); toast.success('Updated'); }}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--sf-2)] transition-colors"
              >
                <span className="text-sm text-[var(--tx)]">{opt.label}</span>
                {autoLockMinutes === opt.minutes && (
                  <Check className="w-4 h-4 text-[var(--gold)]" />
                )}
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {/* ── Export keystore sheet ─────────────────── */}
      {sheet === 'export-keystore' && (
        <Sheet onClose={() => setSheet('none')} eyebrow="Backup" title="Export keystore">
          <p className="text-xs text-[var(--tx-m)] leading-relaxed">
            Pick a strong password. Anyone with this file <em>and</em> password can restore your wallet, so treat it like cash. The file works in MetaMask, Geth, and any v3-compatible wallet.
          </p>

          <div>
            <label className="eyebrow block mb-2">New password</label>
            <input
              type="password"
              value={ksPwd}
              onChange={(e) => setKsPwd(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full rounded-lg p-3 text-sm bg-[var(--bk-2)] border border-[var(--brd)] text-[var(--tx)] placeholder:text-[var(--tx-d)] focus:outline-none focus:border-[var(--gold-d)] transition-colors"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="eyebrow block mb-2">Confirm password</label>
            <input
              type="password"
              value={ksPwdConfirm}
              onChange={(e) => setKsPwdConfirm(e.target.value)}
              placeholder="Re-enter the same password"
              className="w-full rounded-lg p-3 text-sm bg-[var(--bk-2)] border border-[var(--brd)] text-[var(--tx)] placeholder:text-[var(--tx-d)] focus:outline-none focus:border-[var(--gold-d)] transition-colors"
              autoComplete="new-password"
              onKeyDown={(e) => { if (e.key === 'Enter') exportKeystore(); }}
            />
          </div>

          <button
            onClick={exportKeystore}
            disabled={ksEncrypting || !ksPwd || !ksPwdConfirm}
            className="w-full py-3 rounded-lg text-sm font-semibold bg-[var(--gold)] text-[var(--bk)] hover:bg-[var(--gold-l)] transition-colors active:scale-[0.99] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {ksEncrypting ? (
              <>Encrypting…</>
            ) : (
              <><Download className="w-4 h-4" /> Encrypt &amp; download</>
            )}
          </button>
          <p className="text-[10px] text-[var(--tx-d)] text-center font-mono">
            Scrypt n=131072 · ≈1-2s on phones · stronger than PBKDF2
          </p>
        </Sheet>
      )}

      {/* ── Reveal private key sheet ──────────────── */}
      {sheet === 'reveal-key' && (
        <Sheet onClose={() => setSheet('none')} eyebrow="Backup" title="Reveal private key">
          {!revealConfirm ? (
            <>
              <div className="rounded-lg p-4 flex gap-3 bg-[var(--red-bg)] border border-[var(--red)]/30">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[var(--red)]" />
                <div className="text-xs leading-relaxed text-[var(--tx-2)]">
                  <p className="font-medium text-[var(--tx)] mb-1">Anyone with this key controls your wallet.</p>
                  <p>Make sure you&apos;re alone, no shoulder surfers, no screen recording. Solux will never ask you for this.</p>
                </div>
              </div>
              <button
                onClick={() => setRevealConfirm(true)}
                className="w-full py-3 rounded-lg text-sm font-semibold bg-[var(--red)] text-white hover:opacity-90 transition-opacity active:scale-[0.99]"
              >
                I understand, show key
              </button>
              <button
                onClick={() => setSheet('none')}
                className="w-full py-3 rounded-lg text-sm font-medium bg-[var(--bk-2)] border border-[var(--brd)] text-[var(--tx-2)] hover:bg-[var(--sf-2)] transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-medium text-[var(--tx-m)]">Private key</span>
                  <button
                    onClick={() => setKeyVisible((v) => !v)}
                    className="text-[10px] font-mono uppercase tracking-wider flex items-center gap-1 text-[var(--gold)] hover:text-[var(--gold-l)] transition-colors"
                  >
                    {keyVisible ? <><EyeOff className="w-3 h-3" /> Hide</> : <><Eye className="w-3 h-3" /> Show</>}
                  </button>
                </div>
                <div className="rounded-lg p-3 font-mono text-[11px] break-all bg-[var(--bk-2)] border border-[var(--brd)] text-[var(--tx)] leading-relaxed min-h-[5rem]">
                  {keyVisible ? (privateKey ?? '—') : '•'.repeat(64)}
                </div>
              </div>
              <button
                onClick={copyKey}
                className="w-full py-3 rounded-lg text-sm font-semibold bg-[var(--gold)] text-[var(--bk)] hover:bg-[var(--gold-l)] transition-colors active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {keyCopied ? <><Check className="w-4 h-4" /> Copied to clipboard</> : 'Copy to clipboard'}
              </button>
              <p className="text-[10px] text-[var(--tx-d)] text-center font-mono">
                Clipboard auto-clears in 60 seconds
              </p>
            </>
          )}
        </Sheet>
      )}

      {/* ── Reveal seed phrase sheet ────────────── */}
      {sheet === 'reveal-seed' && mnemonic && (
        <Sheet onClose={() => setSheet('none')} eyebrow="Backup" title="Reveal seed phrase">
          {!seedConfirm ? (
            <>
              <div className="rounded-lg p-4 flex gap-3 bg-[var(--red-bg)] border border-[var(--red)]/30">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[var(--red)]" />
                <div className="text-xs leading-relaxed text-[var(--tx-2)]">
                  <p className="font-medium text-[var(--tx)] mb-1">Anyone with these 12 words controls all derived accounts.</p>
                  <p>Make sure you&apos;re alone, no shoulder surfers, no screen recording. Solux will never ask you to type these into a website or chat.</p>
                </div>
              </div>
              <button
                onClick={() => setSeedConfirm(true)}
                className="w-full py-3 rounded-lg text-sm font-semibold bg-[var(--red)] text-white hover:opacity-90 transition-opacity active:scale-[0.99]"
              >
                I understand, show phrase
              </button>
              <button
                onClick={() => setSheet('none')}
                className="w-full py-3 rounded-lg text-sm font-medium bg-[var(--bk-2)] border border-[var(--brd)] text-[var(--tx-2)] hover:bg-[var(--sf-2)] transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-medium text-[var(--tx-m)]">Recovery phrase</span>
                  <button
                    onClick={() => setSeedVisible((v) => !v)}
                    className="text-[10px] font-mono uppercase tracking-wider flex items-center gap-1 text-[var(--gold)] hover:text-[var(--gold-l)] transition-colors"
                  >
                    {seedVisible ? <><EyeOff className="w-3 h-3" /> Hide</> : <><Eye className="w-3 h-3" /> Show</>}
                  </button>
                </div>
                {seedVisible ? (
                  <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-[var(--bk-2)] border border-[var(--brd)] p-3">
                    {mnemonic.split(' ').map((word, i) => (
                      <div key={i} className="flex items-baseline gap-1.5 px-2 py-1.5 rounded bg-[var(--sf)] border border-[var(--brd)]">
                        <span className="text-[10px] font-mono text-[var(--tx-d)] tab-num w-3.5 text-right shrink-0">{i + 1}</span>
                        <span className="text-xs font-mono text-[var(--tx)] truncate">{word}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg p-3 font-mono text-[11px] break-all bg-[var(--bk-2)] border border-[var(--brd)] text-[var(--tx-d)] leading-relaxed min-h-[6rem] flex items-center justify-center">
                    {'•'.repeat(48)}
                  </div>
                )}
              </div>
              <button
                onClick={copySeed}
                className="w-full py-3 rounded-lg text-sm font-semibold bg-[var(--gold)] text-[var(--bk)] hover:bg-[var(--gold-l)] transition-colors active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {seedCopied ? <><Check className="w-4 h-4" /> Copied to clipboard</> : 'Copy to clipboard'}
              </button>
              <p className="text-[10px] text-[var(--tx-d)] text-center font-mono">
                Clipboard auto-clears in 60 seconds · Path m/44&apos;/60&apos;/0&apos;/0/N
              </p>
            </>
          )}
        </Sheet>
      )}

      {/* ── Theme picker sheet ────────────── */}
      {sheet === 'theme' && (
        <Sheet onClose={() => setSheet('none')} eyebrow="Appearance" title="Choose theme">
          <p className="text-xs text-[var(--tx-m)] leading-relaxed">
            Pick a color scheme. Applied instantly across the wallet.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(THEMES) as Theme[]).map((id) => {
              const t = THEMES[id];
              const active = id === theme;
              return (
                <button
                  key={id}
                  onClick={() => {
                    setTheme(id);
                    toast.success(`${t.label} theme applied`);
                    setSheet('none');
                  }}
                  className={`group relative rounded-xl overflow-hidden border transition-all text-left ${
                    active
                      ? 'border-[var(--gold)] shadow-[0_0_0_2px_var(--gold-bg-s)]'
                      : 'border-[var(--brd)] hover:border-[var(--brd-s)]'
                  }`}
                >
                  {/* Theme preview */}
                  <div
                    className="h-20 p-3 flex flex-col justify-between"
                    style={{ background: t.preview.bg }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: t.preview.accent }}
                      />
                      <span
                        className="text-[10px] font-mono uppercase tracking-wider"
                        style={{ color: t.preview.text, opacity: 0.7 }}
                      >
                        Solux
                      </span>
                    </div>
                    <div
                      className="rounded-md px-2 py-1.5"
                      style={{ background: t.preview.surface }}
                    >
                      <div
                        className="h-1 w-8 rounded-full mb-1"
                        style={{ background: t.preview.accent, opacity: 0.7 }}
                      />
                      <div
                        className="h-1 w-12 rounded-full"
                        style={{ background: t.preview.text, opacity: 0.4 }}
                      />
                    </div>
                  </div>
                  <div className="bg-[var(--sf)] px-3 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-[var(--tx)]">{t.label}</p>
                    </div>
                    {active && (
                      <span className="w-5 h-5 rounded-full bg-[var(--gold)] flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-[var(--bk)]" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Sheet>
      )}

      {/* ── Receive QR sheet ──────────────── */}
      {sheet === 'qr' && address && (
        <Sheet onClose={() => setSheet('none')} eyebrow="Receive on" title={`Sentrix ${activeNet.label}`}>
          <p className="text-xs text-[var(--tx-m)] leading-relaxed">
            Share this address or QR code to receive SRX. Chain ID {activeNet.chainId}.
          </p>
          <div className="flex justify-center">
            <div className="rounded-lg bg-[var(--bk)] border border-[var(--brd)] p-4">
              <QRCodeSVG
                value={address}
                size={180}
                bgColor="transparent"
                fgColor="#f1f1f3"
                level="M"
              />
            </div>
          </div>
          <p className="text-[11px] font-mono text-[var(--tx-d)] text-center break-all">
            {address}
          </p>
          <button
            onClick={copyAddress}
            className="w-full py-3 rounded-lg text-sm font-semibold bg-[var(--gold)] text-[var(--bk)] hover:bg-[var(--gold-l)] transition-colors active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {addrCopied ? <><Check className="w-4 h-4" /> Copied to clipboard</> : <><Copy className="w-4 h-4" /> Copy address</>}
          </button>
        </Sheet>
      )}

      {/* ── Network switch sheet ────────────── */}
      {sheet === 'network' && (
        <Sheet onClose={() => setSheet('none')} eyebrow="Network" title="Switch network">
          <p className="text-xs text-[var(--tx-m)] leading-relaxed">
            Same wallet keys, different chain. Mainnet holds real SRX. Testnet is for testing — balances and history reset on chain resets.
          </p>
          <div className="rounded-xl bg-[var(--bk-2)] border border-[var(--brd)] divide-y divide-[var(--brd)] overflow-hidden">
            {(Object.keys(NETWORKS) as NetworkId[]).map((id) => {
              const n = NETWORKS[id];
              const active = id === network;
              const tealText = 'text-[#5eead4]';
              return (
                <button
                  key={id}
                  onClick={() => {
                    setNetwork(id);
                    toast.success(`Switched to ${n.label}`);
                    setSheet('none');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
                    active ? 'bg-[var(--sf-2)]' : 'hover:bg-[var(--sf-2)]'
                  }`}
                >
                  <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                    n.accent === 'teal'
                      ? 'bg-[rgba(45,212,191,0.10)] border-[rgba(45,212,191,0.3)] text-[#5eead4]'
                      : 'bg-[var(--gold-bg)] border-[var(--gold-bg-s)] text-[var(--gold)]'
                  }`}>
                    <Network className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${n.accent === 'teal' ? tealText : 'text-[var(--tx)]'}`}>
                      Sentrix {n.label}
                    </p>
                    <p className="text-[10px] font-mono text-[var(--tx-d)] mt-0.5">
                      Chain {n.chainId} · {n.apiUrl.replace('https://', '')}
                    </p>
                  </div>
                  {active && (
                    <Check className={`w-4 h-4 shrink-0 ${n.accent === 'teal' ? tealText : 'text-[var(--gold)]'}`} />
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-[var(--tx-d)] text-center font-mono">
            Your wallet keys work on both networks
          </p>
        </Sheet>
      )}
    </div>
  );
}

// ── Building blocks ──────────────────────────────────────

function Section({ label, delay, children }: { label: string; delay: number; children: React.ReactNode }) {
  return (
    <section className={`mb-5 animate-fade-up delay-${delay}`}>
      <h2 className="text-[13px] font-semibold text-[var(--tx-m)] mb-2 px-1">{label}</h2>
      <div className="rounded-2xl bg-[var(--sf)] border border-[var(--brd)] divide-y divide-[var(--brd)] overflow-hidden">
        {children}
      </div>
    </section>
  );
}

function Row({
  icon, title, subtitle, value, valueClass, onClick, href, chevron, danger, mono,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  value?: string;
  valueClass?: string;
  onClick?: () => void;
  href?: string;
  chevron?: boolean;
  danger?: boolean;
  mono?: boolean;
}) {
  const inner = (
    <>
      <span className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 border ${
        danger
          ? 'bg-[var(--red-bg)] border-[var(--red)]/30 text-[var(--red)]'
          : 'bg-[var(--gold-bg)] border-[var(--gold-bg-s)] text-[var(--gold)]'
      }`}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${danger ? 'text-[var(--red)]' : 'text-[var(--tx)]'} ${mono ? 'font-mono' : ''} truncate`}>
          {title}
        </p>
        {subtitle && (
          <p className="text-[11px] text-[var(--tx-d)] truncate mt-0.5">{subtitle}</p>
        )}
      </div>
      {value && (
        <span className={`text-xs font-mono shrink-0 ${valueClass ?? 'text-[var(--tx-m)]'}`}>{value}</span>
      )}
      {(chevron || href) && (
        <ChevronRight className="w-4 h-4 text-[var(--tx-d)] shrink-0" />
      )}
    </>
  );

  const className = `w-full flex items-center gap-3 px-4 py-3 transition-colors ${onClick || href ? 'hover:bg-[var(--sf-2)] active:scale-[0.99]' : ''} text-left`;

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{inner}</a>
    );
  }
  if (onClick) {
    return <button onClick={onClick} className={className}>{inner}</button>;
  }
  return <div className={className}>{inner}</div>;
}

function Toggle({
  icon, title, subtitle, value, onChange,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--sf-2)] transition-colors text-left"
    >
      <span className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-[var(--gold-bg)] border border-[var(--gold-bg-s)] text-[var(--gold)]">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--tx)]">{title}</p>
        {subtitle && <p className="text-[11px] text-[var(--tx-d)] mt-0.5">{subtitle}</p>}
      </div>
      <span
        className={`relative w-9 h-5 rounded-full shrink-0 transition-colors ${
          value ? 'bg-[var(--gold)]' : 'bg-[var(--sf-3)]'
        }`}
        aria-hidden
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
            value ? 'translate-x-[1.125rem]' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  );
}

function Sheet({
  onClose, eyebrow, title, children,
}: {
  onClose: () => void; eyebrow: string; title: string; children: React.ReactNode;
}) {
  useEscape(true, onClose);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden bg-[var(--sf)] border border-[var(--brd)] animate-fade-up max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between px-6 pt-6 pb-3 sticky top-0 bg-[var(--sf)] z-10">
          <div>
            <p className="text-[12px] font-medium text-[var(--tx-m)] mb-0.5">{eyebrow}</p>
            <h2 className="text-[20px] font-bold text-[var(--tx)] leading-tight tracking-tight">{title}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--sf-2)] transition-colors -mr-1.5"
          >
            <X className="w-4 h-4 text-[var(--tx-m)]" />
          </button>
        </div>
        <div className="px-6 pb-6 pt-3 space-y-3">{children}</div>
      </div>
    </div>
  );
}
