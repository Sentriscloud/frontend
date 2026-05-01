"use client";

// Per-browser launch ledger. When a user deploys a CoinBlastCurve via
// /create, we record the curve+token addresses + name/symbol in
// localStorage so their own launch surfaces immediately in the
// launchpad list — even before any cross-user discovery hook catches
// up. Multi-user discovery (= every visitor sees every launch) needs
// a CoinBlastFactory contract emitting a registration event; until
// that ships, this is the per-device shortcut. The trade-off is that
// other people don't see your launch until the factory lands or until
// you advertise the curve address manually.
//
// Stored under `coinblast:local-launches:v1`, capped at 200 entries
// (FIFO). Values keyed by curve address (lowercase) so reload de-dupes.

import type { Token } from "@/types";

const KEY = "coinblast:local-launches:v1";
const CAP = 200;

export interface LocalLaunch {
  curveAddress: `0x${string}`;
  tokenAddress: `0x${string}`;
  name: string;
  symbol: string;
  owner: `0x${string}`;
  chainId: number;
  createdAt: number; // unix seconds
  description?: string;
  imageUrl?: string;
}

function load(): LocalLaunch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LocalLaunch[];
  } catch {
    return [];
  }
}

function save(list: LocalLaunch[]): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = list.length > CAP ? list.slice(-CAP) : list;
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    /* quota / private mode — silent */
  }
}

export function recordLocalLaunch(launch: LocalLaunch): void {
  const all = load();
  const lower = launch.curveAddress.toLowerCase();
  const existing = all.findIndex(
    (l) => l.curveAddress.toLowerCase() === lower,
  );
  if (existing >= 0) {
    all[existing] = launch;
  } else {
    all.push(launch);
  }
  save(all);
}

export function listLocalLaunches(chainId: number): LocalLaunch[] {
  return load().filter((l) => l.chainId === chainId);
}

/**
 * Convert a stored LocalLaunch into the Token shape the launchpad
 * cards expect. Default rich fields (description, image) are blank
 * unless the launch flow captured them; trading state (tokensSold,
 * marketCap, progress) is left at zeroes — the BuySellWidget reads
 * live state from the curve itself.
 */
export function localLaunchToToken(l: LocalLaunch): Token {
  return {
    address: l.tokenAddress,
    curveAddress: l.curveAddress,
    name: l.name,
    symbol: l.symbol,
    description: l.description ?? "",
    imageUrl: l.imageUrl ?? "",
    creator: l.owner,
    totalSupply: 1_000_000_000, // pre-fetched display default; the curve has the truth
    tokensSold: 0,
    createdAt: l.createdAt,
    volume24h: 0,
    isGraduated: false,
    isWarned: false,
    isVerified: false,
    price: 0.0001,
    marketCap: 0,
    progress: 0,
    graduationThresholdSrx: 1000,
  };
}
