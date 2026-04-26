'use client';

import { useWalletStore } from '@/lib/store';
import WalletSetup from '@/components/WalletSetup';
import Dashboard from '@/components/Dashboard';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function WalletPage() {
  const { privateKey, address, watchOnly } = useWalletStore();
  // Watch-only mode loads address without privkey, so check both.
  const hasWallet = privateKey || (watchOnly && address);

  return (
    <ErrorBoundary>
      {!hasWallet ? <WalletSetup /> : <Dashboard />}
    </ErrorBoundary>
  );
}
