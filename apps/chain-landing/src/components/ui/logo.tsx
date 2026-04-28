type Variant = "header" | "ceremonial";

// Default = "ceremonial" — bronze ring + diamond + 4 pearl dots, the
// canonical Sentrix mark with full brand identity intact. Use everywhere
// the mark sits next to the wordmark, including nav chrome (paired with
// SENTRIX serif at minimal letter-spacing). The "header" variant is the
// stripped dual-diamond fallback for ultra-compact contexts where the
// pearl dots can't fit.
export function SentrixLogo({
  size = 38,
  variant = "ceremonial",
  className,
}: {
  size?: number;
  variant?: Variant;
  className?: string;
}) {
  if (variant === "header") {
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
  return (
    <img
      src="/brand/coin-ring-512.png"
      srcSet="/brand/coin-ring-128.png 128w, /brand/coin-ring-256.png 256w, /brand/coin-ring-512.png 512w"
      sizes={`${size}px`}
      alt="Sentrix Chain"
      width={size}
      height={size}
      className={className ?? "object-contain"}
      loading="eager"
      decoding="sync"
    />
  );
}
