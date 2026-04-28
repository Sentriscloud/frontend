// Inline SRX brand mark — rhombus + 4 corner dots, polished gold gradient
// inner fill. Same component shipped in Solux (apps/solux/src/components/
// SrxMark.tsx) so the two products share one visual identity. Strokes
// inherit `currentColor` from the parent so the mark tints with whatever
// surface it's placed on.
export function FaucetMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      shapeRendering="geometricPrecision"
      className={className}
      aria-label="Sentrix"
      role="img"
    >
      <defs>
        <linearGradient id="faucet-mark-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffd97a" />
          <stop offset="55%" stopColor="#f4c75e" />
          <stop offset="100%" stopColor="#c89730" />
        </linearGradient>
      </defs>
      <polygon
        points="50,8 92,50 50,92 8,50"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <polygon
        points="50,28 72,50 50,72 28,50"
        fill="url(#faucet-mark-fill)"
        stroke="none"
      />
      <circle cx="50" cy="8"  r="3" fill="currentColor" stroke="none" />
      <circle cx="92" cy="50" r="3" fill="currentColor" stroke="none" />
      <circle cx="50" cy="92" r="3" fill="currentColor" stroke="none" />
      <circle cx="8"  cy="50" r="3" fill="currentColor" stroke="none" />
    </svg>
  )
}
