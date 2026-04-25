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
