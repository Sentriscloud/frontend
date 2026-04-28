// Sentrix coin avatar — sourced from the canonical brand-kit at
// github.com/sentrix-labs/brand-kit (avatars/single-ring-transparent/
// avatar-single-ring-transparent-512.png). Bronze ring + bronze diamond
// + 4 gold cardinal nodes on a transparent background, so the asset
// composites cleanly over any backdrop.
//
// We bundle the 512px PNG locally to avoid a runtime brand-kit dependency.
// Solux's faucet sibling uses the exact same file from its own /brand
// folder — keeps the two products visually identical.

export default function SrxMark({ className }: { className?: string }) {
  return (
    <img
      src="/brand/coin-512.png"
      alt=""
      aria-hidden
      className={className}
      width={512}
      height={512}
    />
  )
}
