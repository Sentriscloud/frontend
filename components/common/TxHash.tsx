"use client";

import { Link } from "@/i18n/navigation";
import { Copyable } from "./Copyable";
import { shortenHash } from "@/lib/format";
import { cn } from "@/lib/utils";

interface TxHashProps {
  hash: string;
  truncate?: boolean;
  truncateChars?: number;
  link?: boolean;
  showCopy?: boolean;
  className?: string;
  muted?: boolean;
}

export function TxHash({
  hash,
  truncate = true,
  truncateChars = 8,
  link = true,
  showCopy = true,
  className,
  muted = false,
}: TxHashProps) {
  const display = truncate ? shortenHash(hash, truncateChars) : hash;

  const linkClasses = cn(
    "font-mono text-sm hover:underline",
    muted ? "text-muted-foreground hover:text-primary" : "text-primary",
    className,
  );

  const content = link ? (
    <Link href={`/tx/${hash}`} prefetch={false} title={hash} className={linkClasses}>
      {display}
    </Link>
  ) : (
    <span title={hash} className={cn("font-mono text-sm", muted && "text-muted-foreground", className)}>
      {display}
    </span>
  );

  if (!showCopy) return content;

  return (
    <span className="inline-flex items-center gap-1 min-w-0">
      {content}
      <Copyable text={hash} bare />
    </span>
  );
}
