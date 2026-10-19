// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ProfileNav from '@/components/ProfileNav'
import { PageLoader } from '@/components/Loading'
import { Globe, MapPin, Moon, PartyPopper, Sparkles } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'

function isToday(ts: string | null): boolean {
  if (!ts) return false
  return new Date(ts).toDateString() === new Date().toDateString()
}

// Free Today expires at local midnight — a live countdown ("5h", "40m")
// makes the window feel real. Computed client-side from the viewer's clock.
function freeLeftLabel(now: number): string {
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  const mins = Math.max(1, Math.ceil((midnight.getTime() - now) / 60000))
  return mins >= 60 ? `${Math.floor(mins / 60)}h` : `${mins}m`
}

const WORLDWIDE_PREVIEW = 12

export default function PulsePage() {
  const [myCity, setMyCity] = useState<string | null>(null)
  const [myId, setMyId] = useState<string | null>(null)
  const [freeToday, setFreeToday] = useState<any[]>([])
  const [groupSessions, setGroupSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [iAmFree, setIAmFree] = useState(false)
  const [toggling, setToggling] = useState(false)

  // Ticks once a minute so the "free for Xh more" countdown stays fresh.
  const [now, setNow] = useState(() => Date.now())
  const [loadedDay] = useState(() => new Date().toDateString())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(t)
  }, [])
  // After midnight the loaded list is yesterday's — hide the countdown then.
  const freeLeft = new Date(now).toDateString() === loadedDay ? freeLeftLabel(now) : null

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setMyId(session.user.id)
        const { data: me } = await supabase.from('users').select('city, free_today_at').eq('id', session.user.id).single()
        if (me?.city) setMyCity(me.city)
        if (isToday(me?.free_today_at)) setIAmFree(true)
      }

      const now = new Date().toISOString()
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const [{ data: freePeople }, { data: sessions }] = await Promise.all([
        supabase.from('users')
          .select('id, full_name, username, avatar_url, city, free_today_at')
          .gte('free_today_at', todayStart.toISOString())
          .order('bestie_score', { ascending: false })
          .limit(20),
        supabase.from('group_sessions')
          .select('id, title, activity_type, scheduled_at, location, max_participants, status, host:users!host_id(full_name, username, avatar_url), participants:group_session_participants(count)')
          .in('status', ['open', 'full'])
          .gte('scheduled_at', now)
          .order('scheduled_at')
          .limit(12),
      ])

      setFreeToday(freePeople || [])
      setGroupSessions(sessions || [])
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
      setFreeToday(prev => prev.filter(u => u.id !== myId))
    } else {
      await supabase.from('users').update({ free_today_at: new Date().toISOString() }).eq('id', myId)
      setIAmFree(true)
    }
    setToggling(false)
  }

  // One deduplicated list of free people (excluding me), split city-first.
  // The two groups are disjoint, so nobody shows up in both sections.
  const todayFree = (() => {
    const seen = new Set<string>()
    return freeToday.filter(u => {
      if (!u?.id || u.id === myId || seen.has(u.id)) return false
      seen.add(u.id)
      return true
    })
  })()
  const isInMyCity = (u: any) => !!myCity && !!u.city?.toLowerCase().includes(myCity.toLowerCase())
  const cityFree = myCity ? todayFree.filter(isInMyCity) : []
  const otherFree = myCity ? todayFree.filter(u => !isInMyCity(u)) : todayFree
  const otherRemainder = Math.max(0, otherFree.length - WORLDWIDE_PREVIEW)

  // Header text links: enlarge the tap area to ~44px without shifting layout.
  const headerLink = { fontSize: '12px', color: '#D4AF37', textDecoration: 'none', padding: '14px 0', margin: '-14px 0' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <ProfileNav />
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(24px, 7vw, 34px)', color: 'var(--text-primary)', marginBottom: '6px', display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
            <Globe size={28} color="#D4AF37" strokeWidth={2} /> City Pulse
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            {myCity ? `What's happening in ${myCity} and around the world` : 'What\'s happening right now'}
          </p>
        </div>

        {/* Free today toggle */}
        {myId && (
          <div style={{ marginBottom: '32px', padding: '20px 24px', borderRadius: '20px', background: iAmFree ? 'rgba(52,211,153,0.06)' : 'var(--surface-1)', border: iAmFree ? '1px solid rgba(52,211,153,0.25)' : '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: '15px', fontWeight: 700, color: iAmFree ? '#34D399' : 'var(--text-primary)', marginBottom: '3px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: iAmFree ? '#34D399' : 'var(--text-dim)', display: 'inline-block' }} />
                {iAmFree ? 'You\'re free today' : 'Are you free today?'}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {iAmFree
                  ? <>Others can see you're available until midnight{freeLeft && <> · <span style={{ color: '#34D399', fontWeight: 600 }}>free for {freeLeft} more</span></>}</>
                  : 'Let others know you\'re up for a spontaneous meetup'}
              </p>
            </div>
            <button onClick={toggleFree} disabled={toggling} style={{ minHeight: '44px', padding: '0 22px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', background: iAmFree ? 'rgba(255,107,53,0.1)' : 'rgba(52,211,153,0.12)', border: iAmFree ? '1px solid rgba(255,107,53,0.3)' : '1px solid rgba(52,211,153,0.35)', color: iAmFree ? '#FF6B35' : '#34D399', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {toggling ? '…' : iAmFree ? 'Turn off' : (<><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34D399', display: 'inline-block' }} />I'm free today!</>)}
            </button>
          </div>
        )}

        {loading ? (
          <PageLoader fullscreen={false} message="Loading…" />
        ) : (
          <>
            {/* Free in your city */}
            {(cityFree.length > 0 || iAmFree) && (
              <section style={{ marginBottom: '36px' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: 'var(--text-muted)', marginBottom: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34D399', display: 'inline-block' }} />
                  FREE TODAY {myCity ? `· ${myCity.toUpperCase()}` : ''}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {cityFree.map(u => <FreePill key={u.id} user={u} left={freeLeft} />)}
                  {cityFree.length === 0 && (
                    /* Only reachable when I'm free and nobody else in my city is */
                    <div style={{ width: '100%' }}>
                      <EmptyState
                        Icon={MapPin}
                        title={myCity ? `You're the first one free in ${myCity}` : 'Add your city to see who’s free near you'}
                        description={myCity
                          ? 'Others nearby can see you until midnight. Start something small and see who joins.'
                          : 'Without a city we can’t tell who’s nearby — free people everywhere are listed below.'}
                        primaryCTA={myCity
                          ? { label: 'Host a group session', href: '/group-sessions/new' }
                          : { label: 'Add your city', href: '/profile/edit' }}
                        accent="green"
                      />
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Free elsewhere */}
            {otherFree.length > 0 && (
              <section style={{ marginBottom: '36px' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: 'var(--text-muted)', marginBottom: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34D399', display: 'inline-block' }} />
                  FREE TODAY · WORLDWIDE
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {otherFree.slice(0, WORLDWIDE_PREVIEW).map(u => <FreePill key={u.id} user={u} left={freeLeft} />)}
                  {otherRemainder > 0 && (
                    <Link href="/events?tab=free" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', padding: '0 14px', borderRadius: '16px', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--surface-1b)', border: '1px solid var(--border-strong)', textDecoration: 'none' }}>
                      +{otherRemainder} more
                    </Link>
                  )}
                </div>
              </section>
            )}

            {/* Nobody free (and I'm not either) — the toggle above is the fix */}
            {todayFree.length === 0 && !iAmFree && (
              <section style={{ marginBottom: '36px' }}>
                <EmptyState
                  Icon={Sparkles}
                  title="No Besties free yet today"
                  description="Be the first to flip Free Today — you'll show up on the map for everyone nearby."
                  primaryCTA={myId
                    ? { label: toggling ? '…' : "I'm free today", onClick: toggleFree }
                    : { label: 'Join Bestie', href: '/signup' }}
                  accent="green"
                />
              </section>
            )}

            {/* Upcoming Group Sessions */}
            {groupSessions.length > 0 && (
              <section style={{ marginBottom: '36px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}><PartyPopper size={12} color="#D4AF37" strokeWidth={2} /> UPCOMING GROUP SESSIONS</p>
                  <Link href="/group-sessions/new" style={headerLink}>+ Host one →</Link>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {groupSessions.map(gs => <GroupSessionCard key={gs.id} session={gs} />)}
                </div>
              </section>
            )}

          </>
        )}
      </div>
    </div>
  )
}

function FreePill({ user, left }: { user: any; left?: string | null }) {
  const initials = user.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  // Same neutral ring for everyone — a score-tinted ring would leak rank to others.
  return (
    <Link href={`/${user.username}`} title={left ? `Free until midnight · ${left} left` : undefined} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '16px', background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.18)', textDecoration: 'none', transition: 'all 0.15s' }}>
      <div style={{ position: 'relative' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '12px', overflow: 'hidden', background: 'var(--surface-3)', border: '1.5px solid rgba(212,175,55,0.25)', flexShrink: 0 }}>
          {user.avatar_url
            ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#D4AF37' }}>{initials}</div>
          }
        </div>
        <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '10px', height: '10px', borderRadius: '50%', background: '#34D399', border: '1.5px solid var(--bg)' }} />
      </div>
      <div>
        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{user.full_name?.split(' ')[0]}</p>
        {(user.city || left) && (
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            {user.city}
            {user.city && left ? ' · ' : ''}
            {left && <span style={{ color: '#34D399' }}>{left} left</span>}
          </p>
        )}
      </div>
    </Link>
  )
}

function GroupSessionCard({ session }: { session: any }) {
  const d = new Date(session.scheduled_at)
  const participantCount = session.participants?.[0]?.count || 0
  const isFull = session.status === 'full'
  const host = session.host
  return (
    <Link href={`/group-sessions/${session.id}`} style={{ display: 'flex', gap: '14px', padding: '16px', borderRadius: '16px', background: 'var(--surface-1)', border: '1px solid var(--border)', textDecoration: 'none', transition: 'all 0.15s' }}>
      <div style={{ flexShrink: 0, width: '52px', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#D4AF37', letterSpacing: '1px' }}>{d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</p>
        <p style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>{d.getDate()}</p>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.title}</p>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {session.location && <><MapPin size={11} strokeWidth={2} /> {session.location} · </>}
          by {host?.full_name?.split(' ')[0]}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '999px', background: isFull ? 'rgba(255,107,53,0.1)' : 'rgba(52,211,153,0.08)', border: isFull ? '1px solid rgba(255,107,53,0.25)' : '1px solid rgba(52,211,153,0.2)', color: isFull ? '#FF6B35' : '#34D399' }}>
            {isFull ? 'Full' : 'Open'}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{participantCount}{session.max_participants ? `/${session.max_participants}` : ''} joined</span>
        </div>
      </div>
    </Link>
  )
}
