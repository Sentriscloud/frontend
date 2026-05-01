'use client'

// Mounted-gate wrapper for SentrixPrivyProvider. The earlier
// `next/dynamic({ssr:false})` form did NOT actually defer client-side
// hydration of children — RSC payload for children pre-rendered + tried
// to hydrate before the dynamic chunk loaded SentrixPrivyProvider, so
// any wagmi `useConfig` / `useAccount` call inside FaucetForm fired
// before WagmiProvider mounted and threw
// "WagmiProviderNotFoundError: useConfig must be used within
// WagmiProvider".
//
// The mounted-state pattern below runs the SentrixPrivyProvider tree
// (and therefore WagmiProvider's context) on the first useEffect tick
// AFTER hydration. Children render `null` server-side and on the very
// first client paint, then mount once useEffect fires — at which point
// WagmiProvider context is established and FaucetForm's useAccount
// resolves cleanly.

import { useEffect, useState, type ReactNode } from 'react'
import { SentrixPrivyProvider } from '@sentriscloud/wallet-config'

export function PrivyProviderDynamic({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return <SentrixPrivyProvider>{children}</SentrixPrivyProvider>
}
