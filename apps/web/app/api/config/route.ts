import { NextResponse } from 'next/server'

// Next 16 already treats this handler as dynamic, so this is belt-and-braces:
// it pins the behaviour so a future Next version or config change cannot
// prerender the route and freeze whatever process.env held at `next build`
// time — which is the exact failure mode NEXT_PUBLIC_* had.
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    serverUrl: process.env.CONVKIT_SERVER_URL ?? 'http://localhost:4000',
    wsUrl: process.env.CONVKIT_WS_URL ?? 'ws://localhost:4000/ws'
  })
}
