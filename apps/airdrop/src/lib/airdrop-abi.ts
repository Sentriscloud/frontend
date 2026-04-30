// Minimal ABI for MerkleAirdrop.sol — only the functions the claim UI needs
// to read state and submit a claim. Mirrors `contracts/MerkleAirdrop.sol`
// in sentrix-labs/canonical-contracts.

export const MERKLE_AIRDROP_ABI = [
  // ── Reads ────────────────────────────────────────────────
  {
    type: "function",
    name: "merkleRoot",
    inputs: [],
    outputs: [{ type: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "claimDeadline",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "claimed",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalClaimed",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "swept",
    inputs: [],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isEligible",
    inputs: [
      { name: "account", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "proof", type: "bytes32[]" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  // ── Write ────────────────────────────────────────────────
  {
    type: "function",
    name: "claim",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "proof", type: "bytes32[]" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // ── Events (optional, included for future indexer use) ──
  {
    type: "event",
    name: "Claimed",
    inputs: [
      { name: "recipient", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;
