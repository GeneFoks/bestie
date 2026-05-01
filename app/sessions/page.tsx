// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const ACTIVITY_EMOJI = {
  meet_irl: '🤝', dance_crew: '💃', trail_crew: '🥾', travel_buddy: '✈️',
  game_night: '🎮', watch_together: '🎬', vibe_call: '📱', deep_chat: '🫂',
  real_talk: '💬', festival_crew: '🎪', epic_journey: '🌍', fishing_crew: '🎣',
}

export default function SessionsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState(null)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }
        setUserId(user.id)

        const { data } = await supabase
          .from('bookings')
          .select(`
            *,
            package:activity_packages(*),
            seeker:users!bookings_seeker_id_fkey(id, full_name, username, avatar_url),
            provider:users!bookings_provider_id_fkey(id, full_name, username, avatar_url)
          `)
          .or(`seeker_id.eq.${user.id},provider_id.eq.${user.id}`)
          .eq('status', 'accepted')
          .order('proposed_datetime', { ascending: true })

        setSessions(data || [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const formatDate = (ts) => {
    if (!ts) return null
    const d = new Date(ts)
    const now = new Date()
    const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24))
    const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    const label = diffDays === 0 ? 'Today' : diffDays === 1 ? 'Tomorrow' : diffDays > 0 ? `In ${diffDays} days` : `${Math.abs(diffDays)} days ago`
    return { dateStr, timeStr, label, isPast: diffDays < 0, isToday: diffDays === 0 }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#080810', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '36px', height: '36px', border: '3px solid rgba(212,175,55,0.2)', borderTop: '3px solid #D4AF37', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const upcoming = sessions.filter(s => s.proposed_datetime && new Date(s.proposed_datetime) >= new Date())
  const noDates = sessions.filter(s => !s.proposed_datetime)
  const past = sessions.filter(s => s.proposed_datetime && new Date(s.proposed_datetime) < new Date())

  return (
    <div style={{ minHeight: '100vh', background: '#080810', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <Link href="/dashboard" style={{ fontSize: '14px', color: '#9B93C0', textDecoration: 'none', padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>← Dashboard</Link>
      </nav>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', color: '#E8E0FF', marginBottom: '4px' }}>My Sessions</h1>
        <p style={{ fontSize: '14px', color: '#9B93C0', marginBottom: '32px' }}>{sessions.length} accepted {sessions.length === 1 ? 'session' : 'sessions'}</p>

        {sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>📅</p>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#E8E0FF', marginBottom: '8px' }}>No sessions yet</h3>
            <p style={{ fontSize: '14px', color: '#9B93C0', marginBottom: '24px' }}>Accepted bookings will appear here</p>
            <Link href="/browse" style={{ padding: '10px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>Browse Besties</Link>
          </div>
        ) : (
          <>
            {/* Upcoming */}
            {upcoming.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#9B93C0', marginBottom: '12px' }}>UPCOMING</p>
                {upcoming.map((s, i) => {
                  const other = s.seeker_id === userId ? s.provider : s.seeker
                  const date = formatDate(s.proposed_datetime)
                  const isNext = i === 0
                  return (
                    <div key={s.id} style={{ background: isNext ? 'linear-gradient(135deg, #0F0F1E 0%, #141428 100%)' : '#0F0F1E', border: isNext ? '1px solid rgba(212,175,55,0.3)' : '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '20px', marginBottom: '12px', position: 'relative', overflow: 'hidden' }}>
                      {isNext && <div style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '999px', background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}>Next up</div>}
                      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                        <div style={{ width: '52px', height: '52px', borderRadius: '14px', overflow: 'hidden', background: '#1a1a35', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {other?.avatar_url
                            ? <img src={other.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ color: '#D4AF37', fontWeight: 700, fontSize: '18px' }}>{other?.full_name?.[0]}</span>
                          }
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '15px', fontWeight: 600, color: '#E8E0FF', marginBottom: '2px' }}>{other?.full_name}</p>
                          <p style={{ fontSize: '13px', color: '#9B93C0', marginBottom: '10px' }}>
                            {ACTIVITY_EMOJI[s.package?.activity_type] || '✨'} {s.package?.name || s.package?.title || 'Session'}
                          </p>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '999px', background: date.isToday ? 'rgba(57,255,20,0.1)' : 'rgba(212,175,55,0.1)', border: date.isToday ? '1px solid rgba(57,255,20,0.3)' : '1px solid rgba(212,175,55,0.2)', color: date.isToday ? '#39FF14' : '#D4AF37' }}>
                              {date.label}
                            </span>
                            <span style={{ fontSize: '12px', color: '#9B93C0' }}>{date.dateStr} · {date.timeStr}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                        <Link href={`/messages?to=${other?.username}`} style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#9B93C0', textDecoration: 'none', textAlign: 'center' }}>
                          💬 Message
                        </Link>
                        <Link href={`/${other?.username}`} style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#9B93C0', textDecoration: 'none', textAlign: 'center' }}>
                          👤 Profile
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* No date */}
            {noDates.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#9B93C0', marginBottom: '12px' }}>DATE NOT SET</p>
                {noDates.map(s => {
                  const other = s.seeker_id === userId ? s.provider : s.seeker
                  return (
                    <div key={s.id} style={{ background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '20px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', overflow: 'hidden', background: '#1a1a35', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {other?.avatar_url
                            ? <img src={other.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ color: '#D4AF37', fontWeight: 700 }}>{other?.full_name?.[0]}</span>
                          }
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '15px', fontWeight: 600, color: '#E8E0FF', marginBottom: '2px' }}>{other?.full_name}</p>
                          <p style={{ fontSize: '13px', color: '#9B93C0' }}>{ACTIVITY_EMOJI[s.package?.activity_type] || '✨'} {s.package?.name || s.package?.title || 'Session'}</p>
                        </div>
                        <Link href={`/messages?to=${other?.username}`} style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#9B93C0', textDecoration: 'none' }}>
                          💬 Set date
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Past */}
            {past.length > 0 && (
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#9B93C0', marginBottom: '12px' }}>PAST</p>
                {past.map(s => {
                  const other = s.seeker_id === userId ? s.provider : s.seeker
                  const date = formatDate(s.proposed_datetime)
                  return (
                    <div key={s.id} style={{ background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '20px', padding: '20px', marginBottom: '12px', opacity: 0.6 }}>
                      <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', overflow: 'hidden', background: '#1a1a35', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {other?.avatar_url
                            ? <img src={other.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ color: '#D4AF37', fontWeight: 700 }}>{other?.full_name?.[0]}</span>
                          }
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '15px', fontWeight: 600, color: '#E8E0FF', marginBottom: '2px' }}>{other?.full_name}</p>
                          <p style={{ fontSize: '13px', color: '#9B93C0' }}>{ACTIVITY_EMOJI[s.package?.activity_type] || '✨'} {s.package?.name || s.package?.title || 'Session'} · {date.dateStr}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
