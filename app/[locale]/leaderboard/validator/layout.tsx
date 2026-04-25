import type { ReactNode } from "react";
import { SubTabs } from "@/components/leaderboard/SubTabs";

export default function ValidatorLeaderboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4">
      <SubTabs
        tabs={[
          { href: "/leaderboard/validator/stake",  label: "Top by Stake" },
          { href: "/leaderboard/validator/uptime", label: "Top by Uptime" },
          { href: "/leaderboard/validator/blocks", label: "Top by Blocks" },
        ]}
      />
      {children}
    </div>
  );
}
