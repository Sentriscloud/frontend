"use client";

import { Reveal } from "@/components/ui/reveal";
import {
  AddToWalletButton,
  SENTRIX_MAINNET_ADD_PARAMS,
  SENTRIX_TESTNET_ADD_PARAMS,
} from "@/components/ui/add-to-wallet-button";
import { SectionHeader } from "./section-header";

export function Developers() {
  return (
    <section id="developers" className="py-[120px] px-6 md:px-[60px]">
      <Reveal>
        <SectionHeader
          tag="Build on Sentrix"
          title="Developer"
          titleEm="quick start."
          subtitle="From zero to running node in under a minute. One binary, no external dependencies."
        />
      </Reveal>

      <Reveal delay={0.15}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-[60px]">
        {/* Getting Started */}
        <div className="group bg-gradient-to-br from-[var(--bk)] to-[var(--sf)] transition-all duration-500 overflow-hidden rounded-2xl border border-[var(--brd)] hover:border-[rgba(122,184,200,.15)] relative">
          <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-[50px]" style={{ background: "var(--cyan)" }} />
          <div className="flex items-center gap-3 px-6 py-3.5 border-b border-[var(--brd)] font-mono text-[10px] text-[var(--tx-d)] tracking-[.12em] bg-[rgba(0,0,0,.15)]">
            <div className="flex gap-1.5">
              <span className="w-[9px] h-[9px] rounded-full bg-[var(--red)] opacity-70" />
              <span className="w-[9px] h-[9px] rounded-full bg-[var(--orange)] opacity-70" />
              <span className="w-[9px] h-[9px] rounded-full bg-[var(--green)] opacity-70" />
            </div>
            Getting Started
          </div>
          <div className="p-7 font-mono text-[12px] leading-[1.9] text-[var(--tx-m)] overflow-x-auto relative">
            <span className="text-[var(--tx-d)]"># Clone and build</span>{"\n"}
            <span className="text-[var(--cyan)]">git clone</span> https://github.com/sentrix-labs/sentrix.git{"\n"}
            <span className="text-[var(--cyan)]">cd</span> sentrix{"\n"}
            <span className="text-[var(--cyan)]">cargo build</span> <span className="text-[var(--orange)]">--release</span>{"\n\n"}
            <span className="text-[var(--tx-d)]"># Generate a wallet</span>{"\n"}
            <span className="text-[var(--cyan)]">./sentrix wallet generate</span>{"\n\n"}
            <span className="text-[var(--tx-d)]"># Initialize blockchain</span>{"\n"}
            <span className="text-[var(--cyan)]">./sentrix init</span> <span className="text-[var(--orange)]">--admin</span> <span className="text-[var(--green)]">0xYOUR_ADDRESS</span>{"\n\n"}
            <span className="text-[var(--tx-d)]"># Start the node</span>{"\n"}
            <span className="text-[var(--cyan)]">./sentrix start</span> <span className="text-[var(--orange)]">--validator-key</span> <span className="text-[var(--green)]">YOUR_KEY</span>
          </div>
        </div>

        {/* CLI Reference */}
        <div className="group bg-gradient-to-br from-[var(--bk)] to-[var(--sf)] transition-all duration-500 overflow-hidden rounded-2xl border border-[var(--brd)] hover:border-[rgba(167,139,250,.15)] relative">
          <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-[50px]" style={{ background: "var(--purple)" }} />
          <div className="flex items-center gap-3 px-6 py-3.5 border-b border-[var(--brd)] font-mono text-[10px] text-[var(--tx-d)] tracking-[.12em] bg-[rgba(0,0,0,.15)]">
            <div className="flex gap-1.5">
              <span className="w-[9px] h-[9px] rounded-full bg-[var(--red)] opacity-70" />
              <span className="w-[9px] h-[9px] rounded-full bg-[var(--orange)] opacity-70" />
              <span className="w-[9px] h-[9px] rounded-full bg-[var(--green)] opacity-70" />
            </div>
            CLI Reference
          </div>
          <div className="p-7 font-mono text-[12px] leading-[1.9] text-[var(--tx-m)] overflow-x-auto relative">
            <span className="text-[var(--tx-d)]"># Chain</span>{"\n"}
            <span className="text-[var(--purple)]">sentrix</span> chain info{"\n"}
            <span className="text-[var(--purple)]">sentrix</span> chain validate{"\n"}
            <span className="text-[var(--purple)]">sentrix</span> chain block <span className="text-[var(--orange)]">&lt;index&gt;</span>{"\n\n"}
            <span className="text-[var(--tx-d)]"># Wallet</span>{"\n"}
            <span className="text-[var(--purple)]">sentrix</span> wallet generate <span className="text-[var(--orange)]">--password</span> <span className="text-[var(--green)]">pw</span>{"\n"}
            <span className="text-[var(--purple)]">sentrix</span> wallet import <span className="text-[var(--orange)]">&lt;key&gt;</span>{"\n\n"}
            <span className="text-[var(--tx-d)]"># Transactions</span>{"\n"}
            <span className="text-[var(--purple)]">sentrix</span> balance <span className="text-[var(--green)]">0xADDRESS</span>{"\n"}
            <span className="text-[var(--purple)]">sentrix</span> history <span className="text-[var(--green)]">0xADDRESS</span>{"\n\n"}
            <span className="text-[var(--tx-d)]"># Validators</span>{"\n"}
            <span className="text-[var(--purple)]">sentrix</span> validator list{"\n"}
            <span className="text-[var(--purple)]">sentrix</span> validator add <span className="text-[var(--orange)]">&lt;addr&gt;</span> <span className="text-[var(--orange)]">&lt;name&gt;</span>
          </div>
        </div>
      </div>
      </Reveal>

      <Reveal delay={0.25}>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[var(--brd)] bg-[var(--sf)] p-6">
          <p className="text-[10px] font-mono tracking-[.15em] text-[var(--cyan)] mb-2">MAINNET</p>
          <p className="text-sm text-[var(--tx-m)] leading-relaxed font-mono">
            RPC: <span className="text-[var(--tx)]">https://rpc.sentrixchain.com</span><br/>
            Chain ID: <span className="text-[var(--tx)]">7119</span> (0x1bcf)<br/>
            Explorer: <a href="https://scan.sentrixchain.com" target="_blank" rel="noopener noreferrer" className="text-[var(--cyan)] hover:underline">scan.sentrixchain.com</a>
          </p>
          <div className="mt-4">
            <AddToWalletButton
              params={SENTRIX_MAINNET_ADD_PARAMS}
              label="Add Sentrix to Wallet"
              variant="primary"
            />
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--brd)] bg-[var(--sf)] p-6">
          <p className="text-[10px] font-mono tracking-[.15em] text-[var(--orange)] mb-2">TESTNET</p>
          <p className="text-sm text-[var(--tx-m)] leading-relaxed font-mono">
            RPC: <span className="text-[var(--tx)]">https://testnet-rpc.sentrixchain.com</span><br/>
            Chain ID: <span className="text-[var(--tx)]">7120</span> (0x1bd0)<br/>
            Explorer: <a href="https://scan.sentrixchain.com" target="_blank" rel="noopener noreferrer" className="text-[var(--cyan)] hover:underline">scan.sentrixchain.com</a> (toggle Testnet)<br/>
            Faucet: <a href="https://faucet.sentrixchain.com" target="_blank" rel="noopener noreferrer" className="text-[var(--cyan)] hover:underline">faucet.sentrixchain.com</a> — free tokens, no real value
          </p>
          <div className="mt-4">
            <AddToWalletButton
              params={SENTRIX_TESTNET_ADD_PARAMS}
              label="Add Testnet to Wallet"
              variant="secondary"
            />
          </div>
        </div>
      </div>
      </Reveal>
    </section>
  );
}
