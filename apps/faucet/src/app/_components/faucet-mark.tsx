/**
 * Faucet brand mark — stylized water drop with a chain link inside.
 * Drawn as monoline SVG so it renders crisp at any size and inherits
 * `currentColor` from the parent for theming.
 */
export function FaucetMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="Sentrix Faucet"
      role="img"
    >
      {/* Outer drop */}
      <path d="M16 3 C 10.5 11, 6 17, 6 22 a 10 10 0 1 0 20 0 C 26 17, 21.5 11, 16 3 Z" />
      {/* Inner ring (signature element — suggests a coin / SRX in the drop) */}
      <circle cx="16" cy="22" r="4" />
      {/* Top highlight tick */}
      <path d="M16 9 L 16 12" />
    </svg>
  )
}
