// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const token = req.headers.get('authorization')?.replace('Bearer ', '') || ''
  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { call_id } = await req.json()
  if (!call_id) return NextResponse.json({ error: 'call_id required' }, { status: 400 })

  // Load call and verify user is a participant
  const { data: call } = await supabaseAdmin
    .from('calls').select('*').eq('id', call_id).single()

  if (!call) return NextResponse.json({ error: 'Call not found' }, { status: 404 })
  if (call.caller_id !== user.id && call.callee_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const DAILY_API_KEY = process.env.DAILY_API_KEY
  if (!DAILY_API_KEY) return NextResponse.json({ error: 'Not configured' }, { status: 503 })

  // Mark call as active + set started_at
  await supabaseAdmin.from('calls').update({
    status: 'active',
    started_at: new Date().toISOString(),
  }).eq('id', call_id).eq('status', 'ringing')

  // Generate token for the callee
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 2
  const tokenRes = await fetch('https://api.daily.co/v1/meeting-tokens', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      properties: {
        room_name: call.room_name,
        exp,
        user_id: user.id,
        is_owner: false,
      },
    }),
  })

  const { token: meetingToken } = await tokenRes.json()

  return NextResponse.json({ token: meetingToken, room_url: call.room_url })
}
