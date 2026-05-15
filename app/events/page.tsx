// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ProfileNav from '@/components/ProfileNav'
import BottomNav from '@/components/BottomNav'

const ACTIVITY_EMOJI: Record<string, string> = {
  hiking: '🥾', running: '🏃', gym_partner: '💪', cycling: '🚴', yoga: '🧘', climbing: '🧗',
  swimming: '🏊', cold_plunge: '🧊', martial_arts: '🥋',
  game_night: '🎮', movie_night: '🎬', night_out: '🍸', karaoke: '🎤', festival_crew: '🎪',
  travel_buddy: '✈️', wing_person: '😎', comedy_show: '😂', bar_hopping: '🍺',
  deep_chat: '🫂', book_club: '📚', debate_club: '🗣️', language_exchange: '🌐',
  career_talk: '💼', money_talk: '💰', journaling: '📓',
  cooking_together: '🍳', dance: '💃', art_together: '🎨', music_lesson: '🎸',
  photography_walk: '📸', improv_acting: '🎭', writing_club: '✍️',
  meditation_circle: '🧘', breathwork: '🌬️', cacao_ceremony: '🍫', sound_healing: '🔔',
  coffee_chat: '☕', coworking: '💻', digital_detox_walk: '📵',
  vent_session: '💬', hype_person: '🔥', grief_support: '🤍',
  meet_irl: '🤝', real_talk: '💬', vibe_call: '📱',
}

function isToday(ts: string | null): boolean {
  if (!ts) return false
  return new Date(ts).toDateString() === new Date().toDateString()
}

function formatDate(dt: string) {
  const d = new Date(dt)
  const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
  const day = d.getDate()
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  return { month, day, time }
}

type Tab = 'all' | 'crew' | 'group' | 'free'

