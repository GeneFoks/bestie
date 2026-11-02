// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'
import {
  getStripe, syncSubscription, loadRow, memberStatus, isBannedByAdmin, botUsername,
  isActiveStatus, GROUP_URL, TOWER_KIND,
} from '@/lib/tower'

// POST { session_id } — called by /tower/success right after Stripe Checkout.
// Reconciles the subscription immediately (doesn't wait for the webhook).
// No invite links: if there was no join request to approve, the person applies
// via GROUP_URL and the bot approves their own active subscription instantly.
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'tower-success', { limit: 30, windowMs: 60000 })
  if (limited) return limited

  let body
  try { body = await req.json() } catch { body = null }
  const sessionId = body?.session_id
  if (typeof sessionId !== 'string' || sessionId.length > 300 || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    return NextResponse.json({ error: 'Неверная ссылка' }, { status: 400 })
  }

  let session
  try {
    session = await getStripe().checkout.sessions.retrieve(sessionId, { expand: ['subscription'] })
  } catch (e) {
    console.error('[tower/success] retrieve:', e?.message)
    return NextResponse.json({ error: 'Платёж не найден' }, { status: 404 })
  }
  const md = session?.metadata || {}
  if (md.kind !== TOWER_KIND) return NextResponse.json({ error: 'Платёж не найден' }, { status: 404 })
  if (session.status !== 'complete') return NextResponse.json({ status: 'incomplete' })

  const chatId = Number(md.chat_id)
  const userId = Number(md.telegram_user_id)
  const sub = session.subscription && typeof session.subscription === 'object' ? session.subscription : null

  if (sub) {
    try {
      await syncSubscription(sub)
    } catch (e) {
      console.error('[tower/success] sync:', e?.message)
    }
  }

  let row = null
  try { row = await loadRow(chatId, userId) } catch {}
  const status = row?.status || sub?.status || 'incomplete'
  const plan = row?.plan || md.plan || 'basic'

  let approved = false
  let need_request = false
  let banned = false
  if (isActiveStatus(status)) {
    const m = await memberStatus(chatId, userId)
    approved = m.ok && m.isMember
    banned = isBannedByAdmin(m)
    need_request = m.ok && !m.isMember && !banned
  }

  const bot = await botUsername()
  return NextResponse.json({
    status,
    plan,
    paid_until: row?.paid_until || null,
    approved,
    need_request,
    banned,
    group_url: GROUP_URL,
    bot_url: `https://t.me/${bot}`,
    manage_url: `https://t.me/${bot}?start=manage`,
  })
}
