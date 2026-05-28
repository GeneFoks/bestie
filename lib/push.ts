import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body?: string; link?: string }
) {
  const pubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privKey = process.env.VAPID_PRIVATE_KEY
  if (!pubKey || !privKey) {
    console.warn('[push] VAPID keys not configured — skipping push')
    return
  }

  webpush.setVapidDetails('mailto:hello@bestiehere.com', pubKey, privKey)

  const supabase = getAdmin()
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('id, subscription')
    .eq('user_id', userId)

  if (error) { console.error('[push] fetch subs error:', error.message); return }
  if (!subs?.length) { console.log('[push] no subscriptions for', userId); return }

  const staleIds: string[] = []

  await Promise.allSettled(
    subs.map(async (row) => {
      try {
        await webpush.sendNotification(row.subscription, JSON.stringify(payload))
      } catch (err: any) {
        // 410 Gone or 404 = subscription expired → remove it
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          staleIds.push(row.id)
        } else {
          console.error('[push] send error:', err?.message)
        }
      }
    })
  )

  // Clean up stale subscriptions
  if (staleIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', staleIds)
  }
}
