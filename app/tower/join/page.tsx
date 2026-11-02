// @ts-nocheck
import { verifyLink, getDb, isLiveStatus, fmtDate, GROUP_URL } from '@/lib/tower'
import TowerJoinClient from './TowerJoinClient'

// /tower/join?t=<signed link from @TowerCrewBot> — choose a plan and pay.
// The token is verified on the server; the client only ever sees it back.
export const dynamic = 'force-dynamic'

export default async function TowerJoinPage({ searchParams }: { searchParams: { t?: string } }) {
  const t = typeof searchParams?.t === 'string' ? searchParams.t : ''
  const p = verifyLink(t, 'pay')

  let active = null
  if (p) {
    try {
      const { data } = await getDb()
        .from('tg_subscriptions')
        .select('plan, status, paid_until, cancel_at_period_end, stripe_subscription_id')
        .eq('chat_id', p.c)
        .eq('telegram_user_id', p.u)
        .maybeSingle()
      if (data?.stripe_subscription_id && isLiveStatus(data.status)) {
        active = {
          plan: data.plan,
          status: data.status,
          until: fmtDate(data.paid_until),
          canceling: !!data.cancel_at_period_end,
        }
      }
    } catch {}
  }

  return <TowerJoinClient t={p ? t : ''} name={p?.n || ''} active={active} groupUrl={GROUP_URL} />
}
