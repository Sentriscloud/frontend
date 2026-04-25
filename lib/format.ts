export function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

export function formatSRX(amount: number): string {
  if (!isFinite(amount)) return "— SRX";
  if (amount === 0) return "0 SRX";
  if (amount >= 1_000_000_000) return (amount / 1_000_000_000).toFixed(2) + "B SRX";
  if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(2) + "M SRX";
  if (amount >= 1_000) return (amount / 1_000).toFixed(2) + "K SRX";
  // DECISION: keep 2 decimals for sub-1K amounts so stat cards don't overflow ("600.0119 SRX"
  // wrapped on the 2×5 grid). Sub-1 non-zero amounts keep 4 decimals — small-coin precision matters.
  if (amount >= 1) return amount.toFixed(2) + " SRX";
  return amount.toFixed(4) + " SRX";
}

export function shortenHash(hash: string, chars = 6): string {
  if (!hash) return "";
  if (hash.length <= chars * 2 + 2) return hash;
  return `${hash.slice(0, chars + 2)}...${hash.slice(-chars)}`;
}

export function shortenAddress(address: string): string {
  return shortenHash(address, 6);
}

// DECISION: API returns unix seconds (10 digits, e.g. 1776597784). JS Date expects ms.
// Any numeric timestamp below 1e12 is treated as seconds and scaled up.
export function toMillis(timestamp: string | number): number {
  if (typeof timestamp === "string") {
    const n = Number(timestamp);
    if (Number.isFinite(n)) return n < 1e12 ? n * 1000 : n;
    return new Date(timestamp).getTime();
  }
  return timestamp < 1e12 ? timestamp * 1000 : timestamp;
}

export function timeAgo(timestamp: string | number): string {
  const now = Date.now();
  const then = toMillis(timestamp);
  const diff = Math.floor((now - then) / 1000);

  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(then).toLocaleDateString();
}

export function formatTimestamp(timestamp: string | number): string {
  const date = new Date(toMillis(timestamp));
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function detectSearchType(query: string): "block" | "tx" | "address" | "unknown" {
  const trimmed = query.trim();
  if (/^\d+$/.test(trimmed)) return "block";
  if (/^0x[a-fA-F0-9]{64}$/.test(trimmed)) return "tx";
  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) return "address";
  return "unknown";
}
