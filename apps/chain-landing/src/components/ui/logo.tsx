export function SentrixLogo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/brand/sentrix-mark.svg"
      alt="Sentrix"
      width={size}
      height={size}
      className={className ?? "object-contain"}
    />
  );
}
