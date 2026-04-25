<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/sentrix-labs/brand-kit@master/png-transparent/sentriscloud-512.png" alt="SentrisCloud" width="120">
</p>

<h1 align="center">sentriscloud-frontend</h1>

<p align="center">Monorepo for SentrisCloud user-facing products.</p>

---

## Stack

- **Package manager:** pnpm 10 (workspaces)
- **Build orchestrator:** Turborepo 2
- **Language:** TypeScript 5 (shared `tsconfig.base.json`)
- **Node:** 20+

## Layout

```
sentriscloud-frontend/
├── apps/              ← Deployable applications
│   ├── (sentrix-scan)        block explorer
│   ├── (sentrix-wallet-web)  web wallet
│   ├── (sentrix-faucet)      testnet faucet
│   ├── (coinblast)           DEX + launchpad
│   └── (landing)             sentriscloud.com
├── packages/          ← Shared internal libraries
│   ├── (ui)                  shared design-system components
│   ├── (chain-client)        Sentrix Chain RPC + indexer client
│   ├── (config)              shared config (eslint, tsconfig, etc.)
│   └── (utils)               shared utilities
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

Apps and packages are added incrementally as products migrate in. The `apps/` and `packages/` folders start empty.

## Commands

| Command | What it does |
|---------|--------------|
| `pnpm install` | Install all workspace dependencies |
| `pnpm dev` | Run all apps' dev servers in parallel |
| `pnpm build` | Build all packages and apps |
| `pnpm lint` | Lint all workspaces |
| `pnpm typecheck` | Type-check all workspaces |
| `pnpm test` | Run all tests |

## Where things live

- **Protocol, SDKs, contracts, brand assets** → [`sentrix-labs`](https://github.com/sentrix-labs)
- **Products and applications (this repo)** → [`sentriscloud`](https://github.com/sentriscloud)
- **Mobile (Flutter)** → `sentriscloud/sentriscloud-mobile` (separate repo, different stack)

## Adding a new app

```bash
mkdir -p apps/my-app
cd apps/my-app
pnpm init
# ...edit package.json, set "name": "@sentriscloud/my-app"
```

The workspace will pick it up automatically via `pnpm-workspace.yaml`.

## Adding a new package

Same as above but under `packages/`. Use `@sentriscloud/<name>` for the package name.
