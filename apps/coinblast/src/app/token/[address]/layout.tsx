import type { Metadata } from "next";
import { ipfsToGateway } from "@/lib/ipfs";

const INDEXER_BASE =
  process.env.INDEXER_API_URL ?? "http://127.0.0.1:8081";

interface TokenRow {
  symbol?: string;
  name?: string;
  image_url?: string | null;
  description?: string | null;
}

// Per-token title + share preview. Resolves the cb_tokens row by
// curve_address from the indexer (same call /token/[address]/page.tsx
// makes client-side via useIndexerTokenMeta) so the OG/Twitter unfurl
// renders the actual coin name + ticker instead of the static
// "CoinBlast — Launch Your Coin" root title.
//
// The `address` param here is the TOKEN address, not the curve. We
// don't have a token→curve resolver server-side, so we fall back to
// generic metadata if the indexer doesn't expose token→token. Once
// the indexer adds a /tokens-by-token-address endpoint we can wire
// this up properly. For now: best-effort scan of the small token list.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ address: string }>;
}): Promise<Metadata> {
  const { address } = await params;
  try {
    const res = await fetch(`${INDEXER_BASE}/coinblast/tokens?limit=100`, {
      cache: "no-store",
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = (await res.json()) as { tokens?: Array<TokenRow & { token_address?: string }> };
      const row = (data.tokens ?? []).find(
        (t) => t.token_address?.toLowerCase() === address.toLowerCase(),
      );
      if (row?.symbol && row?.name) {
        const title = `${row.name} (${row.symbol}) — CoinBlast`;
        const description =
          row.description?.trim() ||
          `Trade ${row.symbol} on CoinBlast — fair-launch bonding curve on Sentrix Chain.`;
        // Route through the shared resolver so OG images honour
        // NEXT_PUBLIC_IPFS_GATEWAY (e.g. when we move off shared
        // gateway.pinata.cloud to a custom-subdomain Pinata gateway).
        // Pre-fix this hardcoded the public Pinata gateway, ignoring
        // the env override the rest of the app already respects.
        const ogImage = row.image_url ? ipfsToGateway(row.image_url) || undefined : undefined;
        return {
          title,
          description,
          openGraph: {
            title,
            description,
            ...(ogImage ? { images: [{ url: ogImage }] } : {}),
          },
          twitter: {
            card: ogImage ? "summary_large_image" : "summary",
            title,
            description,
            ...(ogImage ? { images: [ogImage] } : {}),
          },
        };
      }
    }
  } catch {
    /* indexer unreachable — fall through to generic */
  }
  return {
    title: "CoinBlast — Launch Your Coin",
    description:
      "Launch your coin in seconds on Sentrix Chain. Fair for everyone.",
  };
}

export default function TokenLayout({ children }: { children: React.ReactNode }) {
  return children;
}
