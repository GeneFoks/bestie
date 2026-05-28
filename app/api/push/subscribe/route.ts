// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUser(req: NextRequest) {
  const admin = supabaseAdmin()

  // 1. Try Bearer token (used by PWARegister)
  const bearer = req.headers.get('authorization')?.replace('Bearer ', '')
  if (bearer) {
    const { data: { user } } = await admin.auth.getUser(bearer)
    if (user) return user
  }

  // 2. Fall back to cookie-based session
  try {
    const { createServerClient } = await import('@supabase/ssr')
    const { cookies } = await import('next/headers')
    const cookieStore = cookies()
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (n: string) => cookieStore.get(n)?.value } }
    )
    const { data: { user } } = await authClient.auth.getUser()
    return user ?? null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { subscription } = await req.json()
  if (!subscription?.endpoint) return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })

  const admin = supabaseAdmin()
  const { error } = await admin.from('push_subscriptions').upsert(
    { user_id: user.id, endpoint: subscription.endpoint, subscription },
    { onConflict: 'user_id,endpoint' }
  )

  if (error) {
    // Try insert-or-update with endpoint-only conflict
    await admin.from('push_subscriptions').upsert(
      { user_id: user.id, endpoint: subscription.endpoint, subscription },
      { onConflict: 'endpoint' }
    )
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { endpoint } = await req.json()
  if (!endpoint) return NextResponse.json({ error: 'endpoint required' }, { status: 400 })

  const admin = supabaseAdmin()
  await admin.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}
