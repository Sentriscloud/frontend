export const ORIGIN_STORY = {
  heading: "Why Sentrix",
  paragraphs: [
    "Every era of technology is born from one act of courage — to start from zero.",
    "Satoshi proved that money doesn't have to be controlled by anyone. Vitalik proved that contracts don't need intermediaries. Both changed the world — not because they had the most resources, but because they had the courage to question what already existed.",
    "But that question isn't finished.",
    "Blockchains are still slow, expensive, and too often betrayed by the very people who build them. Trust is sold as a promise — not proven as a fact.",
    "Sentrix was born from the belief that one thing is still missing: a chain that is truly honest, fast, stable, and built to last not one season — but one generation.",
    "Built from zero. By one person. No investors, no team, no capital — only the conviction that this needs to exist.",
    "This is not about trust. This is about proof.",
  ],
  closing: "This is not about trust. This is about proof.",
};

export const SITE = {
  name: "Sentrix",
  tagline: "Layer-1 Blockchain",
  chainId: 7119,
  symbol: "SRX",
  explorer: "https://sentrixscan.sentriscloud.com",
  api: "https://sentrix-api.sentriscloud.com",
  rpc: "https://sentrix-rpc.sentriscloud.com",
  github: "https://github.com/sentrix-labs/sentrix",
  email: "sentriscloud@gmail.com",
};

export const STATS = [
  { value: "3", unit: "s", label: "Block Finality" },
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
    title: "Deflationary Flywheel",
    desc: "50% of every fee permanently burned. Every SNTX and SRTX transaction also burns SRX as gas \u2014 ecosystem growth directly increases SRX scarcity.",
  },
  {
    num: "03",
    title: "Instant Finality, No Forks",
    desc: "PoA round-robin consensus: validators sorted by address, deterministic scheduling. No fork choice rule, no uncle blocks, no reorganization. Final on production.",
  },
  {
    num: "04",
    title: "Ethereum Account Model",
    desc: "Balance + nonce per address. 0x + 40 hex addresses via Keccak-256. ECDSA secp256k1 signatures with chain_id replay protection. MetaMask, ethers.js, web3.js \u2014 all work natively.",
  },
  {
    num: "05",
    title: "Progressive Decentralization",
    desc: "Pioneer \u2192 Voyager \u2192 Frontier \u2192 Odyssey. Following the proven path of BNB Chain and Polygon. Simple first, decentralize with organic growth.",
  },
];

export const FEATURES = [
  {
    icon: "bolt",
    title: "3-Second Instant Finality",
    desc: "Deterministic round-robin scheduling: validators sorted by address, one block per round. No fork choice, no uncle blocks, no reorganization. Final on production.",
  },
  {
    icon: "layers",
    title: "Pure Rust, Zero Unsafe",
    desc: "Built entirely in safe Rust. Memory-safe, thread-safe, maximum performance. Single 4.4MB static binary. sled embedded database for persistent per-block storage.",
  },
  {
    icon: "wallet",
    title: "Ethereum Compatible",
    desc: "JSON-RPC 2.0 with 20 methods. Chain ID 7119 (0x1bcf). Connect MetaMask, ethers.js, web3.js, or Hardhat directly. No custom tooling needed.",
  },
  {
    icon: "clock",
    title: "SRX-20 Token Standard",
    desc: "ERC-20 compatible: transfer, approve, transferFrom, allowance, mint, burn. Deploy with one CLI command. Gas paid in SRX \u2014 every token operation burns native coin.",
  },
  {
    icon: "flame",
    title: "Deflationary by Protocol",
    desc: "50% of every fee permanently burned. Halving every 42M blocks. Eventually burn rate exceeds issuance \u2014 circulating supply decreases over time.",
  },
  {
    icon: "lock",
    title: "Military-Grade Crypto",
    desc: "ECDSA secp256k1 (SEC 2), AES-256-GCM (NIST SP 800-38D), PBKDF2-HMAC-SHA256 600K iterations (RFC 8018). Private keys zeroized on drop.",
  },
  {
    icon: "mempool",
    title: "Priority Fee Mempool",
    desc: "Pending transactions queued by fee (descending). Validators pick highest-fee transactions first, up to 100 per block. Min fee: 0.0001 SRX.",
  },
  {
    icon: "network",
    title: "P2P Network Layer",
    desc: "TCP protocol with length-prefixed JSON messages. Handshake, block broadcast, incremental chain sync. Peers with mismatched chain_id rejected on handshake.",
  },
  {
    icon: "check",
    title: "Atomic Two-Pass Validation",
    desc: "Dry run against working state copy, then commit only if ALL transactions pass. Checked arithmetic (no overflow/underflow). Zero partial state corruption.",
  },
];

