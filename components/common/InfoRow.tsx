import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InfoRowProps {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  mono?: boolean;
  last?: boolean;
  className?: string;
}

export function InfoRow({ label, value, hint, mono = false, last = false, className }: InfoRowProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-6 py-3.5 group/row",
        !last && "border-b border-border/60",
        className,
      )}
    >
      <div className="text-sm text-muted-foreground sm:w-56 shrink-0 font-medium">
        {label}
      </div>
      <div className={cn("min-w-0 flex-1 text-sm", mono && "font-mono break-all")}>
        <div className="leading-relaxed">{value}</div>
        {hint && <div className="text-xs text-muted-foreground/80 mt-1">{hint}</div>}
      </div>
    </div>
  );
}
