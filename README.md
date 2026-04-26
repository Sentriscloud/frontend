<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/sentrix-labs/brand-kit@master/png-transparent/sentriscloud-512.png" alt="SentrisCloud" width="120">
</p>

<h1 align="center">sentriscloud-frontend</h1>

<p align="center">Monorepo for the user-facing apps and tooling around <a href="https://sentrixchain.com">Sentrix Chain</a>.</p>

---

## Stack

- **Package manager:** pnpm 10 (workspaces)
- **Build orchestrator:** Turborepo 2
- **Language:** TypeScript 5 (shared `tsconfig.base.json`)
- **Node:** 20+

## Apps

| App | What it is | Live URL |
|-----|------------|----------|
| **chain-landing** | Sentrix Chain protocol website + docs | [sentrixchain.com](https://sentrixchain.com) |
| **landing** | SentrisCloud brand site | [sentriscloud.com](https://sentriscloud.com) |
| **scan** | Block explorer for Sentrix Chain (mainnet + testnet, in-app toggle) | [scan.sentrixchain.com](https://scan.sentrixchain.com) |
| **faucet** | Mainnet + testnet SRX faucet, Turnstile-protected | [faucet.sentrixchain.com](https://faucet.sentrixchain.com) |
| **solux** | Self-custody web wallet — keys stay on-device, multi-account, staking, SRC-20 | [solux.sentriscloud.com](https://solux.sentriscloud.com) |
| **coinblast** | DEX + memecoin launchpad | [coinblast.sentriscloud.com](https://coinblast.sentriscloud.com) (alpha) |

The Solux **mobile** wallet (Flutter) lives in its own repo: [`sentriscloud/solux`](https://github.com/sentriscloud/solux). Web and mobile share the same brand and the same protocol; keys are managed independently per device.

## Layout

```
sentriscloud-frontend/
├── apps/
│   ├── chain-landing/    sentrixchain.com — protocol site + docs
│   ├── landing/          sentriscloud.com — brand site
│   ├── scan/             block explorer
│   ├── faucet/           testnet faucet
│   ├── coinblast/        DEX + launchpad
│   └── solux/            wallet web companion
├── packages/             (shared libs — added as needed)
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

## Commands

| Command | What it does |
|---------|--------------|
| `pnpm install` | Install all workspace dependencies |
| `pnpm dev` | Run all apps' dev servers in parallel |
| `pnpm --filter <app> dev` | Run a single app's dev server |
| `pnpm build` | Build all apps |
| `pnpm --filter <app> build` | Build a single app |
| `pnpm lint` | Lint all workspaces |
| `pnpm typecheck` | Type-check all workspaces |

## Where things live

- **Protocol, Rust node, SDKs, contracts, brand-kit** → [`sentrix-labs`](https://github.com/sentrix-labs)
- **User-facing TS apps (this repo)** → [`sentriscloud/frontend`](https://github.com/sentriscloud/frontend)
- **Solux mobile wallet (Flutter)** → [`sentriscloud/solux`](https://github.com/sentriscloud/solux)

## Adding a new app

```bash
mkdir -p apps/my-app
cd apps/my-app
pnpm init
# ...edit package.json, set "name": "@sentriscloud/my-app"
```

The workspace will pick it up automatically via `pnpm-workspace.yaml`.
