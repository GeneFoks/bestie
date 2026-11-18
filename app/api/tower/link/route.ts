// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'
import {
  linkTelegramToBestie, unlinkBestieUser, linkStatusForBestieUser, bestieUserFromRequest,
} from '@/lib/tower-access'
import { reputationForBestieUser } from '@/lib/tower-app'

// Telegram («Вышки в США», @TowerCrewBot) ↔ the logged-in Bestie account.
// Auth: Authorization: Bearer <Supabase access token> — the user id always
// comes from the token, never from the body.
//   GET    → own link status + own reputation (incl. hidden)
//   POST   { t } → link (t = personal signed link from the bot, 30 min)
//   DELETE → unlink
// Never log the token.
export const dynamic = 'force-dynamic'

const AUTH_TEXT = 'Войдите в Бести, чтобы продолжить.'
const BAD_TEXT = 'Неверный запрос.'

const STATUS = {
  expired: 400, bad_request: 400, auth: 401, not_found: 404,
  conflict_tg: 409, conflict_user: 409, schema: 503, error: 500,
}

const json = (body, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
const out = (r) => json(r, r?.ok ? 200 : STATUS[r?.code] || 500)
const noAuth = () => json({ ok: false, code: 'auth', error: AUTH_TEXT }, 401)

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, 'tower-link-status', { limit: 60, windowMs: 60000 })
  if (limited) return limited
  const user = await bestieUserFromRequest(req)
  if (!user) return noAuth()
  const [st, reputation] = await Promise.all([
    linkStatusForBestieUser(user.id),
    reputationForBestieUser(user.id, { includeHidden: true }).catch(() => ({ show: false })),
  ])
  return out({ ...st, reputation })
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'tower-link', { limit: 20, windowMs: 60000 })
  if (limited) return limited
  const user = await bestieUserFromRequest(req)
  if (!user) return noAuth()
  let body
  try { body = await req.json() } catch { body = null }
  const t = typeof body?.t === 'string' ? body.t : ''
  if (!t) return json({ ok: false, code: 'bad_request', error: BAD_TEXT }, 400)
  return out(await linkTelegramToBestie(t, user.id))
}

export async function DELETE(req: NextRequest) {
  const limited = rateLimit(req, 'tower-link', { limit: 20, windowMs: 60000 })
  if (limited) return limited
  const user = await bestieUserFromRequest(req)
  if (!user) return noAuth()
  return out(await unlinkBestieUser(user.id))
}
