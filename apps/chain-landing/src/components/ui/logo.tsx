type Variant = "header" | "ceremonial";

export function SentrixLogo({
  size = 28,
  variant = "header",
  className,
}: {
  size?: number;
  variant?: Variant;
  className?: string;
}) {
  if (variant === "ceremonial") {
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
