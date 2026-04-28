# Sentrix Faucet — `@sentriscloud/faucet`

Public testnet + mainnet faucet for Sentrix Chain. Drips SRX (mainnet) or tSRX (testnet) to user wallets after Turnstile (Cloudflare bot-detection) verification.

**Live deployment:** [https://faucet.sentrixchain.com](https://faucet.sentrixchain.com)

## What this does

- **Testnet drip:** 10,000,000 tSRX per claim (chain 7120) — funded from genesis testnet faucet wallet (100M tSRX premined)
- **Mainnet drip:** 1 SRX per claim (chain 7119) — funded operationally from Ecosystem Fund; small amount because mainnet SRX has real economic value
- **Rate limit:** Cloudflare Turnstile (bot detection) + per-IP cooldown
- **Tx submission:** signs locally with faucet private key, submits via JSON-RPC to validator endpoints

## Tech stack

- **Framework:** Next.js 15 (App Router) + React 19
- **Styling:** Tailwind v4 + custom Sentrix brand tokens
- **Crypto:** `@noble/secp256k1` + `@noble/hashes` for tx signing
- **Bot defense:** Cloudflare Turnstile (mainnet + testnet keys separately)
- **Deployment:** Static export → rsync to `/var/www/faucet-sentrixchain` (per Caddy config)

## Local development

### Prerequisites

- Node ≥ 20 (project uses Next.js 15 which requires modern Node)
- pnpm (monorepo uses pnpm workspace)

### Install + run

From monorepo root:

```bash
pnpm install
pnpm --filter @sentriscloud/faucet dev
```

App runs at `http://localhost:3000`.

### Environment variables

Create `.env.local` in `apps/faucet/`. Required vars:

```bash
# RPC endpoints
TESTNET_RPC_URL=https://testnet-rpc.sentrixchain.com
MAINNET_RPC_URL=https://rpc.sentrixchain.com

# Faucet wallets (do NOT commit real keys; use a low-balance dev wallet for local testing)
TESTNET_FAUCET_ADDRESS=0x...
TESTNET_FAUCET_PRIVATE_KEY=<64 hex chars, no 0x prefix>
MAINNET_FAUCET_ADDRESS=0x...
MAINNET_FAUCET_PRIVATE_KEY=<64 hex chars, no 0x prefix>

# Turnstile (get site keys at https://dash.cloudflare.com/?to=/:account/turnstile)
NEXT_PUBLIC_TESTNET_TURNSTILE_SITE_KEY=...
TESTNET_TURNSTILE_SECRET_KEY=...
NEXT_PUBLIC_MAINNET_TURNSTILE_SITE_KEY=...
MAINNET_TURNSTILE_SECRET_KEY=...

# CORS allowed origins (comma-separated)
FAUCET_ALLOWED_ORIGINS=http://localhost:3000,https://faucet.sentrixchain.com
```

For local development without real Turnstile, you can comment out the Turnstile verification check in `src/app/api/faucet/route.ts` (search for `verifyTurnstile`). **Don't commit this disable.**

### Test accounts

For local dev, generate a fresh keypair and pre-fund it:

```bash
# Generate private key (64 hex chars)
openssl rand -hex 32

# Derive address (paste into any EVM tool, e.g. https://www.rfctools.com/ethereum-address-from-private-key/)
```

For testnet, send tSRX from another wallet, or use a snapshot of testnet genesis faucet wallet (do not commit private key).

## Architecture

### File layout

```
apps/faucet/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Landing page (chain selector)
│   │   ├── layout.tsx                  # Root layout with brand tokens
│   │   ├── mainnet/page.tsx            # Mainnet faucet UI
│   │   ├── testnet/page.tsx            # Testnet faucet UI
│   │   ├── api/
│   │   │   └── faucet/route.ts         # POST endpoint: verify Turnstile → sign tx → submit
│   │   ├── globals.css                 # Tailwind + brand vars
│   │   └── _components/                # Shared UI primitives
│   └── ...
├── public/                             # Static assets (logo, favicon)
├── package.json
├── next.config.ts
├── postcss.config.mjs
└── tsconfig.json
```

### Request flow

1. User connects wallet (or pastes address) on `/mainnet` or `/testnet` page
2. Cloudflare Turnstile widget renders → user passes bot challenge → token returned
3. Frontend POSTs `{ address, network: "mainnet"|"testnet", turnstileToken }` to `/api/faucet`
4. Backend:
   - Verifies Turnstile token via `https://challenges.cloudflare.com/turnstile/v0/siteverify`
   - Loads faucet keystore for `network` from env vars
   - Builds tx: `{ from: faucet, to: recipient, value: dripAmount, chainId, nonce }`
   - Signs with `@noble/secp256k1`
   - Submits via JSON-RPC `eth_sendRawTransaction` to chain RPC
   - Returns `{ ok: true, txid }`
5. Frontend displays success + link to block explorer

### Brand styling

Faucet uses the same gold-on-black editorial-luxury theme as `sentrixchain.com`. Theme tokens live in `globals.css`:
- Primary: `#f4c75e` (Sentrix gold)
- Background: dark base with subtle radial gradients
- Typography: Geist Sans (body) + Playfair Display (display)

Same brand tokens applied across `landing`, `scan`, `coinblast`, `solux` apps in this monorepo.

## Deployment

Production deploy is rsync-based:

```bash
# From monorepo root
pnpm --filter @sentriscloud/faucet build

# Output: apps/faucet/.next/
# Deploy: rsync -a apps/faucet/.next/ user@host:/var/www/faucet-sentrixchain/
```

Caddy config reverse-proxies `faucet.sentrixchain.com` → `/var/www/faucet-sentrixchain` with `/api/*` routes proxied to a Node sidecar (Next.js standalone server).

## Operational notes

### Faucet wallet refill

The mainnet faucet wallet runs low frequently (1 SRX drip × N claims = depletes operational budget). Refill from Ecosystem Fund quarterly or as needed. Refill amount + cadence governed by SentrixSafe (see chain governance docs).

### Rate limiting

Currently per-IP via Turnstile + a soft cooldown in the API. Stricter rate limits (per-address, per-day) on the roadmap as faucet usage scales.

### Monitoring

Faucet endpoint health is part of the Prometheus monitoring stack. Alert fires if:
- Faucet wallet balance falls below threshold
- Turnstile verification fails consistently
- RPC submission errors spike

## Roadmap

- [x] Mainnet + testnet support
- [x] Turnstile bot defense
- [x] Sentrix gold-black brand styling
- [ ] Per-address rate limit (currently per-IP only)
- [ ] Faucet refill alert via Telegram bot
- [ ] Bahasa Indonesia UI translation (i18n)
- [ ] Power-user mode (testnet) — bigger drip for known builder wallets

## Cross-references

- Monorepo root: [`../../README.md`](../../README.md)
- Block explorer: `apps/scan/`
- Chain RPC docs: [docs.sentrixchain.com/operations/API_ENDPOINTS](https://docs.sentrixchain.com)
- Brand tokens shared across apps: `packages/brand-tokens/` (if extracted; otherwise in each app's `globals.css`)

## Contributing

PRs welcome. Standard monorepo PR checklist:
- [ ] `pnpm --filter @sentriscloud/faucet typecheck` passes
- [ ] `pnpm --filter @sentriscloud/faucet lint` passes
- [ ] Manual smoke test on local dev (mainnet flow + testnet flow)
- [ ] No private keys or secrets in commit (gitleaks CI checks this)

For brand-affecting changes (UI, copy, layout), coordinate with the wider monorepo brand team to keep consistency across apps.
