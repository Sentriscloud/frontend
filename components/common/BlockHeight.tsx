import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

interface BlockHeightProps {
  height: number;
  link?: boolean;
  format?: boolean;
  prefix?: string;
  className?: string;
  muted?: boolean;
}

export function BlockHeight({
  height,
  link = true,
  format = true,
  prefix = "",
  className,
  muted = false,
}: BlockHeightProps) {
  const display = `${prefix}${format ? height.toLocaleString() : String(height)}`;

  const classes = cn(
    "font-mono font-medium hover:underline",
    muted ? "text-muted-foreground hover:text-primary" : "text-primary",
    className,
  );

  if (!link) {
    return (
      <span className={cn("font-mono font-medium", muted && "text-muted-foreground", className)}>
        {display}
      </span>
    );
  }

  return (
    <Link href={`/blocks/${height}`} prefetch={false} className={classes}>
      {display}
    </Link>
  );
}
