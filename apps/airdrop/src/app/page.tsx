import { ClaimWidget } from "@/components/ClaimWidget";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* ── Hero ──────────────────────────────────────────── */}
      <header className="px-6 pt-12 pb-8 max-w-3xl mx-auto w-full text-center">
        <p className="font-mono text-[10px] tracking-[.22em] uppercase text-[var(--gold)] mb-4">
          Sentrix · Airdrop · Phase 1
        </p>
        <h1 className="font-serif text-[42px] md:text-[56px] leading-[1.05] tracking-tight text-[var(--tx)]">
          Testnet Heroes
        </h1>
        <p className="mt-5 text-[14px] md:text-[15px] text-[var(--tx-m)] leading-relaxed max-w-xl mx-auto">
          1,000,000 SRX distributed to wallets that ran the chain through testnet — sustained
          activity, real participation, no farm-style claims. Eligibility is computed against a
          frozen testnet snapshot; claims are paid in mainnet SRX via an on-chain Merkle proof.
        </p>
      </header>

      {/* ── Claim widget ──────────────────────────────────── */}
      <section className="px-6 flex-1 flex flex-col items-center">
        <ClaimWidget />
      </section>

      {/* ── Trust + transparency footer ──────────────────── */}
      <footer className="px-6 py-10 mt-12 border-t border-[var(--brd)]">
        <div className="max-w-3xl mx-auto grid md:grid-cols-3 gap-6 text-[12px] text-[var(--tx-m)]">
          <div>
            <p className="font-semibold text-[var(--tx)] mb-1.5">How eligibility was computed</p>
            <p className="leading-relaxed">
              Snapshot scanned the testnet (chain 7120) for wallets meeting the cumulative-tx and
              wallet-age thresholds. Premine wallets, validators, governance signers, and faucet
              wallets are excluded by hard rule.
            </p>
          </div>
          <div>
            <p className="font-semibold text-[var(--tx)] mb-1.5">How distribution works</p>
            <p className="leading-relaxed">
              Strategic Reserve pre-funds the MerkleAirdrop contract. You connect your wallet,
              fetch your proof, call <code>claim()</code> on chain 7119, and the contract sends
              SRX to your address. One claim per address. Unclaimed SRX returns to Strategic
              Reserve at sweep.
            </p>
          </div>
          <div>
            <p className="font-semibold text-[var(--tx)] mb-1.5">Auditability</p>
            <p className="leading-relaxed">
              The eligibility list, the snapshot height + block hash, and the Merkle root are all
              public and verifiable. Anyone can re-derive the root from the list and confirm it
              matches what the contract enforces on chain.
              <br />
              <a
                className="text-[var(--gold)] hover:text-[var(--gold-l)]"
                href="https://github.com/sentrix-labs/sentrix/blob/main/docs/tokenomics/AIRDROP_MECHANICS.md"
                target="_blank"
                rel="noopener noreferrer"
              >
                Mechanics doc →
              </a>
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
