import { Card, CardContent } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";

export default function MostActivePage() {
  return (
    <Card>
      <CardContent className="p-0">
        {/* TODO(api): needs GET /accounts/top?sort=tx_count — placeholder */}
        <EmptyState
          icon={Activity}
          title="Most active accounts — coming soon"
          hint="Endpoint /accounts/top?sort=tx_count pending on the Sentrix Chain API."
        />
      </CardContent>
    </Card>
  );
}
