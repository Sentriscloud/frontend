'use client'
import { create } from 'zustand'

interface WalletStore {
  address: string | null
  isConnecting: boolean
  isConnected: boolean
  error: string | null
  connect: () => Promise<void>
  disconnect: () => void
  clearError: () => void
}

export const useWalletStore = create<WalletStore>((set) => ({
  address: null,
  isConnecting: false,
  isConnected: false,
  error: null,

  connect: async () => {
    set({ isConnecting: true, error: null })
    try {
      const { connectWallet } = await import('@/lib/chain')
      const { address } = await connectWallet()
      set({ address, isConnected: true })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to connect wallet'
      set({ error: msg })
    } finally {
      set({ isConnecting: false })
    }
  },

  disconnect: () => set({ address: null, isConnected: false, error: null }),
  clearError: () => set({ error: null }),
}))
