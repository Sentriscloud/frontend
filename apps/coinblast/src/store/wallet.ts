'use client'

// Wallet hook for CoinBlast — wraps wagmi's address state and Privy's
// login/logout so every existing call site (WalletConnect, BuySellWidget,
// portfolio, create) sees the same shape we used pre-Privy. The four
// consumers don't need changes.
//
// Wagmi reads/writes are unchanged: the Privy wagmi adapter registers
// connected wallets (external + embedded) as wagmi connectors, so
// useAccount / useReadContract / useWriteContract continue to work.

import { useAccount } from 'wagmi'
import { usePrivy } from '@privy-io/react-auth'

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
  const { ready, authenticated, login, logout } = usePrivy()

  return {
    address: address ?? null,
    isConnecting: !!isConnecting,
    isConnected: !!isConnected,
    error: null, // Privy renders auth errors inside its own modal
    connect: () => {
      // login() is a no-op until Privy has booted. ready=false on the
      // very first paint; user clicking too early simply waits.
      if (ready) login()
    },
    disconnect: () => {
      // Privy's logout tears down both the auth session and any wagmi
      // connector it had injected; we don't need a separate wagmi call.
      if (authenticated) logout()
    },
    clearError: () => {},
  }
}
