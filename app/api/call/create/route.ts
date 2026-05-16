// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
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

  // Check Daily.co API key
  const DAILY_API_KEY = process.env.DAILY_API_KEY
  if (!DAILY_API_KEY) return NextResponse.json({ error: 'Calls not configured' }, { status: 503 })

  // Create Daily.co room (expires in 2 hours)
  const roomName = `bestie-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 2  // 2h

  const dailyRes = await fetch('https://api.daily.co/v1/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      name: roomName,
      privacy: 'private',
      properties: {
        exp,
        max_participants: 2,
        enable_chat: false,
        enable_screenshare: false,
        enable_knocking: false,
        start_video_off: false,
        start_audio_off: false,
      },
    }),
  })

  if (!dailyRes.ok) {
    const err = await dailyRes.text()
    console.error('Daily.co error:', err)
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 })
  }

  const room = await dailyRes.json()

  // Generate meeting token for the caller
  const tokenRes = await fetch('https://api.daily.co/v1/meeting-tokens', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        exp,
        user_id: user.id,
        is_owner: true,
      },
    }),
  })
  const { token: callerToken } = await tokenRes.json()

  // Store call in DB
  const { data: call, error: dbErr } = await supabaseAdmin.from('calls').insert({
    room_name: roomName,
    room_url: room.url,
    caller_id: user.id,
    callee_id: to_user_id,
    status: 'ringing',
    booking_id: booking_id || null,
  }).select().single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  return NextResponse.json({
    call_id: call.id,
    room_url: room.url,
    token: callerToken,
  })
}
