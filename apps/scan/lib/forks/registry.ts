// Authoritative fork-activation registry. Mirrors the internal Sentrix Labs
// fork-gates reference — kept in sync by hand for now (any time we ship a
// new fork const in `crates/sentrix-core`, we add an entry here too).
//
// Each entry pairs an env-var name with the height the fork activated on
// each network. `null` for a network means "still parked at u64::MAX (not
// activated)" — the UI renders that as "Dormant" in the timeline.
//
// Sources for the heights below: chain hardfork table + jail-consensus
// activation note in `U64_MAX_FORK_GATES.md`.

import type { NetworkId } from "../chain";

export interface ForkEntry {
  /** Stable identifier — used as the React key + URL fragment. */
  id: string;
  /** Display name (the env-var name, with dashes for readability). */
  title: string;
  /** Short one-line description aimed at non-technical users. */
  summary: string;
  /** Fully expanded description for the detail panel. */
  description: string;
  /** Per-network activation height; null means dormant on that network. */
  heights: Record<NetworkId, number | null>;
  /** Risk class — "shipped", "dormant", "danger" (do-not-activate). */
  state: "shipped" | "dormant" | "danger";
}

export const FORKS: ForkEntry[] = [
  {
    id: "state-root",
    title: "STATE_ROOT_FORK_HEIGHT",
    summary: "Block hash starts committing to the post-block account state root.",
    description:
      "Before this fork the block hash was computed without including the trie state root, " +
      "so two validators could disagree on state and still produce identical block hashes — " +
      "any disagreement only surfaced via balance queries. After activation the trie root is " +
      "part of the block hash, so any state divergence triggers an immediate `previous_hash` " +
      "mismatch on the next block and prevents silent forks.",
    heights: { mainnet: 100_000, testnet: 100_000 },
    state: "shipped",
  },
  {
    id: "legacy-validation",
    title: "SENTRIX_LEGACY_VALIDATION_HEIGHT",
    summary: "Closes the txid_index backfill startup hang (#268).",
    description:
      "Below this height the node skips strict re-validation of historical blocks during MDBX " +
      "warm-up, because the pre-cutover history was produced under looser invariants. From this " +
      "height onward every block goes through the strict validator at boot.",
    heights: { mainnet: 557_144, testnet: 0 },
    state: "shipped",
  },
  {
    id: "voyager",
    title: "VOYAGER_FORK_HEIGHT",
    summary: "Activates DPoS proposer rotation + 3-phase BFT finality.",
    description:
      "Replaces the bootstrap Pioneer round-robin proposer with Voyager — Tendermint-style " +
      "Propose → Prevote → Precommit → Finalize over a DPoS-elected validator set. From this " +
      "height onward every block carries a `BlockJustification` with the precommits that " +
      "finalised it, and finality at 2/3+1 stake weight is observable on-chain.",
    heights: { mainnet: 579_047, testnet: 10 },
    state: "shipped",
  },
  {
    id: "voyager-evm",
    title: "VOYAGER_EVM_HEIGHT",
    summary: "Turns on the embedded revm runtime for `eth_sendRawTransaction`.",
    description:
      "Before this fork the chain ran native Sentrix transactions only. After activation the " +
      "node embeds a revm interpreter and accepts standard EVM transactions, so Hardhat / Foundry " +
      "/ ethers.js / viem dApps work without any Sentrix-specific tooling.",
    heights: { mainnet: 579_060, testnet: 752 },
    state: "shipped",
  },
  {
    id: "reward-v2",
    title: "VOYAGER_REWARD_V2_HEIGHT",
    summary: "Coinbase routes to the protocol treasury; rewards are claimed.",
    description:
      "Pre-fork the block reward was credited directly to the proposer. Post-fork the coinbase " +
      "deposits 1 SRX into the protocol treasury at `0x0000…0002`, and validators + delegators " +
      "claim their accrued share via `StakingOp::ClaimRewards`. Keeps stake registry rewards " +
      "and account balances in lock-step without per-block payouts.",
    heights: { mainnet: 590_100, testnet: 100 },
    state: "shipped",
  },
  {
    id: "tokenomics-v2",
    title: "TOKENOMICS_V2_HEIGHT",
    summary: "Max supply moves to 315M; halving aligns with BTC-parity 4y schedule.",
    description:
      "Pre-fork the cap was 210M with 42M-block halvings. Post-fork: 315M cap, 126M-block " +
      "halving (~4 years at 1s blocks). Tightens the issuance curve to BTC-parity for the long " +
      "tail and restores the 20% premine ratio.",
    heights: { mainnet: 640_800, testnet: 381_651 },
    state: "shipped",
  },
  {
    id: "bft-gate-relax",
    title: "BFT_GATE_RELAX_HEIGHT",
    summary: "BFT can run with ⌈2/3 × N⌉ active validators instead of full mesh.",
    description:
      "Originally BFT activation required every active validator to be connected at startup. " +
      "Post-fork the gate relaxes to ⌈2/3 × N⌉, so the chain can recover from a single-validator " +
      "outage without a coordinated halt-and-restart.",
    heights: { mainnet: 692_700, testnet: 551_500 },
    state: "shipped",
  },
  {
    id: "add-self-stake",
    title: "ADD_SELF_STAKE_HEIGHT",
    summary: "Validators can top up `self_stake` from their wallet without a phantom mint.",
    description:
      "Recovery path for validators that fall under `MIN_SELF_STAKE`: bond real SRX into " +
      "`self_stake` directly via `StakingOp::AddSelfStake`. Pre-fork the only path was the " +
      "`force-unjail` CLI, which mutated the registry without a corresponding balance debit and " +
      "left the supply invariant slightly off.",
    heights: { mainnet: 731_245, testnet: 0 },
    state: "shipped",
  },
  {
    id: "jail-consensus",
    title: "JAIL_CONSENSUS_HEIGHT",
    summary: "Jail decisions become consensus state via `JailEvidenceBundle` system txs.",
    description:
      "Replaces the legacy local-only `check_liveness` jail trigger with an epoch-boundary " +
      "system transaction (`StakingOp::JailEvidenceBundle`, sender `PROTOCOL_TREASURY`, " +
      "dispatch recompute-and-compare for auth). Every node applies identical jail state " +
      "post-fork — closes the divergence class observed when LivenessTracker was per-node " +
      "in-memory.",
    heights: { mainnet: 950_400, testnet: 1_030_500 },
    state: "shipped",
  },
  {
    id: "nft-tokenop",
    title: "NFT_TOKENOP_HEIGHT",
    summary: "SRC-721 + SRC-1155 dispatch (DO NOT activate yet).",
    description:
      "Wire format + Pass-1 gate shipped; the dispatch + storage layer that turns " +
      "the parsed payload into state is not yet implemented, so activating this " +
      "fork before the apply path lands would halt every validator on the first " +
      "matching transaction. Stays dormant until the follow-up release ships " +
      "the apply path.",
    heights: { mainnet: null, testnet: null },
    state: "danger",
  },
];

export function forkStateAt(fork: ForkEntry, network: NetworkId, height: number): "active" | "scheduled" | "dormant" {
  const fh = fork.heights[network];
  if (fh == null) return "dormant";
  if (height >= fh) return "active";
  return "scheduled";
}
