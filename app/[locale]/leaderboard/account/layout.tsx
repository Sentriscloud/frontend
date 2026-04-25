import type { ReactNode } from "react";
import { SubTabs } from "@/components/leaderboard/SubTabs";

export default function AccountLeaderboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4">
      <SubTabs
        tabs={[
          { href: "/leaderboard/account/holders", label: "Top Holders" },
          { href: "/leaderboard/account/active",  label: "Most Active" },
        ]}
      />
      {children}
    </div>
  );
}
