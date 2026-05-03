'use client'

// Pump.fun-style unified sign-in modal — three peer entry points:
//
//   1. Privy ("Sign in / Create account") — Google, Twitter, email,
//      MetaMask / Rabby / Brave / WalletConnect. One modal, one flow.
//   2. Solux — Sentrix-native popup wallet, no extension required.
//   3. Watch any address — paste a 0x… for view-only browsing.
//
// Solux stays a peer (not inside Privy's modal) because Privy's connector
// list is curated and doesn't know about Sentrix-native popup wallets;
// the postMessage bridge we already shipped lives outside Privy.
//
// The previous version had a third "Sign in with a wallet" button that
// kicked RainbowKit's modal — Privy's wallet login covers the same
// ground (MetaMask / Rabby / Brave / WC) and fronts social login on
// top, so we collapsed it.

import { useEffect, useState } from 'react'
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
  // Privy login trigger from the parent so the modal has nothing to
  // know about Privy's lifecycle — same hoist rationale as Solux.
  onPrivyLogin: () => void
  isPrivyReady: boolean
}

type View = 'menu' | 'watch'

export function SignInModal({
  open,
  onClose,
  namespace,
  onSoluxConnect,
  isSoluxConnecting,
  onPrivyLogin,
  isPrivyReady,
}: SignInModalProps) {
  const [view, setView] = useState<View>('menu')
  // If Privy stays !ready for too long after open, show an actionable
  // diagnostic instead of leaving the user staring at "warming up…".
  // Common causes: network blocking auth.privy.io (Starlink CGNAT,
  // corporate firewall), App ID misconfigured, allowlist origin
  // mismatch on the Privy dashboard.
  const [privyTimeout, setPrivyTimeout] = useState(false)
  // Click error — if onPrivyLogin throws synchronously we surface it.
  const [clickError, setClickError] = useState<string | null>(null)

  // Reset to menu view on every open so the user doesn't get stuck on
  // the watch sub-screen across opens.
  useEffect(() => {
    if (open) {
      setView('menu')
      setClickError(null)
      setPrivyTimeout(false)
    }
  }, [open])

  // 10s grace, then flag the timeout state. Cleared if Privy becomes
  // ready before that.
  useEffect(() => {
    if (!open) return
    if (isPrivyReady) {
      setPrivyTimeout(false)
      return
    }
    const t = setTimeout(() => setPrivyTimeout(true), 10_000)
    return () => clearTimeout(t)
  }, [open, isPrivyReady])

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
                Email, Google, Twitter, a wallet, or Solux.
              </p>
            </div>

            {/* Diagnostic — surfaces a visible banner if Privy's SDK
                never finishes loading OR the click throws. The most
                common cause is the user's network blocking
                auth.privy.io (Starlink CGNAT, corporate firewall),
                which leaves the SDK silently retrying forever and the
                button doing nothing on click. */}
            {(privyTimeout || clickError) && (
              <div className="mb-4 px-3 py-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-xs leading-relaxed">
                {clickError ? (
                  <p className="text-amber-300 font-mono break-all">{clickError}</p>
                ) : (
                  <>
                    <p className="text-amber-300 font-semibold mb-1">
                      Privy SDK is taking long to initialise.
                    </p>
                    <p className="text-amber-200/80">
                      Most often this is a network block on{' '}
                      <span className="font-mono">auth.privy.io</span>. Try a
                      different network (mobile hotspot), or use Solux below.
                      Open DevTools → Console for the underlying error.
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Primary: Privy — covers email/Google/Twitter and external
                wallets in a single Privy-managed modal. */}
            <button
              onClick={() => {
                try {
                  // login() should pop the Privy modal even if !ready
                  // (the SDK queues internally). Wrap so any sync
                  // throw surfaces to the user instead of being
                  // silently swallowed by React's event boundary.
                  // Type signature claims void, but real Privy 3.x
                  // returns a Promise — capture either flavour.
                  const result = onPrivyLogin() as unknown as
                    | Promise<unknown>
                    | void
                  if (result && typeof (result as Promise<unknown>).then === 'function') {
                    ;(result as Promise<unknown>).catch((e: unknown) => {
                      console.error('[Privy] login() rejected:', e)
                      setClickError(
                        `Privy login failed: ${
                          e instanceof Error ? e.message : String(e)
                        }`,
                      )
                    })
                  }
                  // Don't close on !ready — let the user retry if the
                  // SDK never opens its modal. Close only on success
                  // path (Privy's modal handles its own lifecycle).
                  if (isPrivyReady) onClose()
                } catch (e) {
                  console.error('[Privy] login() threw:', e)
                  setClickError(
                    `Privy login threw: ${
                      e instanceof Error ? e.message : String(e)
                    }`,
                  )
                }
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[var(--sf2)] hover:bg-[var(--sf3)] border border-[var(--brd)] hover:border-[var(--gold)]/60 transition-colors text-left"
            >
              <span className="w-9 h-9 rounded-lg bg-[var(--bk)] flex items-center justify-center">
                <Wallet className="w-4 h-4 text-[var(--tx)]" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--tx)]">
                  Sign in or create account
                  {!isPrivyReady && (
                    <span className="ml-2 text-[10px] text-[var(--tx-d)] font-normal">
                      (warming up…)
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-[var(--tx-m)] leading-snug">
                  Email · Google · Twitter · MetaMask · Rabby · Brave · WC
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--tx-d)]" />
            </button>

            <div className="flex items-center gap-3 my-4 text-[10px] uppercase tracking-widest text-[var(--tx-d)]">
              <div className="flex-1 h-px bg-[var(--brd)]" />
              <span>or</span>
              <div className="flex-1 h-px bg-[var(--brd)]" />
            </div>

            {/* Peer: Solux — Sentrix-native popup wallet. Lives outside
                Privy's modal because Privy's connector list is curated
                and doesn't know about us. */}
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
              sign in with a wallet, social, or Solux.
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
