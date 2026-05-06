// CoinBlast WebSocket layer — eth_subscribe push for live trade feed +
// BFT-finalized confirmations on the buy/sell widget.
//
// Sentrix's chain RPC speaks `eth_subscribe` with both Ethereum-standard
// channels (newHeads, logs, newPendingTransactions) and Sentrix-native
// extensions (sentrix_finalized, sentrix_validatorSet, sentrix_tokenOps,
// sentrix_stakingOps, sentrix_jail) — all served through the same
// entry point. Source: crates/sentrix-rpc/src/ws/mod.rs:243-376.
//
// Why a hand-rolled client instead of wagmi's `useWatchContractEvent` or a
// generic SWR/TanStack layer? Two reasons:
//   1. We need `sentrix_finalized` (non-standard channel — wagmi's WebSocket
//      transport doesn't know about it).
//   2. The live feed wants ONE shared connection across multiple components
//      and across pages — the ConnectionPool below dedupes by URL so /live,
//      BuySellWidget, and PriceHistoryChart end up sharing a single WS.
//
// Reconnection: bounded exponential backoff + a short total-failure ceiling
// (8 attempts) so a permanently-down RPC doesn't loop forever. After the
// ceiling we go quiet and let polling fallbacks take over (the indexer
// poll in /live remains alive at 3s as a backstop).

"use client";

import { useEffect, useRef, useState } from "react";

type Json = unknown;

interface Subscription {
  method: "eth_subscribe";
  channel: string;
  args?: Json[];
  cb: (msg: Json) => void;
  serverId: string | null;
}

class WSClient {
  static MAX_FAILED_ATTEMPTS = 8;
  private url: string;
  private ws: WebSocket | null = null;
  private nextRpcId = 1;
  private pending = new Map<number, (result: Json) => void>();
  private subs = new Map<number, Subscription>();
  private nextSubLocal = 1;
  private connectAttempts = 0;
  private successfulConnects = 0;
  private connecting = false;
  private closed = false;

  constructor(url: string) {
    this.url = url;
  }

  connect(): void {
    if (this.connecting || (this.ws && this.ws.readyState <= 1)) return;
    this.connecting = true;
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.onopen = () => {
      this.connecting = false;
      this.connectAttempts = 0;
      this.successfulConnects++;
      // Re-subscribe everything that was registered while disconnected.
      for (const [, sub] of this.subs) {
        sub.serverId = null;
        this.sendSubscribe(sub);
      }
    };
    ws.onmessage = (e) => this.handleMessage(String(e.data));
    ws.onerror = () => { /* surfaced via onclose */ };
    ws.onclose = () => {
      this.connecting = false;
      this.ws = null;
      if (this.closed) return;
      this.connectAttempts++;
      // Hard-stop only when EVERY attempt has failed (no successful connects
      // ever) AND we've burned the budget. Once a connection has worked we
      // keep retrying forever — those are transient drops, not "RPC offline".
      if (this.successfulConnects === 0 && this.connectAttempts >= WSClient.MAX_FAILED_ATTEMPTS) {
        this.closed = true;
        return;
      }
      const delay = Math.min(30_000, 500 * Math.pow(2, this.connectAttempts));
      setTimeout(() => this.connect(), delay);
    };
  }

  private handleMessage(raw: string): void {
    let m: Record<string, unknown>;
    try { m = JSON.parse(raw); } catch { return; }
    // RPC reply (numbered id) — fulfill the matching pending callback.
    if (typeof m.id === "number" && m.result !== undefined) {
      const cb = this.pending.get(m.id);
      if (cb) {
        this.pending.delete(m.id);
        cb(m.result);
      }
      return;
    }
    // Subscription event — match server-assigned id back to local subs.
    if (m.method === "eth_subscription" && m.params) {
      const p = m.params as { subscription: string; result: Json };
      for (const [, sub] of this.subs) {
        if (sub.serverId === p.subscription) sub.cb(p.result);
      }
    }
  }

  private sendSubscribe(sub: Subscription): void {
    if (!this.ws || this.ws.readyState !== 1) return;
    const id = this.nextRpcId++;
    this.pending.set(id, (r) => { sub.serverId = String(r); });
    const params = [sub.channel, ...(sub.args ?? [])];
    this.ws.send(JSON.stringify({ jsonrpc: "2.0", id, method: sub.method, params }));
  }

  subscribe(
    channel: string,
    cb: (msg: Json) => void,
    args?: Json[],
  ): () => void {
    if (!this.ws) this.connect();
    const localId = this.nextSubLocal++;
    const sub: Subscription = { method: "eth_subscribe", channel, args, cb, serverId: null };
    this.subs.set(localId, sub);
    if (this.ws?.readyState === 1) this.sendSubscribe(sub);

    return () => {
      const s = this.subs.get(localId);
      this.subs.delete(localId);
      if (s?.serverId && this.ws?.readyState === 1) {
        const id = this.nextRpcId++;
        this.ws.send(JSON.stringify({
          jsonrpc: "2.0",
          id,
          method: "eth_unsubscribe",
          params: [s.serverId],
        }));
      }
    };
  }
}

