// Merkle generator for the Sentrix airdrop. Reads the eligible-wallets
// snapshot, allocates per-wallet amounts, builds a Merkle tree compatible
// with `contracts/MerkleAirdrop.sol` (OZ-style sorted-sibling, leaf =
// keccak256(abi.encodePacked(address, uint256))), and writes both the
// public `proofs.json` (consumed by the claim UI) and a private
// `tree.json` (full tree dump for ops audit).
//
// MerkleAirdrop's leaf format: keccak256(abi.encodePacked(address, uint256))
// (NOT the OZ StandardMerkleTree default, which wraps in an extra keccak
// over abi.encode). We use SimpleMerkleTree.of(leaves) here, passing
// pre-hashed leaves — that gives us full control of the leaf encoding and
// matches the contract's verification path exactly.
//
// Run:
//   pnpm --filter @sentriscloud/airdrop merkle
// Env:
//   IN_FILE         default = data/eligible_wallets.json
//   OUT_PROOFS      default = public/proofs.json   (committed; consumed by claim UI)
//   OUT_TREE        default = data/tree.json        (full ops dump)
//   PHASE_TOTAL_WEI default = 1000000000000000000000000  (1,000,000 SRX = 1M × 10^18 wei)
//   ALLOCATION      default = "flat"               (only "flat" supported in v1)

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { keccak256, encodePacked, toHex } from "viem";
import { SimpleMerkleTree } from "@openzeppelin/merkle-tree";

interface EligibleWallet {
  address: string;
  tx_count: number;
  first_seen_block: number;
  last_seen_block: number;
  contract_deploys: number;
  unique_counterparties: number;
}

interface SnapshotFile {
  network: string;
  snapshot_height: number;
  snapshot_block_hash: string;
  generated_at_unix: number;
  parameters: Record<string, number>;
  stats: Record<string, number>;
  wallets: EligibleWallet[];
}

const IN_FILE = process.env.IN_FILE ?? "data/eligible_wallets.json";
const OUT_PROOFS = process.env.OUT_PROOFS ?? "public/proofs.json";
const OUT_TREE = process.env.OUT_TREE ?? "data/tree.json";
const PHASE_TOTAL_WEI = BigInt(
  process.env.PHASE_TOTAL_WEI ?? "1000000000000000000000000", // 1M × 10^18
);
const ALLOCATION = process.env.ALLOCATION ?? "flat";

function leafHash(address: string, amount: bigint): `0x${string}` {
  return keccak256(encodePacked(["address", "uint256"], [address as `0x${string}`, amount]));
}

function main() {
  const inPath = resolve(IN_FILE);
  console.log(`[merkle] reading ${inPath}`);
  const snapshot = JSON.parse(readFileSync(inPath, "utf-8")) as SnapshotFile;
  const wallets = snapshot.wallets;
  if (wallets.length === 0) throw new Error("snapshot wallets[] is empty");

  // ── Allocate per-wallet amount ───────────────────────────
  // v1: flat split. The dust from integer division is tracked but not
  // distributed — it's the tiny fraction of a wei that won't divide evenly,
  // and it stays in the contract until sweep. (At 1e24 wei / N for any
  // realistic N, dust is microscopic.)
  let perWallet: bigint;
  let totalAllocated: bigint;
  if (ALLOCATION === "flat") {
    perWallet = PHASE_TOTAL_WEI / BigInt(wallets.length);
    totalAllocated = perWallet * BigInt(wallets.length);
  } else {
    throw new Error(`ALLOCATION=${ALLOCATION} not supported (only "flat" in v1)`);
  }
  const dust = PHASE_TOTAL_WEI - totalAllocated;

  console.log(
    `[merkle] wallets:           ${wallets.length}\n` +
      `[merkle] phase total:       ${PHASE_TOTAL_WEI} wei\n` +
      `[merkle] allocation:        ${ALLOCATION}\n` +
      `[merkle] per-wallet:        ${perWallet} wei\n` +
      `[merkle] total allocated:   ${totalAllocated} wei\n` +
      `[merkle] dust (sweepable):  ${dust} wei`,
  );

  // ── Build Merkle leaves ──────────────────────────────────
  // leaf = keccak256(abi.encodePacked(address, uint256 amount))
  // Same encoding the on-chain MerkleAirdrop.claim() recomputes.
  const entries = wallets.map((w) => ({
    address: w.address,
    amount: perWallet,
    leaf: leafHash(w.address, perWallet),
  }));

  // ── Build the tree (OZ SimpleMerkleTree, sorted siblings) ──
  const tree = SimpleMerkleTree.of(entries.map((e) => e.leaf));
  const root = tree.root;

  // ── Per-address proof bundle ─────────────────────────────
  // Indexed by lower-case address for trivial lookup from the claim UI:
  //   const entry = proofs.entries[userAddress.toLowerCase()];
  //   contract.claim(entry.amount, entry.proof)
  const entriesIndex: Record<
    string,
    { amount: string; proof: string[]; index: number }
  > = {};
  let walkIdx = 0;
  for (const [i, value] of tree.entries()) {
    const proof = tree.getProof(i);
    const e = entries[walkIdx++];
    if (!e) throw new Error(`tree iteration mismatch at index ${i}`);
    if (e.leaf !== value) {
      // Shouldn't happen — SimpleMerkleTree.of preserves input order with
      // its iteration. Bail loudly so we don't ship a tree whose proofs
      // disagree with the leaf list.
      throw new Error(
        `leaf order mismatch at ${i}: tree=${value} entry=${e.leaf}`,
      );
    }
    entriesIndex[e.address] = {
      amount: toHex(e.amount),
      proof,
      index: i,
    };
  }

  // ── Public proofs.json (consumed by claim UI) ────────────
  const proofsOut = {
    network_chain_id: 7119, // mainnet — recipient gets mainnet SRX
    snapshot_chain_id: 7120, // testnet — eligibility computed here
    snapshot_height: snapshot.snapshot_height,
    snapshot_block_hash: snapshot.snapshot_block_hash,
    merkle_root: root,
    phase_total_wei: PHASE_TOTAL_WEI.toString(),
    per_wallet_wei: perWallet.toString(),
    total_allocated_wei: totalAllocated.toString(),
    dust_wei: dust.toString(),
    eligible_count: wallets.length,
    allocation: ALLOCATION,
    entries: entriesIndex,
    leaf_format: "keccak256(abi.encodePacked(address, uint256))",
    contract_compatible: "MerkleAirdrop.sol — sentrix-labs/canonical-contracts",
  };

  // ── Private tree.json (full audit dump) ─────────────────
  const treeOut = {
    ...proofsOut,
    snapshot_source: snapshot,
    leaves: entries.map((e) => ({
      address: e.address,
      amount: e.amount.toString(),
      leaf: e.leaf,
    })),
  };

  const proofsPath = resolve(OUT_PROOFS);
  const treePath = resolve(OUT_TREE);
  mkdirSync(dirname(proofsPath), { recursive: true });
  mkdirSync(dirname(treePath), { recursive: true });
  writeFileSync(proofsPath, JSON.stringify(proofsOut, null, 2));
  writeFileSync(treePath, JSON.stringify(treeOut, null, 2));

  console.log(
    `\n[merkle] DONE\n` +
      `[merkle]   merkle root: ${root}\n` +
      `[merkle]   wrote: ${proofsPath}\n` +
      `[merkle]   wrote: ${treePath}`,
  );
}

main();
