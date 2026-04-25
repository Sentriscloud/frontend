import type { ReactNode } from "react";
import { SubTabs } from "@/components/leaderboard/SubTabs";

export default function WhaleLeaderboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4">
      <SubTabs
        tabs={[
          { href: "/leaderboard/whale/recent", label: "Recent Large Tx" },
          { href: "/leaderboard/whale/top",    label: "Top Whale Wallets" },
        ]}
      />
      {children}
    </div>
  );
}
