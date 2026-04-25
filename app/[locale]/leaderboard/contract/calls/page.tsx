import { Card, CardContent } from "@/components/ui/card";
import { FileCode } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";

// TODO(api): needs GET /contracts/stats?sort=calls — placeholder empty state until indexer ships.
export default function ContractByCalls() {
  return (
    <Card>
      <CardContent className="p-0">
        <EmptyState
          icon={FileCode}
          title="Top contracts by calls — coming soon"
          hint="Endpoint /contracts/stats?sort=calls pending on the Sentrix Chain API."
        />
      </CardContent>
    </Card>
  );
}
