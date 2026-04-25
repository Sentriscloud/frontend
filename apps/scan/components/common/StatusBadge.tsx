import { CheckCircle2, XCircle, Clock, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type Status = "success" | "failed" | "pending" | "info" | "warning";

const STYLES: Record<Status, { bg: string; text: string; border: string; icon: React.ElementType; label: string }> = {
  success: {
    bg: "bg-green-500/10",
    text: "text-green-500",
    border: "border-green-500/20",
    icon: CheckCircle2,
    label: "Success",
  },
  failed: {
    bg: "bg-red-500/10",
    text: "text-red-500",
    border: "border-red-500/20",
    icon: XCircle,
    label: "Failed",
  },
  pending: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-500",
    border: "border-yellow-500/20",
    icon: Clock,
    label: "Pending",
  },
  info: {
    bg: "bg-[color-mix(in_oklab,var(--blue)_12%,transparent)]",
    text: "text-[var(--blue)]",
    border: "border-[color-mix(in_oklab,var(--blue)_25%,transparent)]",
    icon: Info,
    label: "Info",
  },
  warning: {
    bg: "bg-orange-500/10",
    text: "text-orange-500",
    border: "border-orange-500/20",
    icon: AlertTriangle,
    label: "Warning",
  },
};

interface StatusBadgeProps {
  status: Status;
  label?: string;
  className?: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, label, className, size = "sm" }: StatusBadgeProps) {
  const cfg = STYLES[status];
  const Icon = cfg.icon;
  const displayLabel = label ?? cfg.label;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        cfg.bg,
        cfg.text,
        cfg.border,
        className,
      )}
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {displayLabel}
    </span>
  );
}
