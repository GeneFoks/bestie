// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/push'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  // Auth: Bearer token
  const bearer = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!bearer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user }, error: authErr } = await admin.auth.getUser(bearer)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get poster's profile
  const { data: poster } = await admin
    .from('users')
    .select('full_name, username')
    .eq('id', user.id)
    .single()

  const body = await req.json()
  const { activity_type, location } = body

  const posterName = poster?.full_name || poster?.username || 'Your connection'

  const notifBody = `${posterName} is going to ${activity_type || 'an activity'}` +
    (location ? ` at ${location}` : '') + ' — join them! 👋'

  // Find all mutual knock connections
  const { data: knocks } = await admin
    .from('knocks')
    .select('sender_id, receiver_id')
    .eq('sender_id', user.id)
    .eq('is_mutual', true)

  if (!knocks || knocks.length === 0) {
    return NextResponse.json({ ok: true, pushed: 0 })
  }

  const connectionIds = knocks.map(k => k.receiver_id)

  let pushed = 0
  await Promise.allSettled(
    connectionIds.map(async (uid) => {
      try {
        await sendPushToUser(uid, {
          title: `${posterName} is going out 👋`,
          body: notifBody,
          link: '/going-to',
        })
        pushed++
      } catch (e) {
        console.error('[going-to/notify] push error for', uid, e)
      }
    })
  )

  return NextResponse.json({ ok: true, pushed, total: connectionIds.length })
}
