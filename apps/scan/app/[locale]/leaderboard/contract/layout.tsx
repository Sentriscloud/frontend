import type { ReactNode } from "react";
import { SubTabs } from "@/components/leaderboard/SubTabs";

export default function ContractLeaderboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4">
      <SubTabs
        tabs={[
          { href: "/leaderboard/contract/recent",   label: "Recently Deployed" },
          { href: "/leaderboard/contract/pioneers", label: "Pioneers" },
        ]}
      />
      {children}
    </div>
  );
}
