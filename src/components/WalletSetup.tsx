'use client';

import { useState } from 'react';
import { useWalletStore } from '@/lib/store';
import { generatePrivateKey, privateKeyToAddress, isValidPrivateKey } from '@/lib/crypto';
import { KeyRound, Plus, AlertTriangle, Copy, Check, Eye, Shield, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WalletSetup() {
  const [modal, setModal] = useState<'none' | 'import' | 'generate'>('none');
  const [inputKey, setInputKey] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [previewAddress, setPreviewAddress] = useState('');
  const [copied, setCopied] = useState(false);
  const [savedKey, setSavedKey] = useState(false);
  const { setWallet } = useWalletStore();

  const handleImport = () => {
    const key = inputKey.trim().replace(/^0x/, '');
    if (!isValidPrivateKey(key)) { toast.error('Invalid private key'); return; }
    setWallet(key, privateKeyToAddress(key));
    toast.success('Wallet imported!');
  };

  const handlePreview = () => {
    const key = inputKey.trim().replace(/^0x/, '');
    if (!isValidPrivateKey(key)) { toast.error('Invalid private key'); return; }
    setPreviewAddress(privateKeyToAddress(key));
  };

  const handleGenerate = () => {
    const key = generatePrivateKey();
    setGeneratedKey(key);
    setPreviewAddress(privateKeyToAddress(key));
    setSavedKey(false);
  };

  const handleConfirmGenerate = () => {
    if (!generatedKey || !savedKey) return;
    setWallet(generatedKey, previewAddress);
    toast.success('Wallet created!');
  };

  const copyKey = async () => {
    await navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
    setTimeout(() => navigator.clipboard.writeText(''), 60_000);
  };

  const closeModal = () => {
    setModal('none');
    setInputKey('');
    setGeneratedKey('');
    setPreviewAddress('');
    setSavedKey(false);
    setCopied(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ background: '#F8FAFC' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-5"
            style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)', boxShadow: '0 8px 30px rgba(16,185,129,0.3)' }}
          >
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold" style={{ color: '#0F172A' }}>Sentrix Wallet</h1>
          <p className="mt-2" style={{ color: '#94A3B8', fontSize: '15px' }}>Your gateway to the Sentrix blockchain</p>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => setModal('import')}
            className="w-full flex items-center gap-4 p-5 rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0' }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #10b981, #0d9488)' }}>
              <KeyRound className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-base" style={{ color: '#0F172A' }}>Import Wallet</p>
              <p className="text-sm" style={{ color: '#94A3B8' }}>Use an existing private key</p>
            </div>
          </button>

          <button
            onClick={() => { setModal('generate'); handleGenerate(); }}
            className="w-full flex items-center gap-4 p-5 rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0' }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>
              <Plus className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-base" style={{ color: '#0F172A' }}>Create New Wallet</p>
              <p className="text-sm" style={{ color: '#94A3B8' }}>Generate a fresh wallet</p>
            </div>
          </button>
        </div>

        <p className="text-center text-xs mt-8" style={{ color: '#CBD5E1' }}>
          Your keys stay on this device. Always.
        </p>
      </div>

      {/* Import Modal */}
      {modal === 'import' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden" style={{ background: '#FFFFFF' }}>
            <div className="flex items-center justify-between px-6 pt-6 pb-3">
              <h2 className="text-lg font-bold" style={{ color: '#0F172A' }}>Import Wallet</h2>
              <button onClick={closeModal} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#F1F5F9' }}>
                <X className="w-4 h-4" style={{ color: '#64748B' }} />
              </button>
            </div>

            <div className="px-6 pb-8 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#64748B' }}>Private Key</label>
                <textarea
                  value={inputKey}
                  onChange={(e) => { setInputKey(e.target.value); setPreviewAddress(''); }}
                  placeholder="Paste your 64-character hex key..."
                  className="w-full rounded-xl p-4 text-sm font-mono resize-none h-24 focus:outline-none transition-all"
                  style={{ background: '#F1F5F9', border: '2px solid transparent', color: '#0F172A' }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#10b981'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'transparent'}
                />
              </div>

              {previewAddress && (
                <div className="rounded-xl p-4" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: '#059669' }}>Wallet Address</p>
                  <p className="text-sm font-mono break-all" style={{ color: '#047857' }}>{previewAddress}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handlePreview}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
                  style={{ background: '#F1F5F9', color: '#64748B' }}
                >
                  <Eye className="w-4 h-4" /> Preview
                </button>
                <button
                  onClick={handleImport}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #10b981, #0d9488)', boxShadow: '0 4px 14px rgba(16,185,129,0.35)' }}
                >
                  Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate Modal */}
      {modal === 'generate' && generatedKey && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden" style={{ background: '#FFFFFF' }}>
            <div className="flex items-center justify-between px-6 pt-6 pb-3">
              <h2 className="text-lg font-bold" style={{ color: '#0F172A' }}>Your New Wallet</h2>
              <button onClick={closeModal} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#F1F5F9' }}>
                <X className="w-4 h-4" style={{ color: '#64748B' }} />
              </button>
            </div>

            <div className="px-6 pb-8 space-y-4">
              {/* Warning — self-custody reality check */}
              <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#DC2626' }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#991B1B' }}>Your key, your responsibility.</p>
                  <p className="text-xs mt-1" style={{ color: '#B91C1C' }}>
                    Save this private key somewhere safe (password manager, offline backup).
                    It&apos;s the <strong>only</strong> way to access your funds.
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#B91C1C' }}>
                    <strong>Lost key = lost wallet.</strong> There is no recovery, no password
                    reset, no support line. Nobody — including Sentrix — can restore it for you.
                  </p>
                </div>
              </div>

              {/* Private Key */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Private Key</label>
                  <button onClick={copyKey} className="text-xs font-semibold flex items-center gap-1 transition-colors" style={{ color: copied ? '#10b981' : '#94A3B8' }}>
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="rounded-xl p-4 font-mono text-xs break-all" style={{ background: '#F1F5F9', color: '#0F172A', border: '1px solid #E2E8F0' }}>
                  {generatedKey}
                </div>
              </div>

              {/* Address */}
              <div className="rounded-xl p-4" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                <p className="text-xs font-medium mb-1" style={{ color: '#059669' }}>Your Address</p>
                <p className="text-sm font-mono break-all" style={{ color: '#047857' }}>{previewAddress}</p>
              </div>

              {/* Checkbox */}
              <label className="flex items-center gap-3 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={savedKey}
                  onChange={(e) => setSavedKey(e.target.checked)}
                  className="w-5 h-5 rounded accent-emerald-500"
                />
                <span className="text-sm" style={{ color: '#475569' }}>I&apos;ve saved my private key securely</span>
              </label>

              <button
                onClick={handleConfirmGenerate}
                disabled={!savedKey}
                className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: savedKey ? 'linear-gradient(135deg, #10b981, #0d9488)' : '#CBD5E1',
                  boxShadow: savedKey ? '0 4px 14px rgba(16,185,129,0.35)' : 'none',
                }}
              >
                Open Wallet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
