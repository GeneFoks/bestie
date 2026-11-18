// @ts-nocheck
import { NextRequest } from 'next/server'
import { withApp, appPeople } from '@/lib/tower-app'

// Mini App «Рейтинг»: ?q &skill &state &sort=best|count|new &offset.
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return withApp(req, (user, { params }) => appPeople(user, params))
}
