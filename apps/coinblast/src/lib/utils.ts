import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAddress(addr: string, chars = 4): string {
  if (!addr) return ''
  return `${addr.slice(0, chars + 2)}...${addr.slice(-chars)}`
}

export function formatNumber(n: number, decimals = 2): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(decimals)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(decimals)}K`
  return n.toFixed(decimals)
}

export function formatSRX(n: number): string {
  return `${formatNumber(n)} SRX`
}

export function formatPrice(n: number): string {
  if (n < 0.001) return n.toExponential(2) + ' SRX'
  return n.toFixed(6) + ' SRX'
}

export function formatTimestamp(ts: number): string {
  if (!ts || ts <= 0) return 'just launched'
  const diff = (Date.now() / 1000) - ts
  // Future timestamp (clock skew or seed-from-future-calendar) — don't
  // print "-3h ago", just call it fresh. Caught the CBLAST rollout
  // when the in-product calendar (2026-05-01) ran ahead of real Unix
  // (still 2025-05-01) and the seed displayed as "365d ago".
  if (diff < 0) return 'just launched'
  if (diff < 60) return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function shortenSymbol(s: string): string {
  return s.length > 6 ? s.slice(0, 6) : s
}
