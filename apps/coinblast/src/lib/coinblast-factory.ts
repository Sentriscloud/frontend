// CoinBlastFactory — canonical deployer for bonding-curve launches.
// One createCurve call per launch, one CurveCreated event per launch,
// one shared registry every frontend can scan.
//
// Deploy log:
//   Mainnet 7119: 0xc9D7a61D7C2F428F6A055916488041fD00532110
//                 tx 0x961be17a…fc3d6d5c block 1178667
//   Testnet 7120: 0xc7FBd67fb809b189998cB27F1857b50A3e09619c
//                 tx 0xd25cb184…0b8d060c block 1637883

export const COINBLAST_FACTORY_ADDRESSES = {
  7119: "0xc9D7a61D7C2F428F6A055916488041fD00532110" as `0x${string}`,
  7120: "0xc7FBd67fb809b189998cB27F1857b50A3e09619c" as `0x${string}`,
} as const;

export const COINBLAST_FACTORY_DEPLOY_BLOCK: Record<7119 | 7120, bigint> = {
  7119: 1178667n,
  7120: 1637883n,
} as const;

export const COINBLAST_FACTORY_ABI = [
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "createCurve",
    inputs: [
      {
        name: "p",
        type: "tuple",
        components: [
          { name: "name", type: "string" },
          { name: "symbol", type: "string" },
          { name: "curveSupply", type: "uint256" },
          { name: "basePriceNum", type: "uint256" },
          { name: "basePriceDen", type: "uint256" },
          { name: "kNum", type: "uint256" },
          { name: "kDen", type: "uint256" },
          { name: "graduationSrxThreshold", type: "uint256" },
          { name: "feeRecipient", type: "address" },
          { name: "feeBps", type: "uint256" },
          { name: "router", type: "address" },
          { name: "wsrx", type: "address" },
        ],
      },
    ],
    outputs: [{ name: "curve", type: "address" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "totalCurves",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "curvesOf",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "address[]" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "allCurves",
    inputs: [{ type: "uint256" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "event",
    name: "CurveCreated",
    inputs: [
      { indexed: true, name: "curve", type: "address" },
      { indexed: true, name: "token", type: "address" },
      { indexed: true, name: "owner", type: "address" },
      { indexed: false, name: "name", type: "string" },
      { indexed: false, name: "symbol", type: "string" },
      { indexed: false, name: "curveSupply", type: "uint256" },
      { indexed: false, name: "graduationSrxThreshold", type: "uint256" },
    ],
  },
] as const;
