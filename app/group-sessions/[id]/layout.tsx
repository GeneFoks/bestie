import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'

const ACTIVITY_LABELS: Record<string, string> = {
  hiking: 'Hiking', running: 'Running', gym_partner: 'Gym', cycling: 'Cycling', yoga: 'Yoga',
  cold_plunge: 'Cold Plunge', coffee_chat: 'Coffee Chat', deep_chat: 'Deep Chat',
  game_night: 'Game Night', movie_night: 'Movie Night', night_out: 'Night Out',
  travel_buddy: 'Travel', meditation_circle: 'Meditation', book_club: 'Book Club',
  cooking_together: 'Cooking', dance: 'Dance', climbing: 'Climbing',
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: gs } = await supabase
    .from('group_sessions')
    .select('title, description, activity_type, location, scheduled_at')
    .eq('id', params.id)
    .single()

  if (!gs) return { title: 'Group Session · Bestie' }

  const activity = ACTIVITY_LABELS[gs.activity_type as string] || 'Session'
  const when = gs.scheduled_at ? new Date(gs.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
  const where = gs.location ? ` · ${gs.location}` : ''
  const description = gs.description || `${activity}${when ? ` · ${when}` : ''}${where} — join on Bestie.`

  return {
    title: `${gs.title} · Bestie`,
    description,
    openGraph: { title: `${gs.title} · Bestie`, description, type: 'website' },
    twitter: { card: 'summary_large_image', title: `${gs.title} · Bestie`, description },
  }
}

export default function GroupSessionLayout({ children }: { children: React.ReactNode }) {
  return children
}