export const TOKENS = [
  {
    symbol: "SRX",
    name: "Sentrix",
    type: "Native Coin",
    desc: "The backbone of the chain. Required for all gas fees, validator rewards, and as the base currency for every operation on Sentrix.",
    supply: "MAX: 210,000,000 SRX",
  },
  {
    symbol: "SNTX",
    name: "Sentrix Utility Token",
    type: "SRC-20 Token",
    desc: "The ecosystem engine. Governance voting, staking rewards, gas discount (50% off), Sentrix Launch fee, DEX fee discount, Sentrix Life rewards, social tipping, and developer grants — 8 core utilities.",
    supply: "SUPPLY: 10,000,000,000 SNTX",
  },
  {
    symbol: "SRTX",
    name: "Sentrix Payment Token",
    type: "SRC-20 Token",
    desc: "Universal payment token for micro and business transactions. Dynamic supply via SRX collateral — mint SRTX by locking SRX, burn SRTX to reclaim collateral. QR payments, payroll, escrow, and IDR off-ramp.",
    supply: "SUPPLY: Dynamic (mint & burn)",
  },
];

export const COINBLAST = {
  tagline: "Launch your token in 2 minutes. No coding. No pre-sale. Fair for everyone.",
  steps: [
    "Open CoinBlast",
    "Fill in: token name, symbol (3–5 chars), logo, description, total supply",
    "Pay 100 SNTX launch fee → burned permanently",
    "Token goes live on bonding curve instantly",
    "Anyone can buy or sell immediately",
    "Market cap hits graduation threshold → auto-listed on Sentrix DEX",
  ],
  bondingCurveFormula: "Price = Base Price × (1 + k × tokens_sold / total_supply)",
  fees: [
    { name: "Launch Fee", value: "100 SNTX", distribution: "100% burned" },
    { name: "Trading Fee", value: "1% per tx", distribution: "50% burned + 50% Ecosystem Fund" },
    { name: "Graduation Fee", value: "5% of liquidity", distribution: "100% to Ecosystem Fund" },
  ],
  antiScam: [
    { feature: "Verified Creator Badge", desc: "KYC'd developers get a verified badge on their tokens" },
    { feature: "Lock Period", desc: "Creator cannot sell tokens for X days after launch — prevents instant rugpull" },
    { feature: "Transparent Bonding Curve", desc: "All formula on-chain, fully auditable by anyone" },
    { feature: "Warning System", desc: "Token without description or large creator sell → automatic warning label" },
  ],
};

export const TOKEN_RELATIONSHIP = [
  { token: "SRX", role: "Chain fuel", desc: "Gas fees, validator rewards, store of value. Required by all operations on Sentrix." },
  { token: "SNTX", role: "Ecosystem fuel", desc: "Governance, staking rewards, gas discount, DEX fee discount, launch fees, social rewards, developer grants." },
  { token: "SRTX", role: "Transaction fuel", desc: "Universal payment — QR payments, micro payroll, escrow, IDR off-ramp. Backed by SRX collateral." },
];

export const GOVERNANCE = {
  heading: "On-Chain Governance",
  desc: "SNTX holders govern the chain. Anyone can submit a proposal — holders vote Approve or Reject over 7 days. If majority approves, it executes automatically by smart contract.",
  votingPower: "1 SNTX = 1 vote",
  votingPeriod: "7 days",
  items: [
    "Validator minimum stake changes",
    "SRTX mint ratio changes",
    "SRTX collateral ratio changes",
    "Slash percentage changes",
    "Ecosystem Fund allocation",
    "Chain feature additions or removals",
    "DEX parameters (trading fee, liquidity)",
    "Developer grants distribution",
  ],
};

