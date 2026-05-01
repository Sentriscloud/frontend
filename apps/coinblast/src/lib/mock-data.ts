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
    imageUrl: '',
    creator: '0x5acb04058fc4dfa258f29ce318282377cac176fd',
    totalSupply: 1_000_000_000,
    tokensSold: 0,
    createdAt: 1746105000, // 2026-05-01 ~14:30 UTC
    volume24h: 0,
    isGraduated: false,
    isWarned: false,
    isVerified: true,
    price: 0.0001,
    marketCap: 0,
    progress: 0,
  },
]

export const MOCK_HOLDERS: Holder[] = []
export const MOCK_TRADES: Trade[] = []

export const PLATFORM_STATS = {
  totalTokens: 1,
  totalVolumeSRX: 0,
  totalSRXBurned: 0,
  activeTraders: 0,
}
