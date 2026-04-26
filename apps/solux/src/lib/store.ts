import { create } from 'zustand';

interface WalletState {
  privateKey: string | null;
  address: string | null;
  setWallet: (privateKey: string, address: string) => void;
  clearWallet: () => void;
}

export const useWalletStore = create<WalletState>()((set) => ({
  privateKey: null,
  address: null,
  setWallet: (privateKey, address) => set({ privateKey, address }),
  clearWallet: () => set({ privateKey: null, address: null }),
}));
