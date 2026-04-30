// Phase 1 snapshot — scan Sentrix testnet (chain 7120) and produce
// `data/eligible_wallets.json`. Per AIRDROP_MECHANICS.md:
//   - Threshold: cumulative tx count >= MIN_TX_COUNT
//   - Wallet age: first-tx height <= snapshot_height - MIN_AGE_BLOCKS
//   - Exclusion: hard-coded list of premine + governance + validator + faucet addresses
//   - Real-activity signal: count contract deploys / unique counterparties (informational, not gating in v1)
//
// Inputs come from env so the same script drives staging + final-snapshot runs.
//
// Output: data/eligible_wallets.json shape =
//   {
//     network: "sentrix-testnet-7120",
//     snapshot_height: <hex_block_height>,
//     snapshot_block_hash: <hash>,
//     parameters: { min_tx_count, min_age_blocks, scan_start, scan_end },
//     count: <eligible_count>,
//     wallets: [
//       { address, tx_count, first_seen_block, last_seen_block, contract_deploys, unique_counterparties }
//     ]
//   }
//
// Run:
//   pnpm --filter @sentriscloud/airdrop snapshot
// Env:
//   SNAPSHOT_RPC_URL    default https://testnet-rpc.sentrixchain.com
//   SNAPSHOT_HEIGHT     default = current chain head at run time
//   SCAN_START          default = max(0, SNAPSHOT_HEIGHT - 1_500_000)
//   MIN_TX_COUNT        default = 50
//   MIN_AGE_BLOCKS      default = 1_209_600  (~14 days at 1s blocks)
//   BATCH_SIZE          default = 200        (parallel block fetches)
//   OUT_FILE            default = data/eligible_wallets.json

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

// ── Hard-coded exclusion list (mainnet + testnet — addresses are reused) ──
// Lifted from sentrix/docs/tokenomics/AIRDROP_MECHANICS.md §"Exclusion list".
// Lower-case for case-insensitive comparison.
const EXCLUSION_LIST: ReadonlySet<string> = new Set(
  [
    // Premine wallets (mainnet)
    "0x5b5b06688dcdbe532353ac610aaff41af825279d", // Founder v3
    "0x252f8cfed5acfa9d00d99a65e2ac91f395a35d78", // Founder v2 (compromised, drained)
    "0x4f3319a700000000000000000000000000000000", // Founder v1 (compromised — placeholder; full hash in CANONICAL_ADDRESSES)
    "0x2578cad17e3e56c2970a5b5eab45952439f5ba97", // Strategic Reserve (the source itself)
    "0xeb70fdefd00fdb768dec06c478f450c351499f14", // Ecosystem Fund
    "0x328d56b8174697ef6c9e40e19b7663797e16fa47", // Early Validator
    // Governance + deployer (mainnet)
    "0xa25236925bc10954e0519731cc7ba97f4bb5714b", // Authority (SentrixSafe owner)
    "0x5acb04058fc4dfa258f29ce318282377cac176fd", // Bootstrap deployer (retired)
    "0x6272dc0c842f05542f9ff7b5443e93c0642a3b26", // SentrixSafe (mainnet)
    "0xc9d7a61d7c2f428f6a055916488041fd00532110", // SentrixSafe (testnet)
    // Validator wallets (mainnet)
    "0x753f2f68829fbe76a0132295624f48b27ce2e2d9", // Foundation
    "0x0804a00f53fde72d46abd1db7ee3e97cbfd0a107", // Treasury / val5
    "0x87c9976d4b2e360b9fbb87e4bd5442edce2a7511", // Core
    "0x4cad4793b25b6bb2c927eddfe911996070c7ce68", // Beacon
    // Faucet wallets
    "0x6aa7f39ab5f8e7d5c07a06b776754dc51099097d", // Mainnet faucet
    "0x2ffc302fcd8c0eeab2796b3c1d134f18e8237762", // Testnet faucet
    // Protocol sentinels (no private key but exclude defensively)
    "0x0000000000000000000000000000000000000000", // TOKEN_OP_ADDRESS / null
    "0x0000000000000000000000000000000000000002", // PROTOCOL_TREASURY
    "0x0000000000000000000000000000000000000100", // STAKING_ADDRESS
  ].map((a) => a.toLowerCase()),
);

interface RawBlockTx {
  hash?: string;
  from?: string;
  to?: string | null;
  blockNumber?: string;
}

interface RawBlock {
  number?: string;
  hash?: string;
  transactions?: RawBlockTx[];
}

