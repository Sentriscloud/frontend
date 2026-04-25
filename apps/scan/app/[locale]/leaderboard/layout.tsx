import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Trophy } from "lucide-react";
import { CategoryNav } from "@/components/leaderboard/CategoryNav";
import { PageHeader } from "@/components/common/PageHeader";

export const metadata: Metadata = {
  title: "Leaderboard",
  description:
    "Rankings across Sentrix Chain — accounts, tokens, validators, contracts, and whale activity.",
};

export default function LeaderboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      <PageHeader icon={Trophy} eyebrow="Rankings" title="Leaderboard" />

      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6 mt-6">
        {/* Sidebar (lg+) */}
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <CategoryNav />
          </div>
        </aside>

        {/* Mobile: horizontal category scroller */}
        <div className="lg:hidden overflow-x-auto -mx-4 px-4 pb-2">
          <CategoryNav />
        </div>

        <div className="min-w-0 space-y-4">{children}</div>
      </div>
    </div>
  );
}
