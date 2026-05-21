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
import EventGoingButton from './EventGoingButton'
import { Search, Lock, MessageCircle, Plus, Clock, MapPin, Flame, Zap, Trophy, Medal, Award, Users } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'

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
      <div style={{ minHeight: '100vh', background: '#09090F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <Search size={48} color="#A99ECC" strokeWidth={1.5} />
          </div>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', color: '#F0EAFF', marginBottom: '8px' }}>Crew not found</h1>
          <Link href="/crews" style={{ padding: '10px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', textDecoration: 'none' }}>Browse Crews</Link>
        </div>
      </div>
    )
  }

  const [{ data: members }, { data: upcomingEvents }, { data: ratings }] = await Promise.all([
    supabase
      .from('crew_members')
      .select('joined_at, user:users(id, username, full_name, avatar_url, bestie_score, city, free_today_at)')
      .eq('crew_id', crew.id)
      .order('bestie_score', { ascending: false, foreignTable: 'users' }),
    supabase
      .from('crew_events')
      .select('id, title, datetime, location, is_members_only, max_attendees, attendees:crew_event_attendees(status)')
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
  const scoreColor = avgScore >= 800 ? '#34D399' : avgScore >= 600 ? '#D4AF37' : '#A99ECC'
  const spotsLeft = (crew.max_members || 108) - memberCount

  return (
    <div style={{ minHeight: '100vh', background: '#09090F', fontFamily: 'Plus Jakarta Sans, sans-serif', paddingBottom: '88px' }}>

      {/* COVER IMAGE (full-width, no nav on top — back button overlaid) */}
      <div style={{ position: 'relative', height: '240px', overflow: 'hidden', background: 'linear-gradient(135deg, #1A1A2E 0%, #0d0d22 100%)' }}>
        {crew.cover_url
          ? <img src={crew.cover_url} alt={crew.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : crew.avatar_url
          ? <img src={crew.avatar_url} alt={crew.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(3px) brightness(0.55) scale(1.06)' }} />
          : <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 60%, rgba(212,175,55,0.2) 0%, rgba(8,8,16,0) 70%)' }} />
        }
        {/* Gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,8,16,1) 0%, rgba(8,8,16,0.3) 55%, transparent 100%)' }} />

        {/* Back button + options */}
        <div style={{ position: 'absolute', top: '16px', left: '16px', right: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/crews" style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(8,8,16,0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: '#F0EAFF', fontSize: '18px' }}>
            ←
          </Link>
          <ProfileNav />
        </div>

        {/* Crew identity on cover */}
        <div style={{ position: 'absolute', bottom: '16px', left: '20px', right: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '26px', color: '#F0EAFF', margin: 0 }}>{crew.name}</h1>
            <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '999px', background: crew.is_public ? 'rgba(57,255,20,0.15)' : 'rgba(155,147,192,0.15)', border: crew.is_public ? '1px solid rgba(57,255,20,0.3)' : '1px solid rgba(155,147,192,0.3)', color: crew.is_public ? '#34D399' : '#A99ECC', fontWeight: 600, backdropFilter: 'blur(8px)' }}>
              {crew.is_public ? 'Open' : (<span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Lock size={10} strokeWidth={2} /> Private</span>)}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(232,224,255,0.7)', margin: 0 }}>
            {memberCount} members{avgScore > 0 ? ` · avg BS ${avgScore}` : ''}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '20px 20px' }}>

        {/* Description + Rating */}
        {crew.description && (
          <p style={{ fontSize: '14px', color: '#A99ECC', lineHeight: 1.7, marginBottom: '16px' }}>{crew.description}</p>
        )}
        <div style={{ marginBottom: '20px' }}>
          <CrewRating crewId={crew.id} avgRating={avgRating} ratingCount={ratingCount} />
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px', marginBottom: '20px' }}>
          <div style={{ background: '#111120', borderRadius: '14px', padding: '14px', border: `1px solid ${scoreColor}20` }}>
            <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1px', color: '#A99ECC', marginBottom: '6px' }}>AVG SCORE</p>
            <div style={{ fontSize: '26px', fontWeight: 700, color: scoreColor, fontFamily: 'DM Serif Display, serif' }}>{avgScore || '—'}</div>
          </div>
          <div style={{ background: '#111120', borderRadius: '14px', padding: '14px', border: '1px solid rgba(255,255,255,0.10)' }}>
            <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1px', color: '#A99ECC', marginBottom: '6px' }}>MEMBERS</p>
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#F0EAFF', fontFamily: 'DM Serif Display, serif' }}>{memberCount}</div>
          </div>
          <div style={{ background: '#111120', borderRadius: '14px', padding: '14px', border: '1px solid rgba(255,255,255,0.10)' }}>
            <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1px', color: '#A99ECC', marginBottom: '6px' }}>SPOTS LEFT</p>
            <div style={{ fontSize: '26px', fontWeight: 700, color: spotsLeft <= 10 ? '#FF6B35' : '#F0EAFF', fontFamily: 'DM Serif Display, serif' }}>{spotsLeft}</div>
          </div>
        </div>

        {/* Captain */}
        {crew.captain && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', padding: '12px 16px', background: '#111120', borderRadius: '14px', border: '1px solid rgba(212,175,55,0.12)' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', overflow: 'hidden', background: '#1A1A2E', flexShrink: 0 }}>
              {crew.captain.avatar_url
                ? <img src={crew.captain.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4AF37', fontWeight: 700, fontSize: '14px' }}>{crew.captain.full_name?.[0]}</div>
              }
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '10px', color: '#D4AF37', fontWeight: 600, letterSpacing: '1px', marginBottom: '1px' }}>CAPTAIN</p>
              <Link href={`/${crew.captain.username}`} style={{ fontSize: '14px', fontWeight: 600, color: '#F0EAFF', textDecoration: 'none' }}>{crew.captain.full_name}</Link>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#D4AF37' }}>BS {crew.captain.bestie_score}</span>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
          <Link href={`/crews/${params.slug}/chat`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '14px', textAlign: 'center', fontSize: '15px', fontWeight: 700, background: '#111120', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EAFF', textDecoration: 'none' }}>
            <MessageCircle size={16} strokeWidth={2} /> Crew Chat
          </Link>
          <div style={{ flex: 1 }}>
            <CrewActions crewId={crew.id} captainId={crew.captain_id} isPublic={crew.is_public} isFull={spotsLeft <= 0} captainUsername={crew.captain?.username} crewSlug={params.slug} />
          </div>
        </div>
        <CrewTelegramLink crewId={crew.id} captainId={crew.captain_id} initialUrl={crew.telegram_url ?? null} />
        <CrewInviteButton crewId={crew.id} captainId={crew.captain_id} crewSlug={params.slug} inviteCode={crew.invite_code || ''} />
        <CrewDeleteButton crewId={crew.id} captainId={crew.captain_id} crewName={crew.name} />
        <div style={{ marginBottom: '8px' }} />

        {/* Free Today in this crew — spontaneous meetup signal */}
        {(() => {
          const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
          const freeMembers = (members || []).filter((m: any) =>
            m.user?.free_today_at && new Date(m.user.free_today_at) >= todayStart
          )
          if (freeMembers.length === 0) return null
          return (
            <div style={{ marginBottom: '20px', padding: '16px 18px', borderRadius: '16px', background: 'linear-gradient(90deg, rgba(52,211,153,0.10) 0%, transparent 100%)', border: '1px solid rgba(52,211,153,0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '10px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: '#34D399', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#34D399', boxShadow: '0 0 8px rgba(52,211,153,0.6)' }} />
                  FREE TODAY · {freeMembers.length} IN CREW
                </p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {freeMembers.slice(0, 12).map((m: any) => (
                  <Link key={m.user.id} href={`/${m.user.username}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '999px', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.20)', textDecoration: 'none' }}>
                    <div style={{ position: 'relative', width: '22px', height: '22px', flexShrink: 0 }}>
                      <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#1A1A2E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {m.user.avatar_url
                          ? <img src={m.user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ fontSize: '10px', fontWeight: 700, color: '#34D399' }}>{m.user.full_name?.[0]}</span>
                        }
                      </div>
                      <span style={{ position: 'absolute', bottom: '-1px', right: '-1px', width: '7px', height: '7px', borderRadius: '50%', background: '#34D399', border: '1.5px solid #09090F' }} />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#F0EAFF' }}>{m.user.full_name?.split(' ')[0]}</span>
                  </Link>
                ))}
                {freeMembers.length > 12 && (
                  <span style={{ padding: '6px 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', fontSize: '12px', color: '#A99ECC' }}>
                    +{freeMembers.length - 12} more
                  </span>
                )}
              </div>
            </div>
          )
        })()}

        {/* Events */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', color: '#F0EAFF' }}>Events</h2>
          <Link href={`/crews/${params.slug}/events/new`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, padding: '7px 14px', borderRadius: '10px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', color: '#D4AF37', textDecoration: 'none' }}>
            <Plus size={13} strokeWidth={2.5} /> New Event
          </Link>
        </div>

        {!upcomingEvents || upcomingEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', background: '#111120', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.10)', marginBottom: '24px' }}>
            <p style={{ fontSize: '14px', color: '#A99ECC' }}>No upcoming events</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
            {upcomingEvents.map((event, idx) => {
              const d = new Date(event.datetime)
              const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
              const daysUntil = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              const isNext = idx === 0

              if (isNext) {
                // Hero "NEXT EVENT" block
                return (
                  <div key={event.id} style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(15,15,30,0.95) 100%)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '20px', padding: '20px', marginBottom: '4px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '140px', height: '140px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
                    <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', color: '#D4AF37', marginBottom: '12px' }}>NEXT EVENT</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {/* Date square */}
                      <div style={{ flexShrink: 0, width: '60px', background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.35)', borderRadius: '14px', padding: '8px 0', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#D4AF37', letterSpacing: '1px' }}>{d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</div>
                        <div style={{ fontSize: '28px', fontWeight: 700, color: '#F0EAFF', fontFamily: 'DM Serif Display, serif', lineHeight: 1.1 }}>{d.getDate()}</div>
                        <div style={{ fontSize: '10px', color: '#A99ECC' }}>{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                      </div>
                      {/* Event info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '17px', fontWeight: 700, color: '#F0EAFF' }}>{event.title}</span>
                          {event.is_members_only && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '999px', background: 'rgba(155,147,192,0.15)', color: '#A99ECC', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Lock size={10} strokeWidth={2} /> Members only</span>}
                        </div>
                        <p style={{ fontSize: '13px', color: '#A99ECC', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                          <Clock size={12} strokeWidth={2} /> {timeStr}{event.location ? <> · <MapPin size={12} strokeWidth={2} /> {event.location}</> : ''}
                        </p>
                        <p style={{ fontSize: '12px', color: daysUntil <= 3 ? '#FF6B35' : '#A99ECC', fontWeight: daysUntil <= 3 ? 700 : 400, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {daysUntil === 0 ? (<><Flame size={12} strokeWidth={2} /> Today!</>) : daysUntil === 1 ? (<><Zap size={12} strokeWidth={2} /> Tomorrow</>) : `In ${daysUntil} days`}
                          {event.max_attendees && ` · Max ${event.max_attendees} attendees`}
                        </p>
                      </div>
                    </div>
                    <EventGoingButton
                      eventId={event.id}
                      isFull={!!(event.max_attendees && (event.attendees || []).filter((a: any) => (a.status || 'going') === 'going').length >= event.max_attendees)}
                    />
                  </div>
                )
              }

              return (
                <Link key={event.id} href={`/events/${event.id}`} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '14px', textDecoration: 'none' }}>
                  <div style={{ textAlign: 'center', flexShrink: 0, width: '44px', background: '#131323', borderRadius: '10px', padding: '6px 0', border: '1px solid rgba(255,255,255,0.10)' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#A99ECC', letterSpacing: '1px' }}>{d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#F0EAFF', fontFamily: 'DM Serif Display, serif', lineHeight: 1 }}>{d.getDate()}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#F0EAFF' }}>{event.title}</span>
                      {event.is_members_only && <Lock size={10} color="#A99ECC" strokeWidth={2} />}
                    </div>
                    <div style={{ fontSize: '12px', color: '#A99ECC' }}>{timeStr}{event.location ? ` · ${event.location}` : ''}</div>
                  </div>
                  <span style={{ fontSize: '12px', color: '#A99ECC', flexShrink: 0 }}>→</span>
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
        <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', color: '#F0EAFF', marginBottom: '16px' }}>Members</h2>

        {memberCount === 0 ? (
          <EmptyState
            Icon={Users}
            title="First in the door"
            description="Invite friends with the share link — they'll appear here as they join."
            accent="gold"
            size="sm"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {members.map(({ user, joined_at }, memberIdx) => {
              if (!user) return null
              const sc = user.bestie_score >= 800 ? '#34D399' : user.bestie_score >= 600 ? '#D4AF37' : '#A99ECC'
              const isCaptain = user.id === crew.captain_id
              return (
                <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: '#111120', border: isCaptain ? '1px solid rgba(212,175,55,0.2)' : '1px solid rgba(255,255,255,0.10)', borderRadius: '14px' }}>
                  <Link href={`/${user.username}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0, textDecoration: 'none' }}>
                    {/* Rank number */}
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#A99ECC', width: '20px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {memberIdx === 0 ? <Trophy size={14} color="#FFD700" strokeWidth={2} /> : memberIdx === 1 ? <Medal size={14} color="#C0C0C0" strokeWidth={2} /> : memberIdx === 2 ? <Award size={14} color="#CD7F32" strokeWidth={2} /> : `#${memberIdx + 1}`}
                    </span>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', overflow: 'hidden', background: '#1A1A2E', flexShrink: 0, border: isCaptain ? '2px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {user.avatar_url
                        ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: '16px', fontWeight: 700, color: '#D4AF37' }}>{user.full_name?.[0]}</span>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#F0EAFF' }}>{user.full_name}</span>
                        {isCaptain && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '999px', background: 'rgba(212,175,55,0.15)', color: '#D4AF37', fontWeight: 600 }}>Captain</span>}
                      </div>
                      <span style={{ fontSize: '12px', color: '#A99ECC', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>{user.city ? <><MapPin size={11} strokeWidth={2} /> {user.city}</> : `@${user.username}`}</span>
                    </div>
                    {/* Score circle */}
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', border: `2px solid ${sc}40`, background: `${sc}10`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: sc, lineHeight: 1 }}>{user.bestie_score >= 1000 ? '1k' : user.bestie_score}</span>
                      <span style={{ fontSize: '7px', color: '#A99ECC', letterSpacing: '0.5px', lineHeight: 1, marginTop: '1px' }}>BS</span>
                    </div>
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
