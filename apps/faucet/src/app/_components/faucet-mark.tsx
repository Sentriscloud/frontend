// Sentrix coin stamp — sourced from the canonical brand-kit at
// github.com/sentrix-labs/brand-kit (avatars/solid-bronze-gold/
// avatar-solid-bronze-gold-512.png). Gold diamond on a bronze disc —
// the "complete coin face" variant. Same asset Solux's SrxMark uses,
// so the two products read as one brand family.
//
// We bundle the 512px PNG locally to avoid a runtime brand-kit
// dependency. The transparent-ring variant (coin-512.png) stays in
// /public/brand/ for any future use that wants the framed look.
export function FaucetMark({ className }: { className?: string }) {
  return (
    <img
      src="/brand/coin-solid-512.png"
      alt="Sentrix"
      className={className}
      aria-label="Sentrix Faucet"
      role="img"
      width={512}
      height={512}
    />
  )
}
