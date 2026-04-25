'use client';

import { ArrowLeft, Sparkles } from 'lucide-react';

export default function ComingSoon({ feature, onBack }: { feature: string; onBack: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ background: '#F8FAFC' }}>
      <div className="w-full max-w-sm">
        <button onClick={onBack} className="flex items-center gap-2 mb-5 text-sm font-medium transition-colors active:scale-95" style={{ color: '#64748B' }}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="rounded-2xl p-8 text-center" style={{ background: '#FFFFFF', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0' }}>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)', boxShadow: '0 8px 24px rgba(16,185,129,0.3)' }}>
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold" style={{ color: '#0F172A' }}>{feature}</h2>
          <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full" style={{ background: '#ECFDF5' }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#10b981' }} />
            <span className="text-xs font-semibold" style={{ color: '#059669' }}>Coming Soon</span>
          </div>
          <p className="text-sm mt-5 leading-relaxed" style={{ color: '#64748B' }}>
            We&apos;re working on bringing {feature.toLowerCase()} to Sentrix Wallet. Stay tuned for updates.
          </p>
        </div>
      </div>
    </div>
  );
}
