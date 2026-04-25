import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** Lucide icon component; pass `false` (omit) to render a custom icon slot via `iconSlot`. */
  icon?: LucideIcon;
  /** Custom icon slot, used instead of `icon`. e.g. a token symbol avatar. */
  iconSlot?: ReactNode;
  /** UPPERCASE tracked label above the title (e.g. "BLOCK HEIGHT", "VALIDATOR"). */
  eyebrow?: ReactNode;
  /** Primary title — regular sans, or mono if `mono` prop is set. */
  title: ReactNode;
  /** Switch title font-family to mono + break-all (for hashes / heights). */
  mono?: boolean;
  /** Icon-bubble tone. `gold` (brand default) or `muted` (for dense detail pages). */
  tone?: "gold" | "muted";
  /** Right-hand slot — count pill, status badge, prev/next nav, etc. */
  actions?: ReactNode;
}

// DECISION: two-tone only per audit. Every page defaults to gold for brand consistency;
// `muted` is reserved for detail pages where a separate status signal (StatusBadge,
// direction arrow, +/- amount) already carries the contextual colour weight. Icon bubble
// is small (40×40) so gold stays an accent, not a flood.
export function PageHeader({ icon: Icon, iconSlot, eyebrow, title, mono = false, tone = "gold", actions }: PageHeaderProps) {
  const bubble =
    tone === "gold"
      ? "bg-[color-mix(in_oklab,var(--gold)_12%,transparent)] text-[var(--gold)]"
      : "bg-muted text-muted-foreground border border-[var(--brd)]";

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
      <div className="flex items-center gap-3 min-w-0">
        {iconSlot ? (
          <div className="shrink-0">{iconSlot}</div>
        ) : Icon ? (
          <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", bubble)}>
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[10px] font-mono tracking-[.22em] uppercase text-[var(--tx-d)] mb-0.5">
              {eyebrow}
            </p>
          )}
          <h1
            className={cn(
              "text-2xl font-bold tracking-tight",
              mono && "font-mono break-all text-xl md:text-2xl",
            )}
          >
            {title}
          </h1>
        </div>
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
