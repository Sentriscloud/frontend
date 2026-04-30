"use client";

import { BookOpen } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";

// Glossary — onboarding aid for users who land on scan and don't know
// what BFT round, justification signers, rail badge, finality state, or
// SRX-vs-sentri mean. Sorted alphabetically; jump-anchors via `id` on
// each entry so we can deeplink (e.g. /glossary#justification).

const entries: { term: string; id: string; def: string }[] = [
  {
    term: "Active validator set",
    id: "active-set",
    def: "The list of validators currently producing blocks. Sentrix selects the active set every epoch by stake-weighted ranking. Validators outside the active set are still registered and may earn rotation back in if their stake is sufficient.",
  },
  {
    term: "Address",
    id: "address",
    def: "A 20-byte hex identifier (0x-prefixed) that holds SRX or SRC-20 tokens, runs an EVM contract, or signs transactions. Same format as Ethereum addresses; standard Ethereum tooling (MetaMask, ethers, viem) works on Sentrix without modification.",
  },
  {
    term: "BFT (Byzantine Fault Tolerant)",
    id: "bft",
    def: "Sentrix's consensus protocol. Validators run a three-phase round (propose, prevote, precommit) for each block. A block is final once two-thirds of stake-weighted validators have precommitted it. BFT tolerates up to one-third Byzantine (malicious or offline) stake without losing safety.",
  },
  {
    term: "BFT round",
    id: "bft-round",
    def: "One attempt at finalizing a block at a given height. Round 0 is the happy-path attempt. Higher round numbers indicate the cluster needed extra attempts (network jitter, proposer offline, etc.) — usually not a problem, but persistent high rounds can indicate validator issues.",
  },
  {
    term: "Block",
    id: "block",
    def: "A bundle of finalized transactions plus a header committing to the chain's state root and the previous block's hash. Sentrix targets a one-second block time. Each block has a height (sequential number from genesis), a hash (cryptographic fingerprint), and a validator who proposed it.",
  },
  {
    term: "Block height",
    id: "block-height",
    def: "The block's sequential number. Genesis is height 0; each subsequent block adds 1. The chain's current height equals the height of the most recent finalized block.",
  },
  {
    term: "Burn",
    id: "burn",
    def: "Permanent destruction of SRX. Sentrix burns 50% of every transaction fee, plus any slashed validator stake. Burned SRX is sent to a verifiable address from which no transaction can be produced; the total destroyed is publicly observable on /supply.",
  },
  {
    term: "Delegate",
    id: "delegate",
    def: "Stake SRX with a validator without running validator infrastructure yourself. Delegators earn a share of the validator's rewards minus the validator's commission. Stake is bonded to the validator's slashing risk; if the validator is slashed, delegators lose proportionally.",
  },
  {
    term: "DPoS (Delegated Proof of Stake)",
    id: "dpos",
    def: "The model used to select Sentrix's active validator set. Token holders delegate to validator candidates; the candidates with highest stake-weighted total form the active set for each epoch. Combined with BFT for finalization (Sentrix uses both: DPoS for selection + BFT for agreement).",
  },
  {
    term: "Epoch",
    id: "epoch",
    def: "A fixed window of blocks during which the active validator set does not change. At each epoch boundary, Sentrix recomputes the active set from current stake delegations. New validators enter, underperforming ones exit.",
  },
  {
    term: "EVM (Ethereum Virtual Machine)",
    id: "evm",
    def: "The execution environment for smart contracts. Sentrix runs the EVM via revm (a high-performance Rust implementation). Standard Ethereum contracts deploy on Sentrix without modification. Contract addresses, gas, opcodes — all behave like Ethereum.",
  },
  {
    term: "Finality",
    id: "finality",
    def: "The state of a transaction or block being permanent. On Sentrix, BFT provides single-block finality: a block is final the moment its precommit supermajority is observed. Finalized transactions cannot be reorganized out of the chain.",
  },
  {
    term: "Gas",
    id: "gas",
    def: "Unit of computation cost on the EVM rail. Sentrix uses standard Ethereum gas accounting. Native operations (SRC-20, staking) bypass the EVM and cost a flat MIN_TX_FEE instead.",
  },
  {
    term: "Genesis",
    id: "genesis",
    def: "The very first block (height 0) and its associated state. Includes the 63M SRX premine allocation, initial validator set, and protocol parameters. The genesis configuration is public and verifiable; any node can replay it from scratch.",
  },
  {
    term: "Halving",
    id: "halving",
    def: "Sentrix's block reward halves every approximately 126 million blocks (~four years at one-second blocks), modeled on Bitcoin. The first halving reduces 1 SRX to 0.5 SRX, the second to 0.25 SRX, and so on. This produces a predictable disinflationary supply curve converging to the 315M cap.",
  },
  {
    term: "Jail",
    id: "jail",
    def: "A penalty state for validators that miss too many blocks (downtime) or sign conflicting blocks (double-sign). Jailed validators are removed from the active set and a portion of their stake is slashed. Re-entry requires an explicit unjail transaction.",
  },
  {
    term: "Justification",
    id: "justification",
    def: "The set of validator precommit signatures that proves a block was finalized by BFT supermajority. Each block carries the justification of its parent, providing public proof of finalization.",
  },
  {
    term: "MIN_TX_FEE",
    id: "min-tx-fee",
    def: "The flat protocol-minimum fee for native rail transactions: 10,000 sentri (0.0001 SRX). 50% is burned, 50% goes to the block proposer. EVM rail uses standard EIP-1559 gas pricing instead.",
  },
  {
    term: "Native rail",
    id: "native-rail",
    def: "Operations interpreted directly by Sentrix's protocol without going through the EVM. Includes SRC-20 token operations, staking (delegate, undelegate, claim rewards), and validator coordination. Faster and cheaper than EVM-equivalent operations because there's no contract execution overhead.",
  },
  {
    term: "Nonce",
    id: "nonce",
    def: "An account's transaction sequence number. Each transaction must use the next sequential nonce (current nonce + 1). Prevents replay attacks and ensures transactions apply in order.",
  },
  {
    term: "Premine",
    id: "premine",
    def: "63 million SRX (20% of the 315M cap) allocated at genesis across four roles: founder (21M), early validator (10.5M), ecosystem fund (21M), reserve (10.5M). The remaining 80% issues through block rewards over ~24 years.",
  },
  {
    term: "Proposer",
    id: "proposer",
    def: "The validator selected to propose the next block. Sentrix rotates the proposer round-robin through the active set, weighted by stake — higher-stake validators propose proportionally more often.",
  },
  {
    term: "Rail (transaction rail)",
    id: "rail",
    def: "Sentrix has multiple execution rails: Native (SRX transfers, SRC-20, staking), EVM (smart contracts), Token (SRC-20 ops), Stake (staking ops). The scan UI labels each transaction with its rail badge so you can tell at a glance what kind of transaction it is.",
  },
  {
    term: "RPC",
    id: "rpc",
    def: "Remote Procedure Call interface for interacting with Sentrix programmatically. Both standard JSON-RPC (compatible with Ethereum tooling) and Sentrix-specific REST endpoints are supported. See /api-docs for the full list.",
  },
  {
    term: "Sentri",
    id: "sentri",
    def: "The smallest unit of SRX. 1 SRX = 100,000,000 sentri (10⁸). Comparable to satoshi-vs-bitcoin. The native rail uses sentri as the unit; the EVM rail uses wei (10¹⁸) for Ethereum tooling compatibility.",
  },
  {
    term: "Slashing",
    id: "slashing",
    def: "Destruction of validator stake as a penalty for misbehavior. Sentrix slashes for two triggers: double-sign (~20%, permanent jail) and downtime (~0.1%, configurable jail duration). Slashed SRX is burned, not redistributed.",
  },
  {
    term: "Sourcify",
    id: "sourcify",
    def: "Open-standard contract verification service. Sentrix self-hosts Sourcify at verify.sentrixchain.com. Once a contract is verified, scan can decode its function calls + events using the verified ABI.",
  },
  {
    term: "SRC-20",
    id: "src-20",
    def: "Sentrix's native fungible token standard. Functionally similar to ERC-20 (transfer, approve, allowance) but implemented as protocol-level operations rather than smart contracts — cheaper, faster, and audit-once-correct-forever.",
  },
  {
    term: "SRX",
    id: "srx",
    def: "Sentrix's native asset. Maximum supply 315 million; halving every ~four years; 50% of every fee burned forever. Used for paying transaction fees, staking, and as the unit of account on chain.",
  },
  {
    term: "Stake",
    id: "stake",
    def: "SRX that a validator (or delegator) has bonded to the protocol as economic security. Stake is at risk: provable misbehavior is slashed. Higher stake = more block production frequency + more reward share. Stake is illiquid during the unbonding period after withdrawal.",
  },
  {
    term: "Stake registry",
    id: "stake-registry",
    def: "The on-chain mapping of validators to their bonded stake (self-stake + delegated). Updated on every staking operation, slashing event, and epoch transition. Used to compute the active validator set and reward distributions.",
  },
  {
    term: "State root",
    id: "state-root",
    def: "Cryptographic commitment to the entire blockchain state at a specific block height. Embedded in the block hash post-activation. Two nodes that disagree on state will produce divergent block hashes — BFT then ensures the chain converges on a single canonical history.",
  },
  {
    term: "Testnet",
    id: "testnet",
    def: "Sentrix's developer playground (chain ID 7120, separate from mainnet 7119). Free testnet SRX (tSRX) available from faucet.sentrixchain.com. Same protocol as mainnet but with no real economic value — for testing contracts, integrations, and tooling.",
  },
  {
    term: "Unbonding period",
    id: "unbonding",
    def: "The time window after withdrawing delegated stake during which the stake remains slashable but no longer earns rewards. Prevents validators from offloading risk immediately before misbehaving. Defends against long-range attacks.",
  },
  {
    term: "Validator",
    id: "validator",
    def: "A node that participates in producing and finalizing blocks via BFT consensus. Validators must bond a minimum self-stake to register. They earn block rewards (fixed subsidy) plus a share of transaction fees in blocks they propose.",
  },
  {
    term: "WSRX",
    id: "wsrx",
    def: "Wrapped SRX — an SRC-20 representation of native SRX. Useful for EVM contracts that expect ERC-20-style interaction (DEXs, lending, etc.). 1:1 backed: deposit native SRX → receive WSRX, and vice versa via withdraw.",
  },
];

