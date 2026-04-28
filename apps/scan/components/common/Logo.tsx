import Image from "next/image";

type Variant = "header" | "ceremonial";

// Sentrix Chain mark from the brand-kit (github.com/sentrix-labs/brand-kit).
// Default "ceremonial" = bronze ring + diamond + 4 pearl dots (the canonical
// brand mark with full identity intact). "header" = stripped dual-diamond
// for ultra-compact contexts where the pearl dots can't fit. See
// brand-kit/USAGE.md for the hierarchy.
export function SentrixLogo({
  size = 32,
  variant = "ceremonial",
}: {
  size?: number;
  variant?: Variant;
}) {
  if (variant === "header") {
    return (
      <Image
        src="/sentrix-mark-header.svg"
        alt="Sentrix"
        width={size}
        height={size}
        className="object-contain"
        priority
      />
    );
  }
  return (
    <Image
      src="/coin-ring-512.png"
      alt="Sentrix"
      width={size}
      height={size}
      className="object-contain"
      priority
    />
  );
}
