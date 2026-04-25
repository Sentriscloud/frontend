import type { ReactNode } from "react";
import { SubTabs } from "@/components/leaderboard/SubTabs";

export default function TokenLeaderboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4">
      <SubTabs
        tabs={[
          { href: "/leaderboard/token/holders",   label: "Top by Holders" },
          { href: "/leaderboard/token/transfers", label: "Top by Transfers" },
          { href: "/leaderboard/token/supply",    label: "Top by Supply" },
        ]}
      />
      {children}
    </div>
  );
}