export const SNTX_UTILITIES = [
  { num: "01", title: "Governance", desc: "1 SNTX = 1 vote. Vote on chain upgrades, consensus parameters, and Ecosystem Fund allocation." },
  { num: "02", title: "Staking Reward", desc: "Delegators who stake SRX to validators receive rewards paid in SNTX." },
  { num: "03", title: "Gas Discount", desc: "Pay transaction fees with SNTX and get 50% off. More activity, more demand." },
  { num: "04", title: "Sentrix Launch Fee", desc: "Every token deployed on Sentrix Launch requires SNTX payment — burned on every launch, reducing supply." },
  { num: "05", title: "DEX Fee Discount", desc: "Trade on Sentrix DEX using SNTX and pay lower fees. Rewards holders who participate in the ecosystem." },
  { num: "06", title: "Sentrix Life Reward", desc: "Earn SNTX through daily missions and GPS check-ins at partner locations." },
  { num: "07", title: "Sentrix Social", desc: "Tip creators with SNTX. Unlock premium features. Content ownership, on-chain." },
  { num: "08", title: "Developer Grants", desc: "The Ecosystem Fund distributes grants in SNTX to developers building on Sentrix." },
];

export const TOKENOMICS_BARS = [
  { label: "Block Rewards", pct: 40, value: "40% \u2014 84M SRX" },
  { label: "Founder", pct: 30, value: "10% \u2014 21M SRX" },
  { label: "Ecosystem Fund", pct: 30, value: "10% \u2014 21M SRX" },
  { label: "Early Validators", pct: 15, value: "5% \u2014 10.5M SRX" },
  { label: "Reserve", pct: 15, value: "5% \u2014 10.5M SRX" },
];

export const TOKENOMICS_CARDS = [
  {
    icon: "flame",
    title: "Fee Burn Mechanism",
    desc: "Every transaction fee is split 50/50. Half goes to the block validator as reward. Half is permanently burned, reducing total supply forever.",
  },
  {
    icon: "clock",
    title: "Halving Schedule",
    desc: "Era 0: 1 SRX/block (0\u201342M), Era 1: 0.5 SRX (42M\u201384M), Era 2: 0.25 SRX (84M\u2013126M), Era 3: 0.125 SRX. Halves every ~4 years. Capped by remaining headroom.",
  },
  {
    icon: "trend",
    title: "Three-Token Flywheel",
    desc: "Every SNTX and SRTX transaction burns SRX as gas. Ecosystem growth \u2192 more token usage \u2192 more SRX burned \u2192 increased scarcity \u2192 positive feedback loop.",
  },
  {
    icon: "info",
    title: "Smallest Unit",
    desc: "1 sentri = 0.00000001 SRX. Eight decimal places for maximum precision in microtransactions.",
  },
];

export const ECOSYSTEM = [
  { tag: "Hotspot Management", name: "FastPoint", desc: "MikroTik hotspot management SaaS for RT-RW nets, cafes, and hotels across Indonesia.", badge: "FPT \u00b7 Coming Soon" },
  { tag: "Field Operations", name: "GSC Patrol", desc: "Patrol management system for plantation field officers. Offline-first, GPS tracking, real-time sync.", badge: "GSCT \u00b7 Coming Soon" },
  { tag: "Field Service", name: "Sentris Field", desc: "Field service management platform built for operations teams across Indonesia.", badge: "SFT \u00b7 Planned" },
  { tag: "Property Management", name: "Sentris Kost", desc: "End-to-end property management for boarding houses and rental properties.", badge: "SKT \u00b7 Planned" },
  { tag: "Token Launchpad", name: "Sentrix Launch", desc: "Launch your token in 2 minutes. No coding. No pre-sale. Fair for everyone. Bonding curve pricing — price rises with every buy. Token graduates to Sentrix DEX when market cap threshold is reached.", badge: "Coming Soon" },
];

export const API_CARDS = [
  {
    title: "REST API",
    count: "19 Endpoints",
    items: [
      { method: "GET", path: "/chain/info" },
      { method: "GET", path: "/chain/blocks/{index}" },
      { method: "GET", path: "/accounts/{addr}/balance" },
      { method: "POST", path: "/transactions" },
      { method: "GET", path: "/tokens/{contract}" },
      { method: "POST", path: "/tokens/deploy" },
    ],
    more: "+ 13 more endpoints",
  },
  {
    title: "JSON-RPC 2.0",
    count: "20 Methods \u00b7 Ethereum Compatible",
    items: [
      { path: "eth_chainId" },
      { path: "eth_getBalance" },
      { path: "eth_sendRawTransaction" },
      { path: "eth_getTransactionReceipt" },
      { path: "eth_blockNumber" },
      { path: "net_version" },
    ],
    more: "+ 14 more methods",
  },
  {
    title: "Block Explorer",
    count: "6 Pages \u00b7 Built-in Dark UI",
    items: [
      { path: "/explorer \u2014 Dashboard" },
      { path: "/explorer/block/{index}" },
      { path: "/explorer/address/{addr}" },
      { path: "/explorer/tx/{txid}" },
      { path: "/explorer/validators" },
      { path: "/explorer/tokens" },
    ],
  },
];

