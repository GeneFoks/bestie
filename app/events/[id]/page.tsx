// @ts-nocheck
export const revalidate = 0
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import ProfileNav from '@/components/ProfileNav'
import EventActions from './EventActions'
import DeleteEventButton from './DeleteEventButton'
import ShareEventButton from '@/components/ShareEventButton'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function generateMetadata({ params }) {
  const { data: event } = await supabase.from('crew_events').select('title, description').eq('id', params.id).single()
  if (!event) return { title: 'Event · Bestie' }
  return { title: `${event.title} · Bestie`, description: event.description || event.title }
}

export default async function EventPage({ params }) {
  const { data: event } = await supabase
    .from('crew_events')
    .select('*, crew:crews(id, name, slug, captain_id), creator:users!created_by(id, username, full_name, avatar_url)')
    .eq('id', params.id)
    .single()

  if (!event) {
    return (
      <div style={{ minHeight: '100vh', background: '#080810', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</p>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', color: '#E8E0FF', marginBottom: '8px' }}>Event not found</h1>
          <Link href="/crews" style={{ padding: '10px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>Browse Crews</Link>
        </div>
      </div>
    )
  }

  const { data: attendees } = await supabase
    .from('crew_event_attendees')
    .select('joined_at, user:users(id, username, full_name, avatar_url, bestie_score)')
    .eq('event_id', event.id)
    .order('joined_at', { ascending: true })

  const attendeeCount = attendees?.length || 0
  const eventDate = new Date(event.datetime)
  const isPast = eventDate < new Date()
  const spotsLeft = event.max_attendees ? event.max_attendees - attendeeCount : null

  const dateStr = eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const timeStr = eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ minHeight: '100vh', background: '#080810', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <ProfileNav />
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Event Card */}
        <div style={{ background: 'linear-gradient(135deg, #0F0F1E 0%, #141428 100%)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: '28px', padding: '32px', marginBottom: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

          {/* Crew link + status */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
            <Link href={`/crews/${event.crew?.slug}`} style={{ fontSize: '13px', fontWeight: 600, color: '#D4AF37', textDecoration: 'none', padding: '4px 12px', borderRadius: '999px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
              {event.crew?.name}
            </Link>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <ShareEventButton eventId={event.id} eventTitle={event.title} />
              {isPast && <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '999px', background: 'rgba(155,147,192,0.1)', border: '1px solid rgba(155,147,192,0.2)', color: '#9B93C0', fontWeight: 600 }}>Ended</span>}
              {event.is_members_only
                ? <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '999px', background: 'rgba(155,147,192,0.1)', border: '1px solid rgba(155,147,192,0.2)', color: '#9B93C0', fontWeight: 600 }}>🔒 Members only</span>
                : <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '999px', background: 'rgba(57,255,20,0.08)', border: '1px solid rgba(57,255,20,0.2)', color: '#39FF14', fontWeight: 600 }}>🌐 Open</span>
              }
            </div>
          </div>

          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '32px', color: '#E8E0FF', marginBottom: '20px', lineHeight: 1.2 }}>{event.title}</h1>

          {/* Date / Location */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>📅</span>
              <span style={{ fontSize: '15px', color: '#E8E0FF', fontWeight: 600 }}>{dateStr} · {timeStr}</span>
            </div>
            {event.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>📍</span>
                <span style={{ fontSize: '15px', color: '#9B93C0' }}>{event.location}</span>
              </div>
            )}
          </div>

          {event.description && (
            <p style={{ fontSize: '14px', color: '#9B93C0', lineHeight: 1.7, marginBottom: '20px' }}>{event.description}</p>
          )}

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: spotsLeft !== null ? '1fr 1fr' : '1fr', gap: '10px', marginBottom: '24px' }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '14px', padding: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1px', color: '#9B93C0', marginBottom: '6px' }}>GOING</p>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#E8E0FF', fontFamily: 'DM Serif Display, serif' }}>{attendeeCount}</div>
            </div>
            {spotsLeft !== null && (
              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '14px', padding: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1px', color: '#9B93C0', marginBottom: '6px' }}>SPOTS LEFT</p>
                <div style={{ fontSize: '28px', fontWeight: 700, color: spotsLeft <= 3 ? '#FF6B35' : '#E8E0FF', fontFamily: 'DM Serif Display, serif' }}>{spotsLeft}</div>
              </div>
            )}
          </div>

          {!isPast && (
            <EventActions
              eventId={event.id}
              crewId={event.crew_id}
              captainId={event.crew?.captain_id}
              isMembersOnly={event.is_members_only}
              isFull={spotsLeft !== null && spotsLeft <= 0}
            />
          )}
          <DeleteEventButton
            eventId={event.id}
            captainId={event.crew?.captain_id}
            crewSlug={event.crew?.slug}
            eventTitle={event.title}
          />
        </div>

        {/* Attendees */}
        <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', color: '#E8E0FF', marginBottom: '16px' }}>
          Going · {attendeeCount}
        </h2>

        {attendeeCount === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', background: '#0F0F1E', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: '14px', color: '#9B93C0' }}>No one yet — be the first</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {attendees.map(({ user, joined_at }) => {
              if (!user) return null
              const sc = user.bestie_score >= 800 ? '#39FF14' : user.bestie_score >= 600 ? '#D4AF37' : '#9B93C0'
              return (
                <Link key={user.id} href={`/${user.username}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', textDecoration: 'none' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', overflow: 'hidden', background: '#1a1a35', flexShrink: 0, border: '1px solid rgba(212,175,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {user.avatar_url
                      ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: '16px', fontWeight: 700, color: '#D4AF37' }}>{user.full_name?.[0]}</span>
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#E8E0FF' }}>{user.full_name}</span>
                    <div style={{ fontSize: '12px', color: '#9B93C0' }}>@{user.username}</div>
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: sc }}>{user.bestie_score}</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
