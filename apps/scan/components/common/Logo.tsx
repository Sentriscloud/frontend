import Image from "next/image";

// Sentrix Chain header mark — diamond + 4 gold pearl dots, no ring,
// no outer disc. Single canonical asset for nav, footer, breadcrumb
// chrome. Sourced from brand-kit/svg/sentrix-mark-header.svg.
// See brand-kit/USAGE.md for sizing + alignment guidance.
export function SentrixLogo({ size = 32 }: { size?: number }) {
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
