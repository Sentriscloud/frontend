'use client'

// Originally a zustand store with hand-rolled MetaMask connect logic. Now a
// thin React hook that delegates to wagmi (via the SentrixWalletProvider in
// the root layout) and surfaces the same shape every existing call site
// already expects — `address / isConnected / isConnecting / connect /
// disconnect / clearError / error`.
//
// Keeping the name `useWalletStore` so the four existing consumers
// (WalletConnect.tsx, BuySellWidget.tsx, portfolio/page.tsx, create/page.tsx)
// don't need to change. Migration done in one place instead of four.

import { useAccount, useDisconnect } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'

interface WalletStore {
  address: string | null
  isConnecting: boolean
  isConnected: boolean
  error: string | null
  connect: () => void
  disconnect: () => void
  clearError: () => void
}

export function useWalletStore(): WalletStore {
  const { address, isConnected, isConnecting } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { disconnect } = useDisconnect()

  return {
    address: address ?? null,
    isConnecting: !!isConnecting,
    isConnected: !!isConnected,
    error: null, // RainbowKit shows its own error UI inside the modal
    connect: () => {
      // openConnectModal is only set once the WagmiProvider has settled;
      // before that the user clicked too early — nothing to do.
      if (openConnectModal) openConnectModal()
    },
    disconnect: () => disconnect(),
    clearError: () => {},
  }
}
