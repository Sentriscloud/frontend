// Inline SRX brand mark — rhombus + 4 corner dots with a polished
// gold-gradient inner fill. Inline (not <img src>) so the outer stroke
// + corner dots inherit `currentColor` from the parent text color,
// keeping the mark visually consistent across discs / hero / asset row
// without per-instance color hacks.

export default function SrxMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      shapeRendering="geometricPrecision"
      className={className}
    >
      <defs>
        <linearGradient id="srx-mark-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffd97a" />
          <stop offset="55%" stopColor="#f4c75e" />
          <stop offset="100%" stopColor="#c89730" />
        </linearGradient>
      </defs>
      {/* Outer rhombus — stroke uses parent gold via currentColor */}
      <polygon
        points="50,8 92,50 50,92 8,50"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      {/* Inner rhombus — solid metallic gold */}
      <polygon
        points="50,28 72,50 50,72 28,50"
        fill="url(#srx-mark-fill)"
        stroke="none"
      />
      {/* Cardinal dots — pick up parent currentColor */}
      <circle cx="50" cy="8"  r="3" fill="currentColor" stroke="none" />
      <circle cx="92" cy="50" r="3" fill="currentColor" stroke="none" />
      <circle cx="50" cy="92" r="3" fill="currentColor" stroke="none" />
      <circle cx="8"  cy="50" r="3" fill="currentColor" stroke="none" />
    </svg>
  );
}
