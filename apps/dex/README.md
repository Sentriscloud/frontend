# Sentrix DEX

UniswapV2-fork AMM on Sentrix Chain (SRX) — swap, add/remove liquidity, view pools and positions. Two-token constant-product pools (`x * y = k`), 0.30% LP fee per trade, native SRX ↔ ERC-20 wrapped via WSRX.

**Mainnet:** https://dex.sentrixchain.com

## Tech stack

- Next.js 15 (App Router, standalone output)
- TypeScript + Tailwind CSS 4 + shadcn/ui
- viem + wagmi for EVM RPC
- Privy embedded wallet (email + Google + Twitter + external wallets)
- Solux fallback for users who already have a Solux web wallet session

## Routes

```
app/
├── page.tsx              Swap (canonical landing)
├── pools/
│   ├── page.tsx          All pools list
│   └── [pair]/page.tsx   Per-pair detail (reserves, recent swaps, LP holders)
├── add/page.tsx          Auto-balanced add-liquidity
├── remove/[pair]/page.tsx  Slider 0–100% LP burn
└── positions/page.tsx    Caller's LP positions across pairs
```

The `<Nav />` shared component (Swap | Pools | Add | Positions) replaces the inline header — keep new top-level routes in sync there.

## Contract surface

DEX contracts live in `sentrix-labs/sentrix-dex` (separate repo). Mainnet WSRX + factory + router addresses are pinned in `apps/dex/src/lib/contracts.ts`. Versioned via the `canonical-contracts` repo tag at deploy time.

## Local dev

```bash
pnpm install
pnpm dev --filter @sentriscloud/dex
```

Connects to `https://rpc.sentrixchain.com` by default. To point at testnet override `NEXT_PUBLIC_RPC_URL` in `.env.local`.

## Deploy

`pnpm build --filter @sentriscloud/dex` → `apps/dex/.next/standalone/`. Operator deploys via systemd unit `dex-mainnet.service`. See the operator runbook for the actual sequence.
