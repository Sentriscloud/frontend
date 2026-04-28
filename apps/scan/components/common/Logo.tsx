import Image from "next/image";

type Variant = "header" | "ceremonial";

// Sentrix Chain mark from the brand-kit (github.com/sentrix-labs/brand-kit).
// "header" (default) = solid dual-diamond, no decorative ring or pearl dots
// — reads cleanly at navbar sizes (24-32px). "ceremonial" = full ring +
// pearl dots composition for hero/display contexts. See brand-kit/USAGE.md.
export function SentrixLogo({
  size = 24,
  variant = "header",
}: {
  size?: number;
  variant?: Variant;
}) {
  const src =
    variant === "ceremonial"
      ? "/sentrix-logo.svg"
      : "/sentrix-mark-header.svg";
  return (
    <Image
      src={src}
      alt="Sentrix"
      width={size}
      height={size}
      className="object-contain"
      priority
    />
  );
}
