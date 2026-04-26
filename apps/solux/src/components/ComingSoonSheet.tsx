'use client';

import { useEscape } from '@/lib/useEscape';
import { X, Sparkles } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  feature: string;
  description?: string;
  eta?: string;
}

/** Editorial coming-soon bottom sheet. No email collection — keys-stay-on-device wallet doesn't gather identity. */
export default function ComingSoonSheet({ open, onClose, feature, description, eta }: Props) {
  useEscape(open, onClose);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl overflow-hidden bg-[var(--sf)] border border-[var(--brd)] animate-fade-up">
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <div>
            <div className="eyebrow">Roadmap</div>
            <h2 className="font-serif text-lg text-[var(--tx)]">{feature}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--sf-2)] transition-colors -mr-1">
            <X className="w-4 h-4 text-[var(--tx-m)]" />
          </button>
        </div>

        <div className="px-5 pb-6 space-y-4">
          <div className="rounded-xl bg-[var(--gold-bg)] border border-[var(--gold-bg-s)] p-5 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl flex items-center justify-center bg-[var(--gold)] text-[var(--bk)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-[var(--gold-l)] mb-1">{feature} is on the way</p>
            {eta && (
              <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--gold-d)]">
                ETA {eta}
              </p>
            )}
          </div>

          {description && (
            <p className="text-xs text-[var(--tx-m)] leading-relaxed text-center">
              {description}
            </p>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 rounded-lg text-sm font-medium bg-[var(--bk-2)] border border-[var(--brd)] text-[var(--tx-2)] hover:bg-[var(--sf-2)] transition-colors active:scale-[0.99]"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
