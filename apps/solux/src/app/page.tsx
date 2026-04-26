import Link from 'next/link';
import {
  ArrowRight, ShieldCheck, KeyRound, Activity,
  Send, Download, ListOrdered, TrendingUp, Layers, Palette,
  Smartphone, Apple, Bell,
} from 'lucide-react';

export const metadata = {
  title: 'Solux — Self-custody wallet for Sentrix Chain',
  description:
    'Hold, send, stake, and receive SRX on Sentrix Chain. Keys stay on-device. Web wallet available now, native iOS + Android coming soon.',
};

export default function Landing() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 70% at 50% 0%, rgba(200,168,74,0.10) 0%, transparent 70%)',
          }}
        />
        <div className="relative max-w-2xl mx-auto px-6 pt-20 pb-16 sm:pt-28 sm:pb-24 text-center">
          <div className="eyebrow mb-4 animate-fade-up">
            Sentrix Chain · Chain ID 7119
          </div>
          <h1 className="font-serif text-5xl sm:text-7xl text-[var(--tx)] tracking-tight leading-[1.05] mb-5 animate-fade-up delay-1">
            Solux
          </h1>
          <p className="text-base sm:text-lg text-[var(--tx-2)] leading-relaxed max-w-md mx-auto mb-10 animate-fade-up delay-2">
            A self-custody wallet for Sentrix Chain. Hold, send, stake, and receive
            <span className="text-[var(--gold)] font-mono"> SRX</span> — your keys never leave your device.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-up delay-3">
            <Link
              href="/wallet"
              className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-[var(--gold)] text-[var(--bk)] text-sm font-semibold hover:bg-[var(--gold-l)] transition-colors active:scale-[0.99]"
            >
              Launch web wallet
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#native-app"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg border border-[var(--brd)] text-[var(--tx-2)] text-sm font-medium hover:bg-[var(--sf)] transition-colors"
            >
              Native app
              <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--gold)] text-[var(--bk)]">
                Soon
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* ── Trust strip ─────────────────────────────────────── */}
      <section className="border-y border-[var(--brd)] bg-[var(--sf)]/40">
        <div className="max-w-3xl mx-auto px-6 py-10 grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-4">
          <Trust
            icon={<KeyRound className="w-4 h-4" />}
            title="Self-custody"
            body="Keys generated and stored on-device. No accounts, no servers, no recovery — and no support line that could ever lock you out."
          />
          <Trust
            icon={<ShieldCheck className="w-4 h-4" />}
            title="Local signing"
            body="Transactions signed in your browser. Only the signed payload reaches Sentrix Chain. Your private key never crosses the wire."
          />
          <Trust
            icon={<Activity className="w-4 h-4" />}
            title="Direct to chain"
            body="Talks to Sentrix Chain validators directly. No middleman, no API key, no rate-limited free tier."
          />
        </div>
      </section>

      {/* ── Capabilities ───────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-16 sm:py-20 w-full">
        <div className="text-center mb-12">
          <div className="eyebrow mb-2">Capabilities</div>
          <h2 className="font-serif text-3xl sm:text-4xl text-[var(--tx)]">
            Everything a wallet should be — <span className="text-[var(--gold)]">nothing else.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Feature
            icon={<Send className="w-4 h-4" />}
            label="Send"
            body="Native SRX transfers with deterministic 0.0001 SRX fee. Pre-flight checks for balance, address, and clock skew before you sign. Live transaction tracker shows broadcast → in-block → finalized progress."
          />
          <Feature
            icon={<Download className="w-4 h-4" />}
            label="Receive"
            body="QR code and tap-to-copy address. Works for native SRX and any SRC-20 token deployed on Sentrix Chain. Watch-only mode lets you monitor cold storage."
          />
          <Feature
            icon={<TrendingUp className="w-4 h-4" />}
            label="Stake"
            body="Delegate to validators, claim rewards, undelegate. Full DPoS support — view validator uptime and commission before committing. Multi-validator portfolio in one place."
          />
          <Feature
            icon={<Layers className="w-4 h-4" />}
            label="Multi-account"
            body="One seed phrase, infinite accounts. Standard BIP39 + BIP44 on the EVM path m/44'/60'/0'/0/N — phrases imported in MetaMask or Rabby produce the same addresses."
          />
          <Feature
            icon={<Palette className="w-4 h-4" />}
            label="Themes"
            body="Default editorial charcoal + gold, vibrant Colorful, paper-white Light, deep Ocean blue. Pick whichever matches your day."
          />
          <Feature
            icon={<ListOrdered className="w-4 h-4" />}
            label="Activity"
            body="Direct ledger view of inbound, outbound, token ops, and block rewards — fetched live from Sentrix Chain validators. Full transaction detail modal with payload + finality status."
          />
        </div>
      </section>

      {/* ── Native app coming soon ─────────────────────────── */}
      <section id="native-app" className="border-t border-[var(--brd)] bg-[var(--sf)]/40">
        <div className="max-w-3xl mx-auto px-6 py-16 sm:py-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 items-center">
            {/* Phone mockup illustration */}
            <div className="flex justify-center order-2 sm:order-1">
              <div className="relative">
                <div
                  aria-hidden
                  className="absolute -inset-4 rounded-[2.5rem] opacity-50"
                  style={{
                    background:
                      'radial-gradient(ellipse 60% 80% at 50% 50%, rgba(200,168,74,0.18) 0%, transparent 70%)',
                  }}
                />
                <div className="relative w-44 h-80 rounded-[2rem] bg-[var(--bk)] border-2 border-[var(--brd-s)] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
                  {/* Notch */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-4 rounded-full bg-[var(--bk)] border border-[var(--brd-s)] z-10" />
                  {/* Mock screen content */}
                  <div className="px-4 pt-10 pb-4 h-full flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 rounded-full bg-[var(--gold-bg)] border border-[var(--gold-bg-s)] flex items-center justify-center">
                        <span className="text-[8px] font-mono font-bold text-[var(--gold)]">S</span>
                      </div>
                      <div className="flex-1">
                        <div className="h-1.5 w-12 rounded-full bg-[var(--tx-2)] opacity-60" />
                        <div className="h-1 w-8 rounded-full bg-[var(--tx-d)] mt-1" />
                      </div>
                    </div>
                    <div className="rounded-lg bg-[var(--sf)] border border-[var(--brd)] p-3 mb-3">
                      <div className="h-1 w-10 rounded-full bg-[var(--tx-d)] mb-2" />
                      <div className="font-serif text-base text-[var(--tx)]">21,000.00</div>
                      <div className="h-0.5 w-6 rounded-full bg-[var(--gold)] mt-1" />
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 mb-3">
                      <div className="h-10 rounded-md bg-[var(--sf)] border border-[var(--brd)]" />
                      <div className="h-10 rounded-md bg-[var(--sf)] border border-[var(--brd)]" />
                      <div className="h-10 rounded-md bg-[var(--sf)] border border-[var(--brd)]" />
                    </div>
                    <div className="rounded-lg bg-[var(--sf)] border border-[var(--brd)] p-2 flex-1">
                      <div className="h-1 w-12 rounded-full bg-[var(--tx-d)] mb-2" />
                      <div className="space-y-1.5">
                        <div className="h-3 rounded-sm bg-[var(--bk-2)]" />
                        <div className="h-3 rounded-sm bg-[var(--bk-2)]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 sm:order-2">
              <div className="eyebrow mb-3">Native app</div>
              <h2 className="font-serif text-3xl sm:text-4xl text-[var(--tx)] mb-4 leading-tight">
                iOS &amp; Android <span className="text-[var(--gold)]">on the way.</span>
              </h2>
              <p className="text-sm text-[var(--tx-m)] leading-relaxed mb-6">
                Native apps with biometric unlock, push notifications for finality, and offline transaction signing. Until then, the web wallet works on every device — including
                {' '}<span className="text-[var(--tx-2)]">Add to Home Screen</span> on iOS and Android, which gives you a real app icon and full-screen experience.
              </p>

              <div className="space-y-2 mb-6">
                <button
                  type="button"
                  disabled
                  className="w-full sm:w-auto sm:min-w-[180px] flex items-center gap-3 px-5 py-3 rounded-lg bg-[var(--sf)] border border-[var(--brd)] text-[var(--tx-d)] cursor-not-allowed opacity-70"
                >
                  <Apple className="w-5 h-5" />
                  <div className="text-left">
                    <div className="text-[10px] font-mono uppercase tracking-wider">Coming soon</div>
                    <div className="text-sm font-medium">App Store</div>
                  </div>
                </button>
                <button
                  type="button"
                  disabled
                  className="w-full sm:w-auto sm:min-w-[180px] flex items-center gap-3 px-5 py-3 rounded-lg bg-[var(--sf)] border border-[var(--brd)] text-[var(--tx-d)] cursor-not-allowed opacity-70"
                >
                  <Smartphone className="w-5 h-5" />
                  <div className="text-left">
                    <div className="text-[10px] font-mono uppercase tracking-wider">Coming soon</div>
                    <div className="text-sm font-medium">Google Play</div>
                  </div>
                </button>
                <button
                  type="button"
                  disabled
                  className="w-full sm:w-auto sm:min-w-[180px] flex items-center gap-3 px-5 py-3 rounded-lg bg-[var(--sf)] border border-[var(--brd)] text-[var(--tx-d)] cursor-not-allowed opacity-70"
                >
                  <Download className="w-5 h-5" />
                  <div className="text-left">
                    <div className="text-[10px] font-mono uppercase tracking-wider">Coming soon</div>
                    <div className="text-sm font-medium">Direct APK</div>
                  </div>
                </button>
              </div>

              <Link
                href="/wallet"
                className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--gold)] hover:text-[var(--gold-l)] transition-colors"
              >
                <Bell className="w-3.5 h-3.5" />
                Use the web wallet now
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Network strip ────────────────────────────────── */}
      <section className="border-t border-[var(--brd)]">
        <div className="max-w-3xl mx-auto px-6 py-12 sm:py-14">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center sm:text-left">
            <Stat label="Network"  value="Mainnet" mono={false} />
            <Stat label="Chain ID" value="7119" />
            <Stat label="Native"   value="SRX" />
            <Stat label="Block time" value="~1s" />
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────── */}
      <section className="border-t border-[var(--brd)] bg-[var(--sf)]/30">
        <div className="max-w-2xl mx-auto px-6 py-14 sm:py-20 text-center">
          <div className="eyebrow mb-3">Ready</div>
          <h2 className="font-serif text-3xl sm:text-4xl text-[var(--tx)] mb-3">
            Take custody of your <span className="text-[var(--gold)]">SRX</span>.
          </h2>
          <p className="text-sm text-[var(--tx-m)] mb-7 max-w-md mx-auto">
            Create a fresh wallet in seconds, or import an existing seed phrase. Either way, no signup.
          </p>
          <Link
            href="/wallet"
            className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-[var(--gold)] text-[var(--bk)] text-sm font-semibold hover:bg-[var(--gold-l)] transition-colors active:scale-[0.99]"
          >
            Open Solux
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="border-t border-[var(--brd)] mt-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif text-lg text-[var(--tx)]">Solux</span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--tx-d)]">·</span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--tx-d)]">
              by SentrisCloud
            </span>
          </div>
          <nav className="flex items-center gap-5 text-xs">
            <a
              href="https://sentrixchain.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--tx-m)] hover:text-[var(--gold)] transition-colors"
            >
              Sentrix Chain
            </a>
            <a
              href="https://api.sentrixchain.com/chain/info"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--tx-m)] hover:text-[var(--gold)] transition-colors"
            >
              Network status
            </a>
            <Link
              href="/wallet"
              className="text-[var(--gold)] hover:text-[var(--gold-l)] transition-colors font-medium"
            >
              Wallet →
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}

function Trust({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-7 h-7 rounded-md flex items-center justify-center bg-[var(--gold-bg)] border border-[var(--gold-bg-s)] text-[var(--gold)]">
          {icon}
        </span>
        <span className="text-xs font-mono uppercase tracking-wider text-[var(--tx)]">
          {title}
        </span>
      </div>
      <p className="text-[13px] text-[var(--tx-m)] leading-relaxed">
        {body}
      </p>
    </div>
  );
}

function Feature({ icon, label, body }: { icon: React.ReactNode; label: string; body: string }) {
  return (
    <div className="corner-lines rounded-xl bg-[var(--sf)] border border-[var(--brd)] p-5 hover:bg-[var(--sf-2)] transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--gold-bg)] border border-[var(--gold-bg-s)] text-[var(--gold)]">
          {icon}
        </span>
        <span className="font-serif text-lg text-[var(--tx)]">{label}</span>
      </div>
      <p className="text-[13px] text-[var(--tx-m)] leading-relaxed">{body}</p>
    </div>
  );
}

function Stat({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="eyebrow mb-1.5">{label}</div>
      <div className={`text-base text-[var(--tx)] ${mono ? 'font-mono tab-num' : 'font-serif'}`}>
        {value}
      </div>
    </div>
  );
}
