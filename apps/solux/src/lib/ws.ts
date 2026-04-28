// Minimal WebSocket client + React hooks for Sentrix RPC subscriptions.
// Mirrors apps/scan/lib/ws.ts but takes WS URLs directly (no NetworkId
// helper here). One singleton client per WS URL.

"use client";

import { useEffect, useRef, useState } from "react";

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
  private closed = false;
  private static MAX_FAILED_ATTEMPTS = 3;

  constructor(url: string) { this.url = url; }

  private connect() {
    if (this.connecting || (this.ws && this.ws.readyState <= 1)) return;
    this.connecting = true;
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.onopen = () => {
      this.connecting = false;
      this.connectAttempts = 0;
      this.successfulConnects++;
      for (const [, sub] of this.subs) { sub.serverId = null; this.sendSubscribe(sub); }
    };
    ws.onmessage = (ev) => this.handleMessage(ev.data);
    ws.onerror = () => { /* handled by onclose */ };
    ws.onclose = () => {
      this.connecting = false;
      this.ws = null;
      if (this.closed) return;
      this.connectAttempts++;
      if (this.successfulConnects === 0 && this.connectAttempts >= WsClient.MAX_FAILED_ATTEMPTS) {
        this.closed = true;
        return;
      }
      const delay = Math.min(30_000, 500 * Math.pow(2, this.connectAttempts));
      setTimeout(() => this.connect(), delay);
    };
  }

  private handleMessage(raw: string) {
    let msg: { id?: number; result?: Json; method?: string; params?: { subscription: string; result: Json } };
    try { msg = JSON.parse(raw); } catch { return; }
    if (typeof msg.id === "number" && msg.result !== undefined) {
      const r = this.pending.get(msg.id);
      if (r) { this.pending.delete(msg.id); r(msg.result as Json); }
      return;
    }
    if (msg.method === "eth_subscription" && msg.params) {
      const { subscription, result } = msg.params;
      for (const [, sub] of this.subs) if (sub.serverId === subscription) sub.cb(result);
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

export interface NewHeadEvent { number: number; hash: string; timestamp: number; }

export function useLatestBlock(wsUrl: string): NewHeadEvent | null {
  const [head, setHead] = useState<NewHeadEvent | null>(null);
  const lastHeight = useRef(0);
  useEffect(() => {
    const client = getClient(wsUrl);
    const unsub = client.subscribe("eth_subscribe", "newHeads", (msg) => {
      const m = msg as Record<string, string>;
      const number = hexToNumber(m.number);
      if (number <= lastHeight.current) return;
      lastHeight.current = number;
      setHead({ number, hash: m.hash, timestamp: hexToNumber(m.timestamp) });
    });
    return () => { unsub(); lastHeight.current = 0; };
  }, [wsUrl]);
  return head;
}

export function useLatestFinalized(wsUrl: string): number | null {
  const [height, setHeight] = useState<number | null>(null);
  useEffect(() => {
    const client = getClient(wsUrl);
    const unsub = client.subscribe("sentrix_subscribe", "sentrix_finalized", (msg) => {
      const m = msg as Record<string, unknown>;
      const h = typeof m.height === "number" ? m.height : 0;
      if (h > 0) setHeight(h);
    });
    return () => { unsub(); };
  }, [wsUrl]);
  return height;
}

export function useValidatorSet(wsUrl: string): number | null {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    const client = getClient(wsUrl);
    const unsub = client.subscribe("sentrix_subscribe", "sentrix_validatorSet", (msg) => {
      const m = msg as Record<string, unknown>;
      const validators = Array.isArray(m.validators) ? m.validators : null;
      if (validators) setCount(validators.length);
    });
    return () => { unsub(); };
  }, [wsUrl]);
  return count;
}
