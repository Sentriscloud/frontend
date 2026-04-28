// Sentrix Chain mark — canonical brand-kit asset (sentrix-mark.svg).
// Diamond outline + filled inner diamond + 4 pearl dots, no ring.
export function SentrixLogo({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src="/brand/sentrix-mark.svg"
      alt="Sentrix Chain"
      width={size}
      height={size}
      className={className ?? "object-contain"}
      loading="eager"
      decoding="sync"
    />
  );
}
