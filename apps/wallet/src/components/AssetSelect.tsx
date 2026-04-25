'use client';

import { formatAmount } from '@/lib/amount';
import { ArrowLeft, ChevronRight } from 'lucide-react';

const SENTRI = 100_000_000;

interface Props {
  onBack: () => void;
  onSelect: (asset: 'srx' | 'sntx') => void;
  srxBalance: number;
  sntxBalance: number;
  sntxDecimals: number;
  sntxSymbol: string;
}

export default function AssetSelect({ onBack, onSelect, srxBalance, sntxBalance, sntxDecimals, sntxSymbol }: Props) {
  const srxDisplay = (srxBalance / SENTRI).toLocaleString(undefined, { maximumFractionDigits: 4 });

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ background: '#F8FAFC' }}>
      <div className="w-full max-w-sm">
        <button onClick={onBack} className="flex items-center gap-2 mb-5 text-sm font-medium transition-colors active:scale-95" style={{ color: '#64748B' }}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid #F1F5F9' }}>
            <h2 className="text-base font-bold" style={{ color: '#0F172A' }}>Select asset to send</h2>
          </div>

          <button
            onClick={() => onSelect('srx')}
            className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:bg-slate-50/50"
            style={{ borderBottom: '1px solid #F1F5F9' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white" style={{ background: 'linear-gradient(135deg, #10b981, #0d9488)' }}>S</div>
              <div className="text-left">
                <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>SRX</p>
                <p className="text-xs" style={{ color: '#94A3B8' }}>Sentrix Native</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>{srxDisplay}</p>
              <ChevronRight className="w-4 h-4" style={{ color: '#CBD5E1' }} />
            </div>
          </button>

          <button
            onClick={() => onSelect('sntx')}
            className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:bg-slate-50/50"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white" style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>
                {sntxSymbol[0]}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>{sntxSymbol}</p>
                <p className="text-xs" style={{ color: '#94A3B8' }}>Sentrix Token</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>{formatAmount(sntxBalance, sntxDecimals)}</p>
              <ChevronRight className="w-4 h-4" style={{ color: '#CBD5E1' }} />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
