// TokenFactory v1.1.0 — deployed addresses + minimal ABI for the
// CoinBlast launch flow. Lets the /create form actually mint an
// SRC-20 on-chain instead of just showing a "coming soon" stub.
//
// Audit hardening (vs. v1.0.0):
//   - rejects zero-supply / empty-name / oversize-name+symbol deploys
//   - FactoryToken transfer(0x0) reverts (ERC-20 spec)
// v1.0.0 is still on-chain (immutable) but deprecated; we point at v1.1.0.

export const TOKEN_FACTORY_ADDRESSES = {
  mainnet: "0x53C3838e18703c763564Bb983694CF117B33D366" as const,
  testnet: "0xaE2a8512f0de635F8E90069e2877098c9e0baEc7" as const,
} as const;

export const TOKEN_FACTORY_ABI = [
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "deployToken",
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "initialSupply", type: "uint256" },
    ],
    outputs: [{ name: "token", type: "address" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "tokensOf",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "address[]" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "tokenCount",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "MAX_NAME_LENGTH",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "MAX_SYMBOL_LENGTH",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "event",
    name: "TokenDeployed",
    inputs: [
      { indexed: true, name: "token", type: "address" },
      { indexed: true, name: "owner", type: "address" },
      { indexed: false, name: "name", type: "string" },
      { indexed: false, name: "symbol", type: "string" },
      { indexed: false, name: "initialSupply", type: "uint256" },
    ],
  },
] as const;

// Helper: pull the deployed-token address out of a TokenDeployed log.
// The event's first indexed topic (after the signature hash) is the
// token address. Filter by the factory's own address — the constructor
// of the freshly-minted FactoryToken emits a Transfer(address(0), owner)
// during the same tx, and that log also has 3 topics, so a sig-less
// match would mis-pick the zero address as the contract.
export function extractDeployedTokenAddress(
  logs: ReadonlyArray<{
    topics?: ReadonlyArray<`0x${string}`>;
    address?: `0x${string}`;
  }>,
  factoryAddress: `0x${string}`,
): `0x${string}` | null {
  const factoryLower = factoryAddress.toLowerCase();
  for (const log of logs) {
    if (!log.topics || log.topics.length !== 3) continue;
    if (log.address?.toLowerCase() !== factoryLower) continue;
    const tokenTopic = log.topics[1];
    const addr = ("0x" + tokenTopic.slice(-40)) as `0x${string}`;
    return addr;
  }
  return null;
}
