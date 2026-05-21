import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/push'

/**
 * Cron-triggered reminders for upcoming crew events.
 *
 * Runs on a schedule (Netlify Scheduled Function → every 15 minutes is a
 * sensible cadence). Finds events starting in ~24 hours and pushes a
 * notification to every 'going' attendee who hasn't been notified yet.
 *
 * Auth: caller must supply x-cron-secret matching INTERNAL_API_SECRET so
 * this isn't open to the public internet.
 *
 * Idempotency: tracked via event_reminders_sent(event_id, user_id, kind).
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Window: events starting between [now + 23h, now + 25h]. 2-hour window
  // means a 15-minute cron has ~8 chances to catch each event, and the
  // dedup table prevents double-sends.
  const now = Date.now()
  const winStart = new Date(now + 23 * 60 * 60 * 1000).toISOString()
  const winEnd   = new Date(now + 25 * 60 * 60 * 1000).toISOString()

  const { data: events, error: eErr } = await supabase
    .from('crew_events')
    .select(`
      id, title, datetime, location,
      crew:crews(name, slug),
      attendees:crew_event_attendees(user_id, status)
    `)
    .gte('datetime', winStart)
    .lte('datetime', winEnd)

  if (eErr) return NextResponse.json({ error: eErr.message }, { status: 500 })
  if (!events?.length) return NextResponse.json({ sent: 0, message: 'No events in 24h window' })

  let sentCount = 0
  let skippedCount = 0
  const errors: string[] = []

  for (const event of events) {
    const goingUserIds = (event.attendees || [])
      .filter((a: any) => (a.status || 'going') === 'going')
      .map((a: any) => a.user_id)

    if (goingUserIds.length === 0) continue

    // Filter out anyone who's already been reminded for this event
    const { data: alreadySent } = await supabase
      .from('event_reminders_sent')
      .select('user_id')
      .eq('event_id', event.id)
      .eq('kind', '24h')

    const alreadySentSet = new Set((alreadySent || []).map((r: any) => r.user_id))
    const toRemind = goingUserIds.filter((id: string) => !alreadySentSet.has(id))
    if (toRemind.length === 0) { skippedCount += goingUserIds.length; continue }

    const when = new Date(event.datetime).toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
    const title = `${event.title} — tomorrow`
    const body = `${event.crew?.name} · ${when}${event.location ? ` · ${event.location}` : ''}`
    const link = `/events/${event.id}`

    for (const userId of toRemind) {
      try {
        // In-app notification
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'booking_request', // reuse closest existing type for the bell — adds a calendar icon
          title,
          body,
          link,
        })
        // Push
        await sendPushToUser(userId, { title, body, link })
        // Mark sent (dedup)
        await supabase.from('event_reminders_sent').insert({
          event_id: event.id,
          user_id: userId,
          kind: '24h',
        })
        sentCount++
      } catch (e: any) {
        errors.push(`event=${event.id} user=${userId} ${e?.message || 'unknown'}`)
      }
    }
  }

  return NextResponse.json({
    sent: sentCount,
    skipped: skippedCount,
    events_checked: events.length,
    errors: errors.length ? errors : undefined,
  })
}

// Allow GET for manual debugging in browser (still gated by secret via query)
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('s')
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  // Reuse POST handler — call it with a forged request that has the right header
  const forged = new NextRequest(req.url, {
    headers: { 'x-cron-secret': process.env.INTERNAL_API_SECRET! },
    method: 'POST',
  })
  return POST(forged)
}
