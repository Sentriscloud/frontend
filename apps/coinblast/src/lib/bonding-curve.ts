import type { BondingCurvePoint } from '@/types'

// Bonding curve parameters (matches whitepaper)
export const BASE_PRICE = 0.0001       // SRX per token
export const K = 0.5                    // curve steepness
export const LAUNCH_FEE = 100          // SNTX (burned on deploy)
export const TRADING_FEE = 0.01        // 1% per trade
export const GRADUATION_THRESHOLD = 69_000  // SRX market cap

/**
 * Price at a given point on the curve.
 * Formula: P = BasePrice × (1 + k × tokensSold / totalSupply)
 */
export function getPrice(tokensSold: number, totalSupply: number): number {
  if (totalSupply === 0) return BASE_PRICE
  return BASE_PRICE * (1 + K * (tokensSold / totalSupply))
}

/**
 * Market cap = price × tokensSold
 */
export function getMarketCap(tokensSold: number, totalSupply: number): number {
  return getPrice(tokensSold, totalSupply) * tokensSold
}

/**
 * % progress toward graduation threshold
 */
export function getProgress(tokensSold: number, totalSupply: number): number {
  const mc = getMarketCap(tokensSold, totalSupply)
  return Math.min((mc / GRADUATION_THRESHOLD) * 100, 100)
}

/**
 * Estimate tokens received when buying with srxAmount SRX.
 * Uses midpoint price approximation.
 */
export function estimateBuy(srxIn: number, tokensSold: number, totalSupply: number): {
  tokensOut: number
  fee: number
  priceImpact: number
} {
  const fee = srxIn * TRADING_FEE
  const net = srxIn - fee
  const priceNow = getPrice(tokensSold, totalSupply)
  // approximate: use current price (ignores price impact for small trades)
  const tokensOut = net / priceNow
  const newSold = tokensSold + tokensOut
  const priceAfter = getPrice(newSold, totalSupply)
  const priceImpact = ((priceAfter - priceNow) / priceNow) * 100
  return { tokensOut, fee, priceImpact }
}

/**
 * Estimate SRX received when selling tokensIn tokens.
 */
export function estimateSell(tokensIn: number, tokensSold: number, totalSupply: number): {
  srxOut: number
  fee: number
  priceImpact: number
} {
  const priceNow = getPrice(tokensSold, totalSupply)
  const newSold = Math.max(tokensSold - tokensIn, 0)
  const priceAfter = getPrice(newSold, totalSupply)
  const avgPrice = (priceNow + priceAfter) / 2
  const gross = tokensIn * avgPrice
  const fee = gross * TRADING_FEE
  const srxOut = gross - fee
  const priceImpact = ((priceNow - priceAfter) / priceNow) * 100
  return { srxOut, fee, priceImpact }
}

/**
 * Generate chart data points for the bonding curve.
 * Returns 60 points across the full supply range.
 */
export function generateCurveData(
  totalSupply: number,
  tokensSold: number
): BondingCurvePoint[] {
  const POINTS = 60
  return Array.from({ length: POINTS }, (_, i) => {
    const pct = (i / (POINTS - 1)) * 100
    const sold = (pct / 100) * totalSupply
    return {
      pct,
      price: getPrice(sold, totalSupply),
      isSold: sold <= tokensSold,
    }
  })
}
