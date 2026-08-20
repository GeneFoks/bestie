// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Start (or resume) Stripe Connect onboarding for a crew captain.
// Creates an Express connected account the first time, then returns a hosted
// onboarding link. On return, /api/stripe/connect/refresh syncs the status.
export async function POST(req: NextRequest) {
  const bearer = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!bearer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: { user } } = await admin.auth.getUser(bearer)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { crewId, scope } = await req.json()
  const origin = req.headers.get('origin') || 'https://bestiehere.com'

  // ── Host payouts (per user) — used by paid group sessions ───────────────
  // No crew; the connected account lives on users.stripe_connect_id and is
  // reused across every session the host prices.
  if (scope === 'user') {
    const { data: me } = await admin.from('users').select('id, stripe_connect_id').eq('id', user.id).single()
    let uAccountId = me?.stripe_connect_id
    try {
      if (!uAccountId) {
        const account = await stripe.accounts.create({
          type: 'express',
          email: user.email || undefined,
          capabilities: { transfers: { requested: true }, card_payments: { requested: true } },
          business_type: 'individual',
          metadata: { host_id: user.id },
        })
        uAccountId = account.id
        await admin.from('users').update({ stripe_connect_id: uAccountId }).eq('id', user.id)
      }
      const link = await stripe.accountLinks.create({
        account: uAccountId,
        refresh_url: `${origin}/group-sessions/new?connect=refresh`,
        return_url: `${origin}/group-sessions/new?connect=done`,
        type: 'account_onboarding',
      })
      return NextResponse.json({ url: link.url })
    } catch (err: any) {
      console.error('[connect/onboard user]', err.message)
      if (/platform profile|complete your platform/i.test(err.message || '')) {
        return NextResponse.json({ error: 'Paid sessions aren\'t live yet — Bestie is finishing payment setup. Please try again soon.' }, { status: 503 })
      }
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
  }

  if (!crewId) return NextResponse.json({ error: 'crewId required' }, { status: 400 })

  const { data: crew } = await admin.from('crews').select('id, slug, captain_id, stripe_connect_id').eq('id', crewId).single()
  if (!crew) return NextResponse.json({ error: 'Crew not found' }, { status: 404 })
  if (crew.captain_id !== user.id) return NextResponse.json({ error: 'Only the captain can set up payouts' }, { status: 403 })

  let accountId = crew.stripe_connect_id
  try {
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email || undefined,
        capabilities: { transfers: { requested: true }, card_payments: { requested: true } },
        business_type: 'individual',
        metadata: { crew_id: crewId, captain_id: user.id },
      })
      accountId = account.id
      await admin.from('crews').update({ stripe_connect_id: accountId }).eq('id', crewId)
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/crews/${crew.slug}?connect=refresh`,
      return_url: `${origin}/crews/${crew.slug}?connect=done`,
      type: 'account_onboarding',
    })
    return NextResponse.json({ url: link.url })
  } catch (err: any) {
    console.error('[connect/onboard]', err.message)
    // Platform not activated yet → friendly message instead of raw Stripe text
    if (/platform profile|complete your platform/i.test(err.message || '')) {
      return NextResponse.json({ error: 'Paid memberships aren\'t live yet — Bestie is finishing payment setup. Please try again soon.' }, { status: 503 })
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
