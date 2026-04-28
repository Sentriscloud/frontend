// Sentrix mark — canonical brand-kit asset (sentrix-mark.svg), same
// as chain-landing nav. Diamond outline + filled inner diamond + 4
// pearl dots. No coin disc, no ring background.
export function FaucetMark({ className }: { className?: string }) {
  return (
    <img
      src="/brand/sentrix-mark.svg"
      alt="Sentrix"
      className={className}
      aria-label="Sentrix Faucet"
      role="img"
      width={512}
      height={512}
    />
  )
}
