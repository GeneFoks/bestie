// @ts-nocheck
import TowerSuccessClient from './TowerSuccessClient'

// /tower/success?session_id=cs_... — Stripe Checkout returns here.
export const dynamic = 'force-dynamic'

export default function TowerSuccessPage({ searchParams }: { searchParams: { session_id?: string } }) {
  const sessionId = typeof searchParams?.session_id === 'string' ? searchParams.session_id : ''
  return <TowerSuccessClient sessionId={sessionId} />
}
