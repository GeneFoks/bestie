// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ProfileNav from '@/components/ProfileNav'
import { Users, UsersRound, Calendar, MapPin, Plus, ArrowUp, Sparkles, Cake, Zap, Trash2, Repeat, ChevronRight, UserPlus } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { CardSkeleton, SkeletonList } from '@/components/Loading'
import { ActivityIcon } from '@/lib/activityIcons'
import CreateEventButton from '@/components/CreateEventButton'
import { showToast } from '@/components/Toast'
import { confirmSheet } from '@/components/ConfirmSheet'

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

// Free Today expires at local midnight — a live countdown ("5h", "40m")
// makes the window feel real. Computed client-side from the viewer's clock.
function freeLeftLabel(now: number): string {
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  const mins = Math.max(1, Math.ceil((midnight.getTime() - now) / 60000))
  return mins >= 60 ? `${Math.floor(mins / 60)}h` : `${mins}m`
}

type Tab = 'all' | 'birthday' | 'crew' | 'group' | 'free'
const TAB_IDS: Tab[] = ['all', 'birthday', 'crew', 'group', 'free']
const FREE_PREVIEW = 8

export default function EventsPage() {
  const [myId, setMyId] = useState<string | null>(null)
  const [myCity, setMyCity] = useState<string | null>(null)
  const [myUsername, setMyUsername] = useState<string | null>(null)
  const [iAmFree, setIAmFree] = useState(false)
  const [toggling, setToggling] = useState(false)

  const [crewEvents, setCrewEvents] = useState<any[]>([])
  const [groupSessions, setGroupSessions] = useState<any[]>([])
  const [birthdays, setBirthdays] = useState<any[]>([])
  const [freeToday, setFreeToday] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('all')

  // Ticks once a minute so the "free for Xh more" countdown stays fresh.
  const [now, setNow] = useState(() => Date.now())
  const [loadedDay] = useState(() => new Date().toDateString())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(t)
  }, [])
  // After midnight the loaded list is yesterday's — hide the countdown then.
  const freeLeft = new Date(now).toDateString() === loadedDay ? freeLeftLabel(now) : null

  // Deep link: /events?tab=free (used by Pulse "+N more")
  useEffect(() => {
    try {
      const t = new URLSearchParams(window.location.search).get('tab') as Tab | null
      if (t && TAB_IDS.includes(t)) setTab(t)
    } catch {}
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setMyId(session.user.id)
        const { data: me } = await supabase.from('users')
          .select('city, free_today_at, username').eq('id', session.user.id).single()
        if (me?.city) setMyCity(me.city)
        if (me?.username) setMyUsername(me.username)
        if (isToday(me?.free_today_at)) setIAmFree(true)
      }

      const now = new Date().toISOString()
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)

      const [{ data: ce }, { data: gs }, { data: fp }, { data: bd }] = await Promise.all([
        supabase.from('crew_events')
          .select('id, title, description, datetime, location, max_attendees, crew:crews(id, name, slug, avatar_url), attendees:crew_event_attendees(count)')
          .gte('datetime', now)
          .order('datetime')
          .limit(20),

        supabase.from('group_sessions')
          .select('id, title, activity_type, scheduled_at, location, max_participants, status, series_id, recurrence, cover_image_url, host:users!host_id(id, full_name, username, avatar_url), participants:group_session_participants(count)')
          .in('status', ['open', 'full'])
          .gte('scheduled_at', now)
          .order('scheduled_at')
          .limit(20),

        supabase.from('users')
          .select('id, full_name, username, avatar_url, city, free_today_at')
          .gte('free_today_at', todayStart.toISOString())
          .order('bestie_score', { ascending: false })
          .limit(24),

        supabase.from('birthday_events')
          .select('id, celebrant, title, event_date, location, cover_image, share_slug, guests:birthday_guests(count)')
          .gte('event_date', new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString())
          .order('event_date')
          .limit(20),
      ])

      setCrewEvents(ce || [])
      // Collapse recurring series to one card — the nearest upcoming occurrence.
      // Query is ordered by scheduled_at asc, so the first hit per series wins.
      const seenSeries = new Set<string>()
      setGroupSessions((gs || []).filter((s: any) => {
        const key = s.series_id || s.id
        if (seenSeries.has(key)) return false
        seenSeries.add(key)
        return true
      }))
      setFreeToday(fp || [])
      setBirthdays(bd || [])
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

  // ONE deduplicated, city-first list of free people (excluding me). Both the
  // preview row and the expanded Free Today tab render from this array, and
  // "+N more" is its remainder — so nobody appears twice or gets skipped.
  const isInMyCity = (u: any) => !!myCity && !!u.city?.toLowerCase().includes(myCity.toLowerCase())
  const dedupedFree = (() => {
    const seen = new Set<string>()
    return freeToday.filter(u => {
      if (!u?.id || u.id === myId || seen.has(u.id)) return false
      seen.add(u.id)
      return true
    })
  })()
  const cityFree = myCity ? dedupedFree.filter(isInMyCity) : []
  const otherFree = myCity ? dedupedFree.filter(u => !isInMyCity(u)) : dedupedFree
  const freePeople = [...cityFree, ...otherFree]
  const freeSplit = cityFree.length > 0 && otherFree.length > 0
  const freeRemainder = Math.max(0, freePeople.length - FREE_PREVIEW)

  const totalEvents = crewEvents.length + groupSessions.length + birthdays.length
  const allEmpty = totalEvents === 0 && freePeople.length === 0

  // How many event cards the current tab renders — the invite banner sits
  // after the last one, so it only shows when there is at least one.
  const shownEventCount =
    tab === 'all' ? totalEvents
    : tab === 'birthday' ? birthdays.length
    : tab === 'crew' ? crewEvents.length
    : tab === 'group' ? groupSessions.length
    : 0

  // City-first split: items matching myCity go under an "In {city}" divider,
  // the rest under "Everywhere else" — only when both groups are non-empty.
  const splitByCity = (items: any[], getLoc: (x: any) => string | null | undefined) => {
    if (!myCity) return { inCity: [] as any[], elsewhere: items, split: false }
    const q = myCity.toLowerCase()
    const inCity = items.filter(x => getLoc(x)?.toLowerCase().includes(q))
    const elsewhere = items.filter(x => !getLoc(x)?.toLowerCase().includes(q))
    return { inCity, elsewhere, split: inCity.length > 0 && elsewhere.length > 0 }
  }

  const TABS: { id: Tab; label: string; Icon?: any; count?: number }[] = [
    { id: 'all',      label: 'All',                              count: totalEvents },
    { id: 'birthday', label: 'Birthdays',      Icon: Cake,       count: birthdays.length },
    { id: 'crew',     label: 'Crew Events',    Icon: Users,      count: crewEvents.length },
    { id: 'group',    label: 'Group Sessions', Icon: UsersRound, count: groupSessions.length },
    { id: 'free',     label: 'Free Today',                       count: freePeople.length },
  ]

  // Header text links: enlarge the tap area to ~44px without shifting layout.
  const headerLink = { fontSize: '12px', textDecoration: 'none', padding: '14px 0', margin: '-14px 0' }
  // Inline links inside empty boxes: inline padding grows the hit area only.
  const inlineLink = { fontSize: '13px', textDecoration: 'none', fontWeight: 600, padding: '12px 4px' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <ProfileNav />
      </nav>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '28px 16px 100px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', gap: '12px' }}>
          <div>
            <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(26px, 7vw, 34px)', color: 'var(--text-primary)', marginBottom: '4px' }}>
              Events
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {loading ? 'Loading...' : `${totalEvents} upcoming · ${freePeople.length} free today`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'stretch' }}>
            <Link href="/group-sessions/mine" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', boxSizing: 'border-box', fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none', padding: '0 12px', borderRadius: '12px', border: '1px solid var(--border-strong)', whiteSpace: 'nowrap' }}>My sessions</Link>
            <CreateEventButton variant="compact" />
          </div>
        </div>

        {/* Free Today toggle */}
        {myId && (
          <div style={{ marginBottom: '20px', padding: '14px 18px', borderRadius: '16px', background: iAmFree ? 'rgba(52,211,153,0.06)' : 'var(--surface-1)', border: iAmFree ? '1px solid rgba(52,211,153,0.22)' : '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: iAmFree ? '#34D399' : 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: iAmFree ? '#34D399' : 'transparent', border: iAmFree ? 'none' : '2px solid var(--text-muted)', boxShadow: iAmFree ? '0 0 10px rgba(52,211,153,0.7)' : 'none' }} />
                {iAmFree ? "You're free today" : 'Free today?'}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {iAmFree
                  ? <>Visible to others until midnight{freeLeft && <> · <span style={{ color: '#34D399', fontWeight: 600 }}>free for {freeLeft} more</span></>}</>
                  : 'Let Besties know you\'re available'}
              </p>
            </div>
            <button
              onClick={toggleFree}
              disabled={toggling}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: '44px', padding: '0 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', background: iAmFree ? 'rgba(255,107,53,0.1)' : 'rgba(52,211,153,0.12)', border: iAmFree ? '1px solid rgba(255,107,53,0.3)' : '1px solid rgba(52,211,153,0.35)', color: iAmFree ? '#FF6B35' : '#34D399', whiteSpace: 'nowrap', fontFamily: 'Plus Jakarta Sans, sans-serif', flexShrink: 0 }}
            >
              {toggling ? '…' : iAmFree ? 'Turn off' : "I'm free!"}
            </button>
          </div>
        )}

        {/* Going to — quick entry into "what I'm up to" */}
        <Link href="/going-to" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '16px', background: 'var(--surface-1)', border: '1px solid var(--border)', textDecoration: 'none', marginBottom: '20px' }}>
          <span style={{ width: '34px', height: '34px', borderRadius: '12px', background: 'rgba(155,127,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Zap size={17} color="#9B7FFF" strokeWidth={1.9} /></span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Going to…</span>
            <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)' }}>Share what you're up to & see who's out</span>
          </span>
          <ChevronRight size={16} color="var(--text-muted)" strokeWidth={2} style={{ flexShrink: 0 }} />
        </Link>

        {/* Tabs — sticky under the top nav. Selected = neutral elevated (gold is
            reserved for the primary CTA); counts are small muted numbers. */}
        <div className="filters-scroll" role="tablist" style={{ display: 'flex', gap: '8px', margin: '0 -16px 20px', padding: '10px 16px', overflowX: 'auto', position: 'sticky', top: '66px', zIndex: 40, background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
          {TABS.map(t => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                style={{
                  flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '6px',
                  minHeight: '44px', padding: '0 14px', borderRadius: '12px', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', whiteSpace: 'nowrap',
                  background: active ? 'var(--surface-3)' : 'var(--surface-1b)',
                  border: active ? '1px solid var(--border-strong)' : '1px solid var(--border)',
                  color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                {t.id === 'free' && (
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: active ? '#34D399' : 'var(--text-muted)', boxShadow: active ? '0 0 8px rgba(52,211,153,0.6)' : 'none' }} />
                )}
                {t.Icon && <t.Icon size={14} strokeWidth={1.8} />}
                {t.label}
                {t.count != null && t.count > 0 && (
                  <span style={{ fontSize: '11px', fontWeight: 600, color: active ? 'var(--text-muted)' : 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>
                    {t.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {loading ? (
          /* Skeleton feed matching the real layout: free-today pills + event cards */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div>
              <CardSkeleton width={140} height={12} radius={8} style={{ marginBottom: '12px' }} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <CardSkeleton key={i} width={124} height={48} radius={12} />
                ))}
              </div>
            </div>
            <div>
              <CardSkeleton width={140} height={12} radius={8} style={{ marginBottom: '12px' }} />
              <SkeletonList count={3} height={104} gap={10} />
            </div>
            <div>
              <CardSkeleton width={140} height={12} radius={8} style={{ marginBottom: '12px' }} />
              <SkeletonList count={2} height={104} gap={10} />
            </div>
          </div>
        ) : tab === 'all' && allEmpty ? (
          /* One composite hero instead of a stack of empty boxes */
          <div style={{ padding: '44px 24px', borderRadius: '20px', background: 'linear-gradient(160deg, rgba(212,175,55,0.08) 0%, rgba(155,127,255,0.06) 55%, var(--surface-1) 100%)', border: '1px solid var(--border-strong)', textAlign: 'center' }}>
            <Sparkles size={26} color="#D4AF37" strokeWidth={1.6} style={{ marginBottom: '14px' }} />
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(22px, 6vw, 28px)', color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.2 }}>
              This week in {myCity || 'your city'} is yours to start
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 22px', lineHeight: 1.6 }}>
              Nothing on the calendar yet — which means the first move is yours. Host something small and see who shows up.
            </p>
            {/* The header "Create event" is this screen's one gold CTA — these stay tinted. */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/group-sessions/new" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', fontSize: '13px', fontWeight: 700, padding: '0 18px', borderRadius: '12px', border: '1px solid rgba(155,127,255,0.4)', background: 'rgba(155,127,255,0.14)', color: '#9B7FFF', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                Host a group session
              </Link>
              <Link href="/birthday/new" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', fontSize: '13px', fontWeight: 600, padding: '0 18px', borderRadius: '12px', border: '1px solid rgba(255,107,53,0.35)', background: 'rgba(255,107,53,0.08)', color: '#FF6B35', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                🎂 Create a birthday page
              </Link>
              <Link href="/crews" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', fontSize: '13px', fontWeight: 600, padding: '0 18px', borderRadius: '12px', border: '1px solid var(--border-strong)', color: 'var(--text-muted)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                Browse crews
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

            {/* FREE TODAY section — skipped on All when empty */}
            {(tab === 'free' || (tab === 'all' && freePeople.length > 0)) && (
              <section>
                <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#34D399', boxShadow: '0 0 8px rgba(52,211,153,0.6)' }} />
                  FREE TODAY{myCity ? ` · ${myCity.toUpperCase()}` : ''}
                </p>

                {freePeople.length === 0 ? (
                  <EmptyState
                    Icon={Sparkles}
                    title={iAmFree ? "You're the first one free today" : 'No one is free today yet'}
                    description={iAmFree
                      ? 'Others see you on Pulse and the map until midnight. Invite a friend to make it a plan.'
                      : 'Be the first in your city — the moment you flip Free Today, others see you on Pulse and the map.'}
                    accent="green"
                  />
                ) : tab === 'free' ? (
                  /* Expanded tab: the full deduped list, city-first */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {freeSplit && <CityLabel text={`In ${myCity}`} />}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {(freeSplit ? cityFree : freePeople).map(u => <FreePill key={u.id} user={u} left={freeLeft} />)}
                    </div>
                    {freeSplit && <CityLabel text="Everywhere else" />}
                    {freeSplit && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {otherFree.map(u => <FreePill key={u.id} user={u} left={freeLeft} />)}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Preview row on All: first N of the same list + remainder */
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {freePeople.slice(0, FREE_PREVIEW).map(u => (
                      <FreePill key={u.id} user={u} left={freeLeft} />
                    ))}
                    {freeRemainder > 0 && (
                      <button
                        onClick={() => setTab('free')}
                        style={{ minHeight: '44px', padding: '0 14px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--surface-1b)', border: '1px solid var(--border-strong)', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                      >
                        +{freeRemainder} more
                      </button>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* BIRTHDAYS section — skipped on All when empty */}
            {(tab === 'birthday' || (tab === 'all' && birthdays.length > 0)) && (
              <section>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}><Cake size={13} strokeWidth={2} /> BIRTHDAYS</p>
                  <Link href="/birthday/new" style={{ ...headerLink, color: '#FF6B35' }}>+ Create one →</Link>
                </div>

                {birthdays.length === 0 ? (
                  <div style={{ padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px' }}>No birthdays coming up</p>
                    <Link href="/birthday/new" style={{ ...inlineLink, color: '#FF6B35' }}>🎂 Create a birthday page →</Link>
                  </div>
                ) : (() => {
                  const { inCity, elsewhere, split } = splitByCity(birthdays, b => b.location)
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {split && <CityLabel text={`In ${myCity}`} />}
                      {(split ? inCity : birthdays).map(b => <BirthdayCard key={b.id} bday={b} />)}
                      {split && <CityLabel text="Everywhere else" />}
                      {split && elsewhere.map(b => <BirthdayCard key={b.id} bday={b} />)}
                    </div>
                  )
                })()}
              </section>
            )}

            {/* CREW EVENTS section — skipped on All when empty */}
            {(tab === 'crew' || (tab === 'all' && crewEvents.length > 0)) && (
              <section>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={13} strokeWidth={2} /> CREW EVENTS</p>
                  <Link href="/crews" style={{ ...headerLink, color: '#D4AF37' }}>Browse crews →</Link>
                </div>

                {crewEvents.length === 0 ? (
                  <div style={{ padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px' }}>No crew events scheduled yet</p>
                    <Link href="/crews" style={{ ...inlineLink, color: '#D4AF37' }}>Join a crew to see their events →</Link>
                  </div>
                ) : (() => {
                  const { inCity, elsewhere, split } = splitByCity(crewEvents, e => e.location)
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {split && <CityLabel text={`In ${myCity}`} />}
                      {(split ? inCity : crewEvents).map(e => <CrewEventCard key={e.id} event={e} />)}
                      {split && <CityLabel text="Everywhere else" />}
                      {split && elsewhere.map(e => <CrewEventCard key={e.id} event={e} />)}
                    </div>
                  )
                })()}
              </section>
            )}

            {/* GROUP SESSIONS section — skipped on All when empty */}
            {(tab === 'group' || (tab === 'all' && groupSessions.length > 0)) && (
              <section>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}><UsersRound size={13} strokeWidth={2} /> GROUP SESSIONS</p>
                  <Link href="/group-sessions/new" style={{ ...headerLink, color: '#D4AF37' }}>+ Host one →</Link>
                </div>

                {groupSessions.length === 0 ? (
                  <div style={{ padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px' }}>No open group sessions yet</p>
                    <Link href="/group-sessions/new" style={{ ...inlineLink, color: '#D4AF37' }}>Host the first one →</Link>
                  </div>
                ) : (() => {
                  const { inCity, elsewhere, split } = splitByCity(groupSessions, s => s.location)
                  const renderCard = (gs: any) => (
                    <GroupSessionCard
                      key={gs.id}
                      session={gs}
                      canDelete={!!myId && gs.host?.id === myId}
                      onDeleted={id => setGroupSessions(prev => prev.filter(x => x.id !== id))}
                    />
                  )
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {split && <CityLabel text={`In ${myCity}`} />}
                      {(split ? inCity : groupSessions).map(renderCard)}
                      {split && <CityLabel text="Everywhere else" />}
                      {split && elsewhere.map(renderCard)}
                    </div>
                  )
                })()}
              </section>
            )}

            {/* Invite loop — after the last event card */}
            {shownEventCount > 0 && <InviteBanner username={myUsername} />}

          </div>
        )}
      </div>

      <CreateEventButton variant="fab" />
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CityLabel({ text }: { text: string }) {
  return (
    <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '2px 0 -2px' }}>{text}</p>
  )
}

// Slim invite banner. With a username it opens the native share sheet (or
// copies the link) for /invite/{username}; otherwise it links to /signup.
function InviteBanner({ username }: { username: string | null }) {
  const router = useRouter()
  const href = username ? `/invite/${username}` : '/signup'

  const handleClick = async (e: React.MouseEvent) => {
    if (!username || typeof window === 'undefined') return // plain navigation
    const url = `${window.location.origin}/invite/${username}`
    const text = 'Join me on Bestie — real people, real moments. Sign up with my link and we both get +10 Sparks ⚡'
    if (typeof navigator !== 'undefined' && navigator.share) {
      e.preventDefault()
      try { await navigator.share({ title: 'Join me on Bestie', text, url }) } catch {}
      return
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      e.preventDefault()
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`)
        showToast('Invite link copied — send it to a friend', { type: 'success' })
      } catch {
        router.push(href)
      }
    }
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      style={{ display: 'flex', alignItems: 'center', gap: '12px', minHeight: '44px', padding: '10px 14px', marginTop: '-14px', borderRadius: '16px', background: 'rgba(155,127,255,0.06)', border: '1px solid rgba(155,127,255,0.2)', textDecoration: 'none' }}
    >
      <span style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(155,127,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <UserPlus size={16} color="#9B7FFF" strokeWidth={1.9} />
      </span>
      <span style={{ flex: 1, minWidth: 0, fontSize: '13px', lineHeight: 1.4 }}>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Know someone who'd love this?</span>{' '}
        <span style={{ color: 'var(--text-muted)' }}>Invite them — you both get +10 ✨</span>
      </span>
      <ChevronRight size={16} color="var(--text-muted)" strokeWidth={2} style={{ flexShrink: 0 }} />
    </Link>
  )
}

function FreePill({ user, left }: { user: any; left?: string | null }) {
  const initials = user.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  // Same neutral ring for everyone — a score-tinted ring would leak rank to others.
  return (
    <Link href={`/${user.username}`} title={left ? `Free until midnight · ${left} left` : undefined} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '12px', background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.16)', textDecoration: 'none' }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', overflow: 'hidden', background: 'var(--surface-3)', border: '1.5px solid rgba(212,175,55,0.25)' }}>
          {user.avatar_url
            ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#D4AF37' }}>{initials}</div>
          }
        </div>
        <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '9px', height: '9px', borderRadius: '50%', background: '#34D399', border: '1.5px solid var(--bg)' }} />
      </div>
      <div>
        <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{user.full_name?.split(' ')[0]}</p>
        {(user.city || left) && (
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, whiteSpace: 'nowrap' }}>
            {user.city}
            {user.city && left ? ' · ' : ''}
            {left && <span style={{ color: '#34D399' }}>{left} left</span>}
          </p>
        )}
      </div>
    </Link>
  )
}

function BirthdayCard({ bday }: { bday: any }) {
  const { month, day, time } = formatDate(bday.event_date)
  const guestCount = bday.guests?.[0]?.count || 0
  const title = bday.title || `${bday.celebrant}'s Birthday 🎉`
  return (
    <Link href={`/birthday/${bday.share_slug}`} style={{ display: 'flex', gap: '14px', padding: '16px', borderRadius: '16px', background: 'var(--surface-1)', border: '1px solid rgba(255,107,53,0.22)', textDecoration: 'none' }}>
      <div style={{ flexShrink: 0, width: '52px', textAlign: 'center', paddingTop: '2px' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#FF6B35', letterSpacing: '1px' }}>{month}</p>
        <p style={{ fontFamily: 'DM Serif Display, serif', fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{day}</p>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{time}</p>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(255,107,53,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Cake size={15} color="#FF6B35" strokeWidth={1.8} />
          </span>
          <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{title}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {bday.location && <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><MapPin size={11} strokeWidth={2} /> {bday.location}</span>}
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Users size={11} strokeWidth={2} /> {guestCount} going</span>
        </div>
      </div>
      {bday.cover_image && (
        <img src={bday.cover_image} alt="" style={{ width: '72px', height: '72px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0, alignSelf: 'center' }} />
      )}
    </Link>
  )
}

function CrewEventCard({ event }: { event: any }) {
  const { month, day, time } = formatDate(event.datetime)
  const attendeeCount = event.attendees?.[0]?.count || 0
  const isFull = event.max_attendees && attendeeCount >= event.max_attendees
  const crew = event.crew

  return (
    <Link href={`/events/${event.id}`} style={{ display: 'flex', gap: '14px', padding: '16px', borderRadius: '16px', background: 'var(--surface-1)', border: '1px solid var(--border)', textDecoration: 'none' }}>
      {/* Date block */}
      <div style={{ flexShrink: 0, width: '52px', textAlign: 'center', paddingTop: '2px' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#D4AF37', letterSpacing: '1px' }}>{month}</p>
        <p style={{ fontFamily: 'DM Serif Display, serif', fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{day}</p>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{time}</p>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</p>
        {event.description && (
          <p className="line-clamp-2" style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>{event.description}</p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {crew && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#9B7FFF', fontWeight: 600 }}>
              {crew.avatar_url && <img src={crew.avatar_url} alt="" style={{ width: '16px', height: '16px', borderRadius: '8px', objectFit: 'cover' }} />}
              {crew.name}
            </span>
          )}
          {event.location && <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><MapPin size={11} strokeWidth={2} /> {event.location}</span>}
          <span style={{ fontSize: '11px', color: isFull ? '#FF6B35' : 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Users size={11} strokeWidth={2} /> {attendeeCount}{event.max_attendees ? `/${event.max_attendees}` : ''}
            {isFull && ' · Full'}
          </span>
        </div>
      </div>
    </Link>
  )
}

function GroupSessionCard({ session, canDelete = false, onDeleted }: { session: any; canDelete?: boolean; onDeleted?: (id: string) => void }) {
  const { month, day, time } = formatDate(session.scheduled_at)
  const participantCount = session.participants?.[0]?.count || 0
  const isFull = session.status === 'full'
  const host = session.host
  const recurrenceLabel = session.recurrence === 'weekly' ? 'Weekly' : session.recurrence === 'biweekly' ? 'Biweekly' : session.recurrence === 'monthly' ? 'Monthly' : null
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (deleting) return
    const ok = await confirmSheet({
      title: `Delete "${session.title}"?`,
      body: "This can't be undone.",
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return
    setDeleting(true)
    const { error } = await supabase.from('group_sessions').delete().eq('id', session.id)
    if (error) {
      console.error('Delete session error:', error)
      showToast("Couldn't delete the session — try again", { type: 'error' })
      setDeleting(false)
      return
    }
    onDeleted?.(session.id)
  }

  return (
    <Link href={`/group-sessions/${session.id}`} style={{ position: 'relative', display: 'flex', gap: '14px', padding: '16px', borderRadius: '16px', background: 'var(--surface-1)', border: '1px solid var(--border)', textDecoration: 'none' }}>
      {canDelete && (
        /* 44px transparent hit area around a 30px visual chip */
        <button
          onClick={handleDelete}
          disabled={deleting}
          title="Delete session"
          aria-label="Delete session"
          style={{ position: 'absolute', top: '3px', right: session.cover_image_url ? '85px' : '3px', width: '44px', height: '44px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: deleting ? 'wait' : 'pointer', zIndex: 2 }}
        >
          <span style={{ width: '30px', height: '30px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,80,80,0.10)', border: '1px solid rgba(255,80,80,0.28)', color: '#FF6B6B' }}>
            <Trash2 size={14} strokeWidth={2} />
          </span>
        </button>
      )}
      {/* Date block */}
      <div style={{ flexShrink: 0, width: '52px', textAlign: 'center', paddingTop: '2px' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#D4AF37', letterSpacing: '1px' }}>{month}</p>
        <p style={{ fontFamily: 'DM Serif Display, serif', fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{day}</p>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{time}</p>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(212,175,55,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ActivityIcon type={session.activity_type} size={14} color="#D4AF37" strokeWidth={1.8} />
          </span>
          <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{session.title}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {host && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-muted)' }}>
              {host.avatar_url && <img src={host.avatar_url} alt="" style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover' }} />}
              by {host.full_name?.split(' ')[0]}
            </span>
          )}
          {session.location && <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><MapPin size={11} strokeWidth={2} /> {session.location}</span>}
          <span style={{ fontSize: '11px', color: isFull ? '#FF6B35' : 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Users size={11} strokeWidth={2} /> {participantCount}{session.max_participants ? `/${session.max_participants}` : ''}
          </span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: isFull ? '#FF6B35' : '#34D399', background: isFull ? 'rgba(255,107,53,0.1)' : 'rgba(52,211,153,0.08)', padding: '2px 8px', borderRadius: '8px', border: isFull ? '1px solid rgba(255,107,53,0.25)' : '1px solid rgba(52,211,153,0.2)' }}>
            {isFull ? 'Full' : 'Open'}
          </span>
          {recurrenceLabel && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: '#9B7FFF', background: 'rgba(155,127,255,0.10)', padding: '2px 8px', borderRadius: '8px', border: '1px solid rgba(155,127,255,0.25)' }}>
              <Repeat size={11} strokeWidth={2.2} /> {recurrenceLabel}
            </span>
          )}
        </div>
      </div>
      {session.cover_image_url && (
        <img src={session.cover_image_url} alt="" style={{ width: '72px', height: '72px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0, alignSelf: 'center' }} />
      )}
    </Link>
  )
}
