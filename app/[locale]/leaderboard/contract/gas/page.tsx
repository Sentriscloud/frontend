import { Card, CardContent } from "@/components/ui/card";
import { Flame } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";

// TODO(api): needs GET /contracts/stats?sort=gas_used — placeholder empty state.
export default function ContractByGas() {
  return (
    <Card>
      <CardContent className="p-0">
        <EmptyState
          icon={Flame}
          title="Top contracts by gas used — coming soon"
          hint="Endpoint /contracts/stats?sort=gas_used pending on the Sentrix Chain API."
        />
      </CardContent>
    </Card>
  );
}
