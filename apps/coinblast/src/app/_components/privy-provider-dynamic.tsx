'use client'

// Mounted-gate wrapper for SentrixPrivyProvider. Same pattern faucet
// already ships under `apps/faucet/src/app/_components/privy-provider-
// dynamic.tsx`; lifted here so coinblast's wagmi hooks (useAccount in
// useEffectiveAddress, useReadContract in useCurveState, etc.) don't
// fire before WagmiProvider's React context is established.
//
// Without this gate the children — Header → WalletConnect → usePrivy +
// useEffectiveAddress — render against an empty wagmi context during
// SSR + the first client paint, throw, and leave Privy's SDK stuck
// never reaching `ready=true`. User sees the modal's
// "Sign in or create account (warming up…)" forever and the click
// does nothing because login() pre-ready is a no-op.
//
// `next/dynamic({ssr:false})` was tried first and did NOT work — the
// RSC payload for children still pre-rendered + tried to hydrate
// before the dynamic chunk loaded the provider. The mounted-state
// pattern below is what actually works: children render `null`
// server-side and on the very first client paint, then mount once
// useEffect fires — at which point WagmiProvider context is set up
// and downstream wagmi hooks resolve cleanly on first call.

import { useEffect, useState, type ReactNode } from 'react'
import { SentrixPrivyProvider } from '@sentriscloud/wallet-config'

export function PrivyProviderDynamic({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  // mainnetOnly mirrors what the layout was passing before — coinblast
  // is a launchpad on chain 7119; testnet curves don't surface in this
  // app today.
  return <SentrixPrivyProvider mainnetOnly>{children}</SentrixPrivyProvider>
}
