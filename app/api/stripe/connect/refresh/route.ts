// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Sync a crew's connected-account status (charges_enabled) after the captain
// returns from Stripe onboarding. Cheap to call; also runs from the webhook.
export async function POST(req: NextRequest) {
  const bearer = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!bearer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: { user } } = await admin.auth.getUser(bearer)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { crewId } = await req.json()
  const { data: crew } = await admin.from('crews').select('id, captain_id, stripe_connect_id').eq('id', crewId).single()
  if (!crew || crew.captain_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!crew.stripe_connect_id) return NextResponse.json({ ready: false })

  try {
    const acct = await stripe.accounts.retrieve(crew.stripe_connect_id)
    const ready = !!acct.charges_enabled && !!acct.payouts_enabled
    await admin.from('crews').update({ connect_charges_enabled: ready }).eq('id', crewId)
    return NextResponse.json({ ready })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
