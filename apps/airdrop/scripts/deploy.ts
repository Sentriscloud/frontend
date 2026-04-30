// Deployment helper for `MerkleAirdrop.sol` (sentrix-labs/canonical-contracts).
//
// This script doesn't deploy directly — that's still a `forge create`
// command run from `canonical-contracts` so the deploy is reproducible
// from public source. What this script does:
//
//   1. Read public/proofs.json and assert the merkle root is non-zero
//   2. Compute the constructor argv:
//        - merkleRoot     = bundle.merkle_root
//        - claimDeadline  = now() + CLAIM_WINDOW_DAYS × 86_400
//        - sweepRecipient = STRATEGIC_RESERVE
//        - owner          = SENTRIX_SAFE
//   3. Print the exact `forge create` command to run
//   4. Print the exact pre-fund tx (Strategic Reserve → contract) to send
//      from SentrixSafe once the deploy address is known
//
// Run:
//   pnpm --filter @sentriscloud/airdrop deploy:plan
//
// Env (override defaults if needed):
//   CLAIM_WINDOW_DAYS    default 30
//   STRATEGIC_RESERVE    default 0x2578cad17e3e56c2970a5b5eab45952439f5ba97
//   SENTRIX_SAFE         default 0x6272dC0C842F05542f9fF7B5443E93C0642a3b26
//   PROOFS_FILE          default public/proofs.json

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const STRATEGIC_RESERVE =
  process.env.STRATEGIC_RESERVE ?? "0x2578cad17e3e56c2970a5b5eab45952439f5ba97";
const SENTRIX_SAFE =
  process.env.SENTRIX_SAFE ?? "0x6272dC0C842F05542f9fF7B5443E93C0642a3b26";
const CLAIM_WINDOW_DAYS = parseInt(process.env.CLAIM_WINDOW_DAYS ?? "30", 10);
const PROOFS_FILE = process.env.PROOFS_FILE ?? "public/proofs.json";

interface ProofsBundle {
  merkle_root: string;
  phase_total_wei: string;
  per_wallet_wei: string;
  total_allocated_wei: string;
  dust_wei: string;
  eligible_count: number;
  snapshot_height: number;
  snapshot_block_hash: string;
}

function main() {
  const bundle = JSON.parse(
    readFileSync(resolve(PROOFS_FILE), "utf-8"),
  ) as ProofsBundle;

  if (
    bundle.merkle_root ===
    "0x0000000000000000000000000000000000000000000000000000000000000000"
  ) {
    console.error(
      "[deploy:plan] merkle_root is zero — run snapshot + merkle first.",
    );
    process.exit(1);
  }

  const now = Math.floor(Date.now() / 1000);
  const claimDeadline = now + CLAIM_WINDOW_DAYS * 86_400;
  const totalSrx = (
    BigInt(bundle.total_allocated_wei) /
    BigInt("1000000000000000000")
  ).toString();

  console.log(`──────────────────────────────────────────────────────────
Sentrix Airdrop — Phase 1 deploy plan
──────────────────────────────────────────────────────────

Snapshot
  height:           ${bundle.snapshot_height}
  block hash:       ${bundle.snapshot_block_hash}
  eligible count:   ${bundle.eligible_count}
  per-wallet wei:   ${bundle.per_wallet_wei}
  total wei:        ${bundle.total_allocated_wei}
  dust wei:         ${bundle.dust_wei}

Constructor args
  merkleRoot:       ${bundle.merkle_root}
  claimDeadline:    ${claimDeadline}    (= now + ${CLAIM_WINDOW_DAYS} days)
  sweepRecipient:   ${STRATEGIC_RESERVE}    (Strategic Reserve)
  owner:            ${SENTRIX_SAFE}    (SentrixSafe)

──────────────────────────────────────────────────────────
Step 1 — deploy from canonical-contracts
──────────────────────────────────────────────────────────

In sentrix-labs/canonical-contracts:

    forge create contracts/MerkleAirdrop.sol:MerkleAirdrop \\
      --rpc-url https://rpc.sentrixchain.com \\
      --private-key \$DEPLOYER_PRIVATE_KEY \\
      --constructor-args \\
        ${bundle.merkle_root} \\
        ${claimDeadline} \\
        ${STRATEGIC_RESERVE} \\
        ${SENTRIX_SAFE}

Verify on Sourcify:

    forge verify-contract --chain 7119 \\
      --verifier sourcify \\
      --verifier-url https://verify.sentrixchain.com \\
      <DEPLOY_ADDRESS> \\
      contracts/MerkleAirdrop.sol:MerkleAirdrop

──────────────────────────────────────────────────────────
Step 2 — pre-fund from Strategic Reserve via SentrixSafe
──────────────────────────────────────────────────────────

From SentrixSafe (proposer = authority key), execute:

    transfer ${totalSrx} SRX
    from:  ${STRATEGIC_RESERVE}
    to:    <DEPLOY_ADDRESS>

Total transfer is ${totalSrx} SRX (= ${bundle.total_allocated_wei} wei).
The remaining \`dust_wei\` (${bundle.dust_wei}) stays in the Reserve.

──────────────────────────────────────────────────────────
Step 3 — wire frontend
──────────────────────────────────────────────────────────

Set the deployed address as a build-time env on Vercel (or wherever
airdrop.sentrixchain.com hosts):

    NEXT_PUBLIC_AIRDROP_CONTRACT_ADDRESS=<DEPLOY_ADDRESS>
    NEXT_PUBLIC_FALLBACK_CLAIM_DEADLINE_UNIX=${claimDeadline}

Rebuild + redeploy the airdrop frontend.

──────────────────────────────────────────────────────────
Step 4 — sweep after deadline
──────────────────────────────────────────────────────────

After the claim window expires (\`claimDeadline\` < block.timestamp),
SentrixSafe calls:

    contract.sweep()

Sweeps any unclaimed balance back to ${STRATEGIC_RESERVE}.

──────────────────────────────────────────────────────────`);
}

main();
