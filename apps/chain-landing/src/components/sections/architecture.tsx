"use client";

import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "./section-header";
import { METAMASK_CONFIG, SITE } from "@/data/content";

const ARCH_MODULES = [
  { title: "Core Engine", desc: "blockchain.rs · block.rs · transaction.rs · account.rs · authority.rs · vm.rs · merkle.rs" },
  { title: "Wallet", desc: "wallet.rs (keygen, Keccak-256) · keystore.rs (AES-256-GCM, PBKDF2)" },
  { title: "Network", desc: "node.rs (TCP, length-prefixed JSON, 10MB max) · sync.rs (incremental sync, 100 blocks/chunk)" },
  { title: "API Layer", desc: "routes.rs (REST/axum) · jsonrpc.rs (RPC) · explorer.rs (web UI)" },
];

export function Architecture() {
  return (
    <section id="architecture" className="py-[120px] px-6 md:px-[60px]">
      <Reveal>
        <SectionHeader
          tag="Under The Hood"
          title="System"
          titleEm="architecture."
          subtitle="A modular, layered architecture built entirely in Rust. Every component is purpose-built and independently testable."
        />
      </Reveal>

      {/* ASCII Diagram */}
      <Reveal delay={0.1}>
      <div className="bg-gradient-to-br from-[var(--sf)] to-[var(--sf2)] border border-[var(--brd)] p-8 md:p-12 overflow-x-auto mt-[60px] rounded-2xl">
        <pre className="font-mono text-[12px] leading-[1.6] text-[var(--tx-m)] whitespace-pre text-center">
{`                     `}<span className="text-[var(--gold)]">sentrix (CLI)</span>{`
                  16 commands via clap
        ┌──────────────┴──────────────────┐
        │                                 │
  `}<span className="text-[var(--cyan)]">REST API (19)</span>{`                   `}<span className="text-[var(--cyan)]">Block Explorer</span>{`
  `}<span className="text-[var(--cyan)]">JSON-RPC (20)</span>{`                   `}<span className="text-[var(--cyan)]">6 pages, dark UI</span>{`
        │                                 │
        └──────────────┬──────────────────┘
                       │
        `}<span className="text-[var(--green)]">core/blockchain.rs</span>{` — The Engine
   ┌─────────┬─────────┼─────────┬──────────┐
   │         │         │         │          │
`}<span className="text-[var(--gold)]">AccountDB</span>{`  `}<span className="text-[var(--gold)]">Authority</span>{`  `}<span className="text-[var(--gold)]">Mempool</span>{`  `}<span className="text-[var(--gold)]">SRC-20 VM</span>{`  `}<span className="text-[var(--gold)]">Merkle</span>{`
 balances    PoA     priority   tokens    SHA-256
 + nonces  round-     fee      ERC-20     tree
           robin    sorting   compat.
   │         │         │         │          │
   └─────────┴─────────┴─────────┴──────────┘
                       │
   ┌───────────────────┼───────────────────┐
   │                   │                   │
`}<span className="text-[var(--gold)]">Wallet</span>{`            `}<span className="text-[var(--gold)]">Storage</span>{`           `}<span className="text-[var(--gold)]">P2P Node</span>{`
ECDSA + AES-GCM   libmdbx          TCP broadcast
Keccak-256 addr   per-block        chain sync`}
        </pre>
      </div>
      </Reveal>

      {/* Module Cards */}
      <Reveal delay={0.2}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
        {ARCH_MODULES.map((m, i) => (
          <div key={i} className="group bg-gradient-to-br from-[var(--bk)] to-[var(--sf)] p-7 text-center transition-all duration-350 hover:from-[var(--sf)] hover:to-[var(--sf2)] relative overflow-hidden rounded-2xl border border-[var(--brd)]">
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-px bg-[var(--gold)] transition-all duration-400 group-hover:w-[60%]" />
            <h4 className="text-[13px] font-semibold mb-2 tracking-[.03em] transition-colors duration-300 group-hover:text-[var(--gold-l)]">
              {m.title}
            </h4>
            <p className="font-mono text-[10px] text-[var(--tx-d)] leading-[1.7]">{m.desc}</p>
          </div>
        ))}
      </div>
      </Reveal>

      {/* MetaMask Banner */}
      <Reveal delay={0.15}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[60px] items-center mt-[60px] p-10 md:p-[52px] border border-[var(--brd)] bg-gradient-to-br from-[var(--sf)] to-[var(--sf2)] relative overflow-hidden rounded-2xl">
        <span className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(200,168,74,.25)] to-transparent" />
        <div>
          <h3 className="font-serif text-[28px] font-light mb-3.5">Connect with MetaMask</h3>
          <p className="text-[14px] text-[var(--tx-m)] leading-[1.7] font-light">
            Add Sentrix as a custom network in MetaMask and start transacting in seconds. Compatible with ethers.js and web3.js.
          </p>
        </div>
        <div className="font-mono text-[12px] bg-[var(--sf)] p-5 border border-[rgba(200,168,74,.06)] rounded-sm">
          {METAMASK_CONFIG.map((c, i) => (
            <div key={i} className="flex gap-4 py-2.5 border-b border-[rgba(200,168,74,.05)] last:border-b-0 group/row">
              <span className="text-[var(--tx-d)] min-w-[120px] text-[11px] tracking-[.06em]">{c.label}</span>
              <span className="text-[var(--gold)] transition-all duration-300 group-hover/row:[text-shadow:0_0_10px_rgba(200,168,74,.3)]">{c.value}</span>
            </div>
          ))}
        </div>
      </div>
      </Reveal>
    </section>
  );
}
