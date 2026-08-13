// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/push'

/**
 * Cron-triggered event reminders (Netlify Scheduled Function → every 15 min).
 *
 * Covers three event types:
 *   • crew_events        — 24h before, to 'going' attendees
 *   • group_sessions     — 24h before, to participants
 *   • birthday_events    — 24h before, to 'going' guests
 * plus a post-event follow-up:
 *   • group_sessions     — ~2h after start: "How was it? Add a memory"
 *
 * Each recipient gets an in-app notification + web push + email (best effort).
 * Idempotency via event_reminders_sent(event_id, user_id, kind).
 *
 * Auth: x-cron-secret must match INTERNAL_API_SECRET.
 */

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function sendEmail(to: string, subject: string, title: string, body: string, ctaText: string, ctaUrl: string) {
  if (!process.env.RESEND_API_KEY || !to) return
  const html = `
    <div style="background:#09090F;padding:40px 24px;font-family:sans-serif;">
      <div style="max-width:520px;margin:0 auto;">
        <p style="font-size:22px;font-weight:700;color:#D4AF37;margin:0 0 28px;">BESTIE</p>
        <div style="background:#111120;border:1px solid rgba(212,175,55,0.2);border-radius:20px;padding:32px;">
          <h1 style="font-size:22px;color:#F0EAFF;margin:0 0 12px;">${title}</h1>
          <p style="font-size:15px;color:#A99ECC;line-height:1.7;margin:0 0 24px;">${body}</p>
          <a href="${ctaUrl}" style="display:inline-block;padding:12px 28px;border-radius:12px;background:#D4AF37;color:#09090F;font-weight:700;font-size:14px;text-decoration:none;">${ctaText}</a>
        </div>
        <p style="font-size:12px;color:#6B5EA8;margin:24px 0 0;text-align:center;">bestiehere.com · Real people. Real moments.</p>
      </div>
    </div>`
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'Bestie <noreply@bestiehere.com>', to, subject, html }),
    })
  } catch {}
}

// Deliver one reminder to one user across all channels; dedup-guarded by caller.
async function deliver(db, userId, eventId, kind, notifType, subject, title, body, ctaText, link) {
  const url = link.startsWith('http') ? link : `https://bestiehere.com${link}`
  await db.from('notifications').insert({ user_id: userId, type: notifType, title, body, link })
  try { await sendPushToUser(userId, { title, body, link }) } catch {}
  try {
    const { data } = await db.auth.admin.getUserById(userId)
    if (data?.user?.email) await sendEmail(data.user.email, subject, title, body, ctaText, url)
  } catch {}
  await db.from('event_reminders_sent').insert({ event_id: eventId, user_id: userId, kind })
}

