import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";

export const metadata: Metadata = {
  title: "Sentrix Tokenomics — 315M cap, 4-year halving, 50% fee burn",
  description:
    "SRX tokenomics: 315M hard cap, 63M premine (20%), 252M mining (80%) over a BTC-parity 4-year halving schedule. 50% native fee burn. Full breakdown of premine allocation, vesting, airdrops, and listing roadmap.",
};

export default function TokenomicsDocsPage() {
  return (
    <div className="bg-[var(--bk)] min-h-screen">
      <Navbar />

      <article className="mx-auto max-w-3xl px-5 pt-32 pb-24 md:pt-40">
        {/* Eyebrow */}
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--tx-d)] mb-4">
          Docs · Tokenomics
        </p>

        {/* Title */}
        <h1 className="font-serif text-4xl md:text-5xl text-[var(--tx)] leading-[1.1] tracking-tight">
          Sentrix Chain{" "}
          <span className="text-[var(--gold)]">Tokenomics</span>
        </h1>

        <p className="mt-6 text-base md:text-lg leading-relaxed text-[var(--tx-m)] max-w-2xl">
          315 million SRX hard cap. 20% premine, 80% mined. BTC-parity 4-year
          halving. 50% native fee burn. Built to be predictable, on-chain
          verifiable, and deflationary at scale.
        </p>

        {/* Headline numbers */}
        <Section title="At a glance">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <Stat k="Hard cap" v="315M" sub="SRX, on-chain" />
            <Stat k="Premine" v="63M" sub="20% of supply" />
            <Stat k="Mining" v="252M" sub="80% over ~108y" />
            <Stat k="Block reward" v="1 SRX" sub="era 0, halves 4y" />
            <Stat k="Block time" v="1s" sub="DPoS+BFT" />
            <Stat k="Halving" v="126M blk" sub="~4 years" />
            <Stat k="Fee burn" v="50%" sub="native flat fee" />
            <Stat k="Decimals" v="8" sub="1 SRX = 1e8 sentri" />
          </div>
        </Section>

        {/* Allocation bar */}
        <Section title="Premine allocation — 63M SRX (20%)">
          <p className="mt-4 text-sm text-[var(--tx-m)] leading-relaxed">
            Four genesis wallets, set in{" "}
            <Anchor href="https://github.com/sentrix-labs/sentrix/blob/main/genesis/mainnet.toml">
              <code>genesis/mainnet.toml</code>
            </Anchor>{" "}
            and immutable. Sub-allocation policies below are governance intent;
            each top-level address is publicly auditable on{" "}
            <Anchor href="https://scan.sentrixchain.com">SentrixScan</Anchor>.
          </p>

          {/* Stacked bar */}
          <div className="mt-7 h-12 flex rounded-lg overflow-hidden border border-[var(--brd)]">
            <BarSeg pct={33.33} tone="gold" label="Founder 21M" />
            <BarSeg pct={33.33} tone="teal" label="Eco 21M" />
            <BarSeg pct={16.67} tone="purple" label="Validator 10.5M" />
            <BarSeg pct={16.67} tone="blue" label="Reserve 10.5M" />
          </div>

          <ul className="mt-7 space-y-4">
            <Slot
              tone="gold"
              name="Founder"
              amount="21,000,000 SRX"
              addr="0x5b5b06688dcdbe532353ac610aaff41af825279d"
              note={
                <>
                  Vesting commitment: <strong>12-month cliff + 48-month linear</strong> (60 mo
                  total) from mainnet launch (2026-04-25). Currently a social
                  commitment — vesting contract deploys Q3 2026 to enforce
                  on-chain.
                </>
              }
            />
            <Slot
              tone="teal"
              name="Ecosystem Fund"
              amount="21,000,000 SRX"
              addr="0xeb70fdefd00fdb768dec06c478f450c351499f14"
              note={
                <>
                  Multi-sig governed (1-of-1 today → 3-of-5 Q3 2026). Sub-targets:
                  Dev Grants 8M · Hackathon 3M · Marketing 5M · Mainnet Faucet 1M
                  · Reserve 4M.
                </>
              }
            />
            <Slot
              tone="purple"
              name="Validator Incentive Pool"
              amount="10,500,000 SRX"
              addr="0x328d56b8174697ef6c9e40e19b7663797e16fa47"
              note={
                <>
                  Distributed over ~24 months post external-validator onboarding.
                  Sub-targets: Bootstrap 5M · Self-Stake Match 3M · Slashing
                  Insurance 2.5M.
                </>
              }
            />
            <Slot
              tone="blue"
              name="Strategic Reserve"
              amount="10,500,000 SRX"
              addr="0x2578cad17e3e56c2970a5b5eab45952439f5ba97"
              note={
                <>
                  Multi-sig governed. Sub-targets: Airdrops 5M · CEX Listings 3M
                  · DEX Liquidity 1.5M · Emergency 1M.
                </>
              }
            />
          </ul>
        </Section>

        {/* Halving schedule */}
        <Section title="Halving schedule — BTC-parity, 4 years">
          <p className="mt-4 text-sm text-[var(--tx-m)] leading-relaxed">
            Every <strong>126 million blocks (~4 years)</strong>, the block
            reward halves. Mining ends asymptotically near year 108 once the
            integer reward truncates to zero (halving 27).
          </p>

          <div className="mt-6 overflow-hidden rounded-xl border border-[var(--brd)] bg-[var(--sf)]">
            <table className="w-full text-left">
              <thead className="bg-[var(--bk)]/40">
                <tr>
                  <Th>Era</Th>
                  <Th>Years (approx)</Th>
                  <Th>Reward / block</Th>
                  <Th>Era mint</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--brd)]">
                <EraRow era="0" years="0 → ~4" reward="1 SRX" mint="126,000,000" />
                <EraRow era="1" years="~4 → ~8" reward="0.5 SRX" mint="63,000,000" />
                <EraRow era="2" years="~8 → ~12" reward="0.25 SRX" mint="31,500,000" />
                <EraRow era="3" years="~12 → ~16" reward="0.125 SRX" mint="15,750,000" />
                <EraRow era="4" years="~16 → ~20" reward="0.0625 SRX" mint="7,875,000" />
                <EraRow era="…" years="…" reward="÷2 / era" mint="…" />
                <EraRow era="26" years="~108" reward="1 sentri" mint="1.26 SRX" />
                <EraRow era="27+" years="~112+" reward="0" mint="—" />
              </tbody>
            </table>
          </div>

          <p className="mt-5 text-xs text-[var(--tx-d)] leading-relaxed">
            Geometric series total: 1 × 126M × Σ(2⁻ᵏ) = 252M SRX (with ~1.88 SRX
            integer-truncation residue never minted, so the cap is reached
            asymptotically). Verifiable in source at{" "}
            <Anchor href="https://github.com/sentrix-labs/sentrix/blob/main/crates/sentrix-core/src/blockchain.rs">
              <code>crates/sentrix-core/src/blockchain.rs</code>
            </Anchor>{" "}
            (constants <code>MAX_SUPPLY_V2</code>, <code>HALVING_INTERVAL_V2</code>,{" "}
            <code>BLOCK_REWARD</code>; halving math in <code>get_block_reward()</code>).
          </p>
        </Section>

        {/* Burn */}
        <Section title="Burn mechanism">
          <p className="mt-4 text-sm text-[var(--tx-m)] leading-relaxed">
            Native flat fee is 0.0001 SRX (10,000 sentri). Every fee splits
            50/50 between the block validator and a burn — the burn share uses
            ceiling-division so odd-fee rounding never under-shoots burn.
            Algebraic invariant: <code>burn + validator == fee</code>, no
            sentri lost.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <BurnCard
              kind="Native flat fee"
              detail="50% burn, 50% validator. Implemented as fee.div_ceil(2)."
              status="✅ Live since genesis"
            />
            <BurnCard
              kind="EVM gas"
              detail="Currently routed to the same 50/50 split. EIP-1559 base-fee burn lands in a follow-up release."
              status="Roadmap"
            />
          </div>
          <p className="mt-5 text-xs text-[var(--tx-d)]">
            Live cumulative burn (h≈760k):{" "}
            <code>~15 SRX</code>. Burn rate scales with EVM dApp adoption — the
            chain becomes net-deflationary post halving 1 (~year 4) at typical
            growth assumptions.
          </p>
        </Section>

        {/* Vesting summary */}
        <Section title="Vesting & governance">
          <ul className="mt-5 space-y-3">
            <Bullet>
              <strong>Founder 21M:</strong> 12-mo cliff + 48-mo linear (social
              commitment; on-chain vesting contract Q3 2026).
            </Bullet>
            <Bullet>
              <strong>Ecosystem Fund 21M:</strong> Multi-sig governance,
              transparent disbursement.
            </Bullet>
            <Bullet>
              <strong>Validator Incentive 10.5M:</strong> Distributed over ~24
              months post external-validator onboarding kickoff.
            </Bullet>
            <Bullet>
              <strong>Strategic Reserve 10.5M:</strong> Multi-sig governance.
            </Bullet>
          </ul>
          <p className="mt-5 text-sm text-[var(--tx-m)] leading-relaxed">
            <strong>SentrixSafe</strong> at{" "}
            <code className="text-[var(--tx)]">0x6272dC0C842F05542f9fF7B5443E93C0642a3b26</code>{" "}
            (mainnet) is currently 1-of-1 with the authority signer. Migration
            to 3-of-5 multi-sig is scheduled Q3 2026.
          </p>
        </Section>

        {/* Airdrops */}
        <Section title="Airdrop strategy — 5M SRX">
          <p className="mt-4 text-sm text-[var(--tx-m)] leading-relaxed">
            Phased rollout from the Strategic Reserve. Each phase has its own
            snapshot height + criteria; distribution via Merkle-claim.
          </p>
          <ul className="mt-5 space-y-3">
            <Bullet>
              <strong>Phase 1 — Testnet Heroes</strong> (Q2 2026): 1,000,000 SRX
              to active testnet validators + power users.
            </Bullet>
            <Bullet>
              <strong>Phase 2 — Quest Campaign</strong> (Q3 2026): 1,000,000 SRX
              via Galxe/Zealy-style task completion.
            </Bullet>
            <Bullet>
              <strong>Phase 3 — Activity Rewards</strong> (Q3 2026): 800,000 SRX
              to active mainnet wallets.
            </Bullet>
            <Bullet>
              <strong>Phase 4 — Validator Delegators</strong> (Q4 2026):
              700,000 SRX pro-rata to delegators.
            </Bullet>
            <Bullet>
              <strong>Phase 5 — Retroactive Builders</strong> (Q4 2026 / Q1
              2027): 1,500,000 SRX committee-reviewed for dApp deployers, audit
              contributors, ecosystem PRs.
            </Bullet>
          </ul>
        </Section>

        {/* Listing roadmap */}
        <Section title="Listing roadmap">
          <p className="mt-4 text-sm text-[var(--tx-m)] leading-relaxed">
            All listings below are <strong>target tiers</strong>, subject to
            maintainer approval (aggregators) or commercial agreement (CEXs).
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <TierCard
              tier="Tier 0"
              when="Q2–Q3 2026"
              cost="Free"
              targets={["CoinGecko", "CoinMarketCap", "DefiLlama", "Chainlist (PR live)"]}
            />
            <TierCard
              tier="Tier 1"
              when="Q3–Q4 2026"
              cost="Listing fees"
              targets={["Tokocrypto (ID)", "Pintu (ID)", "Indodax (ID)"]}
            />
            <TierCard
              tier="Tier 2"
              when="Q4 2026 – Q1 2027"
              cost="Listing fees"
              targets={["Gate.io", "MEXC", "KuCoin"]}
            />
            <TierCard
              tier="Tier 3"
              when="2027+"
              cost="Traction-gated"
              targets={["Binance", "Coinbase"]}
            />
          </div>
        </Section>

        {/* Footer note */}
        <div className="mt-20 pt-10 border-t border-[var(--brd)]">
          <p className="text-sm text-[var(--tx-m)]">
            Source-of-truth document:{" "}
            <Anchor href="https://github.com/sentrix-labs/sentrix">
              sentrix-labs/sentrix
            </Anchor>
            . Live chain stats:{" "}
            <Anchor href="https://rpc.sentrixchain.com/chain/info">
              <code>rpc.sentrixchain.com/chain/info</code>
            </Anchor>
            . Discrepancies between this page and on-chain reality are bugs —
            please report to{" "}
            <Anchor href="mailto:security@sentrixchain.com">
              security@sentrixchain.com
            </Anchor>
            .
          </p>
          <Link
            href="/"
            className="inline-block mt-6 text-sm text-[var(--gold)] hover:text-[var(--gold-l)] transition-colors"
          >
            ← Back to Sentrix Chain
          </Link>
        </div>
      </article>

      <Footer />
    </div>
  );
}

