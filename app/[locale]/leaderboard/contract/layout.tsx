import type { ReactNode } from "react";
import { SubTabs } from "@/components/leaderboard/SubTabs";

export default function ContractLeaderboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4">
      <SubTabs
        tabs={[
          { href: "/leaderboard/contract/calls", label: "Top by Calls" },
          { href: "/leaderboard/contract/gas",   label: "Top by Gas Used" },
        ]}
      />
      {children}
    </div>
  );
}
