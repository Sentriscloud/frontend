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
    // SVG vector — next/image's bitmap pipeline (LCP/lazy
    // optimisation) doesn't apply, and enabling it for SVG requires
    // dangerouslyAllowSVG in next.config. Plain <img> is the right
    // call for a 32px brand mark.
    // eslint-disable-next-line @next/next/no-img-element
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