/* ── Small components ─────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-14">
      <h2 className="font-serif text-2xl md:text-3xl text-[var(--tx)] tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Stat({ k, v, sub }: { k: string; v: string; sub: string }) {
  return (
    <div className="rounded-xl border border-[var(--brd)] bg-[var(--sf)] px-4 py-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--tx-d)]">
        {k}
      </p>
      <p className="mt-1.5 font-serif text-xl text-[var(--tx)] tabular-nums">{v}</p>
      <p className="mt-0.5 text-[11px] text-[var(--tx-m)]">{sub}</p>
    </div>
  );
}

type Tone = "gold" | "teal" | "purple" | "blue";

function toneBg(tone: Tone) {
  switch (tone) {
    case "gold":
      return "bg-[var(--gold)]";
    case "teal":
      return "bg-[var(--teal)]";
    case "purple":
      return "bg-[var(--purple)]";
    case "blue":
      return "bg-[var(--blue)]";
  }
}

function toneFg(tone: Tone) {
  switch (tone) {
    case "gold":
      return "text-[var(--gold)]";
    case "teal":
      return "text-[var(--teal)]";
    case "purple":
      return "text-[var(--purple)]";
    case "blue":
      return "text-[var(--blue)]";
  }
}

function BarSeg({ pct, tone, label }: { pct: number; tone: Tone; label: string }) {
  return (
    <div
      className={`${toneBg(tone)} flex items-center justify-center text-[10px] font-mono text-black/80 px-2`}
      style={{ width: `${pct}%` }}
      title={label}
    >
      <span className="hidden md:inline tabular-nums">{label}</span>
    </div>
  );
}

function Slot({
  tone,
  name,
  amount,
  addr,
  note,
}: {
  tone: Tone;
  name: string;
  amount: string;
  addr: string;
  note: React.ReactNode;
}) {
  return (
    <li className="rounded-xl border border-[var(--brd)] bg-[var(--sf)] p-5">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <h3 className={`font-serif text-lg ${toneFg(tone)}`}>{name}</h3>
        <p className="font-mono text-sm text-[var(--tx)] tabular-nums">{amount}</p>
      </div>
      <p className="mt-2 font-mono text-[10px] text-[var(--tx-d)] break-all">{addr}</p>
      <p className="mt-3 text-sm text-[var(--tx-m)] leading-relaxed">{note}</p>
    </li>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--tx-d)] font-medium">
      {children}
    </th>
  );
}

function EraRow({
  era,
  years,
  reward,
  mint,
}: {
  era: string;
  years: string;
  reward: string;
  mint: string;
}) {
  return (
    <tr>
      <td className="px-5 py-3 text-[var(--tx-m)] text-sm font-mono">{era}</td>
      <td className="px-5 py-3 text-[var(--tx-m)] text-sm">{years}</td>
      <td className="px-5 py-3 text-[var(--tx)] text-sm font-mono">{reward}</td>
      <td className="px-5 py-3 text-[var(--tx)] text-sm font-mono tabular-nums">
        {mint}
      </td>
    </tr>
  );
}

function BurnCard({
  kind,
  detail,
  status,
}: {
  kind: string;
  detail: string;
  status: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--brd)] bg-[var(--sf)] p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--gold)]">
        {kind}
      </p>
      <p className="mt-3 text-sm text-[var(--tx-m)] leading-relaxed">{detail}</p>
      <p className="mt-3 text-xs text-[var(--tx-d)]">{status}</p>
    </div>
  );
}

function TierCard({
  tier,
  when,
  cost,
  targets,
}: {
  tier: string;
  when: string;
  cost: string;
  targets: string[];
}) {
  return (
    <div className="rounded-2xl border border-[var(--brd)] bg-[var(--sf)] p-6">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--gold)]">
          {tier}
        </p>
        <p className="font-mono text-[10px] text-[var(--tx-d)]">{when}</p>
      </div>
      <p className="mt-3 text-xs text-[var(--tx-d)]">{cost}</p>
      <ul className="mt-4 space-y-1.5 text-sm text-[var(--tx)]">
        {targets.map((t) => (
          <li key={t}>· {t}</li>
        ))}
      </ul>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="text-[var(--gold)] mt-2 shrink-0">·</span>
      <span className="text-sm leading-relaxed text-[var(--tx-m)]">{children}</span>
    </li>
  );
}

function Anchor({ href, children }: { href: string; children: React.ReactNode }) {
  const isExternal = href.startsWith("http") || href.startsWith("mailto");
  return (
    <a
      href={href}
      {...(isExternal ? { target: "_blank", rel: "noreferrer" } : {})}
      className="text-[var(--gold)] hover:text-[var(--gold-l)] transition-colors underline-offset-2 hover:underline"
    >
      {children}
    </a>
  );
}
