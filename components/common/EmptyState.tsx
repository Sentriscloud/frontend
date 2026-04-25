import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  /** Visual tone. `default` muted, `notice` subtle gold highlight, `warn` orange. */
  tone?: "default" | "notice" | "warn";
  className?: string;
}

// DECISION: one consistent empty-state shape for every "no data / not found / coming soon"
// surface in the app. Gold icon for notice, orange for warn, muted otherwise — keeps the
// editorial voice without each page hand-rolling its own Lucide+p+p block.
export function EmptyState({ icon: Icon, title, hint, action, tone = "default", className }: EmptyStateProps) {
  const toneClasses = {
    default: "text-muted-foreground/40",
    notice: "text-[var(--gold)]/60",
    warn: "text-[var(--orange)]/70",
  }[tone];

  const titleTone = {
    default: "text-muted-foreground",
    notice: "text-[var(--gold)]",
    warn: "text-[var(--orange)]",
  }[tone];

  return (
    <div className={cn("p-12 text-center flex flex-col items-center gap-2", className)}>
      {Icon && <Icon className={cn("h-8 w-8 mb-1", toneClasses)} />}
      <p className={cn("text-sm font-medium", titleTone)}>{title}</p>
      {hint && (
        <p className="text-xs text-muted-foreground/80 max-w-sm leading-relaxed font-mono">{hint}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