interface WalletAccumulator {
  address: string;
  tx_count: number;
  first_seen_block: number;
  last_seen_block: number;
  contract_deploys: number;
  unique_counterparties: Set<string>;
}

const RPC_URL = process.env.SNAPSHOT_RPC_URL ?? "https://testnet-rpc.sentrixchain.com";
const MIN_TX_COUNT = parseInt(process.env.MIN_TX_COUNT ?? "50", 10);
const MIN_AGE_BLOCKS = parseInt(process.env.MIN_AGE_BLOCKS ?? "1209600", 10);
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE ?? "200", 10);
const OUT_FILE = process.env.OUT_FILE ?? "data/eligible_wallets.json";

let nextRpcId = 1;
async function rpc<T = unknown>(method: string, params: unknown[]): Promise<T> {
  const id = nextRpcId++;
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
  if (!res.ok) throw new Error(`RPC ${method} HTTP ${res.status}`);
  const body = (await res.json()) as { result?: T; error?: { message: string } };
  if (body.error) throw new Error(`RPC ${method}: ${body.error.message}`);
  return body.result as T;
}

async function rpcBatch<T = unknown>(
  calls: Array<{ method: string; params: unknown[] }>,
): Promise<T[]> {
  const requests = calls.map((c) => ({
    jsonrpc: "2.0",
    id: nextRpcId++,
    method: c.method,
    params: c.params,
  }));
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requests),
  });
  if (!res.ok) throw new Error(`RPC batch HTTP ${res.status}`);
  const body = (await res.json()) as Array<{ id: number; result?: T; error?: { message: string } }>;
  // RPC servers are not guaranteed to preserve order — sort by id to recover.
  body.sort((a, b) => a.id - b.id);
  return body.map((b, i) => {
    if (b.error) throw new Error(`RPC batch[${i}] ${calls[i]?.method}: ${b.error.message}`);
    return b.result as T;
  });
}

function hexToInt(hex: string | undefined): number {
  if (!hex) return 0;
  return parseInt(hex, 16);
}

