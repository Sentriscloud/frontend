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
          className="flex items-center gap-1.5 mb-6 text-[13px] text-[var(--tx-m)] hover:text-[var(--tx)] transition-colors animate-fade-up"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="mb-6 animate-fade-up delay-1">
          <h1 className="text-[22px] font-bold text-[var(--tx)]">Receive SRX</h1>
          <p className="text-[13px] text-[var(--tx-m)] mt-2 leading-relaxed">
            Share this address with the sender. Works for native SRX and any SRC-20 tokens on Sentrix Chain.
          </p>
        </div>

        <div className="rounded-2xl bg-[var(--sf)] border border-[var(--brd)] p-6 animate-fade-up delay-2">
          <div className="flex justify-center mb-5">
            <div className="rounded-2xl bg-white p-5 shadow-[0_8px_28px_rgba(244,199,94,0.12)]">
              {address && (
                <QRCodeSVG
                  value={address}
                  size={196}
                  bgColor="#ffffff"
                  fgColor="#0a0a0b"
                  level="H"
                  marginSize={0}
                  imageSettings={{
                    // Embed the SRX rhombus as a center watermark — Phantom /
                    // Trust pattern. Error correction "H" (~30%) is high enough
                    // that the QR still scans cleanly with this 18% cutout.
                    src: '/srx-mark.svg',
                    width: 38,
                    height: 38,
                    excavate: true,
                  }}
                />
              )}
            </div>
          </div>

          <div className="rounded-xl bg-[var(--bk-2)] border border-[var(--brd)] p-4 mb-4">
            <div className="text-[12px] font-medium text-[var(--tx-m)] mb-1.5">Your address</div>
            <p className="text-[13px] font-mono break-all text-[var(--tx)] leading-relaxed">{address}</p>
          </div>

          <button
            onClick={copy}
            className="w-full py-3.5 rounded-xl text-[14px] font-semibold bg-[var(--gold)] text-[#3a2a0e] hover:bg-[var(--gold-l)] transition-colors active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy address</>}
          </button>
        </div>
      </div>
    </div>
  );
}
