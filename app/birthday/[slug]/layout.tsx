import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: ev } = await supabase
    .from('birthday_events')
    .select('celebrant, title, event_date, location')
    .eq('share_slug', params.slug)
    .single()

  if (!ev) return { title: 'Birthday · Bestie' }

  const title = ev.title || `${ev.celebrant}'s Birthday 🎉`
  const when = ev.event_date
    ? new Date(ev.event_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : ''
  const where = ev.location ? ` · ${ev.location}` : ''
  const description = `You're invited! ${when}${where} — RSVP, share photos, pick a gift & chat with the guests.`

  return {
    title: `${title} · Bestie`,
    description,
    openGraph: { title: `${title} · Bestie`, description, type: 'website' },
    twitter: { card: 'summary_large_image', title: `${title} · Bestie`, description },
  }
}

export default function BirthdayLayout({ children }: { children: React.ReactNode }) {
  return children
}
