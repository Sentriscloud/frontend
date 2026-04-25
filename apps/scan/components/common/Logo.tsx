import Image from "next/image";

// DECISION: official Sentrix Chain mark from the brand-kit
// (github.com/sentrix-labs/brand-kit). Using the transparent variant — bronze outline + gold
// nodes read cleanly on the dark UI without the all-purpose black-circle container fighting
// the editorial header. Mono-black variant is also shipped (sentrix-logo-mono.svg) for any
// future light-on-dark inversion need.
export function SentrixLogo({ size = 32 }: { size?: number }) {
  return (
    <Image
      src="/sentrix-logo.svg"
      alt="Sentrix"
      width={size}
      height={size}
      className="object-contain"
      priority
    />
  );
}
