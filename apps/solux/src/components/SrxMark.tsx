// Sentrix coin stamp — sourced from the canonical brand-kit at
// github.com/sentrix-labs/brand-kit (avatars/solid-bronze-gold/
// avatar-solid-bronze-gold-512.png). Gold diamond on a bronze disc
// — the "complete coin face" variant, no surrounding ring. Reads as
// a single, dense brand stamp at 24-96px display sizes.
//
// We bundle the 512px PNG locally to avoid a runtime brand-kit dependency.

import Image from 'next/image';

export default function SrxMark({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/coin-solid-512.png"
      alt=""
      aria-hidden
      className={className}
      width={512}
      height={512}
    />
  )
}
