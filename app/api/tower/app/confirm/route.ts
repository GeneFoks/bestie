// @ts-nocheck
import { NextRequest } from 'next/server'
import { withApp, appConfirm } from '@/lib/tower-app'

// Mini App «Вы работали вместе?» answer: POST { reviewId, worked }.
// Only the reviewed person can answer (checked in confirmReview).
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  return withApp(req, (user, { body }) => appConfirm(user, body))
}
