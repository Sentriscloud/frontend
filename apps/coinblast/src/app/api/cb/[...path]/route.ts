// Server-side relay to the Sentrix indexer (`@sentriscloud/indexer-api`).
//
// Same-origin proxy so the browser never sees the indexer host directly
// (no CORS dance, no leaked internal port). GET → /coinblast/* read
// endpoints. POST → /coinblast/* write endpoints (e.g. /metadata, which
// is sig-gated to the curve owner on the indexer side).
//
// Pattern: <METHOD> /api/cb/<anything> → <INDEXER_BASE>/coinblast/<anything>
//
// Operator-side override via INDEXER_API_URL env. Mainnet currently
// proxies to vps6's externally-bound 8081 (per session-off v36 indexer
// relocation); the local-default keeps dev / single-host setups working.

import { NextRequest, NextResponse } from "next/server";

const INDEXER_BASE =
  process.env.INDEXER_API_URL ?? "http://127.0.0.1:8081";

async function proxy(
  req: NextRequest,
  path: string[],
): Promise<NextResponse> {
  const subpath = (path ?? []).join("/");
  const qs = req.nextUrl.search;
  const upstream = `${INDEXER_BASE}/coinblast/${subpath}${qs}`;

  const init: RequestInit = {
    method: req.method,
    cache: "no-store",
  };

  // Only forward a body on methods that have one. fetch with method=GET
  // and a body throws.
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
    init.headers = {
      "Content-Type":
        req.headers.get("Content-Type") ?? "application/json",
    };
  }

  try {
    const res = await fetch(upstream, init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `indexer ${res.status}`, detail: detail.slice(0, 500) },
        { status: res.status === 404 ? 404 : 502 },
      );
    }
    const body = await res.json();
    return NextResponse.json(body, {
      headers:
        req.method === "GET"
          ? { "Cache-Control": "public, max-age=2, s-maxage=2" }
          : undefined,
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxy(req, (await params).path);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxy(req, (await params).path);
}
