'use client'

// Deterministic placeholder avatar for tokens whose deployer didn't
// upload an image. Hashes the token address into two HSL colors and
// renders a gradient + symbol initials. Stable across reloads (same
// address → same avatar), no extra deps, no external image hosting.
//
// Falls back to <img> when imageUrl is set (user-uploaded). On <img>
// load error we silently swap to the gradient — covers broken IPFS
// links, expired blob URLs, or empty strings.

import { useState } from 'react'

interface TokenAvatarProps {
  address: string
  symbol: string
  imageUrl?: string
  size?: number
  className?: string
}

function hashAddress(addr: string): number {
  // Cheap djb2-style hash on the lowercase address, gives us an int we
  // can mod into HSL hue space + a second variant for the gradient.
  const a = addr.toLowerCase()
  let h = 5381
  for (let i = 0; i < a.length; i++) h = (h * 33) ^ a.charCodeAt(i)
  return h >>> 0
}

export function TokenAvatar({ address, symbol, imageUrl, size = 64, className = '' }: TokenAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false)
  const hasImage = !!imageUrl && !imgFailed

  const hash = hashAddress(address || symbol || '0x0')
  const hue1 = hash % 360
  const hue2 = (hue1 + 47 + ((hash >> 8) & 0x1f)) % 360
  const saturation = 60
  const lightness = 38
  const bg = `linear-gradient(135deg, hsl(${hue1} ${saturation}% ${lightness}%) 0%, hsl(${hue2} ${saturation}% ${lightness - 8}%) 100%)`

  const initials = (symbol || '??').slice(0, 4).toUpperCase()
  const fontSize = Math.max(10, Math.floor(size / (initials.length > 2 ? 3.2 : 2.4)))

  if (hasImage) {
    return (
      <img
        src={imageUrl}
        alt={symbol}
        width={size}
        height={size}
        onError={() => setImgFailed(true)}
        className={`object-cover rounded-xl bg-[var(--sf2)] ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className={`rounded-xl flex items-center justify-center font-black text-white tracking-wider select-none ${className}`}
      style={{
        width: size,
        height: size,
        background: bg,
        fontSize,
        textShadow: '0 1px 2px rgba(0,0,0,0.4)',
      }}
      aria-label={symbol}
    >
      {initials}
    </div>
  )
}