const pool = new Map<string, WSClient>();
function getClient(url: string): WSClient {
  let c = pool.get(url);
  if (!c) { c = new WSClient(url); pool.set(url, c); }
  return c;
}

function defaultWsUrl(): string {
  // NEXT_PUBLIC_RPC_URL on coinblast points at the JSON-RPC HTTP host
  // (https://rpc.sentrixchain.com/rpc). Convert to the ws subdomain on
  // the API host: wss://api.sentrixchain.com/ws. Both endpoints are
  // load-balanced across the same validator set.
  const rpc = process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc.sentrixchain.com/rpc";
  try {
    const u = new URL(rpc);
    const host = u.host
      .replace(/^rpc\./, "api.")
      .replace(/^testnet-rpc\./, "testnet-api.");
    return `wss://${host}/ws`;
  } catch {
    return "wss://api.sentrixchain.com/ws";
  }
}

// ── topic0 hashes — derived at module load via viem keccak so the values
//    can never drift from the canonical event signatures. Same pattern the
//    indexer uses (see indexer-deploy/apps/indexer/src/coinblast/events.ts).

import { keccak256, toBytes } from "viem";

function topic0(sig: string): `0x${string}` {
  return keccak256(toBytes(sig));
}

export const TOPIC = {
  buy: topic0("Buy(address,uint256,uint256,uint256)"),
  sell: topic0("Sell(address,uint256,uint256,uint256)"),
  curveCreated: topic0(
    "CurveCreated(address,address,address,string,string,uint256,uint256)",
  ),
  graduated: topic0("Graduated(address,uint256,uint256,uint256)"),
} as const;

interface SubscribeLogsOpts {
  /** Single address or array of addresses to filter logs by. Required —
   *  unfiltered subscriptions would deliver every log on chain. */
  address: `0x${string}` | `0x${string}`[];
  /** Topic filter (positional, like eth_getLogs). Pass `[null]` for any
   *  topic0 — the chain accepts that. */
  topics?: (string | string[] | null)[];
  /** Override the WS endpoint (mostly for tests). */
  wsUrl?: string;
}

export interface RawLog {
  address: `0x${string}`;
  topics: `0x${string}`[];
  data: `0x${string}`;
  blockNumber: `0x${string}`;
  transactionHash: `0x${string}`;
  logIndex: `0x${string}`;
  removed: boolean;
}

/**
 * Counter that increments every time a matching log lands.
 *
 * Designed to be cheap to consume — pages put `tick` in a useEffect dep
 * array to re-fetch indexer-enriched data when a chain-level event fires.
 * The reason we don't decode the log here: the indexer's enriched view
 * (token metadata, fee, derived price) is the source of truth and stays
 * canonical across reloads. WS push acts as a low-latency invalidation
 * signal; the actual data still flows through `/api/cb/*`.
 */
export function useEthSubscribeLogs(opts: SubscribeLogsOpts | null): {
  tick: number;
  lastLog: RawLog | null;
} {
  const [tick, setTick] = useState(0);
  const lastLog = useRef<RawLog | null>(null);
  const optsKey = opts ? JSON.stringify(opts) : null;

  useEffect(() => {
    if (!opts) return;
    const url = opts.wsUrl ?? defaultWsUrl();
    const filter: Record<string, unknown> = { address: opts.address };
    if (opts.topics && opts.topics.length > 0) filter.topics = opts.topics;
    const unsub = getClient(url).subscribe("logs", (msg) => {
      const log = msg as RawLog;
      lastLog.current = log;
      setTick((n) => n + 1);
    }, [filter]);
    return () => { unsub(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optsKey]);

  return { tick, lastLog: lastLog.current };
}

export interface FinalizedEvent {
  height: number;
  hash: `0x${string}`;
}

/**
 * Latest BFT-finalized block height. Sub fires whenever the chain crosses
 * 2/3+1 supermajority on a new block — arrives ~1 block (≈1s) after the
 * block is mined. Useful for the "BFT Finalized" confirmation badge on the
 * buy/sell widget: we capture the receipt's blockNumber and flip the badge
 * once `finalized.height >= receipt.blockNumber`.
 */
export function useEthSubscribeFinalized(): FinalizedEvent | null {
  const [event, setEvent] = useState<FinalizedEvent | null>(null);
  useEffect(() => {
    const url = defaultWsUrl();
    const unsub = getClient(url).subscribe("sentrix_finalized", (msg) => {
      const m = msg as Record<string, unknown>;
      // Server-side payload includes `height` (decimal number) and `hash`.
      const height = typeof m.height === "number" ? m.height : 0;
      const hash = typeof m.hash === "string" ? (m.hash as `0x${string}`) : null;
      if (height > 0 && hash) setEvent({ height, hash });
    });
    return () => { unsub(); };
  }, []);
  return event;
}
