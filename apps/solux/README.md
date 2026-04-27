# Solux

Web wallet UI for Sentrix Chain (Chain ID 7119 mainnet, 7120 testnet).

**Live:** https://solux.sentriscloud.com

## Features

- Create new wallet (ECDSA secp256k1 key generation)
- Import existing wallet via private key, mnemonic, or keystore
- Dashboard — SRX balance, transaction history, validator delegations
- Send SRX with confirmation dialog
- Stake / unstake / claim rewards (Voyager DPoS)
- Mainnet / Testnet network switcher
- Address book + per-address notifications
- PWA install (offline shell, no offline tx)

## Tech Stack

- Next.js 16 + React 19 + TypeScript
- @noble/secp256k1 + @noble/hashes (ECDSA signing, keccak256, sha256)
- @scure/bip32 + @scure/bip39 (HD derivation, mnemonic)
- Zustand (state; private key NOT persisted to storage)
- Tailwind CSS 4
- Axios (API client, baseURL switched per active network)

## Security

- Private key never leaves the browser — only signature + public key are sent
- Wallet key lives in memory only; cleared on lock / refresh / browser close
- Mnemonic kept session-only (never persisted)
- Integer arithmetic for sentri amounts (no floating-point precision loss)
- Confirmation dialog before every transaction
- Clipboard auto-cleared 60s after private-key copy
- Private key bytes zeroed after signing

## Development

```bash
pnpm install
pnpm --filter @sentriscloud/solux dev      # http://localhost:3000
pnpm --filter @sentriscloud/solux build    # production build
```

## Deployment

Production runs `next start` directly on the host as a systemd service, behind a Caddy edge proxy that adds TLS and the public hostname. Build is performed in-place on the host (`.next/` is read by `next start` at boot). To roll out a new version: `git pull && pnpm --filter @sentriscloud/solux build && systemctl restart solux`.

### Environment Variables

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.sentrixchain.com` |
| `NEXT_PUBLIC_CHAIN_ID` | `7119` |
| `NEXT_PUBLIC_CHAIN_NAME` | `Sentrix` |
| `NEXT_PUBLIC_NATIVE_TOKEN` | `SRX` |

Note: the runtime API URL is also hardcoded in `src/lib/store.ts` (`NETWORKS`) so the network switcher works without env reloads. The env var is informational.

## License

Private — SentrisCloud
