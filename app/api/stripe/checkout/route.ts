// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PRICE_IDS: Record<string, string> = {
  community: process.env.STRIPE_PRICE_COMMUNITY!,
  pro:       process.env.STRIPE_PRICE_PRO!,
}

export async function POST(req: NextRequest) {
  const bearer = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!bearer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await admin.auth.getUser(bearer)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { crew_id, plan } = await req.json()
  if (!crew_id || !PRICE_IDS[plan]) {
    return NextResponse.json({ error: 'Invalid plan or crew_id' }, { status: 400 })
  }

  // Verify requester is the captain
  const { data: crew } = await admin
    .from('crews')
    .select('id, name, slug, captain_id')
    .eq('id', crew_id)
    .single()

  if (!crew || crew.captain_id !== user.id) {
    return NextResponse.json({ error: 'Only the crew captain can upgrade' }, { status: 403 })
  }

  const origin = req.headers.get('origin') || 'https://bestiehere.com'

  let session: any
  try {
    session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
    customer_email: user.email || undefined,
    metadata: {
      crew_id,
      crew_slug: crew.slug,
      plan,
      user_id: user.id,
    },
      success_url: `${origin}/crews/${crew.slug}/swarm?upgraded=1`,
      cancel_url:  `${origin}/crews/${crew.slug}/swarm`,
    })
  } catch (err: any) {
    console.error('[stripe/checkout] error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }

  return NextResponse.json({ url: session.url })
}
