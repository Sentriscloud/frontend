// Sentrix Chain header mark — diamond + 4 gold pearl dots, no ring,
// no outer disc. The single canonical asset for nav, footer, and any
// wordmark-adjacent context. Sourced from brand-kit/svg/sentrix-mark-
// header.svg; pearl dots are sized so they stay legible at 32-56px
// display. See brand-kit/USAGE.md for sizing + alignment guidance.
//
// For ceremonial / hero coin stamps (faucet hero, solux balance puck),
// each app ships its own component (FaucetMark, SrxMark) loading the
// solid-bronze-gold avatar — that's a different visual context (asset
// value stamp, not brand chrome). Don't reach for it in nav.
export function SentrixLogo({
  size = 36,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src="/brand/sentrix-mark-header.svg"
      alt="Sentrix Chain"
      width={size}
      height={size}
      className={className ?? "object-contain"}
      loading="eager"
      decoding="sync"
    />
  );
}
