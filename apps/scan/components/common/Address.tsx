"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useRef } from "react";
import { Copyable } from "./Copyable";
import { shortenAddress } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAddressLabel, toneForKind } from "@/lib/labels";

interface AddressProps {
  address: string;
  truncate?: boolean;
  link?: boolean;
  showCopy?: boolean;
  className?: string;
  /** Explicit label override (takes priority over the global registry). */
  label?: string;
  /** Make text muted (for secondary contexts like table cells) */
  muted?: boolean;
  /** Hide the inline label tag even if the registry has one (e.g., detail page headers). */
  hideTag?: boolean;
}

// DECISION: hover highlight uses data-address + DOM query pattern (Solana Explorer inspired)
// Attaches listeners on mount, toggles class via querySelectorAll on hover.
export function Address({
  address,
  truncate = true,
  link = true,
  showCopy = true,
  className,
  label,
  muted = false,
  hideTag = false,
}: AddressProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const registryLabel = useAddressLabel(address);
  const display = label ?? (truncate ? shortenAddress(address) : address);
  const tag = !hideTag && !label && registryLabel ? registryLabel : null;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function onEnter() {
      document
        .querySelectorAll(`[data-address="${address}"]`)
        .forEach((n) => n.classList.add("address-highlight"));
    }
    function onLeave() {
      document
        .querySelectorAll(`[data-address="${address}"]`)
        .forEach((n) => n.classList.remove("address-highlight"));
    }

    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [address]);

  const linkClasses = cn(
    "font-mono text-sm hover:underline rounded px-0.5 -mx-0.5 transition-colors",
    muted ? "text-muted-foreground hover:text-primary" : "text-primary",
    className,
  );

  const content = link ? (
    <Link
      ref={ref as never}
      href={`/address/${address}`}
      prefetch={false}
      data-address={address}
      title={address}
      className={linkClasses}
    >
      {display}
    </Link>
  ) : (
    <span
      ref={ref}
      data-address={address}
      title={address}
      className={cn("font-mono text-sm", muted && "text-muted-foreground", className)}
    >
      {display}
    </span>
  );

  const tagNode = tag ? (
    (() => {
      const tone = toneForKind(tag.kind);
      return (
        <span
          className={cn(
            "inline-flex items-center text-[10px] font-mono uppercase tracking-[.1em] rounded-md px-1.5 py-0.5 border",
            tone.bg,
            tone.fg,
            tone.border,
          )}
          title={`${tag.kind}: ${tag.name}`}
        >
          {tag.name}
        </span>
      );
    })()
  ) : null;

  if (!showCopy && !tagNode) return content;

  return (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      {content}
      {tagNode}
      {showCopy && <Copyable text={address} bare />}
    </span>
  );
}
