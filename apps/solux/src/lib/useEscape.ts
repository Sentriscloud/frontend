'use client';

import { useEffect } from 'react';

/**
 * Listen for ESC key while `enabled` is true and call `onEscape`.
 * Use in modal/sheet components for accessibility — keyboard users expect
 * ESC to dismiss overlays.
 */
export function useEscape(enabled: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onEscape();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [enabled, onEscape]);
}
