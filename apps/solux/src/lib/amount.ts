// Amount math for SRX (8 decimals = 100_000_000 sentri per SRX) and
// SRC-20 tokens with arbitrary decimals.
//
// Precision contract: JavaScript Number is safe up to 2^53-1 ≈ 9.007e15.
// SRX max safe = 9.007e15 / 1e8 ≈ 9 × 10^7 = 90 million SRX. Inputs above
// this would silently lose precision in `parseInt(whole+padded, 10)` and
// produce a corrupted signing payload. We refuse them at parse time.
// Full BigInt refactor is the long-term fix (signing payload, JSON.stringify
// of u64, balance display); for now we guard at the boundary.

export const SENTRI = 100_000_000;
export const MAX_SAFE_SRX_SENTRI = Number.MAX_SAFE_INTEGER;
// Protocol minimum fee in sentri (0.0001 SRX). Mirrors the consensus
// floor; raising this on the chain side requires bumping here in lock-step.
export const MIN_FEE = 10000;

export class AmountOverflowError extends Error {
  constructor(public input: string) {
    super(`Amount exceeds safe precision (~90 million SRX). Split into smaller transactions.`);
    this.name = 'AmountOverflowError';
  }
}

function safeParse(concat: string): number {
  if (concat.length > 16) throw new AmountOverflowError(concat);
  const parsed = parseInt(concat, 10);
  if (!Number.isFinite(parsed) || parsed > MAX_SAFE_SRX_SENTRI) {
    throw new AmountOverflowError(concat);
  }
  return parsed;
}

/**
 * Parse user-typed SRX amount (e.g. "10000.5") into sentri units (u64).
 * Throws {@link AmountOverflowError} if the result would lose precision.
 */
export function parseSRXToSentri(input: string): number {
  const [whole = '0', decimal = ''] = input.split('.');
  const paddedDecimal = decimal.padEnd(8, '0').slice(0, 8);
  return safeParse(whole + paddedDecimal);
}

export function sentriToSRX(sentri: number): string {
  const whole = Math.floor(sentri / SENTRI);
  const frac = String(sentri % SENTRI).padStart(8, '0').replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : `${whole}`;
}

// Generic SRC-20 token amount with arbitrary decimals.
export function parseAmount(input: string, decimals: number): number {
  const [whole = '0', decimal = ''] = input.split('.');
  const padded = decimal.padEnd(decimals, '0').slice(0, decimals);
  return safeParse((whole || '0') + padded);
}

export function formatAmount(units: number, decimals: number): string {
  if (decimals === 0) return String(units);
  const divisor = 10 ** decimals;
  const whole = Math.floor(units / divisor);
  const frac = String(units % divisor).padStart(decimals, '0').replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : String(whole);
}

/**
 * Compact display formatter for the hero / stat / asset-row numbers.
 * Long balances like 21,000,000.00 SRX overflow narrow cards; collapse
 * 10K+ to "K", 1M+ to "M", 1B+ to "B" with trimmed trailing zeros.
 * Below 10K the full localised number with up to 2 decimals is returned.
 *
 * Pair with the original full format in a `title` attribute so users
 * who need the precise figure still get it on hover.
 */
export function formatCompactSRX(srx: number): string {
  if (!isFinite(srx)) return '—';
  const abs = Math.abs(srx);
  if (abs >= 1e9) return (srx / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B';
  if (abs >= 1e6) return (srx / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
  if (abs >= 1e4) return (srx / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return srx.toLocaleString('en-US', { maximumFractionDigits: 2 });
}
