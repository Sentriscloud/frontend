'use client'

// next/dynamic({ssr:false}) wrapper around SentrixPrivyProvider — Privy
// + @privy-io/wagmi internally call useConfig before WagmiProvider has
// fully mounted on hydration, which crashes the page with
// "useConfig must be used within WagmiProvider". Skipping SSR for the
// provider entirely (and the children-tree it wraps) avoids the race —
// the page renders without the provider on first paint, then mounts
// the provider after hydration.
//
// Same pattern as faucet-form-dynamic.tsx, but at the layout level so
// it covers the whole app shell (homepage + /testnet + /mainnet).

import dynamic from 'next/dynamic'
import type { ReactNode } from 'react'

const SentrixPrivyProviderClientOnly = dynamic(
  () =>
    import('@sentriscloud/wallet-config').then((m) => ({
      default: m.SentrixPrivyProvider,
    })),
  { ssr: false },
)

export function PrivyProviderDynamic({ children }: { children: ReactNode }) {
  return <SentrixPrivyProviderClientOnly>{children}</SentrixPrivyProviderClientOnly>
}
