// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getDb, getStripe, syncSubscription, safeEqual, GRACE_DAYS } from '@/lib/tower'

/**
 * Daily safety net for the «Вышки в США» paid group
 * (Netlify Scheduled Function tower-sweep → here).
 *
 * Picks rows that may need action — paid period ended more than GRACE_DAYS ago
 * (or unknown), Stripe already says ended (e.g. canceled mid-period after a
 * failed kick), or past_due — re-reads the subscription from Stripe and runs
 * the same reconcile as the webhook. Catches missed webhooks for renewals,
 * cancellations and failed kicks. Rows without a stripe_subscription_id are
 * never touched.
 *
 * Oldest-updated first: syncSubscription bumps updated_at (and so does an
 * error below), so rows that stay candidates rotate to the back and never
 * starve newer ones.
 *
 * Auth: x-cron-secret must match INTERNAL_API_SECRET.
 */
export const dynamic = 'force-dynamic'

const TERMINAL = 'canceled,incomplete_expired,unpaid,paused'
const MAX_ROWS = 200
const TIME_BUDGET_MS = 8000
const CONCURRENCY = 4

export async function POST(req: NextRequest) {
  const secret = process.env.INTERNAL_API_SECRET
  if (!secret || !safeEqual(req.headers.get('x-cron-secret') || '', secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const started = Date.now()
  const cutoff = new Date(started - GRACE_DAYS * 86400000).toISOString()
  const db = getDb()

  // The two .or() groups are ANDed by PostgREST.
  const { data, error } = await db
    .from('tg_subscriptions')
    .select('id, stripe_subscription_id')
    .is('removed_at', null)
    .not('stripe_subscription_id', 'is', null)
    // due: period over / unknown, already ended in Stripe, or past_due (checked daily)
    .or(`paid_until.is.null,paid_until.lt."${cutoff}",status.in.(${TERMINAL}),status.eq.past_due`)
    // done: ended subscription of someone who was a member before paying, nothing
    // left to demote → final, never re-checked
    .or(`was_member_before.eq.false,promoted_at.not.is.null,status.not.in.(${TERMINAL})`)
    .order('updated_at', { ascending: true })
    .limit(MAX_ROWS)
  if (error) {
    console.error('[tower/sweep] query:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const todo = data || []
  const counts = { candidates: todo.length, synced: 0, removed: 0, approved: 0, stale: 0, errors: 0, skipped_time: 0 }
  const s = getStripe()

  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    if (Date.now() - started > TIME_BUDGET_MS) {
      counts.skipped_time = todo.length - i
      break
    }
    await Promise.all(todo.slice(i, i + CONCURRENCY).map(async (r) => {
      try {
        const sub = await s.subscriptions.retrieve(r.stripe_subscription_id)
        const res = await syncSubscription(sub)
        counts.synced += 1
        if (res?.stale) counts.stale += 1
        if (res?.actions?.includes('removed')) counts.removed += 1
        if (res?.actions?.includes('approved')) counts.approved += 1
      } catch (e) {
        counts.errors += 1
        console.error('[tower/sweep] row', r.id, e?.message || e)
        // Rotate to the back so a permanently failing row can't block the rest.
        try {
          await db.from('tg_subscriptions').update({ updated_at: new Date().toISOString() }).eq('id', r.id)
        } catch {}
      }
    }))
  }

  console.log('[tower/sweep]', JSON.stringify(counts))
  return NextResponse.json({ ok: true, ...counts, ran_at: new Date().toISOString() })
}
