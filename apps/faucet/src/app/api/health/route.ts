import { NextResponse } from 'next/server'

// Minimal liveness endpoint for uptime monitors. Returns 200 if the
// Next process is running; that's intentionally all this does — it
// doesn't probe the Sentrix node or rate-limit store, because those
// depend on networks that may be down without faucet itself being
// broken (in that case `GET /api/faucet?network=…` will surface
// the chain status to operators).
export function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'sentrix-faucet',
    timestamp: new Date().toISOString(),
  })
}
