export interface Token {
  address: string
  name: string
  symbol: string
  description: string
  imageUrl: string
  creator: string
  totalSupply: number
  tokensSold: number
  createdAt: number // unix timestamp
  volume24h: number // in SRX
  isGraduated: boolean
  isWarned: boolean
  isVerified: boolean
  /**
   * On-chain CoinBlastCurve contract address — present when this token has a
   * deployed bonding-curve contract. Absent for mock data + pre-deploy state;
   * BuySellWidget falls back to the local TS estimator when null.
   */
  curveAddress?: `0x${string}`
  /**
   * Per-launch graduation threshold in **whole SRX raised** (matches the
   * contract's `graduationSrxThreshold` field, just in SRX not wei).
   * Different launches will have different thresholds — this lives on the
   * row so the UI doesn't need to thread an on-chain read for static text.
   * If absent, the UI falls back to the legacy 69_000 SRX market-cap
   * default (kept around for pre-deploy preview rows only).
   */
  graduationThresholdSrx?: number
  // social links (all optional)
  website?: string
  twitter?: string
  telegram?: string
  discord?: string
  // computed
  price: number // in SRX
  marketCap: number // in SRX
  progress: number // 0–100, toward graduation
}

export interface Holder {
  address: string
  amount: number
  percentage: number
}

export interface Trade {
  txHash: string
  type: 'buy' | 'sell'
  address: string
  tokenAmount: number
  srxAmount: number
  timestamp: number
}

export interface WalletState {
  address: string | null
  isConnecting: boolean
  isConnected: boolean
}

export interface BondingCurvePoint {
  pct: number
  price: number
  isSold: boolean
}
