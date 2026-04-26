# Sentrix Wallet

Web wallet UI for the Sentrix blockchain (Chain ID 7119).

**Live:** https://sentrix-wallet.sentriscloud.com

## Features

- Create new wallet (ECDSA secp256k1 key generation)
- Import existing wallet via private key
- Dashboard — SRX and SNTX token balances
- Send SRX (native token) with confirmation dialog
- Send SNTX (SRC-20 token) with confirmation dialog
- Transaction history

## Tech Stack

- Next.js 16 + React 19 + TypeScript
- @noble/secp256k1 + @noble/hashes (ECDSA signing, keccak256, sha256)
- Zustand (state management, private key NOT persisted to storage)
- Tailwind CSS 4
- Axios (API client)

## Security

- Private key never sent over network — only signature + public key
- No wallet state persisted to storage — key lives in memory only, cleared on refresh
- Integer arithmetic for amount calculations (no floating-point precision loss)
- Confirmation dialog before every transaction
- Clipboard auto-cleared 60s after private key copy
- Private key bytes zeroed after signing

## Development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (standalone)
```

## Deployment

Docker + GitHub Actions CI/CD:

```
git push master → GitHub Actions → Docker build → GHCR → SSH deploy to VPS
```

### Environment Variables

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://sentrix-api.sentriscloud.com` |
| `NEXT_PUBLIC_CHAIN_ID` | `7119` |
| `NEXT_PUBLIC_CHAIN_NAME` | `Sentrix` |
| `NEXT_PUBLIC_NATIVE_TOKEN` | `SRX` |
| `NEXT_PUBLIC_SNTX_CONTRACT` | `SRX20_16d17385cad3ef46d63c93f4daeb8b2f7571afd3` |

## Architecture

```
sentrix-wallet/
├── src/
│   ├── app/              # Next.js app router
│   │   ├── page.tsx      # Landing → redirect /wallet
│   │   ├── layout.tsx    # Root layout + Toaster
│   │   └── wallet/
│   │       └── page.tsx  # Wallet page (WalletSetup or Dashboard)
│   ├── components/
│   │   ├── WalletSetup.tsx   # Create/import wallet
│   │   ├── Dashboard.tsx     # Balances + navigation
│   │   ├── SendSRX.tsx       # Send native SRX
│   │   ├── SendSNTX.tsx      # Send SNTX token
│   │   └── TxHistory.tsx     # Transaction history
│   ├── lib/
│   │   ├── crypto.ts     # ECDSA signing, address derivation, payload builder
│   │   ├── api.ts        # Blockchain API client
│   │   └── store.ts      # Zustand wallet store
│   └── types/
│       └── index.ts      # TypeScript interfaces
├── Dockerfile            # Multi-stage Node 20 Alpine
├── docker-compose.yml    # Production container config
├── nginx.conf            # Reverse proxy reference config
└── .github/workflows/
    └── deploy.yml        # CI/CD: build → GHCR → VPS deploy
```

## License

Private — SentrisCloud
