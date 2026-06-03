// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/push'
import { rateLimit } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  // Each call fires a push → cap to stop call-spam / push-spam.
  const limited = rateLimit(req, 'call-create', { limit: 15, windowMs: 60_000 })
  if (limited) return limited

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Auth
  const token = req.headers.get('authorization')?.replace('Bearer ', '') || ''
  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { to_user_id, booking_id } = await req.json()
  if (!to_user_id) return NextResponse.json({ error: 'to_user_id required' }, { status: 400 })
  if (to_user_id === user.id) return NextResponse.json({ error: 'Cannot call yourself' }, { status: 400 })

  // Generate a unique room name (Jitsi Meet — no API key needed)
  const roomName = `bestie-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const roomUrl = `https://meet.jit.si/${roomName}`

  // Store call in DB
  const { data: call, error: dbErr } = await supabaseAdmin.from('calls').insert({
    room_name: roomName,
    room_url: roomUrl,
    caller_id: user.id,
    callee_id: to_user_id,
    status: 'ringing',
    booking_id: booking_id || null,
  }).select().single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  // Send push notification to callee
  const { data: callerUser } = await supabaseAdmin
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single()

  await sendPushToUser(to_user_id, {
    title: `📞 Incoming call from ${callerUser?.full_name || 'Someone'}`,
    body: 'Tap to answer',
    link: `/call/${roomName}?call_id=${call.id}`,
  })

  return NextResponse.json({
    call_id: call.id,
    room_url: roomUrl,
    room_name: roomName,
  })
}
