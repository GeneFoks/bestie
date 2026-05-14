import { NextRequest, NextResponse } from 'next/server'
import { sendPushToUser } from '@/lib/push'

// Internal endpoint — only callable server-side via the INTERNAL_API_SECRET header
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId, title, body, link } = await req.json()
  if (!userId || !title) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  await sendPushToUser(userId, { title, body, link })
  return NextResponse.json({ ok: true })
}
