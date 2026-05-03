import type { ReactNode } from "react";
import { SubTabs } from "@/components/leaderboard/SubTabs";

export default function AccountLeaderboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4">
      <SubTabs
        tabs={[
          { href: "/leaderboard/account/holders", label: "Top Holders" },
          // "Most Active" hidden until /accounts/top?sort=tx_count ships on the indexer.
          // The page itself stays addressable — just not advertised in the tab strip.
        ]}
      />
      {children}
    </div>
  );
}
