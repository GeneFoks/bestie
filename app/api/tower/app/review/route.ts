// @ts-nocheck
import { NextRequest } from 'next/server'
import { withApp, appReviewCheck, appReviewSubmit } from '@/lib/tower-app'

// Mini App review wizard.
// GET ?target=<id> → may I review this person (gate, pair, limits) + my old review.
// POST { targetId, workPlace, workMonth, workYear, scores, wouldWorkAgain, text? }
// → stored through storeWizardReview → storeReview (the review gate runs there).
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return withApp(req, (user, { params }) => appReviewCheck(user, Number(params.get('target'))))
}

export async function POST(req: NextRequest) {
  return withApp(req, (user, { body }) => appReviewSubmit(user, body))
}
