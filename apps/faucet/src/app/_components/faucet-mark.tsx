/**
 * Sentrix Chain mark — single-ring transparent avatar from brand-kit.
 * Bronze ring + bronze diamond + 4 gold cardinal nodes on transparent BG.
 * Use the 1024 PNG so it stays crisp at retina display sizes (40-96px).
 */
export function FaucetMark({ className }: { className?: string }) {
  return (
    <img
      src="/brand/coin-single-ring-1024.png"
      alt="Sentrix"
      className={className}
      aria-label="Sentrix Faucet"
      role="img"
      width={1024}
      height={1024}
    />
  )
}
