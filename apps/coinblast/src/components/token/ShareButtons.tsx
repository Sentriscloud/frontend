'use client'

// Share buttons for a token detail page. X (Twitter) intent + copy link.
// Copy state flips for ~1.5s on success so the user gets feedback
// without a layout-shifting toast.

import { useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'

interface Props {
  name: string
  symbol: string
  /** URL to share — defaults to the current page on click. */
  url?: string
}

export function ShareButtons({ name, symbol, url }: Props) {
  const [copied, setCopied] = useState(false)

  const shareUrl = () =>
    url ?? (typeof window !== 'undefined' ? window.location.href : '')

  const tweetIntent = () => {
    const text = `Check out ${name} ($${symbol}) on CoinBlast! 🚀`
    const u = shareUrl()
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(u)}`
    window.open(intent, '_blank', 'noopener,noreferrer,width=550,height=420')
  }

  const copyLink = async () => {
    const u = shareUrl()
    try {
      await navigator.clipboard.writeText(u)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard API can be blocked (older browsers, insecure context).
      // Fall back to a transient prompt — gives the user the URL to copy
      // by hand without crashing the click.
      window.prompt('Copy link:', u)
    }
  }

  const baseBtn =
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all'

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={tweetIntent}
        aria-label="Share on X / Twitter"
        className={`${baseBtn} bg-[var(--sf)] border-[var(--brd)] text-[var(--tx-m)] hover:text-[var(--tx)] hover:border-[var(--brd2)]`}
      >
        <span className="text-[10px] font-bold leading-none">𝕏</span>
        Share
      </button>
      <button
        type="button"
        onClick={copyLink}
        aria-label="Copy link"
        className={`${baseBtn} ${copied ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'bg-[var(--sf)] border-[var(--brd)] text-[var(--tx-m)] hover:text-[var(--tx)] hover:border-[var(--brd2)]'}`}
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5" /> Copied
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" /> Copy link
          </>
        )}
      </button>
      <button
        type="button"
        onClick={() => {
          if (typeof navigator !== 'undefined' && navigator.share) {
            navigator.share({ title: `${name} ($${symbol})`, url: shareUrl() }).catch(() => {})
          } else {
            copyLink()
          }
        }}
        aria-label="Share"
        className={`${baseBtn} bg-[var(--sf)] border-[var(--brd)] text-[var(--tx-m)] hover:text-[var(--tx)] hover:border-[var(--brd2)] sm:hidden`}
      >
        <Share2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
