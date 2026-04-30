// Standalone proof-verification utility. Pulls an entry from proofs.json,
// rebuilds the leaf the way MerkleAirdrop.sol does, walks the proof's
// sorted-sibling chain, and asserts that the computed root matches the
// recorded merkle_root. Useful for:
//   - operator sanity-check before pre-funding the contract
//   - debug when a user reports their claim() reverts with InvalidProof
//
// Run:
//   pnpm --filter @sentriscloud/airdrop verify-proof -- 0xRECIPIENT_ADDRESS
//   # or omit the arg to spot-check the first 5 entries

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { keccak256, encodePacked, concat } from "viem";

const PROOFS_FILE = process.env.PROOFS_FILE ?? "public/proofs.json";

interface ProofsFile {
  merkle_root: string;
  per_wallet_wei: string;
  entries: Record<string, { amount: string; proof: string[]; index: number }>;
}

function leafHash(address: string, amount: bigint): `0x${string}` {
  return keccak256(encodePacked(["address", "uint256"], [address as `0x${string}`, amount]));
}

function recomputeRoot(leaf: `0x${string}`, proof: string[]): `0x${string}` {
  let computed: `0x${string}` = leaf;
  for (const sibling of proof) {
    const sib = sibling as `0x${string}`;
    if (BigInt(computed) < BigInt(sib)) {
      computed = keccak256(concat([computed, sib]));
    } else {
      computed = keccak256(concat([sib, computed]));
    }
  }
  return computed;
}

function main() {
  const proofs = JSON.parse(readFileSync(resolve(PROOFS_FILE), "utf-8")) as ProofsFile;
  const targetArg = process.argv[2]?.toLowerCase();

  const targets: Array<[string, { amount: string; proof: string[]; index: number }]> =
    targetArg
      ? [[targetArg, proofs.entries[targetArg]]].filter(([, v]) => v) as Array<
          [string, { amount: string; proof: string[]; index: number }]
        >
      : Object.entries(proofs.entries).slice(0, 5);

  if (targets.length === 0) {
    console.error(`[verify] no entry found for ${targetArg ?? "(none)"}`);
    process.exit(1);
  }

  let allOk = true;
  for (const [address, entry] of targets) {
    const amount = BigInt(entry.amount);
    const leaf = leafHash(address, amount);
    const computed = recomputeRoot(leaf, entry.proof);
    const ok = computed.toLowerCase() === proofs.merkle_root.toLowerCase();
    if (!ok) allOk = false;
    console.log(
      `[verify] ${address}\n` +
        `         amount: ${amount} wei\n` +
        `         leaf:   ${leaf}\n` +
        `         proof:  ${entry.proof.length} siblings\n` +
        `         root:   ${computed}\n` +
        `         match:  ${ok ? "✓" : "✗ MISMATCH"}\n`,
    );
  }

  if (!allOk) {
    console.error(`[verify] FAIL — at least one proof did not reconstruct the root.`);
    process.exit(1);
  }
  console.log(`[verify] OK — all ${targets.length} proof(s) verify against root ${proofs.merkle_root}`);
}

main();
