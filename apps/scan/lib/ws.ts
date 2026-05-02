// Minimal WebSocket client + React hooks for Sentrix RPC subscriptions.
//
// Wire format: JSON-RPC 2.0 over the network's /ws endpoint.
// Subscribe via eth_subscribe / sentrix_subscribe; receive messages in
// the eth_subscription envelope:
//
//   { "jsonrpc": "2.0", "method": "eth_subscription",
//     "params": { "subscription": "0x01", "result": <payload> } }
//
// One singleton connection per WS URL is shared across all subscribers.
// Reconnects with exponential backoff on close. After a few consecutive
// failed connect attempts (with no successful open in between), gives
// up so an unsupported endpoint doesn't spam the browser console.

"use client";

import { useEffect, useRef, useState } from "react";
import { getWsUrl, type NetworkId } from "./chain";

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;
type SubscribeMethod = "eth_subscribe" | "sentrix_subscribe";
type Channel = "newHeads" | "logs" | "newPendingTransactions" | "syncing"
  | "sentrix_finalized" | "sentrix_validatorSet" | "sentrix_tokenOps"
  | "sentrix_stakingOps" | "sentrix_jail";

interface Subscription {
  method: SubscribeMethod;
  channel: Channel;
  args?: Json[];
  serverId: string | null;
  cb: (msg: Json) => void;
}

class WsClient {
  private url: string;
  private ws: WebSocket | null = null;
  private nextRpcId = 1;
  private pending = new Map<number, (result: Json) => void>();
  private subs = new Map<number, Subscription>();
  private nextSubLocal = 1;
  private connectAttempts = 0;
  private successfulConnects = 0;
  private connecting = false;
  // Cap reconnect backoff at 5 minutes. Previous version stopped retrying
  // after 3 failed attempts with no successful open in between, which
  // dead-ended live updates whenever the WS edge was briefly returning
  // 502 at page-load time (mainnet `wss://rpc.sentrixchain.com/ws` was
  // doing exactly that on 2026-05-02). The page now keeps retrying so
  // streams self-heal once the edge recovers — without spamming the
  // browser console because 5 min is a slow enough heartbeat.
  private static MAX_BACKOFF_MS = 300_000;

  constructor(url: string) {
    this.url = url;
  }

  private connect() {
    if (this.connecting || (this.ws && this.ws.readyState <= 1)) return;
    this.connecting = true;
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.onopen = () => {
      this.connecting = false;
      this.connectAttempts = 0;
      this.successfulConnects++;
      for (const [, sub] of this.subs) {
        sub.serverId = null;
        this.sendSubscribe(sub);
      }
    };
    ws.onmessage = (ev) => this.handleMessage(ev.data);
    ws.onerror = () => { /* handled by onclose */ };
    ws.onclose = () => {
      this.connecting = false;
      this.ws = null;
      this.connectAttempts++;
      const delay = Math.min(
        WsClient.MAX_BACKOFF_MS,
        500 * Math.pow(2, Math.min(this.connectAttempts, 10)),
      );
      setTimeout(() => this.connect(), delay);
    };
  }

  private handleMessage(raw: string) {
    let msg: { id?: number; result?: Json; method?: string; params?: { subscription: string; result: Json } };
    try { msg = JSON.parse(raw); } catch { return; }
    if (typeof msg.id === "number" && msg.result !== undefined) {
      const resolver = this.pending.get(msg.id);
      if (resolver) {
        this.pending.delete(msg.id);
        resolver(msg.result as Json);
      }
      return;
    }
    if (msg.method === "eth_subscription" && msg.params) {
      const { subscription, result } = msg.params;
      for (const [, sub] of this.subs) {
        if (sub.serverId === subscription) sub.cb(result);
      }
    }
  }

  private sendSubscribe(sub: Subscription) {
    if (!this.ws || this.ws.readyState !== 1) return;
    const id = this.nextRpcId++;
    this.pending.set(id, (result) => { sub.serverId = result as string; });
    const params: Json[] = [sub.channel as Json, ...(sub.args ?? [])];
    this.ws.send(JSON.stringify({ jsonrpc: "2.0", id, method: sub.method, params }));
  }

  subscribe(method: SubscribeMethod, channel: Channel, cb: (msg: Json) => void, args?: Json[]): () => void {
    if (!this.ws) this.connect();
    const localId = this.nextSubLocal++;
    const sub: Subscription = { method, channel, args, serverId: null, cb };
    this.subs.set(localId, sub);
    if (this.ws?.readyState === 1) this.sendSubscribe(sub);
    return () => {
      const s = this.subs.get(localId);
      this.subs.delete(localId);
      if (s?.serverId && this.ws?.readyState === 1) {
        const id = this.nextRpcId++;
        const unsubMethod = method === "eth_subscribe" ? "eth_unsubscribe" : "sentrix_unsubscribe";
        this.ws.send(JSON.stringify({ jsonrpc: "2.0", id, method: unsubMethod, params: [s.serverId] }));
      }
    };
  }
}

