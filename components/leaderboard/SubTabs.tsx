"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export interface SubTab {
  href: string;
  label: string;
}

export function SubTabs({ tabs }: { tabs: SubTab[] }) {
  const pathname = usePathname();
  return (
    <div className="inline-flex items-center gap-1 bg-muted/40 border border-border rounded-lg p-1">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            prefetch={false}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
