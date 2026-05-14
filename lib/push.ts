import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:hello@bestiehere.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function sendPushToUser(userId: string, payload: { title: string; body?: string; link?: string }) {
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', userId)

  if (!subs?.length) return

  await Promise.allSettled(
    subs.map((row) =>
      webpush.sendNotification(row.subscription, JSON.stringify(payload)).catch(() => {
        // stale subscription — ignore silently
      })
    )
  )
}
