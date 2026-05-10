'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

// Number that tweens from the previous value to the next over `duration`ms
// using cubic-out easing. Used on the faucet stats so balance / total
// distributed roll up after the API call rather than snapping.
//
// Same micro-interaction Solux ships on its hero balance — keeps the two
// products feeling like one product family.

interface Props {
  value: number
  duration?: number
  format: (n: number) => string
  className?: string
}

// Reduced-motion preference via useSyncExternalStore — lint-clean under
// React 19's react-hooks/set-state-in-effect rule (vs. setState-in-effect
// based on a media-query check) and reactive to runtime preference flips.
function subscribeReducedMotion(cb: () => void) {
  if (typeof window === 'undefined') return () => {}
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
function getReducedMotionSnapshot() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
function getReducedMotionServerSnapshot() {
  return false
}

export function AnimatedNumber({ value, duration = 700, format, className }: Props) {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(0)
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  )

  useEffect(() => {
    if (reducedMotion) return // snap-render via the displayValue branch below

    fromRef.current = display
    startRef.current = null

    const tick = (ts: number) => {
      if (startRef.current === null) startRef.current = ts
      const elapsed = ts - startRef.current
      const t = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const next = fromRef.current + (value - fromRef.current) * eased
      setDisplay(next)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration, reducedMotion])

  return <span className={className}>{format(reducedMotion ? value : display)}</span>
}
