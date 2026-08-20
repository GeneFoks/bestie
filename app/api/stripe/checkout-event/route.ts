// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Buy a ticket to a paid group session. One-time payment; the webhook
// (checkout.session.completed, kind=event_ticket) records the ticket and
// adds the buyer to the participant list.
export async function POST(req: NextRequest) {
  const bearer = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!bearer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await admin.auth.getUser(bearer)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId } = await req.json()
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  const { data: gs } = await admin
    .from('group_sessions')
    .select('id, title, ticket_price, status, max_participants, host_id, scheduled_at, participants:group_session_participants(count)')
    .eq('id', sessionId)
    .single()

  if (!gs) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  const price = Number(gs.ticket_price || 0)
  if (price <= 0) return NextResponse.json({ error: 'This event is free — just join' }, { status: 400 })
  if (gs.host_id === user.id) return NextResponse.json({ error: 'You are the host' }, { status: 400 })
  if (!['open'].includes(gs.status)) return NextResponse.json({ error: 'This event is not open' }, { status: 400 })
  if (new Date(gs.scheduled_at) < new Date()) return NextResponse.json({ error: 'This event already happened' }, { status: 400 })

  const joined = gs.participants?.[0]?.count || 0
  if (gs.max_participants && joined >= gs.max_participants) {
    return NextResponse.json({ error: 'Sold out — the event is full' }, { status: 400 })
  }

  // Already holds a ticket → don't charge twice
  const { data: existing } = await admin
    .from('event_tickets')
    .select('id')
    .eq('session_id', sessionId).eq('user_id', user.id).eq('status', 'paid')
    .maybeSingle()
  if (existing) return NextResponse.json({ error: 'You already have a ticket' }, { status: 400 })

  // Route the money to the host's connected account (Bestie keeps 10%),
  // exactly like paid crew subscriptions. The host must have finished payout
  // onboarding, otherwise there's nowhere to send the funds.
  const { data: host } = await admin
    .from('users')
    .select('stripe_connect_id, connect_charges_enabled')
    .eq('id', gs.host_id)
    .single()
  if (!host?.stripe_connect_id || !host.connect_charges_enabled) {
    return NextResponse.json({ error: 'The host hasn\'t finished payment setup yet — tickets aren\'t available.' }, { status: 400 })
  }

  const PLATFORM_FEE_PERCENT = 10
  const amountCents = Math.round(price * 100)
  const feeCents = Math.round(amountCents * PLATFORM_FEE_PERCENT / 100)

  const origin = req.headers.get('origin') || 'https://bestiehere.com'

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: { name: `Ticket — ${gs.title}` },
        },
        quantity: 1,
      }],
      customer_email: user.email || undefined,
      payment_intent_data: {
        application_fee_amount: feeCents,
        transfer_data: { destination: host.stripe_connect_id },
      },
      metadata: {
        kind: 'event_ticket',
        session_id: sessionId,
        user_id: user.id,
        amount: String(price),
      },
      success_url: `${origin}/group-sessions/${sessionId}?ticket=1`,
      cancel_url:  `${origin}/group-sessions/${sessionId}`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[stripe/checkout-event] error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
