import Link from 'next/link'
import { FaucetMark } from './_components/faucet-mark'

export const metadata = {
  title: 'Sentrix Faucet — Choose Network',
  description: 'Claim SRX on Sentrix Chain. Pick testnet (free, generous) or mainnet (small drip, gas-only onboarding).',
}

export default function FaucetLanding() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 40%, rgba(200,168,74,0.07) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 w-full max-w-[640px] animate-fade-up">
        <div className="flex flex-col items-center text-center mb-10">
          <FaucetMark className="w-24 h-24 mb-6 drop-shadow-[0_0_36px_rgba(200,168,74,0.22)]" />
          <h1 className="font-serif text-3xl tracking-[.16em] uppercase text-[var(--tx)] mb-2">
            Sentrix <span className="text-[var(--gold)]">Faucet</span>
          </h1>
          <p className="text-[10px] text-[var(--tx-d)] tracking-[.18em] uppercase">
            Pick a network to continue
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Testnet */}
          <Link
            href="/testnet"
            className="group relative bg-[var(--sf)] border border-[var(--brd)] rounded-2xl p-6 transition-all hover:border-emerald-500/40 hover:bg-[var(--sf2)]"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] tracking-[.2em] uppercase text-emerald-400/80 font-mono">
                Testnet
              </span>
              <span className="text-[10px] tracking-[.16em] uppercase text-[var(--tx-d)] font-mono">
                Chain 7120
              </span>
            </div>
            <p className="font-serif text-xl text-[var(--tx)] mb-2">
              Free SRX <span className="text-[var(--gold)]">for testing</span>
            </p>
            <p className="text-xs text-[var(--tx-m)] leading-relaxed mb-4">
              Generous drips for builders. Deploy contracts, run scripts, hammer the chain.
              No real value.
            </p>
            <div className="flex items-center gap-4 text-[11px] text-[var(--tx-d)] tracking-wider">
              <span className="text-[var(--gold)]">10 SRX</span>
              <span>·</span>
              <span>24h cooldown</span>
              <span>·</span>
              <span>No captcha</span>
            </div>
            <span className="absolute bottom-6 right-6 text-[var(--gold)] opacity-0 group-hover:opacity-100 transition-opacity">
              →
            </span>
          </Link>

          {/* Mainnet */}
          <Link
            href="/mainnet"
            className="group relative bg-[var(--sf)] border border-[var(--brd)] rounded-2xl p-6 transition-all hover:border-rose-500/40 hover:bg-[var(--sf2)]"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] tracking-[.2em] uppercase text-rose-400 font-mono">
                Mainnet
              </span>
              <span className="text-[10px] tracking-[.16em] uppercase text-[var(--tx-d)] font-mono">
                Chain 7119
              </span>
            </div>
            <p className="font-serif text-xl text-[var(--tx)] mb-2">
              Tiny SRX <span className="text-[var(--gold)]">for onboarding</span>
            </p>
            <p className="text-xs text-[var(--tx-m)] leading-relaxed mb-4">
              Gas-only drip for new wallets. Enough to make your first transaction —
              not for testing or speculation.
            </p>
            <div className="flex items-center gap-4 text-[11px] text-[var(--tx-d)] tracking-wider">
              <span className="text-[var(--gold)]">0.01 SRX</span>
              <span>·</span>
              <span>24h cooldown</span>
              <span>·</span>
              <span>Captcha required</span>
            </div>
            <span className="absolute bottom-6 right-6 text-[var(--gold)] opacity-0 group-hover:opacity-100 transition-opacity">
              →
            </span>
          </Link>
        </div>

        <div className="text-center mt-8 space-y-2">
          <p className="text-xs text-[var(--tx-d)]">
            Powered by{' '}
            <a
              href="https://sentrixchain.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--gold)]/70 hover:text-[var(--gold)] transition-colors"
            >
              Sentrix Chain
            </a>
          </p>
          <p className="text-xs">
            <a
              href="https://sentrixchain.com/docs/faucet"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--gold)]/70 hover:text-[var(--gold)] transition-colors"
            >
              How to use →
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
