# @sentriscloud/landing

Company landing page for **sentriscloud.com**.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS 4 (CSS-first config in `app/globals.css`)
- next-themes (dark default)
- framer-motion (scroll reveals)
- viem (live mainnet stats)
- lucide-react (icons)

## Editing copy

All user-facing copy lives in `content/`:

| File | Purpose |
| --- | --- |
| `content/site.ts` | Site name, tagline, description, social URLs, brand asset URLs |
| `content/products.ts` | Product cards: name, tagline, description, status, href |
| `content/values.ts` | "Why SentrisCloud" value props |
| `content/nav.ts` | Top nav and footer link grids |

Editing copy never touches JSX — change the data, the section re-renders automatically.

## Adding a section

1. Create `components/sections/<name>.tsx`
2. Export a function component
3. Import in `app/page.tsx` and place it where you want
4. If it has data, put data in `content/<name>.ts`

## Live stats

`components/sections/stats.tsx` is a server component that calls `getChainSnapshot()` (in `lib/chain.ts`) which queries the mainnet RPC. The whole page is revalidated every 60s (`export const revalidate = 60` in `app/page.tsx`) — keeps RPC traffic predictable.

Override the RPC by setting `NEXT_PUBLIC_MAINNET_RPC` in `.env.local`.

## Run

From the monorepo root:

```bash
pnpm -F @sentriscloud/landing dev
# → http://localhost:3000
```

Build:

```bash
pnpm -F @sentriscloud/landing build
```

## Deploy

Vercel-ready: `Root Directory` = `apps/landing`, `Install Command` = `pnpm install`, `Build Command` = `pnpm build`. Set `NEXT_PUBLIC_MAINNET_RPC` if not using the default.

## Design system

Aesthetic follows `sentris-design`: editorial luxury (Playfair Display + Sora + IBM Plex Mono, emerald-on-canvas dark), no crypto-neon, no glassmorphism. Tokens defined in `app/globals.css` under `@theme`.
