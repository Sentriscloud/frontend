'use client';

import { useState } from 'react';
import { useWalletStore } from '@/lib/store';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Copy, Check } from 'lucide-react';
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
    <div className="min-h-screen flex justify-center px-5 py-8">
      <div className="w-full max-w-sm">
        <button
          onClick={onBack}
          className="flex items-center gap-2 mb-6 text-xs font-mono uppercase tracking-wider text-[var(--tx-m)] hover:text-[var(--tx)] transition-colors animate-fade-up"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        <div className="mb-6 animate-fade-up delay-1">
          <div className="eyebrow">Inbound</div>
          <h1 className="font-serif text-3xl text-[var(--tx)] mt-1">Receive SRX</h1>
          <p className="text-sm text-[var(--tx-m)] mt-2">
            Share this address with the sender. Works for native SRX and any SRC-20 tokens on Sentrix Chain.
          </p>
        </div>

        <div className="rounded-2xl bg-[var(--sf)] border border-[var(--brd)] p-6 animate-fade-up delay-2">
          <div className="flex justify-center mb-5">
            <div className="rounded-xl bg-[var(--bk)] border border-[var(--brd)] p-4">
              {address && (
                <QRCodeSVG
                  value={address}
                  size={192}
                  bgColor="transparent"
                  fgColor="#f1f1f3"
                  level="M"
                />
              )}
            </div>
          </div>

          <div className="rounded-lg bg-[var(--bk-2)] border border-[var(--brd)] p-3 mb-4">
            <div className="eyebrow mb-1.5">Your address</div>
            <p className="text-xs font-mono break-all text-[var(--tx)] leading-relaxed">{address}</p>
          </div>

          <button
            onClick={copy}
            className="w-full py-3 rounded-lg text-sm font-semibold bg-[var(--gold)] text-[var(--bk)] hover:bg-[var(--gold-l)] transition-colors active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy address</>}
          </button>
        </div>
      </div>
    </div>
  );
}
