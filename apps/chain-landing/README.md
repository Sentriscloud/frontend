# Sentrix Landing Page

Official marketing landing page for Sentrix Chain (SRX) — a Layer-1 blockchain built from scratch in Rust.

**Live:** https://sentrix.sentriscloud.com

## Tech Stack

- Next.js 16 (App Router, standalone output)
- React 19 + TypeScript
- Three.js / @react-three/fiber (3D graphics)
- Framer Motion (animations)
- Tailwind CSS 4
- Lenis (smooth scrolling)
- next-themes (dark/light mode)
- Docker (GHCR deployment)

## Sections

1. Hero with 3D orbital scene
2. Scrolling stat ticker
3. Live chain data (real-time from API)
4. Animated stat counters
5. About (5 core features + 3D coin)
6. Features (9 cards)
7. Token (SRX — single-token chain)
8. Tokenomics
9. Ecosystem products
10. SRX-20 standard
11. Architecture diagram + MetaMask config
12. API endpoints
13. Security primitives
14. Roadmap
15. For Validators
16. Developer quick start
17. CTA
18. Footer

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Build

```bash
npm run build
npm start
```

## Deploy

Push to `master` branch. GitHub Actions CI/CD will:
1. Build Docker image
2. Push to GHCR
3. SSH to VPS and `docker compose up -d --force-recreate`

Domain: `sentrixchain.com` (served by the edge proxy on port 3004)

## Brand

- Royal Blue + Gold color scheme
- Dark mode default
- Professional, minimal design
