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
  // 2026-04-30 audit: guard against unparseable input that bubbles through
  // toMillis as NaN — without this, every comparison below is false and we
  // fall through to `new Date(NaN).toLocaleDateString()` = "Invalid Date".
  if (!Number.isFinite(then)) return "—";
  const diff = Math.floor((now - then) / 1000);

  // Spelled-out spec 2026-05-02 — Etherscan-style "X secs ago", "X mins ago",
  // "X hours ago". Older than a day stays as days indefinitely; the grew-up
  // explorer reading habit is "this transaction is N days old", not a date.
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff} sec${diff === 1 ? "" : "s"} ago`;
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return `${m} min${m === 1 ? "" : "s"} ago`;
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return `${h} hour${h === 1 ? "" : "s"} ago`;
  }
  const d = Math.floor(diff / 86400);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export function formatTimestamp(timestamp: string | number): string {
  const ms = toMillis(timestamp);
  if (!Number.isFinite(ms)) return "—";
  return new Date(ms).toLocaleString("en-US", {
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
  // Tx hashes accept BOTH 0x-prefixed (wallet shape) and bare 64-hex
  // (Sentrix REST shape) — fetchTransaction normalizes both to bare
  // before hitting the backend. Without bare-hex detection, copying a
  // hash out of the explorer's own UI and re-pasting into the search
  // bar fell through to token search.
  if (/^0x[a-fA-F0-9]{64}$/.test(trimmed)) return "tx";
  if (/^[a-fA-F0-9]{64}$/.test(trimmed)) return "tx";
  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) return "address";
  return "unknown";
}
