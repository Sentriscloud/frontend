export const SITE = {
  name: "Sentrix",
  tagline: "Layer-1 Blockchain",
  chainId: 7119,
  testnetChainId: 7120,
  symbol: "SRX",
  explorer: "https://scan.sentrixchain.com",
  api: "https://api.sentrixchain.com",
  rpc: "https://rpc.sentrixchain.com",
  testnetRpc: "https://testnet-rpc.sentrixchain.com",
  github: "https://github.com/sentrix-labs/sentrix",
  email: "security@sentrixchain.com",
  faucet: "https://faucet.sentrixchain.com",
  docs: "https://sentrixchain.com/docs/faucet",
};

export const STATS = [
  { value: "1", unit: "s", label: "Block Time" },
  { value: "210", unit: "M", label: "Hard Cap Supply" },
  { value: "7119", unit: "", label: "Chain ID" },
  { value: "50", unit: "%", label: "Fee Burned" },
];

export const ABOUT_POINTS = [
  {
    num: "01",
    title: "210M Hard Cap, Zero Inflation",
    desc: "210 million SRX minted at genesis. Block rewards halve every 42M blocks (~4 years per era). Once total_minted hits MAX_SUPPLY, rewards drop to zero. No exceptions.",
  },
  {
    num: "02",
    title: "Deflationary by Protocol",
    desc: "50% of every fee — native or EVM — permanently burned. Block rewards halve over time. Eventually burn rate exceeds issuance, circulating supply contracts.",
  },
  {
    num: "03",
    title: "Instant Finality via BFT",
    desc: "DPoS proposer rotation + BFT 2/3+1 vote-based finality. No fork choice, no uncle blocks, no reorgs. A block confirmed by ⅔ of validators is final.",
  },
  {
    num: "04",
    title: "Ethereum Account Model",
    desc: "Balance + nonce per address. 0x + 40 hex addresses via Keccak-256. ECDSA secp256k1 signatures with chain_id replay protection. MetaMask, ethers.js, web3.js — all work natively.",
  },
  {
    num: "05",
    title: "Progressive Decentralization",
    desc: "Pioneer → Voyager → Frontier → Odyssey. Following the proven path of BNB Chain and Polygon. Simple first, decentralize with organic growth.",
  },
];

export const FEATURES = [
  {
    icon: "bolt",
    title: "1-Second Blocks, Instant Finality",
    desc: "DPoS proposer rotation produces blocks every second. BFT 2/3+1 voting finalizes them immediately. No fork choice, no uncle blocks, no reorganization.",
  },
  {
    icon: "layers",
    title: "Pure Rust, Zero Unsafe",
    desc: "Built entirely in safe Rust. Memory-safe, thread-safe, maximum performance. libmdbx storage — the same memory-mapped B+ tree backbone as Reth and Erigon.",
  },
  {
    icon: "wallet",
    title: "Ethereum Compatible",
    desc: "JSON-RPC 2.0 with 25 methods including the native sentrix_* namespace. Chain ID 7119 (0x1bcf). Connect MetaMask, ethers.js, web3.js, or Hardhat directly.",
  },
  {
    icon: "clock",
    title: "SRC-20 Token Standard",
    desc: "ERC-20 compatible: transfer, approve, transferFrom, allowance, mint, burn. Deploy via the EVM (revm 37) or the native runtime. Gas paid in SRX — every operation burns the native coin.",
  },
  {
    icon: "flame",
    title: "Deflationary by Protocol",
    desc: "50% of every fee permanently burned. Block-reward halving every 42M blocks. Eventually burn rate exceeds issuance — circulating supply decreases over time.",
  },
  {
    icon: "lock",
    title: "Military-Grade Crypto",
    desc: "ECDSA secp256k1 (SEC 2), AES-256-GCM (NIST SP 800-38D), Argon2id KDF for keystores. Private keys zeroized on drop. 11 audit rounds, pentest 6/6 passed on live network.",
  },
  {
    icon: "mempool",
    title: "Priority Fee Mempool",
    desc: "Pending transactions queued by fee (descending). Validators pick highest-fee transactions first, up to 5,000 per block. Min fee: 0.0001 SRX.",
  },
  {
    icon: "network",
    title: "P2P Network Layer",
    desc: "libp2p with Noise XX handshake, Kademlia peer discovery, and Gossipsub message propagation. Peers with mismatched chain_id rejected on handshake.",
  },
  {
    icon: "check",
    title: "Atomic Two-Pass Validation",
    desc: "Dry run against working state copy, then commit only if ALL transactions pass. Checked arithmetic (no overflow/underflow). Zero partial state corruption.",
  },
];

