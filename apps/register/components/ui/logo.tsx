import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  size?: number;
  withWordmark?: boolean;
};

/**
 * SentrisCloud mark — 5-dot quincunx in family emerald.
 * Inlined SVG (no jsDelivr fetch) for above-the-fold render.
 */
export function Logo({ className, size = 28, withWordmark = false }: Props) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 120 120"
        fill="currentColor"
        width={size}
        height={size}
        role="img"
        aria-label="SentrisCloud"
        className="text-(--color-emerald-500) shrink-0"
      >
        <circle cx="60" cy="24" r="12" />
        <circle cx="24" cy="60" r="12" />
        <circle cx="60" cy="60" r="12" />
        <circle cx="96" cy="60" r="12" />
        <circle cx="60" cy="96" r="12" />
      </svg>
      {withWordmark ? (
        <span className="text-base font-medium tracking-tight text-(--color-ink)">SentrisCloud</span>
      ) : null}
    </span>
  );
}
