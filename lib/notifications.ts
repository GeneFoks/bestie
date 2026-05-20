export type NotificationType =
  | 'booking_request'
  | 'booking_accepted'
  | 'booking_declined'
  | 'booking_completed'
  | 'session_confirmed'
  | 'new_message'
  | 'spark_received'
  | 'join_request'
  | 'join_accepted'

/**
 * Creates an in-app notification AND fires a web-push to the recipient
 * (best-effort — push errors don't surface here).
 *
 * Routes through `/api/notifications`, which lets us send pushes from the
 * client without exposing the service role key or VAPID private key.
 */
export async function createNotification(params: {
  userId: string
  type: NotificationType
  title: string
  body?: string
  link?: string
}) {
  try {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
  } catch {
    // network errors are silent — notification UX shouldn't block real actions
  }
}
