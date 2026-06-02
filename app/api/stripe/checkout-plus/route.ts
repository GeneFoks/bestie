// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Personal "Bestie Plus" subscription — $8/mo.
// Unlike the crew checkout, this upgrades the individual user.
export async function POST(req: NextRequest) {
  const bearer = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!bearer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await admin.auth.getUser(bearer)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const price = process.env.STRIPE_PRICE_PLUS
  if (!price) {
    return NextResponse.json({ error: 'STRIPE_PRICE_PLUS not configured' }, { status: 500 })
  }

  const origin = req.headers.get('origin') || 'https://bestiehere.com'

  let session: any
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      customer_email: user.email || undefined,
      metadata: {
        kind: 'personal',   // distinguishes from crew upgrades in the webhook
        plan: 'plus',
        user_id: user.id,
      },
      success_url: `${origin}/profile?plus=1`,
      cancel_url:  `${origin}/plus`,
    })
  } catch (err: any) {
    console.error('[stripe/checkout-plus] error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }

  return NextResponse.json({ url: session.url })
}
