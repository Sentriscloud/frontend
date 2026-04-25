'use client';

import { useState } from 'react';
import { useWalletStore } from '@/lib/store';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Copy, Check, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Receive({ onBack }: { onBack: () => void }) {
  const { address } = useWalletStore();
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    toast.success('Address copied');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ background: '#F8FAFC' }}>
      <div className="w-full max-w-sm">
        <button onClick={onBack} className="flex items-center gap-2 mb-5 text-sm font-medium transition-colors active:scale-95" style={{ color: '#64748B' }}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0' }}>
          <div className="px-6 py-5" style={{ background: 'linear-gradient(135deg, #10b981, #0d9488)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <Download className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Receive</h2>
                <p className="text-white/70 text-xs">Your address accepts SRX and SRC-20 tokens</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 space-y-5">
            <div className="flex justify-center">
              <div className="p-4 rounded-2xl" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                {address && <QRCodeSVG value={address} size={200} bgColor="#FFFFFF" fgColor="#0F172A" level="M" />}
              </div>
            </div>

            <div className="rounded-xl p-4" style={{ background: '#F1F5F9' }}>
              <p className="text-xs font-medium mb-2" style={{ color: '#64748B' }}>Your Address</p>
              <p className="text-sm font-mono break-all" style={{ color: '#0F172A' }}>{address}</p>
            </div>

            <button
              onClick={copy}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)', boxShadow: '0 4px 16px rgba(16,185,129,0.3)' }}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy Address'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