export default function GlossaryPage() {
  const grouped = entries.reduce<Record<string, typeof entries>>((acc, e) => {
    const letter = e.term[0].toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(e);
    return acc;
  }, {});
  const letters = Object.keys(grouped).sort();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
      <PageHeader icon={BookOpen} eyebrow="Glossary" title="Sentrix terminology" />

      <Card>
        <CardContent className="p-6 md:p-8 space-y-6">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Quick reference for terms you&apos;ll see across the explorer, RPC docs, and chain operator
            output. Bookmark / deeplink any entry via its anchor (e.g.{" "}
            <code className="font-mono text-xs px-1 py-0.5 rounded bg-muted">/glossary#justification</code>).
          </p>

          {/* Letter index */}
          <div className="flex flex-wrap gap-1.5 pb-3 border-b border-border/60">
            {letters.map((l) => (
              <a
                key={l}
                href={`#letter-${l}`}
                className="inline-flex items-center justify-center h-7 w-7 rounded-md text-[11px] font-mono uppercase tracking-[.1em] bg-muted/50 hover:bg-[var(--gold)]/10 hover:text-[var(--gold)] transition-colors"
              >
                {l}
              </a>
            ))}
          </div>

          {/* Entries */}
          <div className="space-y-8">
            {letters.map((l) => (
              <div key={l} id={`letter-${l}`} className="space-y-4 scroll-mt-20">
                <h2 className="font-mono text-[11px] tracking-[.2em] uppercase text-[var(--gold)]">
                  {l}
                </h2>
                {grouped[l].map((e) => (
                  <div key={e.id} id={e.id} className="scroll-mt-20 space-y-1.5 pb-4 border-b border-border/30 last:border-0">
                    <h3 className="text-base font-medium">{e.term}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{e.def}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
