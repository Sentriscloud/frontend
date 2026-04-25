"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { Users, Coins, Shield, FileCode, Fish, GitCompare } from "lucide-react";
import { cn } from "@/lib/utils";

// DECISION: category list is static (not i18n'd for the labels here — keys translate, short
// category names stay English for technical clarity). Path matching is "startsWith" so every
// sub-page lights up the parent category.
const CATEGORIES = [
  { base: "/leaderboard/account",   label: "Account",   icon: Users,      color: "text-[var(--blue)]" },
  { base: "/leaderboard/token",     label: "Token",     icon: Coins,      color: "text-yellow-500" },
  { base: "/leaderboard/validator", label: "Validator", icon: Shield,     color: "text-purple-500" },
  { base: "/leaderboard/contract",  label: "Contract",  icon: FileCode,   color: "text-cyan-500" },
  { base: "/leaderboard/whale",     label: "Whale",     icon: Fish,       color: "text-green-500" },
  { base: "/leaderboard/compare",   label: "Compare",   icon: GitCompare, color: "text-pink-500" },
] as const;

export function CategoryNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-row lg:flex-col gap-1.5 lg:gap-0.5">
      {CATEGORIES.map(({ base, label, icon: Icon, color }) => {
        const active = pathname.startsWith(base);
        return (
          <Link
            key={base}
            href={base}
            prefetch={false}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors group shrink-0 lg:w-full",
              active
                ? "bg-accent text-foreground font-medium"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0", active ? color : "text-muted-foreground group-hover:text-foreground")} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export { CATEGORIES };