export default function EventsPage() {
  const [myId, setMyId] = useState<string | null>(null)
  const [myCity, setMyCity] = useState<string | null>(null)
  const [iAmFree, setIAmFree] = useState(false)
  const [toggling, setToggling] = useState(false)

  const [crewEvents, setCrewEvents] = useState<any[]>([])
  const [groupSessions, setGroupSessions] = useState<any[]>([])
  const [freeToday, setFreeToday] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('all')

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setMyId(session.user.id)
        const { data: me } = await supabase.from('users')
          .select('city, free_today_at').eq('id', session.user.id).single()
        if (me?.city) setMyCity(me.city)
        if (isToday(me?.free_today_at)) setIAmFree(true)
      }

      const now = new Date().toISOString()
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)

      const [{ data: ce }, { data: gs }, { data: fp }] = await Promise.all([
        supabase.from('crew_events')
          .select('id, title, description, datetime, location, max_attendees, crew:crews(id, name, slug, avatar_url), attendees:crew_event_attendees(count)')
          .gte('datetime', now)
          .order('datetime')
          .limit(20),

        supabase.from('group_sessions')
          .select('id, title, activity_type, scheduled_at, location, max_participants, status, host:users!host_id(id, full_name, username, avatar_url), participants:group_session_participants(count)')
          .in('status', ['open', 'full'])
          .gte('scheduled_at', now)
          .order('scheduled_at')
          .limit(20),

        supabase.from('users')
          .select('id, full_name, username, avatar_url, bestie_score, city, free_today_at')
          .gte('free_today_at', todayStart.toISOString())
          .order('bestie_score', { ascending: false })
          .limit(24),
      ])

      setCrewEvents(ce || [])
      setGroupSessions(gs || [])
      setFreeToday(fp || [])
      setLoading(false)
    }
    init()
  }, [])

  const toggleFree = async () => {
    if (!myId) return
    setToggling(true)
    if (iAmFree) {
      await supabase.from('users').update({ free_today_at: null }).eq('id', myId)
      setIAmFree(false)
    } else {
      await supabase.from('users').update({ free_today_at: new Date().toISOString() }).eq('id', myId)
      setIAmFree(true)
    }
    setToggling(false)
  }

  const freePeople = freeToday.filter(u => u.id !== myId)
  const cityFree = myCity ? freePeople.filter(u => u.city?.toLowerCase().includes(myCity.toLowerCase())) : []
  const otherFree = myCity ? freePeople.filter(u => !u.city?.toLowerCase().includes(myCity.toLowerCase())) : freePeople

  const totalEvents = crewEvents.length + groupSessions.length

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'all', label: 'All', count: totalEvents },
    { id: 'crew', label: '👥 Crew Events', count: crewEvents.length },
    { id: 'group', label: '🎉 Group Sessions', count: groupSessions.length },
    { id: 'free', label: '🟢 Free Today', count: freePeople.length },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#080810', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'rgba(8,8,16,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <ProfileNav />
      </nav>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '28px 16px 100px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', gap: '12px' }}>
          <div>
            <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(26px, 7vw, 34px)', color: '#E8E0FF', marginBottom: '4px' }}>
              Events
            </h1>
            <p style={{ fontSize: '13px', color: '#9B93C0' }}>
              {loading ? 'Loading...' : `${totalEvents} upcoming · ${freePeople.length} free today`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <Link
              href="/group-sessions/new"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              + Host
            </Link>
          </div>
        </div>

        {/* Free Today toggle */}
        {myId && (
          <div style={{ marginBottom: '20px', padding: '14px 18px', borderRadius: '16px', background: iAmFree ? 'rgba(57,255,20,0.06)' : 'rgba(255,255,255,0.03)', border: iAmFree ? '1px solid rgba(57,255,20,0.22)' : '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: iAmFree ? '#39FF14' : '#E8E0FF', margin: 0 }}>
                {iAmFree ? '🟢 You\'re free today' : '⚪ Free today?'}
              </p>
              <p style={{ fontSize: '11px', color: '#9B93C0', marginTop: '2px' }}>
                {iAmFree ? 'Visible to others for spontaneous meetups' : 'Let Besties know you\'re available'}
              </p>
            </div>
            <button
              onClick={toggleFree}
              disabled={toggling}
              style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', background: iAmFree ? 'rgba(255,107,53,0.1)' : 'rgba(57,255,20,0.12)', border: iAmFree ? '1px solid rgba(255,107,53,0.3)' : '1px solid rgba(57,255,20,0.35)', color: iAmFree ? '#FF6B35' : '#39FF14', whiteSpace: 'nowrap', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              {toggling ? '…' : iAmFree ? 'Turn off' : "I'm free!"}
            </button>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flexShrink: 0, padding: '7px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', whiteSpace: 'nowrap',
                background: tab === t.id ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)',
                border: tab === t.id ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.08)',
                color: tab === t.id ? '#D4AF37' : '#9B93C0',
              }}
            >
              {t.label}
              {t.count != null && t.count > 0 && (
                <span style={{ marginLeft: '6px', background: tab === t.id ? 'rgba(212,175,55,0.25)' : 'rgba(255,255,255,0.08)', borderRadius: '6px', padding: '1px 6px', fontSize: '11px' }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid rgba(212,175,55,0.2)', borderTop: '3px solid #D4AF37', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

            {/* FREE TODAY section */}
            {(tab === 'all' || tab === 'free') && (
              <section>
                <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#9B93C0', marginBottom: '12px' }}>
                  🟢 FREE TODAY{myCity ? ` · ${myCity.toUpperCase()}` : ''}
                </p>

                {freePeople.length === 0 ? (
                  <div style={{ padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                    <p style={{ fontSize: '13px', color: '#9B93C0' }}>No one is free today yet — be the first! 👆</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {(cityFree.length > 0 ? cityFree : freePeople).slice(0, 8).map(u => (
                      <FreePill key={u.id} user={u} />
                    ))}
                    {(cityFree.length === 0 && otherFree.length > 0) && otherFree.slice(0, 8).map(u => (
                      <FreePill key={u.id} user={u} />
                    ))}
                    {freePeople.length > 8 && (
                      <button
                        onClick={() => setTab('free')}
                        style={{ padding: '8px 14px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, color: '#9B93C0', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                      >
                        +{freePeople.length - 8} more
                      </button>
                    )}
                  </div>
                )}

                {/* All free people when tab = free */}
                {tab === 'free' && freePeople.length > 8 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                    {freePeople.slice(8).map(u => <FreePill key={u.id} user={u} />)}
                  </div>
                )}
              </section>
            )}

            {/* CREW EVENTS section */}
            {(tab === 'all' || tab === 'crew') && (
              <section>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#9B93C0' }}>👥 CREW EVENTS</p>
                  <Link href="/crews" style={{ fontSize: '12px', color: '#D4AF37', textDecoration: 'none' }}>Browse crews →</Link>
                </div>

                {crewEvents.length === 0 ? (
                  <div style={{ padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                    <p style={{ fontSize: '13px', color: '#9B93C0', marginBottom: '10px' }}>No crew events scheduled yet</p>
                    <Link href="/crews" style={{ fontSize: '13px', color: '#D4AF37', textDecoration: 'none', fontWeight: 600 }}>Join a crew to see their events →</Link>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {crewEvents.map(e => <CrewEventCard key={e.id} event={e} />)}
                  </div>
                )}
              </section>
            )}

            {/* GROUP SESSIONS section */}
            {(tab === 'all' || tab === 'group') && (
              <section>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#9B93C0' }}>🎉 GROUP SESSIONS</p>
                  <Link href="/group-sessions/new" style={{ fontSize: '12px', color: '#D4AF37', textDecoration: 'none' }}>+ Host one →</Link>
                </div>

                {groupSessions.length === 0 ? (
                  <div style={{ padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                    <p style={{ fontSize: '13px', color: '#9B93C0', marginBottom: '10px' }}>No open group sessions yet</p>
                    <Link href="/group-sessions/new" style={{ fontSize: '13px', color: '#D4AF37', textDecoration: 'none', fontWeight: 600 }}>Host the first one →</Link>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {groupSessions.map(gs => <GroupSessionCard key={gs.id} session={gs} activityEmoji={ACTIVITY_EMOJI} />)}
                  </div>
                )}
              </section>
            )}

          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FreePill({ user }: { user: any }) {
  const initials = user.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  const sc = (user.bestie_score || 0) >= 800 ? '#39FF14' : (user.bestie_score || 0) >= 600 ? '#D4AF37' : '#9B93C0'
  return (
    <Link href={`/${user.username}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '12px', background: 'rgba(57,255,20,0.05)', border: '1px solid rgba(57,255,20,0.16)', textDecoration: 'none' }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', overflow: 'hidden', background: '#1a1a35', border: `1.5px solid ${sc}40` }}>
          {user.avatar_url
            ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: sc }}>{initials}</div>
          }
        </div>
        <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '9px', height: '9px', borderRadius: '50%', background: '#39FF14', border: '1.5px solid #080810' }} />
      </div>
      <div>
        <p style={{ fontSize: '12px', fontWeight: 600, color: '#E8E0FF', margin: 0 }}>{user.full_name?.split(' ')[0]}</p>
        {user.city && <p style={{ fontSize: '10px', color: '#9B93C0', margin: 0 }}>{user.city}</p>}
      </div>
    </Link>
  )
}

function CrewEventCard({ event }: { event: any }) {
  const { month, day, time } = formatDate(event.datetime)
  const attendeeCount = event.attendees?.[0]?.count || 0
  const isFull = event.max_attendees && attendeeCount >= event.max_attendees
  const crew = event.crew

  return (
    <Link href={`/events/${event.id}`} style={{ display: 'flex', gap: '14px', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', textDecoration: 'none' }}>
      {/* Date block */}
      <div style={{ flexShrink: 0, width: '44px', textAlign: 'center', paddingTop: '2px' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, color: '#D4AF37', letterSpacing: '1px' }}>{month}</p>
        <p style={{ fontFamily: 'DM Serif Display, serif', fontSize: '24px', fontWeight: 700, color: '#E8E0FF', lineHeight: 1 }}>{day}</p>
        <p style={{ fontSize: '10px', color: '#9B93C0' }}>{time}</p>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '14px', fontWeight: 700, color: '#E8E0FF', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</p>
        {event.description && (
          <p className="line-clamp-2" style={{ fontSize: '12px', color: '#9B93C0', marginBottom: '8px' }}>{event.description}</p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {crew && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#9B8FFF', fontWeight: 600 }}>
              {crew.avatar_url && <img src={crew.avatar_url} alt="" style={{ width: '16px', height: '16px', borderRadius: '4px', objectFit: 'cover' }} />}
              {crew.name}
            </span>
          )}
          {event.location && <span style={{ fontSize: '11px', color: '#9B93C0' }}>📍 {event.location}</span>}
          <span style={{ fontSize: '11px', color: isFull ? '#FF6B35' : '#9B93C0' }}>
            👥 {attendeeCount}{event.max_attendees ? `/${event.max_attendees}` : ''}
            {isFull && ' · Full'}
          </span>
        </div>
      </div>
    </Link>
  )
}

function GroupSessionCard({ session, activityEmoji }: { session: any; activityEmoji: Record<string, string> }) {
  const { month, day, time } = formatDate(session.scheduled_at)
  const participantCount = session.participants?.[0]?.count || 0
  const isFull = session.status === 'full'
  const emoji = activityEmoji[session.activity_type] || '🎉'
  const host = session.host

  return (
    <Link href={`/group-sessions/${session.id}`} style={{ display: 'flex', gap: '14px', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', textDecoration: 'none' }}>
      {/* Date block */}
      <div style={{ flexShrink: 0, width: '44px', textAlign: 'center', paddingTop: '2px' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, color: '#D4AF37', letterSpacing: '1px' }}>{month}</p>
        <p style={{ fontFamily: 'DM Serif Display, serif', fontSize: '24px', fontWeight: 700, color: '#E8E0FF', lineHeight: 1 }}>{day}</p>
        <p style={{ fontSize: '10px', color: '#9B93C0' }}>{time}</p>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <span style={{ fontSize: '16px' }}>{emoji}</span>
          <p style={{ fontSize: '14px', fontWeight: 700, color: '#E8E0FF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{session.title}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {host && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#9B93C0' }}>
              {host.avatar_url && <img src={host.avatar_url} alt="" style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover' }} />}
              by {host.full_name?.split(' ')[0]}
            </span>
          )}
          {session.location && <span style={{ fontSize: '11px', color: '#9B93C0' }}>📍 {session.location}</span>}
          <span style={{ fontSize: '11px', color: isFull ? '#FF6B35' : '#9B93C0' }}>
            👥 {participantCount}{session.max_participants ? `/${session.max_participants}` : ''}
          </span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: isFull ? '#FF6B35' : '#39FF14', background: isFull ? 'rgba(255,107,53,0.1)' : 'rgba(57,255,20,0.08)', padding: '2px 8px', borderRadius: '6px', border: isFull ? '1px solid rgba(255,107,53,0.25)' : '1px solid rgba(57,255,20,0.2)' }}>
            {isFull ? 'Full' : 'Open'}
          </span>
        </div>
      </div>
    </Link>
  )
}
