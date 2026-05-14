import { supabase } from './supabase'

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

export async function createNotification(params: {
  userId: string
  type: NotificationType
  title: string
  body?: string
  link?: string
}) {
  await supabase.from('notifications').insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body ?? null,
    link: params.link ?? null,
  })
}
