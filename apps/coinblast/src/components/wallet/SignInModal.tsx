'use client'

// Pump.fun-style unified sign-in modal. One "Sign in" CTA in the
// header opens this; the modal lists every way to authenticate side
// by side with clear hierarchy:
//
//   1. Solux  — Sentrix-native, no extension required (popup-based).
//   2. Wallet — RainbowKit modal: MetaMask, Rabby, Phantom, OKX, Trust,
//               Coinbase Wallet, generic injected. The wallets that
//               actually sign txs.
//   3. Watch  — paste any 0x… for view-only browsing. View-only,
//               can't sign trades, but useful for portfolio peeking.
//
// The previous pattern (three independent buttons stacked under the
// Connect Wallet primary) confused users into thinking each was a
// separate site, and the Solux button looked like a sub-option of
// the wallet button. Promoting it to a peer in the same modal makes
// the trade-off explicit ("Solux for fast onboarding without an
// extension; MetaMask/Rabby for full signing power").

import { useEffect, useState } from 'react'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { ManualAddressInput } from '@sentriscloud/wallet-config'
import { X, Wallet, Eye, ChevronRight, ArrowLeft } from 'lucide-react'

interface SignInModalProps {
  open: boolean
  onClose: () => void
  namespace: string
  // Hoisted from the parent — owning useSoluxConnect here would
  // unmount the popup-message listener the moment the modal closes,
  // and the postMessage from /connect would land in nothing. The
  // parent (WalletConnect) keeps the hook alive across modal opens.
  onSoluxConnect: () => void
  isSoluxConnecting: boolean
}

type View = 'menu' | 'watch'

export function SignInModal({ open, onClose, namespace, onSoluxConnect, isSoluxConnecting }: SignInModalProps) {
  const { openConnectModal } = useConnectModal()
  const [view, setView] = useState<View>('menu')

  // Reset to menu view on every open so the user doesn't get stuck on
  // the watch sub-screen across opens.
  useEffect(() => {
    if (open) setView('menu')
  }, [open])

  // Close on Escape — standard modal hygiene.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed z-[200] flex items-center justify-center p-4"
      style={{ top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
    >
      {/* Backdrop */}
      <div
        className="absolute bg-black/70 backdrop-blur-sm"
        style={{ top: 0, left: 0, right: 0, bottom: 0 }}
        onClick={onClose}
        aria-hidden
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-[var(--sf)] border border-[var(--brd)] rounded-2xl shadow-xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-lg text-[var(--tx-d)] hover:text-[var(--tx)] hover:bg-[var(--sf2)] transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {view === 'menu' && (
          <div className="p-6">
            <div className="text-center mb-5">
              <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-[var(--gold)]/15 border border-[var(--brd2)] flex items-center justify-center">
                <Wallet className="w-7 h-7 text-[var(--gold)]" />
              </div>
              <h2 className="text-lg font-bold text-[var(--tx)] mb-1">Sign in</h2>
              <p className="text-xs text-[var(--tx-m)]">
                Connect with Solux, a wallet, or watch any address.
              </p>
            </div>

            {/* Primary: Solux */}
            <button
              onClick={() => {
                onSoluxConnect()
                onClose()
              }}
              disabled={isSoluxConnecting}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[var(--sf2)] hover:bg-[var(--sf3)] border border-[var(--brd)] hover:border-[var(--gold)]/60 transition-colors text-left disabled:opacity-50"
            >
              <span className="w-9 h-9 rounded-lg bg-[var(--gold)]/15 border border-[var(--gold)]/40 flex items-center justify-center text-base leading-none">⌬</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--tx)]">Solux</p>
                <p className="text-[11px] text-[var(--tx-m)] leading-snug">
                  {isSoluxConnecting ? 'Waiting for Solux popup…' : 'Sentrix-native — no extension needed'}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--tx-d)]" />
            </button>

            <div className="flex items-center gap-3 my-4 text-[10px] uppercase tracking-widest text-[var(--tx-d)]">
              <div className="flex-1 h-px bg-[var(--brd)]" />
              <span>or</span>
              <div className="flex-1 h-px bg-[var(--brd)]" />
            </div>

            {/* Secondary: real wallet */}
            <button
              onClick={() => {
                onClose()
                // RainbowKit's modal needs a tick to mount cleanly after
                // ours unmounts — without the timeout the open call
                // sometimes loses to its own backdrop fade.
                setTimeout(() => openConnectModal?.(), 50)
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[var(--sf2)] hover:bg-[var(--sf3)] border border-[var(--brd)] hover:border-[var(--brd2)] transition-colors text-left"
            >
              <span className="w-9 h-9 rounded-lg bg-[var(--bk)] flex items-center justify-center">
                <Wallet className="w-4 h-4 text-[var(--tx)]" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--tx)]">Sign in with a wallet</p>
                <p className="text-[11px] text-[var(--tx-m)] leading-snug">
                  MetaMask, Rabby, Phantom, OKX, Trust, Coinbase
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--tx-d)]" />
            </button>

            {/* Tertiary: view-only */}
            <button
              onClick={() => setView('watch')}
              className="w-full flex items-center gap-3 px-4 py-3 mt-2 rounded-xl text-[var(--tx-m)] hover:text-[var(--tx)] hover:bg-[var(--sf2)] transition-colors text-left"
            >
              <span className="w-9 h-9 rounded-lg flex items-center justify-center">
                <Eye className="w-4 h-4 text-[var(--tx-d)]" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm">Watch any address</p>
                <p className="text-[11px] text-[var(--tx-d)] leading-snug">
                  View-only, no signing. Useful for portfolio peeking.
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--tx-d)]" />
            </button>
          </div>
        )}

        {view === 'watch' && (
          <div className="p-6">
            <button
              onClick={() => setView('menu')}
              className="flex items-center gap-1 text-[var(--tx-d)] hover:text-[var(--tx)] text-xs mb-4 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <h2 className="text-lg font-bold text-[var(--tx)] mb-2">Watch any address</h2>
            <p className="text-xs text-[var(--tx-m)] mb-4 leading-relaxed">
              Paste a 0x… address to browse the launchpad with that wallet&apos;s
              context. View-only — to trade you&apos;ll need to come back and
              sign in with a wallet or Solux.
            </p>
            <ManualAddressInput
              namespace={namespace}
              placeholder="0x… address"
              onAccept={onClose}
            />
          </div>
        )}
      </div>
    </div>
  )
}
