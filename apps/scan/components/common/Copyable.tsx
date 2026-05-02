"use client";

import { useState, type ReactNode } from "react";
import { Copy, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type CopyState = "idle" | "copied" | "error";

interface CopyableProps {
  text: string | null | undefined;
  children?: ReactNode;
  className?: string;
  iconClassName?: string;
  /** When true, render icon only without any wrapper children spacing */
  bare?: boolean;
  /** Optional label shown in the toast, e.g., "Block hash". Defaults to generic "Copied". */
  label?: string;
}

// DECISION: on copy success fire a sonner toast AND flip the icon to a gold check for 1.5s.
// Gold (not green) because green was generic success — the brand's success-copy-feedback signal
// is a gold pulse matching the rest of the editorial palette.
export function Copyable({ text, children, className, iconClassName, bare, label }: CopyableProps) {
  const [state, setState] = useState<CopyState>("idle");

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
      const preview = text.length > 22 ? `${text.slice(0, 10)}…${text.slice(-8)}` : text;
      toast.success(label ? `${label} copied` : "Copied to clipboard", { description: preview, duration: 1800 });
    } catch {
      setState("error");
      toast.error("Clipboard blocked by browser");
    }
    setTimeout(() => setState("idle"), 2_000);
  }

  const disabled = !text;

  const iconBtn = (
    <button
      type="button"
      onClick={handleCopy}
      disabled={disabled}
      aria-label={state === "copied" ? "Copied" : "Copy to clipboard"}
      title={state === "error" ? "Clipboard blocked by browser" : state === "copied" ? "Copied!" : "Copy"}
      className={cn(
        "inline-flex items-center justify-center h-5 w-5 rounded hover:bg-accent transition-all shrink-0 disabled:opacity-40 disabled:cursor-not-allowed",
        state === "copied" && "scale-110",
        iconClassName,
      )}
    >
      {state === "copied" ? (
        <Check className="h-3.5 w-3.5 text-[var(--gold)] drop-shadow-[0_0_6px_rgba(200,168,74,.6)]" />
      ) : state === "error" ? (
        <X className="h-3.5 w-3.5 text-red-500" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
      )}
    </button>
  );

  if (bare || !children) {
    // Bare mode means the icon stands alone (e.g., a copy-only column).
    // Hover-fade doesn't make sense without a visible companion, so the
    // icon stays at full opacity in this mode.
    return iconBtn;
  }

  // Hover-only spec 2026-05-02: icon hides until the user hovers the row
  // (or the focus lands inside it for keyboard nav). The named group
  // (`copy`) avoids colliding with parent components that already use
  // `group` for their own hover effects (StatCard, AddressNote, etc).
  // Once copied, the icon stays visible for the success-feedback window
  // even if the cursor leaves — that's `data-state` driving the override.
  return (
    <span
      className={cn("group/copy inline-flex items-center gap-1 min-w-0", className)}
      data-copy-state={state}
    >
      {children}
      <span
        className={cn(
          "transition-opacity duration-150",
          state === "idle"
            ? "opacity-0 group-hover/copy:opacity-100 group-focus-within/copy:opacity-100"
            : "opacity-100",
        )}
      >
        {iconBtn}
      </span>
    </span>
  );
}
