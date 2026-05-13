<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/sentrix-labs/brand-kit@master/png-transparent/sentriscloud-512.png" alt="SentrisCloud" width="120">
</p>

<h1 align="center">sentriscloud-frontend</h1>

<p align="center">SentrisCloud frontend monorepo — apps built on <a href="https://sentrixchain.com">Sentrix Chain</a>.</p>

<p align="center">
  <img alt="status" src="https://img.shields.io/badge/status-live-22c55e">
  <img alt="monorepo" src="https://img.shields.io/badge/monorepo-pnpm%20%2B%20turborepo-f59e0b">
  <img alt="node" src="https://img.shields.io/badge/node-%E2%89%A520-339933?logo=node.js&logoColor=white">
  <img alt="pnpm" src="https://img.shields.io/badge/pnpm-10-f69220?logo=pnpm&logoColor=white">
  <img alt="turborepo" src="https://img.shields.io/badge/turborepo-2-ef4444?logo=turborepo&logoColor=white">
  <img alt="typescript" src="https://img.shields.io/badge/typescript-5-3178c6?logo=typescript&logoColor=white">
  <img alt="next" src="https://img.shields.io/badge/next.js-15-000000?logo=next.js&logoColor=white">
</p>

---

## What's in here

Eight Next.js apps, one shared `wallet-config` package, one Turborepo pipeline.

| App | What it is | Live URL |
|-----|------------|----------|
| **chain-landing** | Sentrix Chain protocol site (EN / ID) | [sentrixchain.com](https://sentrixchain.com) |
| **landing** | SentrisCloud company / brand site | [sentriscloud.com](https://sentriscloud.com) |
| **scan** | Block explorer — mainnet + testnet, EIP-3091 compliant | [scan.sentrixchain.com](https://scan.sentrixchain.com) |
| **faucet** | Mainnet + testnet SRX faucet, Turnstile-protected | [faucet.sentrixchain.com](https://faucet.sentrixchain.com) |
| **solux** | Self-custody web wallet — keys stay on-device | [solux.sentriscloud.com](https://solux.sentriscloud.com) |
| **coinblast** | Bonding-curve memecoin launchpad | [coinblast.sentriscloud.com](https://coinblast.sentriscloud.com) |
| **dex** | Uniswap-V2-style AMM | [dex.sentrixchain.com](https://dex.sentrixchain.com) |
| **airdrop** | Eligibility-check + claim widget | [airdrop.sentrixchain.com](https://airdrop.sentrixchain.com) |

Solux's mobile wallet (Flutter) is in a separate repo: [`sentriscloud/solux`](https://github.com/sentriscloud/solux). Same brand and protocol; keys are managed independently per device.

## Quick start

Prerequisites: **Node ≥ 20**, **pnpm 10** (`npm i -g pnpm@10`), **git**.

```bash
git clone git@github.com:sentriscloud/frontend.git sentriscloud-frontend
cd sentriscloud-frontend
pnpm install
pnpm dev                          # all apps in parallel (Turbo)
# or run a single app:
pnpm --filter @sentriscloud/scan dev
```

Build, lint, type-check:

```bash
pnpm build                        # all apps
pnpm --filter @sentriscloud/coinblast build
pnpm lint
pnpm typecheck
```

`pnpm dev` runs every app in parallel; Next.js will increment ports starting at 3000 if any are taken. To pin one, prefix `PORT=<n>` (see [Apps](#apps)).

## Apps

Each app lives at `apps/<name>/` and uses the workspace name `@sentriscloud/<name>`. All eight are Next.js 15 + React 19 + Tailwind.

| Name | Workspace | Notes |
|------|-----------|-------|
| chain-landing | `@sentriscloud/chain-landing` | i18n via `next-intl` (EN default, ID toggle) |
| landing | `@sentriscloud/landing` | brand / company site |
| scan | `@sentriscloud/scan` | locale-prefixed routes; in-app mainnet/testnet switcher |
| solux | `@sentriscloud/solux` | on-device keystore via `wallet-config`; cross-app sign popup |
| faucet | `@sentriscloud/faucet` | Cloudflare Turnstile required for prod |
| coinblast | `@sentriscloud/coinblast` | bonding-curve launchpad on `CoinBlastFactory` |
| dex | `@sentriscloud/dex` | UniswapV2-fork AMM |
| airdrop | `@sentriscloud/airdrop` | claim widget gated on per-address eligibility |

Run any one with `pnpm --filter @sentriscloud/<name> dev`. `next dev` defaults to port 3000; if you want to run several at once, set `PORT=<n>` in front (e.g. `PORT=3008 pnpm --filter @sentriscloud/coinblast dev`). Apps with `.env.example` files expect those values copied to `.env.local` before first run.

## Structure

```
sentriscloud-frontend/
├── apps/
│   ├── airdrop/          claim widget (airdrop.sentrixchain.com)
│   ├── chain-landing/    sentrixchain.com — protocol site + docs
│   ├── coinblast/        bonding-curve launchpad
│   ├── dex/              UniswapV2-fork AMM
│   ├── faucet/           mainnet + testnet faucet
│   ├── landing/          sentriscloud.com — company site
│   ├── scan/             block explorer
│   └── solux/            self-custody web wallet
├── packages/
│   └── wallet-config/    shared wagmi/RainbowKit config + Solux popup-signer
├── turbo.json            pipeline (build / dev / lint / typecheck / test / clean)
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

`packages/wallet-config` is the shared chain config + connector setup every app imports. Use it instead of duplicating wagmi setup per app.

## Deploy

Each app deploys as a systemd service on the build host running `next start` against the app's `.next/` build output (`coinblast.service`, `solux.service`, `sentrix-scan.service`, `sentrix-dex.service`, `sentrix-faucet.service`, `sentrix-airdrop.service`, `sentrix-landing.service`, `sentriscloud-landing.service`). Caddy on the same host terminates TLS and routes each subdomain to the local port. Builds are produced from this repo's `pnpm --filter <app> build` and the service is restarted via `systemctl restart <unit>`. There is no GHCR or container registry wired up at the moment; only `apps/chain-landing/` ships a `Dockerfile`, kept for parity but not part of the prod path.

## Where things live

- **Protocol, Rust node, SDKs, contracts, brand-kit** → [`sentrix-labs`](https://github.com/sentrix-labs)
- **User-facing TS apps (this repo)** → [`sentriscloud/frontend`](https://github.com/sentriscloud/frontend)
- **Solux mobile wallet (Flutter)** → [`sentriscloud/solux`](https://github.com/sentriscloud/solux)

## Adding a new app

```bash
mkdir -p apps/my-app
cd apps/my-app
pnpm init
# set "name": "@sentriscloud/my-app" in package.json
```

`pnpm-workspace.yaml` already globs `apps/*` and `packages/*`, so the new workspace is picked up on the next `pnpm install`. Add `build`/`dev`/`lint`/`typecheck` scripts to match the Turbo pipeline in `turbo.json`.

## License

[MIT](LICENSE) — Copyright (c) 2026 Sentrix Labs. The Sentrix Chain protocol itself (separate repo, [`sentrix-labs/sentrix`](https://github.com/sentrix-labs/sentrix)) is BUSL-1.1; this monorepo is independently licensed.
