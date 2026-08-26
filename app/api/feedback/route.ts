// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rateLimit'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const FOUNDER_EMAIL = 'fokinsllc@gmail.com'

// In-app feedback: stores every message and forwards it to the founder's
// inbox. Works for logged-in and anonymous visitors alike.
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'feedback', { limit: 5, windowMs: 60_000 })
  if (limited) return limited

  try {
    const { message, mood, page, email } = await req.json()
    const text = String(message || '').trim()
    if (text.length < 3) return NextResponse.json({ error: 'Message too short' }, { status: 400 })
    if (text.length > 2000) return NextResponse.json({ error: 'Message too long' }, { status: 400 })

    // Attach the author when a session token is provided (optional)
    let userId = null
    let userLabel = 'Anonymous visitor'
    const bearer = req.headers.get('authorization')?.replace('Bearer ', '')
    if (bearer) {
      const { data: { user } } = await admin.auth.getUser(bearer)
      if (user) {
        userId = user.id
        const { data: profile } = await admin.from('users').select('full_name, username, email').eq('id', user.id).single()
        userLabel = `${profile?.full_name || 'Bestie'} (@${profile?.username || '—'} · ${profile?.email || user.email || ''})`
      }
    }

    const moodLabel = mood === 'love' ? '😍 Love' : mood === 'idea' ? '💡 Idea' : mood === 'problem' ? '😕 Problem' : '💬 Feedback'

    await admin.from('feedback').insert({
      user_id: userId,
      email: email ? String(email).trim().toLowerCase() : null,
      mood: mood || null,
      page: page ? String(page).slice(0, 200) : null,
      message: text,
    })

    // Forward to the founder — best-effort, never block the response on it
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Bestie Feedback <noreply@bestiehere.com>',
        to: FOUNDER_EMAIL,
        subject: `${moodLabel} — feedback on Bestie`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;">
            <p style="font-size:13px;color:#888;margin:0 0 4px;">${userLabel}${email ? ` · reply-to: ${email}` : ''}</p>
            <p style="font-size:13px;color:#888;margin:0 0 16px;">Page: ${page || '—'} · ${moodLabel}</p>
            <p style="font-size:15px;line-height:1.6;white-space:pre-wrap;">${text.replace(/</g, '&lt;')}</p>
          </div>
        `,
      }),
    }).catch(() => {})

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[feedback]', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
