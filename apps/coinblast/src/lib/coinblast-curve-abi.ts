// ABI for the on-chain CoinBlastCurve contract
// (canonical-contracts/contracts/CoinBlastCurve.sol).
//
// One curve instance per launched token. The frontend reads tokensSold /
// srxRaised / graduated for display, calls quoteBuy/quoteSell for accurate
// pricing (replaces the local TS estimator), and submits buy/sell.

export const coinBlastCurveAbi = [
  // ── Reads ────────────────────────────────────────────────────────
  {
    type: "function",
    stateMutability: "view",
    name: "token",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "curveSupply",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "tokensSold",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "srxRaised",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "graduated",
    inputs: [],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "graduationSrxThreshold",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "feeBps",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "quoteBuy",
    inputs: [{ name: "tokensOut", type: "uint256" }],
    outputs: [
      { name: "grossSrxIn", type: "uint256" },
      { name: "fee", type: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "quoteSell",
    inputs: [{ name: "tokensIn", type: "uint256" }],
    outputs: [
      { name: "srxOut", type: "uint256" },
      { name: "fee", type: "uint256" },
    ],
  },
  // ── Writes ───────────────────────────────────────────────────────
  {
    type: "function",
    stateMutability: "payable",
    name: "buy",
    inputs: [{ name: "minTokensOut", type: "uint256" }],
    outputs: [{ name: "tokensOut", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "sell",
    inputs: [
      { name: "tokensIn", type: "uint256" },
      { name: "minSrxOut", type: "uint256" },
    ],
    outputs: [{ name: "srxOut", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "graduate",
    inputs: [],
    outputs: [],
  },
  // ── Events ───────────────────────────────────────────────────────
  {
    type: "event",
    name: "Buy",
    inputs: [
      { indexed: true, name: "buyer", type: "address" },
      { indexed: false, name: "srxIn", type: "uint256" },
      { indexed: false, name: "fee", type: "uint256" },
      { indexed: false, name: "tokensOut", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "Sell",
    inputs: [
      { indexed: true, name: "seller", type: "address" },
      { indexed: false, name: "tokensIn", type: "uint256" },
      { indexed: false, name: "fee", type: "uint256" },
      { indexed: false, name: "srxOut", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "Graduated",
    inputs: [
      { indexed: true, name: "pair", type: "address" },
      { indexed: false, name: "srxLiquidity", type: "uint256" },
      { indexed: false, name: "tokenLiquidity", type: "uint256" },
      { indexed: false, name: "lpBurned", type: "uint256" },
    ],
  },
] as const;
