// @ts-nocheck
import { NextRequest } from 'next/server'
import { withApp, appMe, appSettings, appUnlink } from '@/lib/tower-app'

// Mini App «Я». Auth: Telegram initData in X-Tg-Init-Data (lib/tower-app withApp).
// GET → my card + review checklist + reviews waiting for «работали вместе?».
// POST { action:'settings', hidden?, skills?, state? } | { action:'unlink' }.
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return withApp(req, (user) => appMe(user), { touch: true })
}

export async function POST(req: NextRequest) {
  return withApp(req, (user, { body }) => (body?.action === 'unlink' ? appUnlink(user) : appSettings(user, body)))
}
