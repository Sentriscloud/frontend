// Sentrix coin avatar — sourced from the canonical brand-kit at
// github.com/sentrix-labs/brand-kit (avatars/single-ring-transparent/
// avatar-single-ring-transparent-256.png). Bronze ring + bronze diamond
// + 4 gold cardinal nodes on a transparent background, so the mark
// composites cleanly over any backdrop. We bundle it locally to avoid a
// runtime dependency on the brand-kit repo.
//
// Use the 512px variant by default for retina-crisp display sizes
// (40-128px range). If you ever need to render larger, reach for
// /brand/coin-512.png (or coin-256.png for smaller fixed slots).
export function FaucetMark({ className }: { className?: string }) {
  return (
    <img
      src="/brand/coin-512.png"
      alt="Sentrix"
      className={className}
      aria-label="Sentrix Faucet"
      role="img"
      width={512}
      height={512}
    />
  )
}
