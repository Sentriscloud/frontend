# Sentrix Scan

Block explorer for Sentrix Chain (SRX) — browse blocks, transactions, addresses, validators, and SRC-20 tokens.

**Mainnet:** https://scan.sentrixchain.com
**Testnet:** https://scan-testnet.sentrixchain.com

> **Two explorers coexist by design.** This is the **Next.js V1** — feature-rich (validator pages, leaderboard, EIP-3091 deeplinks, contract verification panel, multi-locale i18n). For the **WASM V2 Obsidian** alternative (same data, full-Rust + tonic-web, near-native parse cost) see [`Sentriscloud/sentrix-explorer-v2`](https://github.com/Sentriscloud/sentrix-explorer-v2) at `scan.sentriscloud.com` / `scan-testnet.sentriscloud.com`. Pick whichever fits the workflow; neither replaces the other.

## Tech Stack

- Next.js 15 (App Router, standalone output)
- TypeScript
- Tailwind CSS 4 + shadcn/ui
- lucide-react (icons)
- recharts (charts — ready for future tx/gas charts)
- viem (EVM RPC client)
- next-themes (dark/light mode)
- No database — queries chain RPC + REST API directly

## Architecture

```
app/
├── page.tsx                Home — stats dashboard + latest blocks/tx
├── blocks/
│   ├── page.tsx            All blocks list
│   └── [height]/page.tsx   Block detail
├── tx/
│   └── [hash]/page.tsx     Transaction detail
├── address/
│   └── [addr]/page.tsx     Account detail (balance, history)
├── validators/
│   └── page.tsx            Validators list
├── tokens/
│   ├── page.tsx            SRC-20 tokens list
│   └── [addr]/page.tsx     Token detail
└── search/
    └── page.tsx            Smart search

lib/
├── chain.ts                viem chain definitions (mainnet + testnet)
├── api.ts                  REST API client
├── hooks.ts                React hooks with polling
├── format.ts               Number/hash/time formatting
├── network-context.tsx     Network switcher context
└── utils.ts                shadcn utilities
```

## Features

- Real-time stats (5s polling)
- Smart search (block height / tx hash / address auto-detect)
- Network switcher (Mainnet / Testnet)
- Dark mode default + light toggle
- Copy-to-clipboard on all hashes and addresses
- Relative timestamps with hover for absolute
- Responsive (mobile, tablet, desktop)
- No database dependency

## Local Development

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open http://localhost:3000

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| NEXT_PUBLIC_MAINNET_RPC | Mainnet JSON-RPC | https://rpc.sentrixchain.com |
| NEXT_PUBLIC_MAINNET_API | Mainnet REST API | https://api.sentrixchain.com |
| NEXT_PUBLIC_MAINNET_CHAIN_ID | Mainnet chain ID | 7119 |
| NEXT_PUBLIC_TESTNET_RPC | Testnet JSON-RPC | https://testnet-rpc.sentrixchain.com |
| NEXT_PUBLIC_TESTNET_API | Testnet REST API | https://testnet-api.sentrixchain.com |
| NEXT_PUBLIC_TESTNET_CHAIN_ID | Testnet chain ID | 7120 |
| NEXT_PUBLIC_DEFAULT_NETWORK | Default network | mainnet |

## Build

```bash
pnpm build
```

## Deploy

### Systemd

A single `sentrix-scan.service` runs `pnpm start` from this directory on
port 3005. Both networks are served by the same process; the network is
selected per-request via the cookie / `?network=` query / dedicated
subdomain (Caddy routes both subdomains to the same upstream).

### Caddy

```
scan.sentrixchain.com         → 127.0.0.1:3005
scan-testnet.sentrixchain.com → 127.0.0.1:3005
```