async function main() {
  console.log(`[snapshot] RPC: ${RPC_URL}`);

  // ── Resolve snapshot height ──────────────────────────────
  const headHex = await rpc<string>("eth_blockNumber", []);
  const head = hexToInt(headHex);
  const snapshotHeight = parseInt(process.env.SNAPSHOT_HEIGHT ?? String(head), 10);
  if (snapshotHeight > head) {
    throw new Error(
      `SNAPSHOT_HEIGHT=${snapshotHeight} is past the current chain head (${head}).`,
    );
  }

  const scanStartDefault = Math.max(0, snapshotHeight - 1_500_000);
  const scanStart = parseInt(process.env.SCAN_START ?? String(scanStartDefault), 10);

  console.log(
    `[snapshot] Snapshot height: ${snapshotHeight} (head ${head})\n` +
      `[snapshot] Scan range: ${scanStart} → ${snapshotHeight} (${snapshotHeight - scanStart + 1} blocks)\n` +
      `[snapshot] Filters: tx_count >= ${MIN_TX_COUNT}, wallet_age >= ${MIN_AGE_BLOCKS} blocks\n` +
      `[snapshot] Exclusion list: ${EXCLUSION_LIST.size} addresses`,
  );

  // ── Resolve snapshot block hash for the output (for verifiability) ──
  const snapshotBlock = await rpc<RawBlock>("eth_getBlockByNumber", [
    `0x${snapshotHeight.toString(16)}`,
    false,
  ]);
  const snapshotHash = snapshotBlock?.hash ?? "0x0";

  // ── Scan blocks in batches, accumulate per-address activity ──
  const accumulator = new Map<string, WalletAccumulator>();
  const totalBlocks = snapshotHeight - scanStart + 1;
  let scanned = 0;
  const startTime = Date.now();

  for (let b = scanStart; b <= snapshotHeight; b += BATCH_SIZE) {
    const end = Math.min(b + BATCH_SIZE - 1, snapshotHeight);
    const calls = [];
    for (let h = b; h <= end; h++) {
      calls.push({
        method: "eth_getBlockByNumber",
        params: [`0x${h.toString(16)}`, true],
      });
    }
    let blocks: RawBlock[];
    try {
      blocks = await rpcBatch<RawBlock>(calls);
    } catch (e) {
      console.warn(
        `[snapshot] batch ${b}..${end} failed (${(e as Error).message}); falling back to serial`,
      );
      blocks = [];
      for (const c of calls) {
        try {
          blocks.push(await rpc<RawBlock>(c.method, c.params));
        } catch {
          blocks.push({ number: undefined, hash: undefined, transactions: [] });
        }
      }
    }

    for (const block of blocks) {
      const blockNum = hexToInt(block.number);
      for (const tx of block.transactions ?? []) {
        const from = (tx.from ?? "").toLowerCase();
        if (!from || from === "0x" || from.length !== 42) continue;
        if (EXCLUSION_LIST.has(from)) continue;
        const to = (tx.to ?? "").toLowerCase();
        const isContractDeploy = !tx.to || tx.to === "0x" || tx.to === null;

        let wallet = accumulator.get(from);
        if (!wallet) {
          wallet = {
            address: from,
            tx_count: 0,
            first_seen_block: blockNum,
            last_seen_block: blockNum,
            contract_deploys: 0,
            unique_counterparties: new Set<string>(),
          };
          accumulator.set(from, wallet);
        }
        wallet.tx_count++;
        if (blockNum < wallet.first_seen_block) wallet.first_seen_block = blockNum;
        if (blockNum > wallet.last_seen_block) wallet.last_seen_block = blockNum;
        if (isContractDeploy) wallet.contract_deploys++;
        if (to && to.length === 42) wallet.unique_counterparties.add(to);
      }
    }

    scanned += blocks.length;
    if (scanned % (BATCH_SIZE * 10) < BATCH_SIZE) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = scanned / elapsed;
      const eta = ((totalBlocks - scanned) / rate).toFixed(0);
      console.log(
        `[snapshot]   scanned ${scanned}/${totalBlocks} (${((scanned / totalBlocks) * 100).toFixed(1)}%) — ${rate.toFixed(1)} blk/s — ETA ${eta}s — wallets seen ${accumulator.size}`,
      );
    }
  }

  // ── Filter eligibility ───────────────────────────────────
  const ageCutoff = snapshotHeight - MIN_AGE_BLOCKS;
  const eligible: Array<{
    address: string;
    tx_count: number;
    first_seen_block: number;
    last_seen_block: number;
    contract_deploys: number;
    unique_counterparties: number;
  }> = [];
  let droppedByTxCount = 0;
  let droppedByAge = 0;

  for (const wallet of accumulator.values()) {
    if (wallet.tx_count < MIN_TX_COUNT) {
      droppedByTxCount++;
      continue;
    }
    if (wallet.first_seen_block > ageCutoff) {
      droppedByAge++;
      continue;
    }
    eligible.push({
      address: wallet.address,
      tx_count: wallet.tx_count,
      first_seen_block: wallet.first_seen_block,
      last_seen_block: wallet.last_seen_block,
      contract_deploys: wallet.contract_deploys,
      unique_counterparties: wallet.unique_counterparties.size,
    });
  }

  // Stable, deterministic ordering — important so two snapshot runs against
  // the same height produce byte-identical output (and therefore the same
  // Merkle root downstream).
  eligible.sort((a, b) => (a.address < b.address ? -1 : a.address > b.address ? 1 : 0));

  const out = {
    network: "sentrix-testnet-7120",
    rpc_url: RPC_URL,
    snapshot_height: snapshotHeight,
    snapshot_block_hash: snapshotHash,
    generated_at_unix: Math.floor(Date.now() / 1000),
    parameters: {
      min_tx_count: MIN_TX_COUNT,
      min_age_blocks: MIN_AGE_BLOCKS,
      scan_start: scanStart,
      scan_end: snapshotHeight,
      exclusion_count: EXCLUSION_LIST.size,
    },
    stats: {
      addresses_seen: accumulator.size,
      eligible: eligible.length,
      dropped_by_tx_count: droppedByTxCount,
      dropped_by_age: droppedByAge,
    },
    wallets: eligible,
  };

  const outPath = resolve(OUT_FILE);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(out, null, 2));

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `\n[snapshot] DONE in ${elapsed}s\n` +
      `[snapshot]   addresses_seen: ${accumulator.size}\n` +
      `[snapshot]   eligible:       ${eligible.length}\n` +
      `[snapshot]   dropped_tx:     ${droppedByTxCount}\n` +
      `[snapshot]   dropped_age:    ${droppedByAge}\n` +
      `[snapshot]   wrote: ${outPath}`,
  );
}

main().catch((e) => {
  console.error("[snapshot] FAILED:", e);
  process.exit(1);
});
