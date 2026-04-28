// Deterministic jazzicon-style avatar — same pattern MetaMask, Uniswap,
// and most EVM wallets use. Each address produces a unique 5-shape
// Cubist collage clipped to a circle, so users learn to recognize their
// own wallet visually instead of squinting at "0xc1d2…21d6".
//
// Reasonably faithful reimplementation (no @metamask/jazzicon dep —
// 50 lines is cheaper than another 30 KB on the wallet bundle).

const PALETTE: ReadonlyArray<string> = [
  '#f4c75e', // brand gold
  '#ffd97a',
  '#d4a937',
  '#b08230',
  '#1c8a6f', // teal contrast
  '#7c4cff', // violet contrast
  '#e85a4f', // coral contrast
  '#3a8dff', // azure contrast
  '#f0ead6', // cream
];

// Mulberry32 — 32-bit seeded PRNG. Fast, decent distribution, deterministic.
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromAddress(addr: string): number {
  // Take first 8 hex chars → 32-bit number. Sufficient entropy for
  // visual uniqueness; full address would overflow JS int.
  const clean = addr.replace(/^0x/, '').slice(0, 8);
  return parseInt(clean, 16) || 1;
}

export default function GenerativeAvatar({
  address,
  size = 40,
  className,
}: {
  address: string | null;
  size?: number;
  className?: string;
}) {
  const seed = address ? seedFromAddress(address) : 1;
  const rand = mulberry32(seed);

  // Two distinct background colors picked from palette by hash
  const bgIdx = Math.floor(rand() * PALETTE.length);
  const bg = PALETTE[bgIdx];

  // 4 overlay shapes — each is a colored rectangle that's rotated and
  // translated to a random offset. Together they form the Cubist collage.
  const shapes = Array.from({ length: 4 }, () => {
    const colorIdx = Math.floor(rand() * PALETTE.length);
    return {
      color: PALETTE[colorIdx],
      tx: rand() * size - size / 2,
      ty: rand() * size - size / 2,
      rot: rand() * 360,
    };
  });

  const id = `clip-${seed}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      shapeRendering="geometricPrecision"
    >
      <defs>
        <clipPath id={id}>
          <circle cx={size / 2} cy={size / 2} r={size / 2} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <rect width={size} height={size} fill={bg} />
        {shapes.map((s, i) => (
          <rect
            key={i}
            x={0}
            y={0}
            width={size}
            height={size}
            fill={s.color}
            transform={`translate(${s.tx} ${s.ty}) rotate(${s.rot} ${size / 2} ${size / 2})`}
          />
        ))}
      </g>
    </svg>
  );
}
