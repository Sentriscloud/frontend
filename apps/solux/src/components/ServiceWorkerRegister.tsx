'use client';

import { useEffect } from 'react';

/** Registers /sw.js once on first mount. Logs failures only in dev. */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    // Skip in dev — Next.js dev server hot reloads conflict with SW caching
    if (process.env.NODE_ENV !== 'production') return;

    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  }, []);

  return null;
}
