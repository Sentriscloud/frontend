'use client';

import { useState } from 'react';
import { useWalletStore } from '@/lib/store';
import { encryptVault, saveVault, saveWatchVault } from '@/lib/vault';
import {
  generatePrivateKey, privateKeyToAddress, isValidPrivateKey,
  generateMnemonic, isValidMnemonic, mnemonicToPrivateKey,
} from '@/lib/crypto';
import { decryptKeystore, isValidKeystoreJson } from '@/lib/keystore';
import { isValidAddress } from '@/lib/crypto';
import { useEscape } from '@/lib/useEscape';
import {
  Plus, FileText, KeyRound, FileLock2, Eye, EyeOff, Cpu, AlertTriangle, Copy, Check, X, ChevronRight, ArrowLeft, Upload, Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';

type Modal = 'none' | 'create' | 'import-seed' | 'import-key' | 'import-keystore' | 'watch' | 'set-password';

interface PendingWallet {
  privateKey: string;
  address: string;
  mnemonic?: string;
  activeIndex?: number;
}

export default function WalletSetup() {
  const [modal, setModal] = useState<Modal>('none');
  const [pending, setPending] = useState<PendingWallet | null>(null);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [encrypting, setEncrypting] = useState(false);

  // Create-wallet flow state (mnemonic-based)
  const [genMnemonic, setGenMnemonic] = useState('');
  const [genAddress, setGenAddress] = useState('');
  const [savedConfirm, setSavedConfirm] = useState(false);
  const [copiedMnemonic, setCopiedMnemonic] = useState(false);

  // Import seed phrase
  const [seedInput, setSeedInput] = useState('');
  const [seedDeriving, setSeedDeriving] = useState(false);

  // Import private key
  const [keyInput, setKeyInput] = useState('');
  const [keyPreviewAddr, setKeyPreviewAddr] = useState('');

  // Import keystore JSON
  const [keystoreJson, setKeystoreJson] = useState('');
  const [keystorePassword, setKeystorePassword] = useState('');
  const [keystoreFileName, setKeystoreFileName] = useState('');
  const [keystoreDecrypting, setKeystoreDecrypting] = useState(false);

  // Watch-only address
  const [watchInput, setWatchInput] = useState('');

  const { unlock, setVault } = useWalletStore();

  // After any successful key derivation (create / seed-import / pk-import /
  // keystore), we route to the password-set modal instead of unlocking
  // directly. The user picks a vault password, we encrypt+persist, and only
  // then put the key into in-memory store. This is what makes "refresh
  // doesn't lose the wallet" work.
  const beginPasswordSetup = (p: PendingWallet) => {
    setPending(p);
    setPassword('');
    setPasswordConfirm('');
    setModal('set-password');
  };

  const openCreate = async () => {
    const mnemonic = generateMnemonic();
    const privKey = await mnemonicToPrivateKey(mnemonic);
    setGenMnemonic(mnemonic);
    setGenAddress(privateKeyToAddress(privKey));
    setSavedConfirm(false);
    setCopiedMnemonic(false);
    setModal('create');
  };

  const handleCreateConfirm = async () => {
    if (!genMnemonic || !savedConfirm) return;
    const privKey = await mnemonicToPrivateKey(genMnemonic);
    beginPasswordSetup({
      privateKey: privKey,
      address: privateKeyToAddress(privKey),
      mnemonic: genMnemonic,
      activeIndex: 0,
    });
  };

  const handleSeedImport = async () => {
    const phrase = seedInput.trim().split(/\s+/).join(' ');
    if (!isValidMnemonic(phrase)) {
      toast.error('Invalid seed phrase');
      return;
    }
    setSeedDeriving(true);
    try {
      const privKey = await mnemonicToPrivateKey(phrase);
      beginPasswordSetup({
        privateKey: privKey,
        address: privateKeyToAddress(privKey),
        mnemonic: phrase,
        activeIndex: 0,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Derivation failed');
    } finally {
      setSeedDeriving(false);
    }
  };

  const handleKeyImport = () => {
    const key = keyInput.trim().replace(/^0x/, '');
    if (!isValidPrivateKey(key)) {
      toast.error('Invalid private key');
      return;
    }
    beginPasswordSetup({
      privateKey: key,
      address: privateKeyToAddress(key),
    });
  };

  const handleKeyPreview = () => {
    const key = keyInput.trim().replace(/^0x/, '');
    if (!isValidPrivateKey(key)) { toast.error('Invalid private key'); return; }
    setKeyPreviewAddr(privateKeyToAddress(key));
  };

  const handleKeystoreFile = async (file: File) => {
    const text = await file.text();
    if (!isValidKeystoreJson(text)) {
      toast.error('Not a valid v3 keystore file');
      return;
    }
    setKeystoreJson(text);
    setKeystoreFileName(file.name);
  };

  const handleKeystoreImport = async () => {
    if (!keystoreJson || !keystorePassword) {
      toast.error('Pick a file and enter password');
      return;
    }
    setKeystoreDecrypting(true);
    try {
      const privKey = await decryptKeystore(keystoreJson, keystorePassword);
      beginPasswordSetup({
        privateKey: privKey,
        address: privateKeyToAddress(privKey),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Decryption failed');
    } finally {
      setKeystoreDecrypting(false);
    }
  };

  const copyMnemonic = async () => {
    await navigator.clipboard.writeText(genMnemonic);
    setCopiedMnemonic(true);
    toast.success('Phrase copied');
    setTimeout(() => setCopiedMnemonic(false), 2000);
    setTimeout(() => navigator.clipboard.writeText(''), 60_000);
  };

  const handleWatchImport = () => {
    const addr = watchInput.trim().toLowerCase();
    if (!isValidAddress(addr)) {
      toast.error('Invalid address');
      return;
    }
    // Watch-only persists straight to localStorage as plain JSON — no key
    // to protect, so no password gate. Survives refresh out of the box.
    const vault = saveWatchVault(addr);
    setVault(vault);
    unlock({ privateKey: null, address: addr, watchOnly: true });
    toast.success('Watching address');
  };

  const handleSetPassword = async () => {
    if (!pending) return;
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== passwordConfirm) {
      toast.error('Passwords don’t match');
      return;
    }
    setEncrypting(true);
    try {
      const vault = await encryptVault(
        {
          privateKey: pending.privateKey,
          mnemonic: pending.mnemonic,
          activeIndex: pending.activeIndex,
        },
        password,
        pending.address,
      );
      saveVault(vault);
      setVault(vault);
      unlock({
        privateKey: pending.privateKey,
        address: pending.address,
        mnemonic: pending.mnemonic ?? null,
        activeIndex: pending.activeIndex ?? 0,
      });
      toast.success('Wallet encrypted and saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Encryption failed');
    } finally {
      setEncrypting(false);
    }
  };

  const closeModal = () => {
    setModal('none');
    setSeedInput('');
    setKeyInput('');
    setKeyPreviewAddr('');
    setGenMnemonic('');
    setGenAddress('');
    setSavedConfirm(false);
    setCopiedMnemonic(false);
    setKeystoreJson('');
    setKeystorePassword('');
    setKeystoreFileName('');
    setWatchInput('');
    setPending(null);
    setPassword('');
    setPasswordConfirm('');
    setShowPassword(false);
  };

  const generateRandomKey = () => {
    const k = generatePrivateKey();
    setKeyInput(k);
    setKeyPreviewAddr(privateKeyToAddress(k));
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        {/* Hero */}
        <div className="text-center mb-10 animate-fade-up">
          <div className="eyebrow mb-3">Sentrix Chain · Self-custody</div>
          <h1 className="font-serif text-5xl text-[var(--tx)] tracking-tight mb-3">Solux</h1>
          <p className="text-sm text-[var(--tx-m)] leading-relaxed max-w-[280px] mx-auto">
            Choose a method to set up your wallet. All keys stay on this device.
          </p>
        </div>

        {/* Method list */}
        <div className="space-y-2 animate-fade-up delay-1">
          <Method
            icon={<Plus className="w-4 h-4" />}
            title="Create new wallet"
            body="Generate a 12-word recovery phrase and a fresh address"
            onClick={openCreate}
          />
          <Method
            icon={<FileText className="w-4 h-4" />}
            title="Import seed phrase"
            body="Restore using a 12 or 24-word BIP39 phrase"
            onClick={() => setModal('import-seed')}
          />
          <Method
            icon={<KeyRound className="w-4 h-4" />}
            title="Import private key"
            body="Restore using a raw 64-character hex key"
            onClick={() => setModal('import-key')}
          />
          <Method
            icon={<FileLock2 className="w-4 h-4" />}
            title="Import keystore JSON"
            body="Decrypt a MetaMask / Geth v3 keystore file"
            onClick={() => setModal('import-keystore')}
          />
          <Method
            icon={<Eye className="w-4 h-4" />}
            title="Watch address"
            body="Monitor any address read-only — no key needed"
            onClick={() => setModal('watch')}
          />
          <Method
            icon={<Cpu className="w-4 h-4" />}
            title="Hardware wallet"
            body="Connect Ledger or Trezor"
            badge="Soon"
            disabled
          />
        </div>

        <p className="text-center text-[11px] mt-8 text-[var(--tx-d)] tracking-wide animate-fade-up delay-2">
          Keys never leave this device · No accounts · No recovery service
        </p>
      </div>

      {/* ── Create modal — mnemonic display ──────────────── */}
      {modal === 'create' && genMnemonic && (
        <Sheet onClose={closeModal} eyebrow="New wallet" title="Save your phrase">
          <div className="rounded-lg p-4 flex gap-3 bg-[var(--red-bg)] border border-[var(--red)]/30">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[var(--red)]" />
            <div className="text-xs leading-relaxed text-[var(--tx-2)]">
              <p className="font-medium text-[var(--tx)] mb-1">Write these 12 words down.</p>
              <p>Anyone with this phrase can drain your wallet. Solux can never recover it for you — lost phrase means lost coins.</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="eyebrow">Recovery phrase</span>
              <button onClick={copyMnemonic} className="text-[10px] font-mono uppercase tracking-wider flex items-center gap-1 text-[var(--gold)] hover:text-[var(--gold-l)] transition-colors">
                {copiedMnemonic ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedMnemonic ? 'Copied' : 'Copy'}
              </button>
            </div>
            <MnemonicGrid words={genMnemonic.split(' ')} />
          </div>

          <div className="rounded-lg p-3 bg-[var(--gold-bg)] border border-[var(--gold-bg-s)]">
            <div className="eyebrow mb-1 text-[var(--gold-d)]">Your address</div>
            <p className="text-xs font-mono break-all text-[var(--gold-l)]">{genAddress}</p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer py-1">
            <input
              type="checkbox"
              checked={savedConfirm}
              onChange={(e) => setSavedConfirm(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-[var(--gold)] cursor-pointer"
            />
            <span className="text-sm text-[var(--tx-2)] leading-snug">
              I&apos;ve written down the recovery phrase somewhere safe
            </span>
          </label>

          <button
            onClick={handleCreateConfirm}
            disabled={!savedConfirm}
            className="w-full py-3 rounded-lg text-sm font-semibold bg-[var(--gold)] text-[var(--bk)] hover:bg-[var(--gold-l)] transition-colors active:scale-[0.99] disabled:opacity-25 disabled:cursor-not-allowed disabled:bg-[var(--sf-2)] disabled:text-[var(--tx-d)]"
          >
            Open wallet
          </button>
        </Sheet>
      )}

      {/* ── Import seed phrase modal ─────────────────────── */}
      {modal === 'import-seed' && (
        <Sheet onClose={closeModal} eyebrow="Restore" title="Import seed phrase">
          <div>
            <label className="eyebrow block mb-2">12 or 24 words</label>
            <textarea
              value={seedInput}
              onChange={(e) => setSeedInput(e.target.value)}
              placeholder="apple banana cherry…"
              className="w-full rounded-lg p-3 text-sm font-mono resize-none h-28 bg-[var(--bk-2)] border border-[var(--brd)] text-[var(--tx)] placeholder:text-[var(--tx-d)] focus:outline-none focus:border-[var(--gold-d)] transition-colors leading-relaxed"
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-[10px] text-[var(--tx-d)] mt-1.5 font-mono">
              Standard BIP39 · path m/44&apos;/60&apos;/0&apos;/0/0
            </p>
          </div>

          <button
            onClick={handleSeedImport}
            disabled={seedDeriving || !seedInput.trim()}
            className="w-full py-3 rounded-lg text-sm font-semibold bg-[var(--gold)] text-[var(--bk)] hover:bg-[var(--gold-l)] transition-colors active:scale-[0.99] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {seedDeriving ? 'Deriving…' : 'Import wallet'}
          </button>
        </Sheet>
      )}

      {/* ── Import private key modal ─────────────────────── */}
      {modal === 'import-key' && (
        <Sheet onClose={closeModal} eyebrow="Restore" title="Import private key">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="eyebrow">Private key</span>
              <button
                onClick={generateRandomKey}
                className="text-[10px] font-mono uppercase tracking-wider text-[var(--gold)] hover:text-[var(--gold-l)] transition-colors"
              >
                Random
              </button>
            </div>
            <textarea
              value={keyInput}
              onChange={(e) => { setKeyInput(e.target.value); setKeyPreviewAddr(''); }}
              placeholder="64-character hex…"
              className="w-full rounded-lg p-3 text-xs font-mono resize-none h-20 bg-[var(--bk-2)] border border-[var(--brd)] text-[var(--tx)] placeholder:text-[var(--tx-d)] focus:outline-none focus:border-[var(--gold-d)] transition-colors leading-relaxed"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {keyPreviewAddr && (
            <div className="rounded-lg p-3 bg-[var(--gold-bg)] border border-[var(--gold-bg-s)]">
              <div className="eyebrow mb-1 text-[var(--gold-d)]">Derived address</div>
              <p className="text-xs font-mono break-all text-[var(--gold-l)]">{keyPreviewAddr}</p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleKeyPreview}
              className="flex-1 py-3 rounded-lg text-sm font-medium bg-[var(--bk-2)] border border-[var(--brd)] text-[var(--tx-2)] hover:bg-[var(--sf-2)] transition-colors active:scale-[0.99]"
            >
              Preview
            </button>
            <button
              onClick={handleKeyImport}
              className="flex-1 py-3 rounded-lg text-sm font-semibold bg-[var(--gold)] text-[var(--bk)] hover:bg-[var(--gold-l)] transition-colors active:scale-[0.99]"
            >
              Import
            </button>
          </div>
        </Sheet>
      )}

      {/* ── Import keystore JSON modal ─────────────────────── */}
      {modal === 'import-keystore' && (
        <Sheet onClose={closeModal} eyebrow="Restore" title="Import keystore">
          <p className="text-xs text-[var(--tx-m)] leading-relaxed">
            Drop a Web3 Secret Storage v3 file (MetaMask, Geth, MyCrypto). Decryption happens in your browser — the file and password never leave this device.
          </p>

          <div>
            <label className="eyebrow block mb-2">Keystore file</label>
            <label
              htmlFor="keystore-file-input"
              className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bk-2)] border border-dashed border-[var(--brd-s)] cursor-pointer hover:bg-[var(--sf-2)] hover:border-[var(--gold-d)] transition-colors"
            >
              <span className="w-9 h-9 rounded-md flex items-center justify-center bg-[var(--gold-bg)] border border-[var(--gold-bg-s)] text-[var(--gold)] shrink-0">
                <Upload className="w-4 h-4" />
              </span>
              <div className="flex-1 min-w-0">
                {keystoreFileName ? (
                  <>
                    <p className="text-sm font-mono text-[var(--tx)] truncate">{keystoreFileName}</p>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--gold)] mt-0.5">
                      Loaded — tap to replace
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-[var(--tx)]">Tap to select file</p>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--tx-d)] mt-0.5">
                      .json file
                    </p>
                  </>
                )}
              </div>
            </label>
            <input
              id="keystore-file-input"
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleKeystoreFile(file);
              }}
            />
          </div>

          <div>
            <label className="eyebrow block mb-2">Password</label>
            <input
              type="password"
              value={keystorePassword}
              onChange={(e) => setKeystorePassword(e.target.value)}
              placeholder="Keystore password"
              className="w-full rounded-lg p-3 text-sm bg-[var(--bk-2)] border border-[var(--brd)] text-[var(--tx)] placeholder:text-[var(--tx-d)] focus:outline-none focus:border-[var(--gold-d)] transition-colors"
              autoComplete="current-password"
              onKeyDown={(e) => { if (e.key === 'Enter') handleKeystoreImport(); }}
            />
          </div>

          <button
            onClick={handleKeystoreImport}
            disabled={keystoreDecrypting || !keystoreJson || !keystorePassword}
            className="w-full py-3 rounded-lg text-sm font-semibold bg-[var(--gold)] text-[var(--bk)] hover:bg-[var(--gold-l)] transition-colors active:scale-[0.99] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {keystoreDecrypting ? 'Decrypting…' : 'Decrypt & import'}
          </button>
          <p className="text-[10px] text-[var(--tx-d)] text-center font-mono">
            Scrypt KDF takes 1-2 seconds on most phones
          </p>
        </Sheet>
      )}

      {/* ── Set password modal ───────────────────────────── */}
      {modal === 'set-password' && pending && (
        <Sheet onClose={() => { /* prevent accidental close mid-encrypt */ if (!encrypting) closeModal(); }} eyebrow="Encrypt vault" title="Set unlock password">
          <div className="rounded-lg p-4 flex gap-3 bg-[var(--gold-bg)] border border-[var(--gold-bg-s)]">
            <Lock className="w-4 h-4 shrink-0 mt-0.5 text-[var(--gold)]" />
            <div className="text-xs leading-relaxed text-[var(--tx-2)]">
              <p className="font-medium text-[var(--tx)] mb-1">Protects your key on this device.</p>
              <p>You&apos;ll enter this every time you open Solux. We can&apos;t reset it — if you forget, restore from your seed phrase.</p>
            </div>
          </div>

          <div>
            <label className="eyebrow block mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-lg p-3 pr-10 text-sm bg-[var(--bk-2)] border border-[var(--brd)] text-[var(--tx)] placeholder:text-[var(--tx-d)] focus:outline-none focus:border-[var(--gold-d)] transition-colors"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md flex items-center justify-center text-[var(--tx-m)] hover:text-[var(--tx)] transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="eyebrow block mb-2">Confirm password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="Re-enter password"
              className="w-full rounded-lg p-3 text-sm bg-[var(--bk-2)] border border-[var(--brd)] text-[var(--tx)] placeholder:text-[var(--tx-d)] focus:outline-none focus:border-[var(--gold-d)] transition-colors"
              autoComplete="new-password"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSetPassword(); }}
            />
          </div>

          <button
            onClick={handleSetPassword}
            disabled={encrypting || password.length < 8 || password !== passwordConfirm}
            className="w-full py-3 rounded-lg text-sm font-semibold bg-[var(--gold)] text-[var(--bk)] hover:bg-[var(--gold-l)] transition-colors active:scale-[0.99] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {encrypting ? 'Encrypting…' : 'Encrypt and continue'}
          </button>
          <p className="text-[10px] text-[var(--tx-d)] text-center font-mono">
            PBKDF2 600k iter · AES-256-GCM
          </p>
        </Sheet>
      )}

      {/* ── Watch-only modal ─────────────────────────────── */}
      {modal === 'watch' && (
        <Sheet onClose={closeModal} eyebrow="Read-only" title="Watch an address">
          <p className="text-xs text-[var(--tx-m)] leading-relaxed">
            Monitor any address without a private key. You&apos;ll see balance, history, and staking, but cannot send transactions. Useful for cold-storage tracking.
          </p>
          <div>
            <label className="eyebrow block mb-2">Address</label>
            <textarea
              value={watchInput}
              onChange={(e) => setWatchInput(e.target.value)}
              placeholder="0x…"
              className="w-full rounded-lg p-3 text-xs font-mono resize-none h-16 bg-[var(--bk-2)] border border-[var(--brd)] text-[var(--tx)] placeholder:text-[var(--tx-d)] focus:outline-none focus:border-[var(--gold-d)] transition-colors"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <button
            onClick={handleWatchImport}
            disabled={!watchInput.trim()}
            className="w-full py-3 rounded-lg text-sm font-semibold bg-[var(--gold)] text-[var(--bk)] hover:bg-[var(--gold-l)] transition-colors active:scale-[0.99] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Open watch wallet
          </button>
        </Sheet>
      )}
    </div>
  );
}

