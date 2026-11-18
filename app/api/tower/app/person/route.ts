// @ts-nocheck
import { NextRequest } from 'next/server'
import { withApp, appPerson } from '@/lib/tower-app'

// Mini App person card: ?id=<telegram user id>.
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return withApp(req, (user, { params }) => appPerson(user, Number(params.get('id'))))
}
