// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Buy a ticket to a paid crew event. One-time payment routed to the CREW's
// connected account (Bestie keeps 10%); the webhook (checkout.session.completed,
// kind=crew_event_ticket) records the ticket and RSVPs the buyer as going.
export async function POST(req: NextRequest) {
  const bearer = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!bearer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await admin.auth.getUser(bearer)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { eventId } = await req.json()
  if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 })

  const { data: ev } = await admin
    .from('crew_events')
    .select('id, title, datetime, ticket_price, max_attendees, is_members_only, crew_id, crew:crews(id, name, slug, stripe_connect_id, connect_charges_enabled)')
    .eq('id', eventId)
    .single()

  if (!ev) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  const price = Number(ev.ticket_price || 0)
  if (price <= 0) return NextResponse.json({ error: 'This event is free — just RSVP' }, { status: 400 })
  if (new Date(ev.datetime) < new Date()) return NextResponse.json({ error: 'This event already happened' }, { status: 400 })

  // Already going → nothing to buy
  const { data: rsvp } = await admin
    .from('crew_event_attendees')
    .select('status')
    .eq('event_id', eventId).eq('user_id', user.id)
    .maybeSingle()
  if (rsvp?.status === 'going') return NextResponse.json({ error: 'You are already on the list' }, { status: 400 })

  // Already holds a ticket → don't charge twice
  const { data: existing } = await admin
    .from('crew_event_tickets')
    .select('id')
    .eq('event_id', eventId).eq('user_id', user.id).eq('status', 'paid')
    .maybeSingle()
  if (existing) return NextResponse.json({ error: 'You already have a ticket' }, { status: 400 })

  // Capacity — only 'going' RSVPs take a seat (matches the DB capacity trigger)
  if (ev.max_attendees) {
    const { count } = await admin
      .from('crew_event_attendees')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId).eq('status', 'going')
    if ((count || 0) >= ev.max_attendees) {
      return NextResponse.json({ error: 'Sold out — the event is full' }, { status: 400 })
    }
  }

  // Members-only events: the buyer must already be in the crew
  if (ev.is_members_only) {
    const { data: member } = await admin
      .from('crew_members')
      .select('user_id')
      .eq('crew_id', ev.crew_id).eq('user_id', user.id)
      .maybeSingle()
    if (!member) return NextResponse.json({ error: 'Members only — join the crew first' }, { status: 403 })
  }

  // Route the money to the crew's connected account (Bestie keeps 10%),
  // exactly like paid group sessions. The crew must have finished payout
  // onboarding, otherwise there's nowhere to send the funds.
  const crew = ev.crew
  if (!crew?.stripe_connect_id || !crew.connect_charges_enabled) {
    return NextResponse.json({ error: 'The crew hasn\'t finished payment setup yet — tickets aren\'t available.' }, { status: 400 })
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
          product_data: { name: `Ticket — ${ev.title}` },
        },
        quantity: 1,
      }],
      customer_email: user.email || undefined,
      payment_intent_data: {
        application_fee_amount: feeCents,
        transfer_data: { destination: crew.stripe_connect_id },
      },
      metadata: {
        kind: 'crew_event_ticket',
        event_id: eventId,
        user_id: user.id,
        amount: String(price),
      },
      success_url: `${origin}/events/${eventId}?ticket=1`,
      cancel_url:  `${origin}/events/${eventId}`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[stripe/checkout-crew-event] error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
