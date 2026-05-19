// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { googleCalendarUrl, downloadICS } from '@/lib/calendar'
import { createNotification } from '@/lib/notifications'
import NotificationBell from '@/components/NotificationBell'
import { usePushNotifications } from '@/lib/usePushNotifications'

export default function BookingsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState(null)
  const [bookings, setBookings] = useState([])
  const [tab, setTab] = useState('upcoming')
  const [loading, setLoading] = useState(true)
  const [calOpen, setCalOpen] = useState(null)
  const [streak, setStreak] = useState(0)
  const userIdRef = useRef(null)
  usePushNotifications()

  const loadBookings = async (uid) => {
    const { data: bookingRows } = await supabase
      .from('bookings')
      .select('*, package:activity_packages(*)')
      .or(`seeker_id.eq.${uid},provider_id.eq.${uid}`)
      .order('created_at', { ascending: false })
    if (!bookingRows?.length) return

    const userIds = [...new Set([
      ...bookingRows.map(b => b.seeker_id),
      ...bookingRows.map(b => b.provider_id),
    ].filter(Boolean))]
    const { data: users } = await supabase.from('users').select('id, full_name, username, avatar_url, bestie_score, city').in('id', userIds)
    const userMap = {}
    users?.forEach(u => { userMap[u.id] = u })
    setBookings(bookingRows.map(b => ({ ...b, seeker: userMap[b.seeker_id] || null, provider: userMap[b.provider_id] || null })))
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      userIdRef.current = user.id
      setUserId(user.id)
      await loadBookings(user.id)

      // fetch streak
      const { data: me } = await supabase.from('users').select('streak_weeks').eq('id', user.id).single()
      setStreak(me?.streak_weeks || 0)

      setLoading(false)
      const channel = supabase.channel('bookings-rt')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
          const uid = userIdRef.current
          const { new: n, old: o } = payload
          if (n?.seeker_id === uid || n?.provider_id === uid || o?.seeker_id === uid || o?.provider_id === uid)
            loadBookings(uid)
        }).subscribe()
      return () => supabase.removeChannel(channel)
    }
    init()
  }, [])

  const sendEmail = async (type, to, data) => {
    try { await fetch('/api/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, to, data }) }) }
    catch (e) { console.error(e) }
  }

  const updateStatus = async (id, status) => {
    const booking = bookings.find(b => b.id === id)
    const update: any = { status }
    if (status === 'completed') update.confirmed_by_provider = true
    await supabase.from('bookings').update(update).eq('id', id)
    setBookings(b => b.map(b2 => b2.id === id ? { ...b2, ...update } : b2))
    const activityTitle = booking.package?.title || 'Session'
    const providerName = booking.provider?.full_name || 'Your Bestie'
    const seekerName = booking.seeker?.full_name || 'Someone'
    if (status === 'accepted') {
      await sendEmail('booking_accepted', booking.seeker?.email, { providerName, activityTitle })
      await createNotification({ userId: booking.seeker_id, type: 'booking_accepted', title: `${providerName} accepted your request`, body: activityTitle, link: '/bookings' })
    }
    if (status === 'declined') {
      await sendEmail('booking_declined', booking.seeker?.email, { providerName, activityTitle })
      await createNotification({ userId: booking.seeker_id, type: 'booking_declined', title: `${providerName} declined your request`, body: activityTitle, link: '/bookings' })
    }
    if (status === 'cancelled') {
      await sendEmail('booking_cancelled', booking.provider?.email, { seekerName, activityTitle })
      await createNotification({ userId: booking.provider_id, type: 'booking_declined', title: `${seekerName} cancelled their request`, body: activityTitle, link: '/bookings' })
    }
    if (status === 'completed') {
      await sendEmail('booking_completed', booking.seeker?.email, { providerName, activityTitle, reviewUrl: `https://bestiehere.com/review/${id}` })
      await createNotification({ userId: booking.seeker_id, type: 'booking_completed', title: `Session with ${providerName} completed!`, body: 'Rate your experience', link: `/review/${id}` })
    }
  }

  useEffect(() => {
    if (!calOpen) return
    const handler = () => setCalOpen(null)
    document.addEventListener('click', handler, true)
    return () => document.removeEventListener('click', handler, true)
  }, [calOpen])

  // ── Stats ──
  const allMine = bookings.filter(b => b.seeker_id === userId || b.provider_id === userId)
  const lifetimeMet = allMine.filter(b => b.status === 'completed').length
  const now = new Date()
  const thisMonthMet = allMine.filter(b => {
    const d = new Date(b.created_at)
    return b.status === 'completed' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  // ── Tab buckets ──
  const upcoming  = allMine.filter(b => b.status === 'accepted')
  const pending   = allMine.filter(b => b.status === 'pending')
  const completed = allMine.filter(b => b.status === 'completed' || b.status === 'cancelled' || b.status === 'declined')

  const tabList = [
    { id: 'upcoming',  label: 'Upcoming',  count: upcoming.length },
    { id: 'pending',   label: 'Pending',   count: pending.length },
    { id: 'completed', label: 'Completed', count: completed.length },
  ]
  const current = tab === 'upcoming' ? upcoming : tab === 'pending' ? pending : completed

  const formatDate = (ts) => {
    if (!ts) return null
    const d = new Date(ts)
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const initials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#09090F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid rgba(212,175,55,0.2)', borderTop: '3px solid #D4AF37', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#09090F', fontFamily: 'Plus Jakarta Sans, sans-serif', paddingBottom: '40px' }}>
      <style>{`
        .bk-tab { flex: 1; padding: 10px 4px; border-radius: 10px; font-size: 13px; font-weight: 600; border: none; cursor: pointer; transition: all 0.2s; }
        .bk-tab.active { background: rgba(212,175,55,0.12); color: #D4AF37; }
        .bk-tab.inactive { background: transparent; color: #6B6490; }
        .bk-card { background: #111120; border: 1px solid rgba(255,255,255,0.10); border-radius: 20px; padding: 18px; margin-bottom: 12px; transition: border-color 0.2s; }
        .bk-card:hover { border-color: rgba(212,175,55,0.15); }
        .btn-confirm { flex: 2; padding: 12px; border-radius: 12px; font-size: 13px; font-weight: 700; background: #34D399; color: #09090F; border: none; cursor: pointer; transition: filter 0.2s; }
        .btn-confirm:hover { filter: brightness(0.9); }
        .btn-decline { flex: 1; padding: 12px; border-radius: 12px; font-size: 13px; font-weight: 600; background: rgba(255,80,80,0.08); border: 1px solid rgba(255,80,80,0.2); color: #ff6b6b; cursor: pointer; }
        .btn-ghost { padding: 10px 14px; border-radius: 12px; font-size: 12px; font-weight: 600; background: #131323; border: 1px solid rgba(255,255,255,0.1); color: #A99ECC; cursor: pointer; transition: background 0.2s; text-decoration: none; display: inline-flex; align-items: center; gap: 5px; }
        .btn-ghost:hover { background: rgba(255,255,255,0.12); }
        .btn-spark { padding: 10px 16px; border-radius: 12px; font-size: 12px; font-weight: 700; background: rgba(212,175,55,0.1); border: 1px solid rgba(212,175,55,0.25); color: #D4AF37; cursor: pointer; transition: background 0.2s; display: inline-flex; align-items: center; gap: 5px; }
        .btn-spark:hover { background: rgba(212,175,55,0.18); }
        .stat-tile { flex: 1; background: #111120; border: 1px solid rgba(255,255,255,0.10); border-radius: 16px; padding: 16px 12px; text-align: center; }
      `}</style>

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {userId && <NotificationBell userId={userId} />}
          <Link href="/dashboard" style={{ fontSize: '13px', color: '#A99ECC', textDecoration: 'none', padding: '7px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>← Dashboard</Link>
        </div>
      </nav>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 20px 0' }}>

        {/* Header */}
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '26px', fontWeight: 700, color: '#F0EAFF', marginBottom: '4px' }}>My Bookings</h1>
        <p style={{ fontSize: '13px', color: '#6B6490', marginBottom: '24px' }}>Sessions, plans & moments scheduled with besties</p>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
          <div className="stat-tile">
            <p style={{ fontSize: '24px', fontWeight: 700, color: '#D4AF37', marginBottom: '2px' }}>{lifetimeMet}</p>
            <p style={{ fontSize: '10px', fontWeight: 700, color: '#6B6490', letterSpacing: '1px', textTransform: 'uppercase' }}>Lifetime</p>
            <p style={{ fontSize: '11px', color: '#A99ECC', marginTop: '1px' }}>met irl</p>
          </div>
          <div className="stat-tile">
            <p style={{ fontSize: '24px', fontWeight: 700, color: '#34D399', marginBottom: '2px' }}>{thisMonthMet}</p>
            <p style={{ fontSize: '10px', fontWeight: 700, color: '#6B6490', letterSpacing: '1px', textTransform: 'uppercase' }}>This month</p>
            <p style={{ fontSize: '11px', color: '#A99ECC', marginTop: '1px' }}>confirmed</p>
          </div>
          <div className="stat-tile">
            <p style={{ fontSize: '24px', fontWeight: 700, color: '#9B7FFF', marginBottom: '2px' }}>{streak > 0 ? `${streak}w` : '—'}</p>
            <p style={{ fontSize: '10px', fontWeight: 700, color: '#6B6490', letterSpacing: '1px', textTransform: 'uppercase' }}>Streak</p>
            <p style={{ fontSize: '11px', color: '#A99ECC', marginTop: '1px' }}>{streak > 0 ? 'active' : 'start now'}</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '14px', padding: '4px', marginBottom: '20px' }}>
          {tabList.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`bk-tab ${tab === t.id ? 'active' : 'inactive'}`}>
              {t.label} {t.count > 0 && <span style={{ fontSize: '11px', opacity: 0.8 }}>{t.count}</span>}
            </button>
          ))}
        </div>

        {/* Empty state */}
        {current.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: '44px', marginBottom: '12px' }}>{tab === 'upcoming' ? '📅' : tab === 'pending' ? '⏳' : '✅'}</p>
            <p style={{ fontSize: '16px', fontWeight: 600, color: '#F0EAFF', marginBottom: '8px' }}>
              {tab === 'upcoming' ? 'No upcoming sessions' : tab === 'pending' ? 'No pending requests' : 'No completed sessions yet'}
            </p>
            <p style={{ fontSize: '13px', color: '#A99ECC', marginBottom: '24px' }}>
              {tab === 'upcoming' ? 'Accepted sessions will appear here' : tab === 'pending' ? 'When someone requests you or you send a request' : 'Complete your first session to start your journey'}
            </p>
            <Link href="/browse" style={{ padding: '10px 22px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', textDecoration: 'none' }}>Browse Besties</Link>
          </div>
        )}

        {/* Booking cards */}
        {current.map(booking => {
          const isProvider = booking.provider_id === userId
          const other = isProvider ? booking.seeker : booking.provider
          const price = booking.package?.is_free ? 'Free' : booking.package?.price_per_session ? `$${booking.package.price_per_session}` : null
          const dateStr = formatDate(booking.scheduled_at)

          // Status badge
          const statusMap = {
            pending:   { label: 'PENDING',   color: '#D4AF37', bg: 'rgba(212,175,55,0.12)',   border: 'rgba(212,175,55,0.3)' },
            accepted:  { label: 'UPCOMING',  color: '#34D399', bg: 'rgba(57,255,20,0.1)',     border: 'rgba(57,255,20,0.25)' },
            completed: { label: 'COMPLETED', color: '#9B7FFF', bg: 'rgba(155,143,255,0.1)',   border: 'rgba(155,143,255,0.25)' },
            declined:  { label: 'DECLINED',  color: '#ff6b6b', bg: 'rgba(255,80,80,0.08)',    border: 'rgba(255,80,80,0.2)' },
            cancelled: { label: 'CANCELLED', color: '#6B6490', bg: 'rgba(107,100,144,0.1)',   border: 'rgba(107,100,144,0.2)' },
          }
          const st = statusMap[booking.status] || statusMap.pending

          return (
            <div key={booking.id} className="bk-card">
              {/* Top row: avatar + info + status */}
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '14px' }}>
                <Link href={other?.username ? `/${other.username}` : '#'} style={{ flexShrink: 0 }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '16px', overflow: 'hidden', background: '#1A1A2E', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid rgba(255,255,255,0.12)' }}>
                    {other?.avatar_url
                      ? <img src={other.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ color: '#D4AF37', fontWeight: 700, fontSize: '16px' }}>{initials(other?.full_name)}</span>}
                  </div>
                </Link>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '15px', fontWeight: 700, color: '#F0EAFF', marginBottom: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {booking.package?.title || 'Session'}
                        {price && <span style={{ marginLeft: '8px', fontSize: '14px', color: price === 'Free' ? '#34D399' : '#D4AF37', fontWeight: 700 }}>{price}</span>}
                      </p>
                      <p style={{ fontSize: '12px', color: '#A99ECC' }}>
                        with <span style={{ color: '#C8C0E8', fontWeight: 500 }}>{other?.full_name || 'Unknown'}</span>
                        {other?.city ? ` · ${other.city}` : ''}
                      </p>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', background: st.bg, border: `1px solid ${st.border}`, color: st.color, flexShrink: 0 }}>
                      {st.label}
                    </span>
                  </div>

                  {dateStr && (
                    <p style={{ fontSize: '12px', color: '#A99ECC', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#D4AF37' }}>🕐</span> {dateStr}
                    </p>
                  )}
                </div>
              </div>

              {booking.message && (
                <p style={{ fontSize: '13px', color: '#A99ECC', fontStyle: 'italic', marginBottom: '12px', padding: '10px 12px', borderRadius: '10px', background: '#111120', borderLeft: '2px solid rgba(212,175,55,0.3)' }}>
                  "{booking.message}"
                </p>
              )}

              {/* Calendar */}
              {booking.scheduled_at && booking.status === 'accepted' && (() => {
                const start = new Date(booking.scheduled_at)
                const title = `Session with ${other?.full_name || 'Bestie'} — ${booking.package?.title || 'Activity'}`
                const description = `Your Bestie session on Bestiehere.com${booking.message ? `\n\n"${booking.message}"` : ''}`
                return (
                  <div style={{ position: 'relative', marginBottom: '10px' }}>
                    <button onClick={() => setCalOpen(calOpen === booking.id ? null : booking.id)} style={{ width: '100%', padding: '9px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)', color: '#D4AF37', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      📅 Add to Calendar
                    </button>
                    {calOpen === booking.id && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '6px', background: '#13132a', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '12px', overflow: 'hidden', zIndex: 10 }}>
                        <a href={googleCalendarUrl({ title, start, description })} target="_blank" rel="noopener noreferrer" onClick={() => setCalOpen(null)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', fontSize: '13px', color: '#F0EAFF', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
                          <img src="https://ssl.gstatic.com/calendar/images/dynamiclogo_2020q4/calendar_31_2x.png" alt="" style={{ width: '18px', height: '18px', borderRadius: '4px' }} />Google Calendar
                        </a>
                        <button onClick={() => { downloadICS({ title, start, description, filename: 'bestie-session.ics' }); setCalOpen(null) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', fontSize: '13px', color: '#F0EAFF', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                          🗓 Apple / Outlook (.ics)
                        </button>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* ── ACTION BUTTONS ── */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>

                {/* PENDING — provider sees Confirm + Decline */}
                {booking.status === 'pending' && isProvider && (
                  <>
                    <button onClick={() => updateStatus(booking.id, 'declined')} className="btn-decline">✕ Decline</button>
                    <button onClick={() => updateStatus(booking.id, 'accepted')} className="btn-confirm">✓ Confirm</button>
                  </>
                )}

                {/* PENDING — seeker sees Cancel */}
                {booking.status === 'pending' && !isProvider && (
                  <button onClick={() => updateStatus(booking.id, 'cancelled')} className="btn-ghost">Cancel request</button>
                )}

                {/* UPCOMING — provider can mark completed */}
                {booking.status === 'accepted' && isProvider && (
                  <button onClick={() => updateStatus(booking.id, 'completed')} style={{ flex: 1, padding: '11px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', border: 'none', cursor: 'pointer' }}>
                    ✓ Mark as completed
                  </button>
                )}

                {/* UPCOMING — confirm provider side if completed but not confirmed */}
                {booking.status === 'completed' && isProvider && !booking.confirmed_by_provider && (
                  <button onClick={async () => {
                    await supabase.from('bookings').update({ confirmed_by_provider: true }).eq('id', booking.id)
                    setBookings(b => b.map(b2 => b2.id === booking.id ? { ...b2, confirmed_by_provider: true } : b2))
                  }} className="btn-confirm" style={{ flex: 1 }}>
                    ✓ Confirm session happened
                  </button>
                )}

                {/* COMPLETED — Send a Spark + Book again */}
                {booking.status === 'completed' && (
                  <>
                    <Link href={other?.username ? `/${other.username}?sparks=true` : '#'} className="btn-spark">✨ Send a Spark</Link>
                    <Link href={other?.username ? `/${other.username}` : '#'} className="btn-ghost">↺ Book again</Link>
                  </>
                )}

                {/* Always: Message button */}
                {booking.status !== 'cancelled' && booking.status !== 'declined' && (
                  <Link href={other?.username ? `/messages?to=${other.username}` : '#'} className="btn-ghost">💬 Message</Link>
                )}

              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
