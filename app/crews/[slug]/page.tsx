// @ts-nocheck
export const revalidate = 0
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import ProfileNav from '@/components/ProfileNav'
import CrewActions from './CrewActions'
import CrewAvatarSection from './CrewAvatarSection'
import JoinRequestActions from './JoinRequestActions'
import CrewInviteButton from './CrewInviteButton'
import CrewRating from './CrewRating'
import CrewDeleteButton from './CrewDeleteButton'
import CrewTelegramLink from './CrewTelegramLink'
import CrewKickButton from './CrewKickButton'
import JoinRequestsPanel from './JoinRequestsPanel'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function generateMetadata({ params }) {
  const { data: crew } = await supabase.from('crews').select('name, description').eq('slug', params.slug).single()
  if (!crew) return { title: 'Crew · Bestie' }
  return {
    title: `${crew.name} · Bestie`,
    description: crew.description || `${crew.name} crew on Bestie.`,
  }
}

export default async function CrewPage({ params }) {
  const { data: crew } = await supabase
    .from('crews')
    .select('*, captain:users!captain_id(id, username, full_name, avatar_url, bestie_score)')
    .eq('slug', params.slug)
    .single()

  if (!crew) {
    return (
      <div style={{ minHeight: '100vh', background: '#080810', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</p>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', color: '#E8E0FF', marginBottom: '8px' }}>Crew not found</h1>
          <Link href="/crews" style={{ padding: '10px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>Browse Crews</Link>
        </div>
      </div>
    )
  }

  const [{ data: members }, { data: upcomingEvents }, { data: ratings }] = await Promise.all([
    supabase
      .from('crew_members')
      .select('joined_at, user:users(id, username, full_name, avatar_url, bestie_score, city)')
      .eq('crew_id', crew.id)
      .order('bestie_score', { ascending: false, foreignTable: 'users' }),
    supabase
      .from('crew_events')
      .select('id, title, datetime, location, is_members_only, max_attendees')
      .eq('crew_id', crew.id)
      .gte('datetime', new Date().toISOString())
      .order('datetime', { ascending: true })
      .limit(5),
    supabase.from('crew_ratings').select('rating').eq('crew_id', crew.id),
  ])

  const memberCount = members?.length || 0
  const avgScore = memberCount > 0
    ? Math.round(members.reduce((sum, m) => sum + (m.user?.bestie_score || 0), 0) / memberCount)
    : 0
  const ratingCount = ratings?.length || 0
  const avgRating = ratingCount > 0
    ? Math.round(ratings.reduce((s, r) => s + r.rating, 0) / ratingCount * 10) / 10
    : 0
  const scoreColor = avgScore >= 800 ? '#39FF14' : avgScore >= 600 ? '#D4AF37' : '#9B93C0'
  const spotsLeft = (crew.max_members || 108) - memberCount

  return (
    <div style={{ minHeight: '100vh', background: '#080810', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <ProfileNav />
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Crew Card */}
        <div style={{ background: 'linear-gradient(135deg, #0F0F1E 0%, #141428 100%)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: '28px', padding: '32px', marginBottom: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '24px' }}>
            <CrewAvatarSection crewId={crew.id} captainId={crew.captain_id} initialUrl={crew.avatar_url} crewName={crew.name} />

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', color: '#E8E0FF' }}>{crew.name}</h1>
                <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '999px', background: crew.is_public ? 'rgba(57,255,20,0.1)' : 'rgba(155,147,192,0.1)', border: crew.is_public ? '1px solid rgba(57,255,20,0.25)' : '1px solid rgba(155,147,192,0.25)', color: crew.is_public ? '#39FF14' : '#9B93C0', fontWeight: 600 }}>
                  {crew.is_public ? 'Open' : '🔒 Private'}
                </span>
              </div>
              {crew.description && <p style={{ fontSize: '14px', color: '#9B93C0', lineHeight: 1.6, marginBottom: '8px' }}>{crew.description}</p>}
              <CrewRating crewId={crew.id} avgRating={avgRating} ratingCount={ratingCount} />
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px', marginBottom: '24px' }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '14px', padding: '14px', border: `1px solid ${scoreColor}20` }}>
              <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1px', color: '#9B93C0', marginBottom: '6px' }}>AVG SCORE</p>
              <div style={{ fontSize: '28px', fontWeight: 700, color: scoreColor, fontFamily: 'DM Serif Display, serif' }}>{avgScore || '—'}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '14px', padding: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1px', color: '#9B93C0', marginBottom: '6px' }}>MEMBERS</p>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#E8E0FF', fontFamily: 'DM Serif Display, serif' }}>{memberCount}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '14px', padding: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1px', color: '#9B93C0', marginBottom: '6px' }}>SPOTS LEFT</p>
              <div style={{ fontSize: '28px', fontWeight: 700, color: spotsLeft <= 10 ? '#FF6B35' : '#E8E0FF', fontFamily: 'DM Serif Display, serif' }}>{spotsLeft}</div>
            </div>
          </div>

          {/* Captain */}
          {crew.captain && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', padding: '12px', background: 'rgba(212,175,55,0.06)', borderRadius: '12px', border: '1px solid rgba(212,175,55,0.12)' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', overflow: 'hidden', background: '#1a1a35', flexShrink: 0 }}>
                {crew.captain.avatar_url
                  ? <img src={crew.captain.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4AF37', fontWeight: 700, fontSize: '14px' }}>{crew.captain.full_name?.[0]}</div>
                }
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '10px', color: '#D4AF37', fontWeight: 600, letterSpacing: '1px', marginBottom: '1px' }}>CAPTAIN</p>
                <Link href={`/${crew.captain.username}`} style={{ fontSize: '14px', fontWeight: 600, color: '#E8E0FF', textDecoration: 'none' }}>{crew.captain.full_name}</Link>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#D4AF37' }}>BS {crew.captain.bestie_score}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <Link href={`/crews/${params.slug}/chat`} style={{ flex: 1, display: 'block', padding: '14px', borderRadius: '14px', textAlign: 'center', fontSize: '15px', fontWeight: 700, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8E0FF', textDecoration: 'none' }}>
              💬 Crew Chat
            </Link>
            <div style={{ flex: 1 }}>
              <CrewActions crewId={crew.id} captainId={crew.captain_id} isPublic={crew.is_public} isFull={spotsLeft <= 0} captainUsername={crew.captain?.username} crewSlug={params.slug} />
            </div>
          </div>
          <CrewTelegramLink crewId={crew.id} captainId={crew.captain_id} initialUrl={crew.telegram_url ?? null} />
          <CrewInviteButton crewId={crew.id} captainId={crew.captain_id} crewSlug={params.slug} inviteCode={crew.invite_code || ''} />
          <CrewDeleteButton crewId={crew.id} captainId={crew.captain_id} crewName={crew.name} />
        </div>

        {/* Events */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', color: '#E8E0FF' }}>Upcoming Events</h2>
          <Link href={`/crews/${params.slug}/events/new`} style={{ fontSize: '13px', fontWeight: 600, padding: '7px 14px', borderRadius: '10px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', color: '#D4AF37', textDecoration: 'none' }}>
            + New Event
          </Link>
        </div>

        {!upcomingEvents || upcomingEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', background: '#0F0F1E', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '24px' }}>
            <p style={{ fontSize: '14px', color: '#9B93C0' }}>No upcoming events</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
            {upcomingEvents.map(event => {
              const d = new Date(event.datetime)
              const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
              return (
                <Link key={event.id} href={`/events/${event.id}`} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', textDecoration: 'none' }}>
                  <div style={{ textAlign: 'center', flexShrink: 0, width: '44px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#D4AF37', letterSpacing: '1px' }}>{d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</div>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: '#E8E0FF', fontFamily: 'DM Serif Display, serif', lineHeight: 1 }}>{d.getDate()}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#E8E0FF' }}>{event.title}</span>
                      {event.is_members_only && <span style={{ fontSize: '10px', color: '#9B93C0' }}>🔒</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9B93C0' }}>{timeStr}{event.location ? ` · ${event.location}` : ''}</div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Join Requests — client component fetches with captain's session */}
        {!crew.is_public && (
          <JoinRequestsPanel crewId={crew.id} captainId={crew.captain_id} />
        )}

        {/* Members */}
        <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', color: '#E8E0FF', marginBottom: '16px' }}>Members</h2>

        {memberCount === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', background: '#0F0F1E', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: '14px', color: '#9B93C0' }}>No members yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {members.map(({ user, joined_at }) => {
              if (!user) return null
              const sc = user.bestie_score >= 800 ? '#39FF14' : user.bestie_score >= 600 ? '#D4AF37' : '#9B93C0'
              const isCaptain = user.id === crew.captain_id
              return (
                <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px' }}>
                  <Link href={`/${user.username}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0, textDecoration: 'none' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', overflow: 'hidden', background: '#1a1a35', flexShrink: 0, border: '1px solid rgba(212,175,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {user.avatar_url
                        ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: '16px', fontWeight: 700, color: '#D4AF37' }}>{user.full_name?.[0]}</span>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#E8E0FF' }}>{user.full_name}</span>
                        {isCaptain && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '999px', background: 'rgba(212,175,55,0.15)', color: '#D4AF37', fontWeight: 600 }}>Captain</span>}
                      </div>
                      <span style={{ fontSize: '12px', color: '#9B93C0' }}>@{user.username}{user.city ? ` · ${user.city}` : ''}</span>
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: sc, flexShrink: 0 }}>{user.bestie_score}</span>
                  </Link>
                  <CrewKickButton crewId={crew.id} captainId={crew.captain_id} memberId={user.id} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
