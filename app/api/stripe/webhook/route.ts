// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature') || ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error('[webhook] signature error:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {

    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const meta = session.metadata || {}

      // Expiry: 1 month from now
      const expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + 1)

      // ── Personal Bestie Plus subscription ──
      if (meta.kind === 'personal') {
        if (!meta.user_id) break
        await admin.from('users').update({
          subscription_tier: 'plus',
          plus_expires_at: expiresAt.toISOString(),
          stripe_subscription_id: session.subscription as string,
          stripe_customer_id: session.customer as string,
        }).eq('id', meta.user_id)
        console.log(`[webhook] user ${meta.user_id} upgraded to Plus`)
        break
      }

      // ── Event ticket (one-time payment) ──
      if (meta.kind === 'event_ticket') {
        const { session_id, user_id, amount } = meta
        if (!session_id || !user_id) break

        await admin.from('event_tickets').insert({
          session_id,
          user_id,
          amount: Number(amount || 0),
          stripe_session_id: session.id,
          status: 'paid',
        })

        // Add the buyer to the participant list (idempotent-ish: skip if present)
        const { data: already } = await admin
          .from('group_session_participants')
          .select('id').eq('session_id', session_id).eq('user_id', user_id).maybeSingle()
        if (!already) {
          await admin.from('group_session_participants').insert({ session_id, user_id })
        }

        console.log(`[webhook] ticket: user ${user_id} paid $${amount} for session ${session_id}`)
        break
      }

      // ── Crew upgrade ──
      const { crew_id, plan } = meta
      if (!crew_id || !plan) break

      await admin.from('crews').update({
        plan,
        plan_expires_at: expiresAt.toISOString(),
        stripe_subscription_id: session.subscription as string,
        stripe_customer_id: session.customer as string,
      }).eq('id', crew_id)

      console.log(`[webhook] crew ${crew_id} upgraded to ${plan}`)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription

      // Downgrade a personal Plus subscriber back to free (if this sub is theirs)
      await admin.from('users')
        .update({ subscription_tier: 'free', plus_expires_at: null, stripe_subscription_id: null })
        .eq('stripe_subscription_id', sub.id)

      // Find crew by subscription ID and downgrade to free
      await admin.from('crews')
        .update({ plan: 'free', plan_expires_at: null, stripe_subscription_id: null })
        .eq('stripe_subscription_id', sub.id)
      console.log(`[webhook] subscription ${sub.id} cancelled — downgraded to free`)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      console.warn(`[webhook] payment failed for customer ${invoice.customer}`)
      // Optionally notify the captain here
      break
    }
  }

  return NextResponse.json({ received: true })
}
