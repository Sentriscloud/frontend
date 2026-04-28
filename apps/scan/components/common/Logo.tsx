import Image from "next/image";

// Sentrix Chain mark — canonical brand-kit asset.
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
