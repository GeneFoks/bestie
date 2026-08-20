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

      // ── Crew subscription (recurring, Connect destination charge) ──
      if (meta.kind === 'crew_sub') {
        const { crew_id, user_id } = meta
        if (!crew_id || !user_id) break

        const periodEnd = new Date(); periodEnd.setMonth(periodEnd.getMonth() + 1)
        await admin.from('crew_subscriptions').upsert({
          crew_id, user_id,
          stripe_subscription_id: session.subscription as string,
          status: 'active',
          current_period_end: periodEnd.toISOString(),
        }, { onConflict: 'crew_id,user_id' })

        // Grant crew membership (idempotent)
        const { data: already } = await admin.from('crew_members')
          .select('user_id').eq('crew_id', crew_id).eq('user_id', user_id).maybeSingle()
        if (!already) await admin.from('crew_members').insert({ crew_id, user_id })

        console.log(`[webhook] crew_sub: user ${user_id} joined crew ${crew_id}`)
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

      // Crew membership subscription cancelled → mark cancelled + remove member
      const { data: crewSub } = await admin.from('crew_subscriptions')
        .select('crew_id, user_id').eq('stripe_subscription_id', sub.id).maybeSingle()
      if (crewSub) {
        await admin.from('crew_subscriptions').update({ status: 'canceled' }).eq('stripe_subscription_id', sub.id)
        await admin.from('crew_members').delete().eq('crew_id', crewSub.crew_id).eq('user_id', crewSub.user_id)
        console.log(`[webhook] crew_sub cancelled: user ${crewSub.user_id} left crew ${crewSub.crew_id}`)
      }
      console.log(`[webhook] subscription ${sub.id} cancelled`)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      // Mark crew membership past_due (grace handled by Stripe retries)
      if (invoice.subscription) {
        await admin.from('crew_subscriptions').update({ status: 'past_due' })
          .eq('stripe_subscription_id', invoice.subscription as string)
      }
      console.warn(`[webhook] payment failed for customer ${invoice.customer}`)
      break
    }

    case 'account.updated': {
      // Connect account status changed → sync the crew's payout readiness
      const acct = event.data.object as Stripe.Account
      const ready = !!acct.charges_enabled && !!acct.payouts_enabled
      // Same connected-account id can belong to a crew (subscriptions) or a
      // host (paid sessions) — sync both tables.
      await admin.from('crews').update({ connect_charges_enabled: ready }).eq('stripe_connect_id', acct.id)
      await admin.from('users').update({ connect_charges_enabled: ready }).eq('stripe_connect_id', acct.id)
      console.log(`[webhook] connect account ${acct.id} ready=${ready}`)
      break
    }
  }

  return NextResponse.json({ received: true })
}
