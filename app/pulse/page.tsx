// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ProfileNav from '@/components/ProfileNav'
import { PageLoader } from '@/components/Loading'
import { Globe, MapPin, Moon, PartyPopper } from 'lucide-react'

function isToday(ts: string | null): boolean {
  if (!ts) return false
  return new Date(ts).toDateString() === new Date().toDateString()
}

export default function PulsePage() {
  const [myCity, setMyCity] = useState<string | null>(null)
  const [myId, setMyId] = useState<string | null>(null)
  const [freeToday, setFreeToday] = useState<any[]>([])
  const [groupSessions, setGroupSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [iAmFree, setIAmFree] = useState(false)
  const [toggling, setToggling] = useState(false)

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
          .select('id, full_name, username, avatar_url, bestie_score, city, free_today_at')
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

  const todayFree = freeToday.filter(u => u.id !== myId)
  const cityFree = myCity ? todayFree.filter(u => u.city?.toLowerCase().includes(myCity.toLowerCase())) : []
  const otherFree = myCity ? todayFree.filter(u => !u.city?.toLowerCase().includes(myCity.toLowerCase())) : todayFree

  return (
    <div style={{ minHeight: '100vh', background: '#09090F', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <ProfileNav />
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(24px, 7vw, 34px)', color: '#F0EAFF', marginBottom: '6px', display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
            <Globe size={28} color="#D4AF37" strokeWidth={2} /> City Pulse
          </h1>
          <p style={{ fontSize: '14px', color: '#A99ECC' }}>
            {myCity ? `What's happening in ${myCity} and around the world` : 'What\'s happening right now'}
          </p>
        </div>

        {/* Free today toggle */}
        {myId && (
          <div style={{ marginBottom: '32px', padding: '20px 24px', borderRadius: '20px', background: iAmFree ? 'rgba(57,255,20,0.06)' : '#111120', border: iAmFree ? '1px solid rgba(57,255,20,0.25)' : '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: '15px', fontWeight: 700, color: iAmFree ? '#34D399' : '#F0EAFF', marginBottom: '3px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: iAmFree ? '#34D399' : '#6B5EA8', display: 'inline-block' }} />
                {iAmFree ? 'You\'re free today' : 'Are you free today?'}
              </p>
              <p style={{ fontSize: '13px', color: '#A99ECC' }}>
                {iAmFree ? 'Others can see you\'re available for a meetup' : 'Let others know you\'re up for a spontaneous meetup'}
              </p>
            </div>
            <button onClick={toggleFree} disabled={toggling} style={{ padding: '10px 22px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', background: iAmFree ? 'rgba(255,107,53,0.1)' : 'rgba(57,255,20,0.12)', border: iAmFree ? '1px solid rgba(255,107,53,0.3)' : '1px solid rgba(57,255,20,0.35)', color: iAmFree ? '#FF6B35' : '#34D399', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
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
                <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#A99ECC', marginBottom: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34D399', display: 'inline-block' }} />
                  FREE TODAY {myCity ? `· ${myCity.toUpperCase()}` : ''}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {cityFree.map(u => <FreePill key={u.id} user={u} />)}
                  {cityFree.length === 0 && (
                    <p style={{ fontSize: '13px', color: '#A99ECC' }}>No one in your city yet — be the first!</p>
                  )}
                </div>
              </section>
            )}

            {/* Free elsewhere */}
            {otherFree.length > 0 && (
              <section style={{ marginBottom: '36px' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#A99ECC', marginBottom: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34D399', display: 'inline-block' }} />
                  FREE TODAY · WORLDWIDE
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {otherFree.slice(0, 12).map(u => <FreePill key={u.id} user={u} />)}
                </div>
              </section>
            )}

            {freeToday.length === 0 && (
              <section style={{ marginBottom: '36px', padding: '32px', textAlign: 'center', borderRadius: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.10)' }}>
                <div style={{ width: '44px', height: '44px', margin: '0 auto 8px', borderRadius: '14px', background: 'rgba(155,143,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Moon size={22} color="#9B7FFF" strokeWidth={2} />
                </div>
                <p style={{ fontSize: '14px', color: '#A99ECC' }}>No one is free today yet. Be the first!</p>
              </section>
            )}

            {/* Upcoming Group Sessions */}
            {groupSessions.length > 0 && (
              <section style={{ marginBottom: '36px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#A99ECC', display: 'inline-flex', alignItems: 'center', gap: '8px' }}><PartyPopper size={12} color="#D4AF37" strokeWidth={2} /> UPCOMING GROUP SESSIONS</p>
                  <Link href="/group-sessions/new" style={{ fontSize: '12px', color: '#D4AF37', textDecoration: 'none' }}>+ Host one →</Link>
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

function FreePill({ user }: { user: any }) {
  const initials = user.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  const scoreColor = (user.bestie_score || 0) >= 800 ? '#34D399' : (user.bestie_score || 0) >= 600 ? '#D4AF37' : '#A99ECC'
  return (
    <Link href={`/${user.username}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '14px', background: 'rgba(57,255,20,0.05)', border: '1px solid rgba(57,255,20,0.18)', textDecoration: 'none', transition: 'all 0.15s' }}>
      <div style={{ position: 'relative' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', overflow: 'hidden', background: '#1A1A2E', border: `1.5px solid ${scoreColor}50`, flexShrink: 0 }}>
          {user.avatar_url
            ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: scoreColor }}>{initials}</div>
          }
        </div>
        <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '10px', height: '10px', borderRadius: '50%', background: '#34D399', border: '1.5px solid #09090F' }} />
      </div>
      <div>
        <p style={{ fontSize: '13px', fontWeight: 600, color: '#F0EAFF' }}>{user.full_name?.split(' ')[0]}</p>
        {user.city && <p style={{ fontSize: '11px', color: '#A99ECC' }}>{user.city}</p>}
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
    <Link href={`/group-sessions/${session.id}`} style={{ display: 'flex', gap: '14px', padding: '16px', borderRadius: '16px', background: '#111120', border: '1px solid rgba(255,255,255,0.11)', textDecoration: 'none', transition: 'all 0.15s' }}>
      <div style={{ flexShrink: 0, width: '48px', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#D4AF37', letterSpacing: '1px' }}>{d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</p>
        <p style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', fontWeight: 700, color: '#F0EAFF', lineHeight: 1.1 }}>{d.getDate()}</p>
        <p style={{ fontSize: '10px', color: '#A99ECC' }}>{d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '15px', fontWeight: 600, color: '#F0EAFF', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.title}</p>
        <p style={{ fontSize: '12px', color: '#A99ECC', marginBottom: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {session.location && <><MapPin size={11} strokeWidth={2} /> {session.location} · </>}
          by {host?.full_name?.split(' ')[0]}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '999px', background: isFull ? 'rgba(255,107,53,0.1)' : 'rgba(57,255,20,0.08)', border: isFull ? '1px solid rgba(255,107,53,0.25)' : '1px solid rgba(57,255,20,0.2)', color: isFull ? '#FF6B35' : '#34D399' }}>
            {isFull ? 'Full' : 'Open'}
          </span>
          <span style={{ fontSize: '11px', color: '#A99ECC' }}>{participantCount}/{session.max_participants} joined</span>
        </div>
      </div>
    </Link>
  )
}