function Method({
  icon, title, body, onClick, disabled, badge,
}: {
  icon: React.ReactNode; title: string; body: string;
  onClick?: () => void; disabled?: boolean; badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`corner-lines w-full flex items-center gap-4 p-4 rounded-xl bg-[var(--sf)] border border-[var(--brd)] transition-colors text-left ${
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:bg-[var(--sf-2)] hover:border-[var(--gold-bg-s)] active:scale-[0.99]'
      }`}
    >
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-[var(--gold-bg)] border border-[var(--gold-bg-s)] text-[var(--gold)]">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm text-[var(--tx)]">{title}</p>
          {badge && (
            <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--bk-2)] text-[var(--tx-d)] border border-[var(--brd)]">
              {badge}
            </span>
          )}
        </div>
        <p className="text-[11px] text-[var(--tx-d)] mt-0.5 leading-snug">{body}</p>
      </div>
      {!disabled && (
        <ChevronRight className="w-4 h-4 text-[var(--tx-d)] shrink-0" />
      )}
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
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl overflow-hidden bg-[var(--sf)] border border-[var(--brd)] animate-fade-up max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-2 sticky top-0 bg-[var(--sf)] z-10">
          <button
            onClick={onClose}
            aria-label="Back"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--sf-2)] transition-colors -ml-1"
          >
            <ArrowLeft className="w-4 h-4 text-[var(--tx-m)]" />
          </button>
          <div className="flex-1 text-center">
            <div className="eyebrow">{eyebrow}</div>
            <h2 className="font-serif text-lg text-[var(--tx)] leading-tight">{title}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--sf-2)] transition-colors -mr-1"
          >
            <X className="w-4 h-4 text-[var(--tx-m)]" />
          </button>
        </div>
        <div className="px-5 pb-6 pt-3 space-y-4">{children}</div>
      </div>
    </div>
  );
}

function MnemonicGrid({ words }: { words: string[] }) {
  return (
    <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-[var(--bk-2)] border border-[var(--brd)] p-3">
      {words.map((word, i) => (
        <div
          key={i}
          className="flex items-baseline gap-1.5 px-2 py-1.5 rounded bg-[var(--sf)] border border-[var(--brd)]"
        >
          <span className="text-[10px] font-mono text-[var(--tx-d)] tab-num w-3.5 text-right shrink-0">
            {i + 1}
          </span>
          <span className="text-xs font-mono text-[var(--tx)] truncate">{word}</span>
        </div>
      ))}
    </div>
  );
}
