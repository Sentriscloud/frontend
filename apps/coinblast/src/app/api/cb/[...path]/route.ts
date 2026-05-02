// Server-side relay to the Sentrix indexer (`@sentriscloud/indexer-api`).
//
// The indexer container binds 127.0.0.1:8081 only — Caddy doesn't yet
// expose a public subdomain for it, so the browser can't fetch directly.
// Next.js running on the same host (`coinblast.sentriscloud.com` →
// 127.0.0.1:3006 per the Caddy snapshot) CAN reach localhost, so we
// proxy through here. Same-origin from the browser's POV → no CORS
// dance, no leaked internal port number in client code.
//
// Pattern: GET /api/cb/<anything> → http://127.0.0.1:8081/coinblast/<anything>
//
// Operator-side override via INDEXER_API_URL env if the indexer ever
// moves off localhost (or we add a wireguard-internal subdomain later).

import { NextRequest, NextResponse } from "next/server";

const INDEXER_BASE =
  process.env.INDEXER_API_URL ?? "http://127.0.0.1:8081";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const subpath = (path ?? []).join("/");
  const qs = req.nextUrl.search;
  const upstream = `${INDEXER_BASE}/coinblast/${subpath}${qs}`;

  try {
    const res = await fetch(upstream, {
      // Don't cache here — most callers want live data. Pages that DO
      // want caching can wrap with React `cache()` or set their own
      // SWR `dedupingInterval`. Default-stale would surprise the live
      // feed and the buy/sell widget.
      cache: "no-store",
      // Tag for future invalidate on graduation event etc.
      next: { tags: ["coinblast-indexer"] },
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `indexer ${res.status}`, detail: detail.slice(0, 500) },
        { status: res.status === 404 ? 404 : 502 },
      );
    }

    const body = await res.json();
    return NextResponse.json(body, {
      // Cheap CDN-friendly hint for any future Caddy / Cloudflare layer.
      // Live feed callers override via cache:'no-store' on the fetch.
      headers: { "Cache-Control": "public, max-age=2, s-maxage=2" },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "indexer unreachable",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 503 },
    );
  }
}
