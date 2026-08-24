// @ts-nocheck
export const revalidate = 0
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import ProfileNav from '@/components/ProfileNav'
import EventActions from './EventActions'
import DeleteEventButton from './DeleteEventButton'
import ShareEventButton from '@/components/ShareEventButton'
import CheckInButton from './CheckInButton'
import EventPhotoGallery from './EventPhotoGallery'
import { EmptyState } from '@/components/EmptyState'
import { Users } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function generateMetadata({ params }) {
  const { data: event } = await supabase.from('crew_events').select('title, description, datetime, location').eq('id', params.id).single()
  if (!event) return { title: 'Event · Bestie' }
  const when = event.datetime ? new Date(event.datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
  const where = event.location ? ` · ${event.location}` : ''
  const description = event.description || `${when}${where} — join this event on Bestie.`
  const title = `${event.title} · Bestie`
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function EventPage({ params }) {
  const { data: event } = await supabase
    .from('crew_events')
    .select('*, crew:crews(id, name, slug, captain_id), creator:users!created_by(id, username, full_name, avatar_url)')
    .eq('id', params.id)
    .single()

  if (!event) {
    return (
      <div style={{ minHeight: '100vh', background: '#09090F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</p>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', color: '#F0EAFF', marginBottom: '8px' }}>Event not found</h1>
          <Link href="/crews" style={{ padding: '10px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', textDecoration: 'none' }}>Browse Crews</Link>
        </div>
      </div>
    )
  }

  const { data: attendees } = await supabase
    .from('crew_event_attendees')
    .select('joined_at, status, user:users(id, username, full_name, avatar_url, bestie_score)')
    .eq('event_id', event.id)
    .order('joined_at', { ascending: true })

  const { data: coHosts } = await supabase
    .from('crew_event_co_hosts')
    .select('crew:crews(id, name, slug, avatar_url)')
    .eq('event_id', event.id)

  const allAttendees = attendees || []
  const goingList = allAttendees.filter(a => (a.status || 'going') === 'going')
  const maybeList = allAttendees.filter(a => a.status === 'maybe')
  const cantList  = allAttendees.filter(a => a.status === 'cant_make')
  const attendeeCount = goingList.length  // capacity counts only confirmed 'going'
  const eventDate = new Date(event.datetime)
  const isPast = eventDate < new Date()
  const spotsLeft = event.max_attendees ? event.max_attendees - attendeeCount : null

  const dateStr = eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const timeStr = eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ minHeight: '100vh', background: '#09090F', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <ProfileNav />
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Event Card */}
        <div style={{ background: 'linear-gradient(135deg, #111120 0%, #141428 100%)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: '28px', padding: '32px', marginBottom: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

          {/* Crew link + status */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <Link href={`/crews/${event.crew?.slug}`} style={{ fontSize: '13px', fontWeight: 600, color: '#D4AF37', textDecoration: 'none', padding: '4px 12px', borderRadius: '999px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
                {event.crew?.name}
              </Link>
              {coHosts && coHosts.length > 0 && coHosts.map((ch: any) => ch.crew && (
                <span key={ch.crew.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#A99ECC' }}>
                  <span style={{ fontSize: '10px', color: '#6B6280' }}>×</span>
                  <Link href={`/crews/${ch.crew.slug}`} style={{ fontSize: '13px', fontWeight: 600, color: '#9B7FFF', textDecoration: 'none', padding: '4px 12px', borderRadius: '999px', background: 'rgba(155,127,255,0.10)', border: '1px solid rgba(155,127,255,0.25)' }}>
                    {ch.crew.name}
                  </Link>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <ShareEventButton eventId={event.id} eventTitle={event.title} />
              {isPast && <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '999px', background: 'rgba(155,147,192,0.1)', border: '1px solid rgba(155,147,192,0.2)', color: '#A99ECC', fontWeight: 600 }}>Ended</span>}
              {event.is_members_only
                ? <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '999px', background: 'rgba(155,147,192,0.1)', border: '1px solid rgba(155,147,192,0.2)', color: '#A99ECC', fontWeight: 600 }}>🔒 Members only</span>
                : <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '999px', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#34D399', fontWeight: 600 }}>🌐 Open</span>
              }
            </div>
          </div>

          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '32px', color: '#F0EAFF', marginBottom: '20px', lineHeight: 1.2 }}>{event.title}</h1>

          {/* Date / Location */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>📅</span>
              <span style={{ fontSize: '15px', color: '#F0EAFF', fontWeight: 600 }}>{dateStr} · {timeStr}</span>
            </div>
            {event.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>📍</span>
                <span style={{ fontSize: '15px', color: '#A99ECC' }}>{event.location}</span>
              </div>
            )}
          </div>

          {event.description && (
            <p style={{ fontSize: '14px', color: '#A99ECC', lineHeight: 1.7, marginBottom: '20px' }}>{event.description}</p>
          )}

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', marginBottom: '24px' }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '14px', padding: '12px 14px', border: '1px solid rgba(52,211,153,0.18)' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1px', color: '#34D399', marginBottom: '4px' }}>GOING</p>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#34D399', fontFamily: 'DM Serif Display, serif' }}>{goingList.length}</div>
            </div>
            {maybeList.length > 0 && (
              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '14px', padding: '12px 14px', border: '1px solid rgba(212,175,55,0.18)' }}>
                <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1px', color: '#D4AF37', marginBottom: '4px' }}>MAYBE</p>
                <div style={{ fontSize: '26px', fontWeight: 700, color: '#D4AF37', fontFamily: 'DM Serif Display, serif' }}>{maybeList.length}</div>
              </div>
            )}
            {spotsLeft !== null && (
              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '14px', padding: '12px 14px', border: '1px solid rgba(255,255,255,0.10)' }}>
                <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1px', color: '#A99ECC', marginBottom: '4px' }}>SPOTS LEFT</p>
                <div style={{ fontSize: '26px', fontWeight: 700, color: spotsLeft <= 3 ? '#FF6B35' : '#F0EAFF', fontFamily: 'DM Serif Display, serif' }}>{spotsLeft}</div>
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
          <CheckInButton
            eventId={event.id}
            eventTitle={event.title}
            isPast={isPast}
            startsAt={event.datetime}
          />
          <DeleteEventButton
            eventId={event.id}
            captainId={event.crew?.captain_id}
            crewSlug={event.crew?.slug}
            eventTitle={event.title}
          />
        </div>

        {/* Attendees — Going */}
        <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', color: '#F0EAFF', marginBottom: '16px' }}>
          Going · {goingList.length}
        </h2>

        {goingList.length === 0 ? (
          <EmptyState
            Icon={Users}
            title="No one's confirmed yet"
            description="Be the first to RSVP — your name shows up here once you tap Going."
            accent="gold"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {goingList.map(({ user }) => {
              if (!user) return null
              const sc = user.bestie_score >= 800 ? '#34D399' : user.bestie_score >= 600 ? '#D4AF37' : '#A99ECC'
              return (
                <Link key={user.id} href={`/${user.username}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '14px', textDecoration: 'none' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', overflow: 'hidden', background: '#1A1A2E', flexShrink: 0, border: '1px solid rgba(212,175,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {user.avatar_url
                      ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: '16px', fontWeight: 700, color: '#D4AF37' }}>{user.full_name?.[0]}</span>
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#F0EAFF' }}>{user.full_name}</span>
                    <div style={{ fontSize: '12px', color: '#A99ECC' }}>@{user.username}</div>
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: sc }}>{user.bestie_score}</span>
                </Link>
              )
            })}
          </div>
        )}

        {/* Maybe list — separate, lower visual weight */}
        {maybeList.length > 0 && (
          <>
            <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '17px', color: '#D4AF37', marginTop: '28px', marginBottom: '12px' }}>
              Maybe · {maybeList.length}
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {maybeList.map(({ user }) => {
                if (!user) return null
                return (
                  <Link key={user.id} href={`/${user.username}`} title={user.full_name} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '999px', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.20)', textDecoration: 'none' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', overflow: 'hidden', background: '#1A1A2E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {user.avatar_url
                        ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: '10px', fontWeight: 700, color: '#D4AF37' }}>{user.full_name?.[0]}</span>
                      }
                    </div>
                    <span style={{ fontSize: '12px', color: '#F0EAFF', fontWeight: 600 }}>{user.full_name?.split(' ')[0]}</span>
                  </Link>
                )
              })}
            </div>
          </>
        )}

        {/* Photo album — appears once anyone uploaded a photo or checked in with one */}
        <EventPhotoGallery eventId={event.id} />
      </div>
    </div>
  )
}
