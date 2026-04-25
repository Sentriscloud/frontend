"use client";

import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "./section-header";

const VALIDATOR_BENEFITS = [
  {
    icon: "reward",
    title: "Block Rewards",
    desc: "Earn SRX for every block you produce. Era 0: 1 SRX/block. Halving every 42M blocks ensures long-term scarcity.",
  },
  {
    icon: "fee",
    title: "Transaction Fees",
    desc: "Collect 50% of all transaction fees from your produced blocks. The other 50% is permanently burned.",
  },
  {
    icon: "security",
    title: "Encrypted Keystores",
    desc: "AES-256-GCM encrypted keystores with PBKDF2. Private keys never touch the command line or environment variables.",
  },
  {
    icon: "uptime",
    title: "High Uptime, Low Overhead",
    desc: "Single 4.4MB static binary. No JVM, no runtime dependencies. Runs on a modest VPS with minimal resources.",
  },
  {
    icon: "bft",
    title: "BFT Finality",
    desc: "Byzantine Fault Tolerant consensus ensures blocks are final once 2/3+ validators agree. No forks, no reorgs.",
  },
  {
    icon: "network",
    title: "libp2p Networking",
    desc: "Production-grade P2P with automatic peer discovery, incremental chain sync, and NAT traversal.",
  },
];

const ICONS: Record<string, React.ReactNode> = {
  reward: (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M12 6v12" /><path d="M15 9.5c0-1.38-1.34-2.5-3-2.5s-3 1.12-3 2.5 1.34 2.5 3 2.5 3 1.12 3 2.5-1.34 2.5-3 2.5" />
    </svg>
  ),
  fee: (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  ),
  security: (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  uptime: (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  bft: (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" />
    </svg>
  ),
  network: (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="6" height="6" rx="1" /><rect x="16" y="2" width="6" height="6" rx="1" /><rect x="9" y="16" width="6" height="6" rx="1" /><path d="M5 8v3a2 2 0 002 2h10a2 2 0 002-2V8" /><path d="M12 13v3" />
    </svg>
  ),
};

export function Validators() {
  return (
    <section id="validators" className="py-[120px] px-6 md:px-[60px]">
      <Reveal>
        <SectionHeader
          tag="Run a Node"
          title="For"
          titleEm="validators."
          subtitle="7 validators across 3 VPS. Secure the network, earn rewards, shape the chain's future."
        />
      </Reveal>

      <Reveal delay={0.15}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-[60px]">
          {VALIDATOR_BENEFITS.map((b, i) => (
            <div
              key={i}
              className="group bg-gradient-to-br from-[var(--bk)] to-[var(--sf)] p-7 transition-all duration-350 hover:from-[var(--sf)] hover:to-[var(--sf2)] relative overflow-hidden rounded-2xl border border-[var(--brd)] hover:border-[rgba(200,168,74,.15)]"
            >
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-px bg-[var(--gold)] transition-all duration-400 group-hover:w-[60%]" />
              <div className="text-[var(--gold)] mb-4 opacity-80 group-hover:opacity-100 transition-opacity">
                {ICONS[b.icon]}
              </div>
              <h4 className="text-[14px] font-semibold mb-2 tracking-[.02em] transition-colors duration-300 group-hover:text-[var(--gold-l)]">
                {b.title}
              </h4>
              <p className="text-[13px] text-[var(--tx-m)] font-light leading-[1.7]">{b.desc}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delay={0.25}>
        <div className="mt-8 p-8 md:p-10 border border-[var(--brd)] bg-gradient-to-br from-[var(--sf)] to-[var(--sf2)] rounded-2xl relative overflow-hidden">
          <span className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(200,168,74,.25)] to-transparent" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="font-serif text-[24px] font-light mb-3">Become a Validator</h3>
              <p className="text-[14px] text-[var(--tx-m)] leading-[1.7] font-light">
                Clone the repo, build the binary, generate your keystore, and register as a validator.
                Detailed setup guides available on GitHub.
              </p>
            </div>
            <div className="font-mono text-[12px] bg-[var(--sf)] p-5 border border-[rgba(200,168,74,.06)] rounded-sm leading-[1.9] text-[var(--tx-m)] overflow-x-auto">
              <span className="text-[var(--tx-d)]"># Quick start</span>{"\n"}
              <span className="text-[var(--cyan)]">git clone</span> https://github.com/sentrix-labs/sentrix.git{"\n"}
              <span className="text-[var(--cyan)]">cargo build</span> <span className="text-[var(--orange)]">--release</span>{"\n"}
              <span className="text-[var(--cyan)]">./sentrix wallet generate</span> <span className="text-[var(--orange)]">--password</span>{"\n"}
              <span className="text-[var(--cyan)]">./sentrix start</span> <span className="text-[var(--orange)]">--keystore</span> <span className="text-[var(--green)]">keystore.json</span>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
