export function SentrixLogo({ size = 32, className }: { size?: number; className?: string }) {
  const target = size <= 64 ? 128 : size <= 128 ? 256 : 512;
  return (
    <img
      src={`/brand/coin-ring-${target}.png`}
      srcSet={`/brand/coin-ring-128.png 128w, /brand/coin-ring-256.png 256w, /brand/coin-ring-512.png 512w`}
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
