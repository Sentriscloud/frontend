# @sentriscloud/airdrop

Sentrix airdrop claim system. Phase 1 (Testnet Heroes) ships first.

## Pieces

- `scripts/snapshot.ts` — scans Sentrix testnet (chain 7120), accumulates
  per-address tx counts + age + activity signals, applies eligibility filters
  + the hard exclusion list, writes `data/eligible_wallets.json`.
- `scripts/merkle.ts` — reads the eligibility list, allocates SRX (flat split
  in v1), builds a Merkle tree compatible with `MerkleAirdrop.sol`'s
  `keccak256(abi.encodePacked(address, uint256))` leaf encoding, writes
  `public/proofs.json` (consumed by the claim UI) + `data/tree.json` (full
  audit dump).
- `scripts/verify-proof.ts` — re-derives the Merkle root from a single
  proof; useful for sanity-checking before pre-funding the contract or for
  debugging a user's failed `claim()`.
- `scripts/deploy.ts` — prints the exact `forge create` command + pre-fund
  payload + frontend env settings for a Phase 1 mainnet deploy. Doesn't
  deploy itself — the actual deploy command runs from
  `sentrix-labs/canonical-contracts` so it's reproducible from public source.
- `src/app/` — Next.js 15 claim UI. Connect wallet → look up proof in
  `public/proofs.json` → call `claim(amount, proof)` on the deployed
  `MerkleAirdrop` contract.

## End-to-end flow

```
┌─ scripts/snapshot.ts ──────┐    ┌─ scripts/merkle.ts ────────┐
│  query testnet RPC,        │    │  flat-allocate SRX,        │
│  filter eligibility,       │ →  │  build Merkle tree,        │ →  data/tree.json
│  exclude blocked addrs     │    │  emit per-wallet proofs    │ →  public/proofs.json
└────────────────────────────┘    └────────────────────────────┘            │
                                                                            │
                                          ┌─────────────────────────────────┘
                                          ▼
                                  ┌─ scripts/deploy.ts ──────────────────┐
                                  │  print constructor args + pre-fund   │
                                  │  payload for SentrixSafe to execute  │
                                  └──────────────────────────────────────┘
                                          │
                                          ▼
                  ┌─ MerkleAirdrop.sol (canonical-contracts) ──┐
                  │  immutable root, deadline, sweepRecipient, │
                  │  owner. Pre-funded with SRX from Strategic │
                  │  Reserve.                                  │
                  └────────────────────────────────────────────┘
                                          │
                                          ▼
                            ┌─ src/app/page.tsx ──────────────┐
                            │  connect wallet → fetch proof   │
                            │  from /proofs.json → claim()    │
                            └─────────────────────────────────┘
```

## Run locally

```bash
# 1. Snapshot (writes data/eligible_wallets.json)
pnpm --filter @sentriscloud/airdrop snapshot

# 2. Merkle (writes public/proofs.json + data/tree.json)
pnpm --filter @sentriscloud/airdrop merkle

# 3. Verify proofs round-trip
pnpm --filter @sentriscloud/airdrop verify-proof

# 4. Print deploy plan
pnpm --filter @sentriscloud/airdrop exec tsx scripts/deploy.ts

# 5. Frontend dev
pnpm --filter @sentriscloud/airdrop dev
# open http://localhost:3000
```

## Env

Snapshot script (defaults shown):

| Name | Default | Notes |
|------|---------|-------|
| `SNAPSHOT_RPC_URL` | `https://testnet-rpc.sentrixchain.com` | testnet (7120) |
| `SNAPSHOT_HEIGHT` | _current head_ | freeze for reproducibility |
| `SCAN_START` | `max(0, head - 1.5M)` | scan window start |
| `MIN_TX_COUNT` | `50` | cumulative tx threshold |
| `MIN_AGE_BLOCKS` | `1209600` | ~14 days at 1s blocks |
| `BATCH_SIZE` | `200` | parallel block fetches |

Merkle script:

| Name | Default | Notes |
|------|---------|-------|
| `IN_FILE` | `data/eligible_wallets.json` | snapshot output |
| `OUT_PROOFS` | `public/proofs.json` | committed; consumed by UI |
| `OUT_TREE` | `data/tree.json` | full audit dump |
| `PHASE_TOTAL_WEI` | `1000000000000000000000000` | 1M × 10^18 (Phase 1 alloc) |
| `ALLOCATION` | `flat` | only flat in v1 |

Frontend (build-time):

| Name | Default | Notes |
|------|---------|-------|
| `NEXT_PUBLIC_AIRDROP_CONTRACT_ADDRESS` | `""` | set after Phase 1 deploy |
| `NEXT_PUBLIC_FALLBACK_CLAIM_DEADLINE_UNIX` | `0` | optional UI fallback |

Deploy planner:

| Name | Default | Notes |
|------|---------|-------|
| `CLAIM_WINDOW_DAYS` | `30` | sets `claimDeadline = now + N × 86400` |
| `STRATEGIC_RESERVE` | `0x2578cad17e3e56c2970a5b5eab45952439f5ba97` | sweepRecipient |
| `SENTRIX_SAFE` | `0x6272dC0C842F05542f9fF7B5443E93C0642a3b26` | owner |

## Cross-references

- Mechanics: [`sentrix/docs/tokenomics/AIRDROP_MECHANICS.md`](https://github.com/sentrix-labs/sentrix/blob/main/docs/tokenomics/AIRDROP_MECHANICS.md)
- Contract: [`canonical-contracts/contracts/MerkleAirdrop.sol`](https://github.com/sentrix-labs/canonical-contracts/blob/main/contracts/MerkleAirdrop.sol)
- Tokenomics overview: [`sentrix/docs/tokenomics/SRX.md`](https://github.com/sentrix-labs/sentrix/blob/main/docs/tokenomics/SRX.md)
- Phase 1 deploy runbook: operator-internal (Sentrix Labs)