const clients = new Map<string, WsClient>();
function getClient(wsUrl: string): WsClient {
  let c = clients.get(wsUrl);
  if (!c) { c = new WsClient(wsUrl); clients.set(wsUrl, c); }
  return c;
}

function hexToNumber(hex: string | undefined): number {
  if (!hex || typeof hex !== "string") return 0;
  return parseInt(hex, 16);
}

export interface NewHeadEvent { number: number; hash: string; timestamp: number; txCount: number; }

// Hook: subscribe to newHeads on the given network. Re-renders only on
// advancing height so consumers can use it safely as an effect dep.
export function useLatestBlock(network: NetworkId): NewHeadEvent | null {
  const [head, setHead] = useState<NewHeadEvent | null>(null);
  const lastHeight = useRef(0);
  useEffect(() => {
    const client = getClient(getWsUrl(network));
    const unsub = client.subscribe("eth_subscribe", "newHeads", (msg) => {
      const m = msg as Record<string, string>;
      const number = hexToNumber(m.number);
      if (number <= lastHeight.current) return;
      lastHeight.current = number;
      setHead({ number, hash: m.hash, timestamp: hexToNumber(m.timestamp), txCount: 0 });
    });
    return () => { unsub(); lastHeight.current = 0; setHead(null); };
  }, [network]);
  return head;
}

export function useLatestFinalized(network: NetworkId): number | null {
  const [height, setHeight] = useState<number | null>(null);
  useEffect(() => {
    const client = getClient(getWsUrl(network));
    const unsub = client.subscribe("sentrix_subscribe", "sentrix_finalized", (msg) => {
      const m = msg as Record<string, unknown>;
      const h = typeof m.height === "number" ? m.height : 0;
      if (h > 0) setHeight(h);
    });
    return () => { unsub(); setHeight(null); };
  }, [network]);
  return height;
}

// Token op events streamed from the chain (Deploy / Transfer / Burn / Mint /
// Approve / NFT family / SRC-1155 family). Returns the most recent N events,
// newest-first. Pass `limit = 0` to disable buffering and just receive a
// single setter (use the subscribe-callback variant directly).
export interface TokenOpEvent {
  height: number;
  txid: string;
  op: string;
  contract?: string;
  from?: string;
  to?: string;
  amount?: number;
  raw: Record<string, unknown>;
}

export function useTokenOps(network: NetworkId, limit = 20): TokenOpEvent[] {
  const [events, setEvents] = useState<TokenOpEvent[]>([]);
  useEffect(() => {
    const client = getClient(getWsUrl(network));
    const unsub = client.subscribe("sentrix_subscribe", "sentrix_tokenOps", (msg) => {
      const m = msg as Record<string, unknown>;
      const ev: TokenOpEvent = {
        height: typeof m.height === "number" ? m.height : 0,
        txid: typeof m.txid === "string" ? m.txid : "",
        op: typeof m.op === "string" ? m.op : "unknown",
        contract: typeof m.contract === "string" ? m.contract : undefined,
        from: typeof m.from === "string" ? m.from : undefined,
        to: typeof m.to === "string" ? m.to : undefined,
        amount: typeof m.amount === "number" ? m.amount : undefined,
        raw: m,
      };
      setEvents((prev) => [ev, ...prev].slice(0, limit));
    });
    return () => { unsub(); setEvents([]); };
  }, [network, limit]);
  return events;
}

// Staking op events: Delegate / Undelegate / ClaimRewards / RegisterValidator /
// AddSelfStake / ForceUnjail. Same buffer semantics as useTokenOps.
export interface StakingOpEvent {
  height: number;
  txid: string;
  op: string;
  validator?: string;
  delegator?: string;
  amount?: number;
  raw: Record<string, unknown>;
}

export function useStakingOps(network: NetworkId, limit = 20): StakingOpEvent[] {
  const [events, setEvents] = useState<StakingOpEvent[]>([]);
  useEffect(() => {
    const client = getClient(getWsUrl(network));
    const unsub = client.subscribe("sentrix_subscribe", "sentrix_stakingOps", (msg) => {
      const m = msg as Record<string, unknown>;
      const ev: StakingOpEvent = {
        height: typeof m.height === "number" ? m.height : 0,
        txid: typeof m.txid === "string" ? m.txid : "",
        op: typeof m.op === "string" ? m.op : "unknown",
        validator: typeof m.validator === "string" ? m.validator : undefined,
        delegator: typeof m.delegator === "string" ? m.delegator : undefined,
        amount: typeof m.amount === "number" ? m.amount : undefined,
        raw: m,
      };
      setEvents((prev) => [ev, ...prev].slice(0, limit));
    });
    return () => { unsub(); setEvents([]); };
  }, [network, limit]);
  return events;
}
