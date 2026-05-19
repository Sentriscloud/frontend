// Sentrix V2 DEX deployed addresses (per
// `sentrix-labs/sentrix-dex/deployments/{7119,7120}.json`).
// feeToSetter on each Factory is the authority signer 0xa252…;
// users only need the Router for normal swap flow.

export const DEX = {
  mainnet: {
    factory: "0xC5344f0DDE0B9916217449Ad9222e446475aD936" as const,
    router: "0xAb67E171c0DE0Cd6dD6fE87E5E399C091F9c9dE8" as const,
    wsrx: "0x4693b113e523A196d9579333c4ab8358e2656553" as const,
  },
  testnet: {
    factory: "0x8565392086cbA8D39cBba1F6f60ad1F1A17651C7" as const,
    router: "0x2bF73491733c3b87D72b16d4f7151dA294b55cB0" as const,
    wsrx: "0x85d5E7694AF31C2Edd0a7e66b7c6c92C59fF949A" as const,
  },
} as const;

// Tokens currently listed on the DEX. SGC = Sentrix Genesis Coin,
// the first launched ERC-20 (1B supply, 18 decimals). New tokens
// land here once the operator lists their pair on the Factory.
export interface Token {
  symbol: string;
  name: string;
  address: "native" | `0x${string}`;
  decimals: number;
}

const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

function optionalErc20Token(
  symbol: string,
  name: string,
  address: string | undefined,
  decimals: number,
): readonly Token[] {
  if (!address || !EVM_ADDRESS_RE.test(address)) return [];
  return [{ symbol, name, address: address as `0x${string}`, decimals }];
}

const OPTIONAL_TOKENS = {
  mainnet: {
    sUSDC: process.env.NEXT_PUBLIC_SUSDC_MAINNET_ADDRESS,
  },
  testnet: {
    sUSDC: process.env.NEXT_PUBLIC_SUSDC_TESTNET_ADDRESS,
  },
} as const;

export const TOKENS: Record<"mainnet" | "testnet", readonly Token[]> = {
  mainnet: [
    { symbol: "SRX", name: "Sentrix", address: "native", decimals: 18 },
    {
      symbol: "SGC",
      name: "Sentrix Genesis Coin",
      address: "0xa79Fc9015aE30766ab4D24a5D4d3A0c66F371504",
      decimals: 18,
    },
    ...optionalErc20Token(
      "sUSDC",
      "Sentrix Bridged USDC",
      OPTIONAL_TOKENS.mainnet.sUSDC,
      6,
    ),
  ],
  testnet: [
    { symbol: "SRX", name: "Sentrix", address: "native", decimals: 18 },
    {
      symbol: "SGC",
      name: "Sentrix Genesis Coin",
      address: "0x72730453f4080C6ad8deF96c06F6074818Fb95B5",
      decimals: 18,
    },
    ...optionalErc20Token(
      "sUSDC",
      "Sentrix Bridged USDC",
      OPTIONAL_TOKENS.testnet.sUSDC,
      6,
    ),
  ],
};

export const PRICE_ROUTE_PREFERENCE = {
  mainnet: ["SRX/sUSDC", "SRX/sUSDT"],
  testnet: ["SRX/sUSDC", "SRX/sUSDT"],
} as const;

export const ROUTER_ABI = [
  {
    type: "function",
    stateMutability: "view",
    name: "getAmountsOut",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "path", type: "address[]" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
  {
    type: "function",
    stateMutability: "payable",
    name: "swapExactSRXForTokens",
    inputs: [
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "swapExactTokensForSRX",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "swapExactTokensForTokens",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
  // Liquidity surface — UniswapV2Router02 mirror. SRX flavour names the
  // ETH-equivalent variants for readability ("addLiquiditySRX" reads
  // closer to the chain's currency than "addLiquidityETH" would).
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "addLiquidity",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "amountADesired", type: "uint256" },
      { name: "amountBDesired", type: "uint256" },
      { name: "amountAMin", type: "uint256" },
      { name: "amountBMin", type: "uint256" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [
      { name: "amountA", type: "uint256" },
      { name: "amountB", type: "uint256" },
      { name: "liquidity", type: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "payable",
    name: "addLiquiditySRX",
    inputs: [
      { name: "token", type: "address" },
      { name: "amountTokenDesired", type: "uint256" },
      { name: "amountTokenMin", type: "uint256" },
      { name: "amountSRXMin", type: "uint256" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [
      { name: "amountToken", type: "uint256" },
      { name: "amountSRX", type: "uint256" },
      { name: "liquidity", type: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "removeLiquidity",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "liquidity", type: "uint256" },
      { name: "amountAMin", type: "uint256" },
      { name: "amountBMin", type: "uint256" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [
      { name: "amountA", type: "uint256" },
      { name: "amountB", type: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "removeLiquiditySRX",
    inputs: [
      { name: "token", type: "address" },
      { name: "liquidity", type: "uint256" },
      { name: "amountTokenMin", type: "uint256" },
      { name: "amountSRXMin", type: "uint256" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [
      { name: "amountToken", type: "uint256" },
      { name: "amountSRX", type: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "pure",
    name: "quote",
    inputs: [
      { name: "amountA", type: "uint256" },
      { name: "reserveA", type: "uint256" },
      { name: "reserveB", type: "uint256" },
    ],
    outputs: [{ name: "amountB", type: "uint256" }],
  },
] as const;

// Pair ABI — extended to cover the LP-token surface (totalSupply,
// balanceOf, approve, allowance) so the liquidity flows can read user
// share + approve LP tokens to the Router for burn. token1 added so
// the pool list can identify the trailing side in one read instead of
// inferring from the pair sort order.
export const PAIR_ABI = [
  {
    type: "function",
    stateMutability: "view",
    name: "getReserves",
    inputs: [],
    outputs: [
      { name: "reserve0", type: "uint112" },
      { name: "reserve1", type: "uint112" },
      { name: "blockTimestampLast", type: "uint32" },
    ],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "token0",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "token1",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "totalSupply",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "balanceOf",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

export const FACTORY_ABI = [
  {
    type: "function",
    stateMutability: "view",
    name: "getPair",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
    ],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "allPairsLength",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "allPairs",
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "createPair",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
    ],
    outputs: [{ name: "pair", type: "address" }],
  },
] as const;

export const ERC20_ABI = [
  {
    type: "function",
    stateMutability: "view",
    name: "balanceOf",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "symbol",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "decimals",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "name",
    inputs: [],
    outputs: [{ type: "string" }],
  },
] as const;
