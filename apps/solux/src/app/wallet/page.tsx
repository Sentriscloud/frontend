'use client';

import { useWalletStore } from '@/lib/store';
import WalletSetup from '@/components/WalletSetup';
import Dashboard from '@/components/Dashboard';

export default function WalletPage() {
  const { privateKey } = useWalletStore();

  if (!privateKey) {
    return <WalletSetup />;
  }

  return <Dashboard />;
}