export const SECURITY_CARDS = [
  { icon: "key", title: "ECDSA secp256k1", desc: "Transaction signing on secp256k1 curve (SEC 2 standard). Same elliptic curve as Bitcoin and Ethereum. Canonical JSON payload \u2192 SHA-256 hash \u2192 ECDSA sign.", mono: "SEC 2 \u00b7 crate: secp256k1" },
  { icon: "lock", title: "AES-256-GCM", desc: "Wallet encryption with AEAD authenticated encryption (NIST SP 800-38D). Key derivation via PBKDF2-HMAC-SHA256 with 600,000 iterations (RFC 8018).", mono: "NIST SP 800-38D \u00b7 RFC 8018" },
  { icon: "shield", title: "SHA-256 Merkle Tree", desc: "Block hashing and Merkle root verification via SHA-256 binary trees (FIPS 180-4). Odd-level duplication for complete tree construction.", mono: "FIPS 180-4 \u00b7 crate: sha2" },
  { icon: "arrow", title: "Keccak-256 Addresses", desc: "Ethereum-compatible address derivation (FIPS 202). Uncompressed pubkey \u2192 Keccak-256 \u2192 last 20 bytes \u2192 0x prefix. Private keys zeroized on drop.", mono: "FIPS 202 \u00b7 crate: sha3 + zeroize" },
  { icon: "check", title: "Atomic Validation", desc: "Dry run all transactions against working state copy. If any tx fails, entire block rejected. Commit only on full pass.", mono: "checked_add / checked_sub \u00b7 zero partial state" },
  { icon: "shieldCheck", title: "Replay Protection", desc: "chain_id (7119) embedded in signing payload \u2014 prevents cross-chain replay attacks. Sequential nonce validation. P2P peers rejected on chain_id mismatch.", mono: "chain_id: 7119 (0x1bcf) \u00b7 nonce + API key" },
];

export const ROADMAP = [
  {
    phase: "Pioneer",
    status: "done" as const,
    statusText: "\u2713 Complete \u2014 Q2 2026",
    title: "PoA Genesis",
    items: ["Core blockchain engine, ECDSA wallets, sled storage", "SRX-20 token standard, block explorer, JSON-RPC 2.0", "libp2p networking, 7 validators on 3 VPS", "525+ tests, 22.5K LOC, v1.2.0 released"],
  },
  {
    phase: "Voyager",
    status: "active" as const,
    statusText: "\u25cf Q3-Q4 2026",
    title: "DPoS + BFT + EVM",
    items: ["Delegated Proof of Stake with rewards distribution", "BFT finality (2/3+ validator votes) — wired and active", "EVM smart contracts via revm — 519 tests passing", "Staking, delegation, slashing, encrypted keystores"],
  },
  {
    phase: "Frontier",
    status: "planned" as const,
    statusText: "\u25cb 2027",
    title: "Ecosystem Expansion",
    items: ["Sentrix Pay, RWA tokenization, digital identity", "DEX, lending, parametric insurance", "Developer SDKs, documentation portal", "Exchange listing applications"],
  },
  {
    phase: "Odyssey",
    status: "planned" as const,
    statusText: "\u25cb 2027-2028",
    title: "Full Public Chain",
    items: ["Cross-chain bridges, mobile wallet", "On-chain governance via SNTX", "Ecosystem grants program", "Mature validator network, global reach"],
  },
];

export const TICKER_ITEMS = [
  "SRX|$0.00", "CHAIN ID|7119 (0x1bcf)", "HARD CAP|210,000,000", "BURN|50% per tx",
  "BLOCK TIME|3s", "FINALITY|Instant", "CONSENSUS|PoA + BFT", "UNIT|1 sentri = 10\u207b\u2078 SRX",
  "TOKEN STD|SRX-20", "MIN FEE|0.0001 SRX", "MAX TX/BLOCK|100", "P2P|libp2p",
  "STORAGE|sled DB", "STATUS|\u25cf LIVE",
];

export const METAMASK_CONFIG = [
  { label: "Network", value: "Sentrix" },
  { label: "RPC URL", value: "sentrix-rpc.sentriscloud.com" },
  { label: "Chain ID", value: "7119" },
  { label: "Symbol", value: "SRX" },
  { label: "Explorer", value: "sentrixscan.sentriscloud.com" },
];
