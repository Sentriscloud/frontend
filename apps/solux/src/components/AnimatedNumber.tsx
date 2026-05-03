'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

// Subscribe to the prefers-reduced-motion media query without setState
// in an effect. Returns true when the user has the system setting on.
function subscribeReducedMotion(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}
function getReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
function getReducedMotionServer() {
  return false;
}

// Number that counts up from 0 (or the previous value) to its target
// over `duration`ms. Used on the balance hero so refresh / unlock /
// network-switch reveals feel like the number is "rolling in" instead
// of snapping to a value — same micro-interaction Phantom uses.
//
// Easing is cubic-out so the number rushes early and settles at the
// end, which reads as confident on a hero amount.

interface Props {
  value: number;
  duration?: number;
  format: (n: number) => string;
  className?: string;
  style?: React.CSSProperties;
}

export default function AnimatedNumber({
  value,
  duration = 900,
  format,
  className,
  style,
}: Props) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  // Track the OS reduced-motion preference reactively. Avoids a
  // setState-in-effect on the early-return path.
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    getReducedMotionServer,
  );

  useEffect(() => {
    if (reducedMotion) return;

    fromRef.current = display;
    startRef.current = null;

    const tick = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3); // cubic-out
      const next = fromRef.current + (value - fromRef.current) * eased;
      setDisplay(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // Intentionally exclude `display` from deps — it changes on every
    // tick and would restart the animation infinitely.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration, reducedMotion]);

  // When reduced-motion is on, render the target value directly —
  // bypasses the easing state entirely.
  return (
    <span className={className} style={style}>
      {format(reducedMotion ? value : display)}
    </span>
  );
}