// SRX is the only protocol token. Three cards present three roles
// of the single token, not three different tokens.
export const TOKENS = [
  {
    symbol: "SRX",
    name: "Gas & Settlement",
    type: "Native Coin · Required",
    desc: "Every transaction — native or EVM — pays its fee in SRX. Half of every fee is permanently burned, half rewards the proposing validator. Chain activity tightens supply.",
    supply: "MIN FEE: 0.0001 SRX",
  },
  {
    symbol: "SRX",
    name: "Staking & Consensus",
    type: "Native Coin · DPoS",
    desc: "Validators stake SRX to be eligible for block production. Delegators stake SRX to validators and earn a share of block rewards + fees, paid in SRX. Slashing burns staked SRX.",
    supply: "MAX: 210,000,000 SRX",
  },
  {
    symbol: "SRX",
    name: "Network Security",
    type: "Native Coin · Skin-in-Game",
    desc: "Total staked SRX is the cost of attacking the chain. Delegated proof-of-stake puts capital at risk for every block proposed — economic security backing protocol guarantees.",
    supply: "GENESIS: 100% minted",
  },
];

export const TOKENOMICS_BARS = [
  { label: "Block Rewards", pct: 40, value: "40% — 84M SRX" },
  { label: "Founder", pct: 10, value: "10% — 21M SRX" },
  { label: "Ecosystem Fund", pct: 10, value: "10% — 21M SRX" },
  { label: "Early Validators", pct: 5, value: "5% — 10.5M SRX" },
  { label: "Reserve", pct: 5, value: "5% — 10.5M SRX" },
];

export const TOKENOMICS_CARDS = [
  {
    icon: "flame",
    title: "Fee Burn Mechanism",
    desc: "Every transaction fee is split 50/50. Half goes to the block proposer as reward. Half is permanently burned, reducing total supply forever.",
  },
  {
    icon: "clock",
    title: "Halving Schedule",
    desc: "Era 0: 1 SRX/block (0–42M), Era 1: 0.5 SRX (42M–84M), Era 2: 0.25 SRX (84M–126M), Era 3: 0.125 SRX. Halves every ~4 years. Capped by remaining headroom.",
  },
  {
    icon: "trend",
    title: "Burn Flywheel",
    desc: "EVM contracts and native transfers all burn SRX as gas. More activity → more SRX burned → tightening supply → economic alignment for long-term holders and validators.",
  },
  {
    icon: "info",
    title: "Smallest Unit",
    desc: "1 sentri = 0.00000001 SRX. Eight decimal places for maximum precision in microtransactions.",
  },
];

export const ECOSYSTEM = [
  { tag: "Block Explorer", name: "SentrixScan", desc: "Browse blocks, transactions, addresses, validators, and SRC-20 tokens on Sentrix Chain.", badge: "Live" },
  { tag: "Testnet Faucet", name: "Sentrix Faucet", desc: "Get free testnet SRX to experiment, deploy contracts, and build dApps on Sentrix Chain (chain ID 7120).", badge: "Live" },
  { tag: "Mobile Wallet", name: "Solux", desc: "Self-custody mobile wallet for SRX. Multi-platform (iOS + Android), built in Flutter.", badge: "In Development" },
  { tag: "Token Launchpad", name: "CoinBlast", desc: "Launch SRC-20 tokens fairly via bonding curve. No pre-sale, no rugs. Graduates to DEX at threshold.", badge: "In Development" },
];

export const API_CARDS = [
  {
    title: "REST API",
    count: "60+ Endpoints",
    items: [
      { method: "GET", path: "/chain/info" },
      { method: "GET", path: "/chain/blocks/{index}" },
      { method: "GET", path: "/accounts/{addr}/balance" },
      { method: "POST", path: "/transactions" },
      { method: "GET", path: "/tokens/{contract}" },
      { method: "POST", path: "/tokens/deploy" },
    ],
    more: "+ 54 more endpoints",
  },
  {
    title: "JSON-RPC 2.0",
    count: "25 Methods · Ethereum Compatible",
    items: [
      { path: "eth_chainId" },
      { path: "eth_getBalance" },
      { path: "eth_sendRawTransaction" },
      { path: "eth_getTransactionReceipt" },
      { path: "eth_blockNumber" },
      { path: "sentrix_*" },
    ],
    more: "+ 19 more methods (incl. native sentrix_* namespace)",
  },
  {
    title: "Block Explorer",
    count: "scan.sentrixchain.com",
    items: [
      { path: "/ — Dashboard" },
      { path: "/block/{index}" },
      { path: "/address/{addr}" },
      { path: "/tx/{txid}" },
      { path: "/validators" },
      { path: "/tokens" },
    ],
  },
];

