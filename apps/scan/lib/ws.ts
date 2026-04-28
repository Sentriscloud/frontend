// Minimal WebSocket client + React hook for Sentrix RPC subscriptions.
//
// Wire format: JSON-RPC 2.0 over wss://rpc.sentrixchain.com/ws.
// Subscribe via eth_subscribe / sentrix_subscribe; receive messages in
// the eth_subscription envelope:
//
//   { "jsonrpc": "2.0", "method": "eth_subscription",
//     "params": { "subscription": "0x01", "result": <payload> } }
//
// One singleton connection per network is shared across all
// subscribers. Reconnects with exponential backoff (max 30s) on close.
// Re-subscribes pending channels after reconnect so listeners don't
// have to handle resubscribe themselves.

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
  // Local id (provisional) until the server returns the subscription id.
  serverId: string | null;
  cb: (msg: Json) => void;
}

class WsClient {
  private url: string;
  private ws: WebSocket | null = null;
  private nextRpcId = 1;
  // Pending requests by rpc id, resolved when the server responds.
  private pending = new Map<number, (result: Json) => void>();
  // Active subscriptions, keyed by a local id we generate on subscribe().
  // Survives reconnect — on reopen we replay subscribe requests.
  private subs = new Map<number, Subscription>();
  private nextSubLocal = 1;
  private connectAttempts = 0;
  private connecting = false;
  private closed = false;

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
      // Re-subscribe to all active channels.
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
      if (this.closed) return;
      const delay = Math.min(30_000, 500 * Math.pow(2, this.connectAttempts++));
      setTimeout(() => this.connect(), delay);
    };
  }

  private handleMessage(raw: string) {
    let msg: { id?: number; result?: Json; method?: string; params?: { subscription: string; result: Json } };
    try { msg = JSON.parse(raw); } catch { return; }
    // Subscription response (we got the server-side id back).
    if (typeof msg.id === "number" && msg.result !== undefined) {
      const resolver = this.pending.get(msg.id);
      if (resolver) {
        this.pending.delete(msg.id);
        resolver(msg.result as Json);
      }
      return;
    }
    // Subscription event.
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
    this.pending.set(id, (result) => {
      sub.serverId = result as string;
    });
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

  close() {
    this.closed = true;
    this.ws?.close();
    this.ws = null;
  }
}

const clients = new Map<NetworkId, WsClient>();

function getClient(network: NetworkId): WsClient {
  let c = clients.get(network);
  if (!c) {
    c = new WsClient(getWsUrl(network));
    clients.set(network, c);
  }
  return c;
}

// Decoded newHeads payload — just the fields we care about.
export interface NewHeadEvent {
  number: number;        // decoded from hex
  hash: string;
  timestamp: number;
  txCount: number;       // count of transactions[] (not present on header-only payloads, defaults to 0)
}

function hexToNumber(hex: string | undefined): number {
  if (!hex || typeof hex !== "string") return 0;
  return parseInt(hex, 16);
}

// Hook: subscribe to newHeads; returns latest block info.
// Only fires re-renders when the height advances, so consumers can
// safely use it as an effect dep without thrashing.
export function useLatestBlock(network: NetworkId): NewHeadEvent | null {
  const [head, setHead] = useState<NewHeadEvent | null>(null);
  const lastHeight = useRef(0);
  useEffect(() => {
    const client = getClient(network);
    const unsub = client.subscribe("eth_subscribe", "newHeads", (msg) => {
      const m = msg as Record<string, string>;
      const number = hexToNumber(m.number);
      if (number <= lastHeight.current) return;
      lastHeight.current = number;
      setHead({
        number,
        hash: m.hash,
        timestamp: hexToNumber(m.timestamp),
        txCount: 0,
      });
    });
    return () => { unsub(); lastHeight.current = 0; setHead(null); };
  }, [network]);
  return head;
}

// Hook: subscribe to sentrix_finalized; returns latest finalized height.
export function useLatestFinalized(network: NetworkId): number | null {
  const [height, setHeight] = useState<number | null>(null);
  useEffect(() => {
    const client = getClient(network);
    const unsub = client.subscribe("sentrix_subscribe", "sentrix_finalized", (msg) => {
      const m = msg as Record<string, unknown>;
      const h = typeof m.height === "number" ? m.height : 0;
      if (h > 0) setHeight(h);
    });
    return () => { unsub(); setHeight(null); };
  }, [network]);
  return height;
}
