'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'cb_cookie_consent'

export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        // Small delay so it slides in after the page lands instead of
        // racing the first paint — feels less jarring on slow networks.
        const t = setTimeout(() => setVisible(true), 400)
        return () => clearTimeout(t)
      }
    } catch {
      // localStorage blocked (private mode in some browsers); skip.
    }
  }, [])

  const choose = (decision: 'accept' | 'reject') => {
    try {
      window.localStorage.setItem(STORAGE_KEY, decision)
    } catch {
      // best-effort; banner still hides for the rest of this session
    }
    setVisible(false)
  }

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-[60] transition-transform duration-300 ease-out ${
        visible ? 'translate-y-0' : 'translate-y-full pointer-events-none'
      }`}
    >
      <div className="mx-auto max-w-5xl m-3 sm:m-4 rounded-xl border border-[var(--brd)] bg-[var(--sf)]/95 backdrop-blur shadow-2xl px-4 py-3 sm:px-5 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <p className="text-sm text-[var(--tx-m)] flex-1">
          We use cookies to improve your experience.
        </p>
        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => choose('reject')}
            className="flex-1 sm:flex-none px-3.5 py-1.5 text-sm rounded-md text-[var(--tx-d)] hover:text-[var(--tx)] hover:bg-[var(--sf2)] border border-transparent hover:border-[var(--brd)] transition-colors"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => choose('accept')}
            className="flex-1 sm:flex-none px-3.5 py-1.5 text-sm font-semibold rounded-md bg-emerald-500 hover:bg-emerald-400 text-black transition-colors"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  )
}
