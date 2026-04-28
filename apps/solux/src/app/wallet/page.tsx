'use client';

import { useEffect } from 'react';
import { useWalletStore } from '@/lib/store';
import WalletSetup from '@/components/WalletSetup';
import Dashboard from '@/components/Dashboard';
import UnlockScreen from '@/components/UnlockScreen';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function WalletPage() {
  const { address, privateKey, watchOnly, vault, hydrated, hydrate } = useWalletStore();

  // Read encrypted-vault metadata out of localStorage on mount so we can
  // show the unlock screen before the user does anything. Watch vaults
  // hydrate straight to "unlocked" inside the store action — no prompt.
  useEffect(() => { hydrate(); }, [hydrate]);

  // Empty first paint avoids a flash of WalletSetup while hydration runs.
  if (!hydrated) return null;

  const unlocked = address && (privateKey || watchOnly);

  return (
    <ErrorBoundary>
      {unlocked
        ? <Dashboard />
        : vault?.kind === 'encrypted'
          ? <UnlockScreen vault={vault} />
          : <WalletSetup />}
    </ErrorBoundary>
  );
}
