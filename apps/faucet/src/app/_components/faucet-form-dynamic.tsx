'use client'

// next/dynamic({ssr:false}) wrapper — Privy's PrivyProvider is gated on
// window, so any wagmi hook nested inside it (useAccount / useConfig)
// blows up when Next tries to SSR the page. Skipping the form entirely
// during prerender + first server render and only rendering it after
// the client has hydrated is the supported pattern.
//
// Lives in a tiny client file because dynamic({ssr:false}) is only
// allowed from client modules in Next 15+.

import dynamic from 'next/dynamic'

export const FaucetFormDynamic = dynamic(
  () => import('./faucet-form').then((m) => m.FaucetForm),
  { ssr: false },
)
