"use client";

import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { detectSearchType } from "@/lib/format";
import { Suspense } from "react";

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const type = detectSearchType(query);

  if (type === "block") {
    return (
      <div className="text-center space-y-4">
        <p className="text-muted-foreground">Redirecting to block #{query}...</p>
        <Link href={`/blocks/${query}`} className="text-primary hover:underline">
          View Block #{query}
        </Link>
      </div>
    );
  }

  if (type === "tx") {
    return (
      <div className="text-center space-y-4">
        <p className="text-muted-foreground">Redirecting to transaction...</p>
        <Link href={`/tx/${query}`} className="text-primary hover:underline">
          View Transaction
        </Link>
      </div>
    );
  }

  if (type === "address") {
    return (
      <div className="text-center space-y-4">
        <p className="text-muted-foreground">Redirecting to address...</p>
        <Link href={`/address/${query}`} className="text-primary hover:underline">
          View Address
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center space-y-4">
      <Search className="h-12 w-12 text-muted-foreground mx-auto" />
      <p className="text-muted-foreground">
        No results found for &quot;{query}&quot;
      </p>
      <p className="text-xs text-muted-foreground">
        Try searching by block height (number), transaction hash (0x + 64 hex), or address (0x + 40 hex)
      </p>
      <Link href="/" className="text-primary hover:underline text-sm inline-block">
        Back to home
      </Link>
    </div>
  );
}

export default function SearchPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Card>
        <CardContent className="p-8">
          <Suspense fallback={<p className="text-center text-muted-foreground">Loading...</p>}>
            <SearchContent />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
