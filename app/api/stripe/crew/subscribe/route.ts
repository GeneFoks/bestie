// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const PLATFORM_FEE_PERCENT = 10  // Bestie's cut

// Member subscribes to a crew. Monthly recurring Checkout; Stripe takes the
// platform fee and routes the rest to the captain's connected account.
export async function POST(req: NextRequest) {
  const bearer = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!bearer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: { user } } = await admin.auth.getUser(bearer)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { crewId } = await req.json()
  const { data: crew } = await admin
    .from('crews')
    .select('id, slug, name, captain_id, stripe_connect_id, connect_charges_enabled, sub_price, sub_active')
    .eq('id', crewId).single()

  if (!crew) return NextResponse.json({ error: 'Crew not found' }, { status: 404 })
  if (!crew.sub_active || !crew.sub_price || Number(crew.sub_price) <= 0)
    return NextResponse.json({ error: 'This crew has no active paid membership' }, { status: 400 })
  if (!crew.stripe_connect_id || !crew.connect_charges_enabled)
    return NextResponse.json({ error: 'The captain has not finished payout setup' }, { status: 400 })
  if (crew.captain_id === user.id)
    return NextResponse.json({ error: 'You are the captain — you host it, not pay for it' }, { status: 400 })

  // Already subscribed?
  const { data: existing } = await admin.from('crew_subscriptions')
    .select('id, status').eq('crew_id', crewId).eq('user_id', user.id).maybeSingle()
  if (existing?.status === 'active') return NextResponse.json({ error: 'You are already a member' }, { status: 400 })

  const origin = req.headers.get('origin') || 'https://bestiehere.com'

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(Number(crew.sub_price) * 100),
          recurring: { interval: 'month' },
          product_data: { name: `${crew.name} — monthly membership` },
        },
        quantity: 1,
      }],
      subscription_data: {
        application_fee_percent: PLATFORM_FEE_PERCENT,
        transfer_data: { destination: crew.stripe_connect_id },
        metadata: { kind: 'crew_sub', crew_id: crewId, user_id: user.id },
      },
      customer_email: user.email || undefined,
      metadata: { kind: 'crew_sub', crew_id: crewId, user_id: user.id },
      success_url: `${origin}/crews/${crew.slug}?sub=1`,
      cancel_url: `${origin}/crews/${crew.slug}`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[crew/subscribe]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
