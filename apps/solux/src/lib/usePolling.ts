'use client';

import { useEffect, useRef } from 'react';

type Cleanup = () => void;

/**
 * Polling primitive that:
 *   - calls `tick` immediately on mount
 *   - re-calls every `intervalMs` while the document tab is visible
 *   - pauses when the tab is hidden (document.visibilityState === 'hidden')
 *   - resumes (and fires once immediately) when the tab becomes visible again
 *   - cancels cleanly on unmount and on dependency change
 *
 * Pass `enabled=false` to suspend without changing deps.
 *
 * `tick` may return a cleanup function that runs before the next tick or on
 * unmount — use this to abort an in-flight fetch on rapid re-fires.
 */
export function usePolling(
  tick: () => void | Cleanup | Promise<void | Cleanup>,
  intervalMs: number,
  enabled = true,
) {
  // Keep a stable ref to the latest tick so changing it doesn't restart the
  // interval (caller usually re-renders on every state update).
  const tickRef = useRef(tick);
  tickRef.current = tick;

  useEffect(() => {
    if (!enabled) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;
    let cleanupFn: Cleanup | void;

    const run = () => {
      const result = tickRef.current();
      if (result instanceof Promise) {
        result.then((r) => { cleanupFn = r ?? undefined; });
      } else {
        cleanupFn = result ?? undefined;
      }
    };

    const start = () => {
      if (intervalId !== null) return;
      run();
      intervalId = setInterval(run, intervalMs);
    };

    const stop = () => {
      if (intervalId !== null) { clearInterval(intervalId); intervalId = null; }
      if (typeof cleanupFn === 'function') { cleanupFn(); cleanupFn = undefined; }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') start();
      else stop();
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
  }, [enabled, intervalMs]);
}
