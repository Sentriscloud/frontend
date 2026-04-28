import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { FaucetMark } from './_components/faucet-mark'

export const metadata = {
  title: 'Sentrix Faucet — Choose Network',
  description: 'Claim SRX on Sentrix Chain. Pick testnet (free, generous) or mainnet (small drip, gas-only onboarding).',
}

export default function FaucetLanding() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div aria-hidden className="gold-orb fixed top-[-120px] right-[-100px] z-0" />

      <div className="relative z-10 w-full max-w-[640px] animate-fade-up">
        {/* Hero — brand-kit coin avatar standalone with gold halo behind. */}
        <div className="flex flex-col items-center text-center mb-12">
          <div className="relative mb-6">
            <div
              aria-hidden
              className="absolute inset-0 -m-8 rounded-full opacity-60 blur-3xl"
              style={{ background: 'radial-gradient(circle, rgba(244,199,94,0.40) 0%, transparent 65%)' }}
            />
            <FaucetMark className="relative w-24 h-24 drop-shadow-[0_0_28px_rgba(244,199,94,0.22)]" />
          </div>
          <h1 className="font-serif text-[44px] tracking-tight text-[var(--tx)] mb-3 leading-none">
            Sentrix <span className="text-[var(--gold)]">Faucet</span>
          </h1>
          <p className="text-[14px] text-[var(--tx-m)] max-w-[400px]">
            Pick a network to claim SRX. Testnet for development, mainnet for new-wallet onboarding.
          </p>
        </div>

        {/* Network cards — testnet primary (free), mainnet secondary (gas-only) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Link
            href="/testnet"
            className="group relative bg-[var(--sf)] border border-[var(--brd)] rounded-2xl p-6 transition-all hover:border-[var(--gold-bg-s)] hover:bg-[var(--sf-2)]"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-[rgba(34,197,94,0.10)] text-[var(--green)] text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse-live" />
                Testnet
              </span>
              <span className="text-[12px] text-[var(--tx-m)] font-mono">Chain 7120</span>
            </div>
            <p className="text-[18px] font-bold text-[var(--tx)] mb-2 leading-snug">
              Free SRX <span className="text-[var(--gold)]">for testing</span>
            </p>
            <p className="text-[13px] text-[var(--tx-m)] leading-relaxed mb-5">
              Generous drips for builders. Deploy contracts, run scripts, hammer the chain. No real value.
            </p>
            <div className="flex items-center gap-3 text-[12px] text-[var(--tx-m)]">
              <span className="text-[var(--gold)] font-semibold">10 SRX</span>
              <span className="opacity-40">·</span>
              <span>24h cooldown</span>
              <span className="opacity-40">·</span>
              <span>No captcha</span>
            </div>
            <ArrowRight className="absolute bottom-6 right-6 w-4 h-4 text-[var(--gold)] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            href="/mainnet"
            className="group relative bg-[var(--sf)] border border-[var(--brd)] rounded-2xl p-6 transition-all hover:border-[var(--gold-bg-s)] hover:bg-[var(--sf-2)]"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-[rgba(248,113,113,0.10)] text-[var(--red)] text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--red)] animate-pulse-live" />
                Mainnet
              </span>
              <span className="text-[12px] text-[var(--tx-m)] font-mono">Chain 7119</span>
            </div>
            <p className="text-[18px] font-bold text-[var(--tx)] mb-2 leading-snug">
              Tiny SRX <span className="text-[var(--gold)]">for onboarding</span>
            </p>
            <p className="text-[13px] text-[var(--tx-m)] leading-relaxed mb-5">
              Gas-only drip for new wallets. Enough to make your first transaction — not for testing or speculation.
            </p>
            <div className="flex items-center gap-3 text-[12px] text-[var(--tx-m)]">
              <span className="text-[var(--gold)] font-semibold">0.01 SRX</span>
              <span className="opacity-40">·</span>
              <span>24h cooldown</span>
              <span className="opacity-40">·</span>
              <span>Captcha required</span>
            </div>
            <ArrowRight className="absolute bottom-6 right-6 w-4 h-4 text-[var(--gold)] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </Link>
        </div>

        <div className="text-center mt-10 space-y-2">
          <p className="text-[13px] text-[var(--tx-m)]">
            Powered by{' '}
            <a
              href="https://sentrixchain.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--gold)] hover:text-[var(--gold-l)] transition-colors font-medium"
            >
              Sentrix Chain
            </a>
          </p>
          <p className="text-[12px]">
            <a
              href="https://sentrixchain.com/docs/faucet"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--tx-m)] hover:text-[var(--gold)] transition-colors"
            >
              How to use →
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