export const SECURITY_CARDS = [
  { icon: "key", title: "ECDSA secp256k1", desc: "Transaction signing on secp256k1 curve (SEC 2 standard). Same elliptic curve as Bitcoin and Ethereum. Canonical JSON payload → SHA-256 hash → ECDSA sign.", mono: "SEC 2 · crate: secp256k1" },
  { icon: "lock", title: "AES-256-GCM Keystores", desc: "Wallet encryption with AEAD authenticated encryption (NIST SP 800-38D). Key derivation via Argon2id — memory-hard, GPU-resistant. Private keys zeroized on drop.", mono: "NIST SP 800-38D · Argon2id" },
  { icon: "shield", title: "Binary Sparse Merkle Tree", desc: "State commitments via BLAKE3 + SHA-256 sparse trees. Proofs are short, verifiable, and stable across rebuilds. Reorg-immune by BFT finality.", mono: "BLAKE3 + SHA-256 · proofs" },
  { icon: "arrow", title: "Keccak-256 Addresses", desc: "Ethereum-compatible address derivation (FIPS 202). Uncompressed pubkey → Keccak-256 → last 20 bytes → 0x prefix. Identical address space to Ethereum.", mono: "FIPS 202 · crate: sha3" },
  { icon: "check", title: "Atomic Validation", desc: "Dry run all transactions against working state copy. If any tx fails, entire block rejected. Commit only on full pass.", mono: "checked_add / checked_sub" },
  { icon: "shieldCheck", title: "Replay Protection + 11 Audits", desc: "chain_id (7119) embedded in signing payload — prevents cross-chain replay. 11 audit rounds completed (116 findings, 78+ fixed). Pentest 6/6 passed on live mainnet.", mono: "chain_id: 7119 · 11 audits" },
];

export const ROADMAP = [
  {
    phase: "Pioneer",
    status: "done" as const,
    statusText: "✓ Complete",
    title: "PoA Genesis",
    items: ["Core blockchain engine, ECDSA wallets, MDBX storage", "SRC-20 token standard, block explorer, JSON-RPC 2.0", "libp2p networking, validator fleet bootstrap", "Mainnet h=0…579,058 — succeeded by Voyager 2026-04-25"],
  },
  {
    phase: "Voyager",
    status: "active" as const,
    statusText: "● Live on Mainnet (v2.1.36)",
    title: "DPoS + BFT + EVM",
    items: ["Delegated Proof of Stake with reward distribution v2", "BFT finality (2/3+1 votes) wired and active", "EVM via revm 37 — eth_sendRawTransaction live", "ClaimRewards op + treasury escrow, 4 validators in production"],
  },
  {
    phase: "Frontier",
    status: "planned" as const,
    statusText: "○ 2027",
    title: "Performance & Scale",
    items: ["Parallel transaction execution (F-1 scaffold landed)", "Sub-1s block time experiments", "Mainnet hard fork governance", "Developer SDKs and documentation portal"],
  },
  {
    phase: "Odyssey",
    status: "planned" as const,
    statusText: "○ 2027–2028",
    title: "Cross-chain & Light Clients",
    items: ["Cross-chain bridges to major L1s/L2s", "Light client implementation", "Mature ecosystem, global validator network", "Foundation governance"],
  },
];

export const TICKER_ITEMS = [
  "SRX|$0.00", "CHAIN ID|7119 (0x1bcf)", "HARD CAP|210,000,000", "BURN|50% per tx",
  "BLOCK TIME|1s", "FINALITY|Instant (BFT 2/3+1)", "CONSENSUS|DPoS + BFT", "UNIT|1 sentri = 10⁻⁸ SRX",
  "TOKEN STD|SRC-20", "MIN FEE|0.0001 SRX", "MAX TX/BLOCK|5,000", "P2P|libp2p",
  "STORAGE|libmdbx", "STATUS|● MAINNET LIVE",
];

export const METAMASK_CONFIG = [
  { label: "Network", value: "Sentrix Chain" },
  { label: "RPC URL", value: "rpc.sentrixchain.com" },
  { label: "Chain ID", value: "7119" },
  { label: "Symbol", value: "SRX" },
  { label: "Explorer", value: "scan.sentrixchain.com" },
];
