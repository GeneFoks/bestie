import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sendPushToUser } from '@/lib/push'

/**
 * Create an in-app notification AND fire the matching web-push (best-effort).
 *
 * - Requires an authenticated user (via Supabase cookie auth).
 * - Inserts a row into `notifications` so the bell updates.
 * - Sends a web-push to every active subscription the recipient has.
 * - Push failures are silent — the in-app side always succeeds.
 */
export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value } }
  )
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId, type, title, body, link } = await req.json()
  if (!userId || !type || !title) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Never notify yourself
  if (userId === user.id) {
    return NextResponse.json({ ok: true, skipped: 'self' })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // In-app row (always)
  const { error: insertErr } = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body: body ?? null,
    link: link ?? null,
  })
  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  // Push (best-effort) — never block on this
  sendPushToUser(userId, { title, body, link }).catch(() => {})

  return NextResponse.json({ ok: true })
}
