// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'
import { reputationForBestieUser } from '@/lib/tower-app'

// GET ?user=<Bestie user uuid> → the public «🗼 Вышки в США» block for that
// profile (only when the person linked Telegram and isn't hidden). Public
// fields only — never Telegram ids or usernames.
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const json = (body, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, 'tower-profile', { limit: 60, windowMs: 60000 })
  if (limited) return limited
  const user = req.nextUrl.searchParams.get('user') || ''
  if (!UUID_RE.test(user)) return json({ show: false })
  try {
    return json(await reputationForBestieUser(user))
  } catch {
    return json({ show: false })
  }
}
