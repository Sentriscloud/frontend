// Token registry. Each entry is the *static* metadata for a deployed
// CoinBlast curve (name, symbol, social links, contract addresses); the
// dynamic state (tokensSold, srxRaised, graduated, marketCap, progress)
// is meant to be overlaid by useCurveState() at render time so cards
// and the BuySellWidget stay in sync with the chain.
//
// The default fields below — tokensSold, totalSupply, price, marketCap,
// progress — are SEED VALUES used until the per-card hook resolves.
// Once a hook resolution lands the static row's snapshot becomes
// irrelevant. List pages that haven't been migrated to the hook still
// see the seed; it's stale but never wrong-by-direction (totalSupply,
// name, symbol are immutable; the rest are 0 / empty for fresh launches).
//
// When the chain ships a CoinBlastFactory that enumerates curves
// on-chain, swap this static array for a hook that reads the factory.

import type { Token, Holder, Trade } from '@/types'

export const MOCK_TOKENS: Token[] = [
  {
    address: '0xe1d502b93ce492cbde32a369d5393626e38d55a7',
    curveAddress: '0x7a2992af0d4979add076347666023d66d29276fc',
    name: 'CoinBlast Genesis',
    symbol: 'CBLAST',
    description:
      "First on-chain CoinBlast bonding-curve launch. Linear curve, 1B supply, 0.0001 SRX base price, K = 0.5, graduation at 1000 SRX raised. Fees accrue to the SentrisCloud Ecosystem Fund.",
    // Owner of CBLAST genesis is the zero address (deployed direct via
    // useDeployContract pre-factory) so the sig-gated POST /coinblast/
    // metadata endpoint can never accept an icon for it. Seed via
    // MOCK_TOKENS instead so the genesis card has visual parity with
    // the factory-deployed launches.
    imageUrl: 'ipfs://bafkreic35xrbrthns6txvswf3cbk4uor2fbdfdpvlxalwdmxlxylop4jo4',
    creator: '0x5acb04058fc4dfa258f29ce318282377cac176fd',
    totalSupply: 1_000_000_000,
    tokensSold: 0,
    // 0 = "just launched" (formatTimestamp short-circuits). Better than a
    // fixed Unix seed that drifts as soon as time passes; ideally read from
    // the curve's deploy block.timestamp via a hook.
    createdAt: 0,
    volume24h: 0,
    isGraduated: false,
    isWarned: false,
    isVerified: true,
    price: 0.0001,
    marketCap: 0,
    progress: 0,
    graduationThresholdSrx: 1000, // matches CoinBlastCurve.graduationSrxThreshold = 1000 SRX
  },
  {
    // JST — bare ERC-20 deployed early (pre-metadata-endpoint). Owner
    // wallet (0x4fec…34b7) lives in operator's MetaMask, not on the
    // build host, so the sig-gated POST flow can't be run from a
    // script. Seed via MOCK_TOKENS so the card has visual parity with
    // factory-deployed launches. Same pattern CBLAST genesis uses.
    address: '0xc9Ff6CedfBd00B6aB647777A558423Bef4E055A8',
    curveAddress: '0xc4a8157b1dc0129618892d038460b324e0c145fe',
    name: 'Just token',
    symbol: 'JST',
    description:
      'Just token. Bare ERC-20 deployed early on Sentrix Chain — predates the canonical CoinBlast bonding-curve flow.',
    imageUrl: 'ipfs://bafkreif6m53yyc7x3xab5yg3sw2tjcijunnk3dig53hmxothzupp4hm4oy',
    creator: '0x4fecfdaf3711caee67ad916b6213436feb1c34b7',
    totalSupply: 1_000_000_000,
    tokensSold: 0,
    createdAt: 0,
    volume24h: 0,
    isGraduated: false,
    isWarned: false,
    isVerified: false,
    price: 0.0001,
    marketCap: 0,
    progress: 0,
    graduationThresholdSrx: 10000,
  },
]

export const MOCK_HOLDERS: Holder[] = []
export const MOCK_TRADES: Trade[] = []

export const PLATFORM_STATS = {
  totalTokens: MOCK_TOKENS.length,
  totalVolumeSRX: 0,
  totalSRXBurned: 0,
  activeTraders: 0,
}
