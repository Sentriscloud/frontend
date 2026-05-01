// Mock-data was removed 2026-05-01. CoinBlast has no on-chain factory or
// deployed bonding-curve contracts yet, so the launchpad lists nothing —
// the UI now renders empty states everywhere mock fixtures used to live.
//
// When the on-chain registry is ready, replace these exports with hooks
// that read from the registry contract (planned: a `CoinBlastFactory`
// that creates + tracks `CoinBlastCurve` instances). Each curve exposes
// tokensSold / srxRaised / graduated / curveSupply directly via the ABI
// in `coinblast-curve-abi.ts`.

import type { Token, Holder, Trade } from '@/types'

export const MOCK_TOKENS: Token[] = []
export const MOCK_HOLDERS: Holder[] = []
export const MOCK_TRADES: Trade[] = []

export const PLATFORM_STATS = {
  totalTokens: 0,
  totalVolumeSRX: 0,
  totalSRXBurned: 0,
  activeTraders: 0,
}