async function unremindedUsers(db, eventId, kind, userIds) {
  if (!userIds.length) return []
  const { data } = await db.from('event_reminders_sent')
    .select('user_id').eq('event_id', eventId).eq('kind', kind)
  const done = new Set((data || []).map(r => r.user_id))
  return userIds.filter(id => !done.has(id))
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const db = admin()
  const now = Date.now()
  const in23h = new Date(now + 23 * 3600e3).toISOString()
  const in25h = new Date(now + 25 * 3600e3).toISOString()
  // Follow-up window: started 2–4h ago
  const ago4h = new Date(now - 4 * 3600e3).toISOString()
  const ago2h = new Date(now - 2 * 3600e3).toISOString()

  let sent = 0
  const fmt = (d) => new Date(d).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  // ── 1. Crew events — 24h ──
  const { data: crewEvents } = await db.from('crew_events')
    .select('id, title, datetime, location, crew:crews(name), attendees:crew_event_attendees(user_id, status)')
    .gte('datetime', in23h).lte('datetime', in25h)
  for (const e of crewEvents || []) {
    const going = (e.attendees || []).filter(a => (a.status || 'going') === 'going').map(a => a.user_id)
    for (const uid of await unremindedUsers(db, e.id, '24h', going)) {
      await deliver(db, uid, e.id, '24h', 'event_reminder',
        `${e.title} — tomorrow`, `${e.title} is tomorrow 🎉`,
        `${e.crew?.name || 'Your crew'} · ${fmt(e.datetime)}${e.location ? ` · ${e.location}` : ''}`,
        'View event →', `/events/${e.id}`)
      sent++
    }
  }

  // ── 2. Group sessions — 24h ──
  const { data: sessions } = await db.from('group_sessions')
    .select('id, title, scheduled_at, location, status, participants:group_session_participants(user_id)')
    .in('status', ['open', 'full']).gte('scheduled_at', in23h).lte('scheduled_at', in25h)
  for (const s of sessions || []) {
    const ids = (s.participants || []).map(p => p.user_id)
    for (const uid of await unremindedUsers(db, s.id, '24h', ids)) {
      await deliver(db, uid, s.id, '24h', 'event_reminder',
        `${s.title} — tomorrow`, `${s.title} is tomorrow 🎉`,
        `${fmt(s.scheduled_at)}${s.location ? ` · ${s.location}` : ''}`,
        'View event →', `/group-sessions/${s.id}`)
      sent++
    }
  }

  // ── 3. Birthdays — 24h ──
  const { data: bdays } = await db.from('birthday_events')
    .select('id, celebrant, title, event_date, location, share_slug, guests:birthday_guests(user_id, status)')
    .gte('event_date', in23h).lte('event_date', in25h)
  for (const b of bdays || []) {
    const going = (b.guests || []).filter(g => g.status === 'going').map(g => g.user_id)
    const name = b.title || `${b.celebrant}'s Birthday`
    for (const uid of await unremindedUsers(db, b.id, '24h', going)) {
      await deliver(db, uid, b.id, '24h', 'event_reminder',
        `${name} — tomorrow 🎂`, `${name} is tomorrow 🎂`,
        `${fmt(b.event_date)}${b.location ? ` · ${b.location}` : ''}`,
        'Open the invite →', `/birthday/${b.share_slug}`)
      sent++
    }
  }

  // ── 4. Group sessions — post-event follow-up (2–4h after start) ──
  const { data: doneSessions } = await db.from('group_sessions')
    .select('id, title, host_id, participants:group_session_participants(user_id)')
    .gte('scheduled_at', ago4h).lte('scheduled_at', ago2h)
  for (const s of doneSessions || []) {
    const ids = [s.host_id, ...(s.participants || []).map(p => p.user_id)].filter(Boolean)
    const uniq = [...new Set(ids)]
    for (const uid of await unremindedUsers(db, s.id, 'followup', uniq)) {
      await deliver(db, uid, s.id, 'followup', 'event_followup',
        `How was ${s.title}?`, `How was ${s.title}? ✨`,
        `Add a photo, give Sparks to the people you met, and grow your streak.`,
        'Share a memory →', `/group-sessions/${s.id}`)
      sent++
    }
  }

  // ── 5. Top up recurring series (keep ~12 future occurrences) ──
  let created = 0
  const { data: seriesHeads } = await db.from('group_sessions')
    .select('series_id, recurrence')
    .not('series_id', 'is', null).neq('recurrence', 'none')
  const seenSeries = new Set()
  for (const s of seriesHeads || []) {
    if (seenSeries.has(s.series_id)) continue
    seenSeries.add(s.series_id)
    // Count future occurrences; if fewer than 6, extend from the latest one.
    const { data: future } = await db.from('group_sessions')
      .select('id, title, activity_type, description, location, max_participants, ticket_price, cover_image_url, host_id, scheduled_at, recurrence')
      .eq('series_id', s.series_id).gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: false })
    if (!future || future.length >= 6) continue
    const tmpl = future[0]
    const stepDays = tmpl.recurrence === 'weekly' ? 7 : tmpl.recurrence === 'biweekly' ? 14 : 0
    const rows = []
    for (let i = 1; i <= 12 - future.length; i++) {
      const d = new Date(tmpl.scheduled_at)
      if (tmpl.recurrence === 'monthly') d.setMonth(d.getMonth() + i)
      else d.setDate(d.getDate() + i * stepDays)
      rows.push({
        host_id: tmpl.host_id, title: tmpl.title, activity_type: tmpl.activity_type,
        description: tmpl.description, location: tmpl.location, max_participants: tmpl.max_participants,
        ticket_price: tmpl.ticket_price, cover_image_url: tmpl.cover_image_url,
        recurrence: tmpl.recurrence, series_id: s.series_id, scheduled_at: d.toISOString(),
      })
    }
    if (rows.length) { await db.from('group_sessions').insert(rows); created += rows.length }
  }

  // ── 6. Paid crews: kick non-subscribers from Telegram after the grace date ──
  let kicked = 0
  const nowIso = new Date().toISOString()
  const { data: dueCrews } = await db.from('crews')
    .select('id, captain_id, telegram_chat_id')
    .eq('sub_active', true)
    .not('telegram_chat_id', 'is', null)
    .not('sub_grace_until', 'is', null)
    .lte('sub_grace_until', nowIso)

  const TG = process.env.TELEGRAM_BOT_TOKEN
  for (const c of dueCrews || []) {
    if (!TG) break
    const { data: tgMembers } = await db.from('crew_telegram_members')
      .select('user_id, telegram_user_id').eq('crew_id', c.id)
    for (const m of tgMembers || []) {
      if (m.user_id === c.captain_id) continue
      const { data: sub } = await db.from('crew_subscriptions')
        .select('status').eq('crew_id', c.id).eq('user_id', m.user_id).maybeSingle()
      if (sub?.status === 'active') continue
      try {
        // Kick without permanent ban: ban then immediately unban.
        await fetch(`https://api.telegram.org/bot${TG}/banChatMember`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: c.telegram_chat_id, user_id: m.telegram_user_id }),
        })
        await fetch(`https://api.telegram.org/bot${TG}/unbanChatMember`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: c.telegram_chat_id, user_id: m.telegram_user_id, only_if_banned: true }),
        })
        await db.from('crew_telegram_members').delete().eq('crew_id', c.id).eq('user_id', m.user_id)
        kicked++
      } catch {}
    }
  }

  return NextResponse.json({ sent, created, kicked })
}

// Manual trigger for debugging: /api/reminders/events?s=SECRET
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('s')
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const forged = new NextRequest(req.url, {
    headers: { 'x-cron-secret': process.env.INTERNAL_API_SECRET! }, method: 'POST',
  })
  return POST(forged)
}
