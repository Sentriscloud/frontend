import Image from "next/image";

export function SentrixLogo({ size = 32 }: { size?: number }) {
  return (
    <Image
      src="/sentrix-coin-og.png"
      alt="Sentrix"
      width={size}
      height={size}
      className="object-contain"
      quality={100}
      priority
    />
  );
}
