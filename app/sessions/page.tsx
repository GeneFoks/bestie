// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import CallButton from '@/components/CallButton'
import { PageLoader } from '@/components/Loading'
import { ActivityIcon } from '@/lib/activityIcons'
import { EmptyState } from '@/components/EmptyState'
import { Calendar } from 'lucide-react'
import { createNotification } from '@/lib/notifications'
import { celebrate } from '@/lib/celebrate'
import { showToast } from '@/components/Toast'
import { confirmSheet } from '@/components/ConfirmSheet'

export default function SessionsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState(null)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }
        setUserId(user.id)
        await loadSessions(user.id)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const archiveSession = async (booking) => {
    const isSeeker = booking.seeker_id === userId
    const field = isSeeker ? 'archived_by_seeker' : 'archived_by_provider'
    await supabase.from('bookings').update({ [field]: true }).eq('id', booking.id)
    setSessions(prev => prev.filter(s => s.id !== booking.id))
  }

  const deleteSession = async (booking) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const other = booking.seeker_id === user.id ? booking.provider : booking.seeker
    const firstName = other?.full_name?.split(' ')[0] || 'them'
    // Second question: sever the connection too? Cancel = delete only.
    const disconnect = await confirmSheet({
      title: `Also disconnect from ${firstName}?`,
      body: 'Removes your match and contact link — the connection disappears from both circles. Either way, Bestie Score points from this meetup are removed for both of you.',
      confirmLabel: 'Delete + disconnect',
      danger: true,
    })
    setDeleting(true)
    const { data, error } = await supabase.rpc('delete_session_full', {
      p_booking_id: booking.id, p_user_id: user.id, p_disconnect: disconnect,
    })
    if (error || (data !== 'deleted' && data !== 'deleted_disconnected')) {
      console.error('delete_session_full failed:', error?.message || data)
      showToast("Couldn't delete the meetup — try again.", { type: 'error' })
      setDeleting(false)
      return
    }
    setSessions(prev => prev.filter(s => s.id !== booking.id))
    setConfirmDelete(null)
    setDeleting(false)
    showToast(disconnect ? `Meetup deleted — disconnected from ${firstName}` : 'Meetup deleted', { type: 'success' })
  }

  const loadSessions = async (uid) => {
    // Step 1: load bookings (accepted + completed), excluding archived by this user
    const { data: rows, error } = await supabase
      .from('bookings')
      .select('*, package:activity_packages(*)')
      .or(`seeker_id.eq.${uid},provider_id.eq.${uid}`)
      .in('status', ['accepted', 'completed'])
      .order('scheduled_at', { ascending: true })

    if (error || !rows || rows.length === 0) { setSessions([]); return }

    // Step 2: load users
    const userIds = [...new Set([
      ...rows.map(b => b.seeker_id),
      ...rows.map(b => b.provider_id),
    ].filter(Boolean))]

    const { data: users } = await supabase
      .from('users')
      .select('id, full_name, username, avatar_url')
      .in('id', userIds)

    const userMap = {}
    users?.forEach(u => { userMap[u.id] = u })

    // Step 3: merge + filter archived
    const merged = rows
      .filter(b => !(b.seeker_id === uid ? b.archived_by_seeker : b.archived_by_provider))
      .map(b => ({
        ...b,
        seeker: userMap[b.seeker_id] || null,
        provider: userMap[b.provider_id] || null,
      }))

    setSessions(merged)
  }

  const confirmSession = async (booking) => {
    const isSeeker = booking.seeker_id === userId
    const field = isSeeker ? 'confirmed_by_seeker' : 'confirmed_by_provider'
    const theirConfirm = isSeeker ? booking.confirmed_by_provider : booking.confirmed_by_seeker
    await supabase.from('bookings').update({ [field]: true }).eq('id', booking.id)

    const partnerId = isSeeker ? booking.provider_id : booking.seeker_id
    const partner = isSeeker ? booking.provider : booking.seeker
    const partnerName = partner?.full_name?.split(' ')[0] || 'Bestie'

    if (theirConfirm) {
      // Both sides confirmed — this is the "session happened" moment for both
      const { data: me } = await supabase.from('users').select('full_name').eq('id', userId).single()
      const myName = me?.full_name?.split(' ')[0] || 'Bestie'
      createNotification({
        userId: partnerId,
        type: 'session_confirmed',
        title: `${myName} confirmed your session`,
        body: 'Tap to leave a memory and Sparks',
        link: `/sessions/${booking.id}/memory`,
      }).catch(() => {})
      celebrate({ count: 36, spread: 70 })
    } else {
      // Only I confirmed — nudge the partner to confirm too
      const { data: me } = await supabase.from('users').select('full_name').eq('id', userId).single()
      const myName = me?.full_name?.split(' ')[0] || 'Bestie'
      createNotification({
        userId: partnerId,
        type: 'session_confirmed',
        title: `${myName} confirmed your session`,
        body: 'Confirm on your end to lock it in',
        link: '/sessions',
      }).catch(() => {})
    }

    await loadSessions(userId)
  }

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

  if (loading) return <PageLoader message="Loading your sessions…" />

  const upcoming = sessions.filter(s => s.status === 'accepted' && (!s.scheduled_at || new Date(s.scheduled_at) >= new Date()))
  const needsConfirm = sessions.filter(s => {
    const isSeeker = s.seeker_id === userId
    const myConfirm = isSeeker ? s.confirmed_by_seeker : s.confirmed_by_provider
    const theirConfirm = isSeeker ? s.confirmed_by_provider : s.confirmed_by_seeker
    return theirConfirm && !myConfirm
  })
  const bothConfirmed = sessions.filter(s => s.confirmed_by_seeker && s.confirmed_by_provider)
  const past = sessions.filter(s => s.scheduled_at && new Date(s.scheduled_at) < new Date())

  const SessionActions = ({ session, isCompleted }: { session: any, isCompleted: boolean }) => (
    <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
      <button
        onClick={() => archiveSession(session)}
        style={{ flex: 1, padding: '11px 8px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: 'var(--surface-1b)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}
      >
        📦 Archive
      </button>
      <button
        onClick={() => setConfirmDelete(session.id)}
        style={{ flex: 1, padding: '11px 8px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: 'rgba(255,80,80,0.06)', border: '1px solid rgba(255,80,80,0.15)', color: '#FF6B6B', cursor: 'pointer' }}
      >
        🗑️ Delete{isCompleted ? ' (−score)' : ''}
      </button>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'var(--surface-1)', border: '1px solid rgba(255,80,80,0.3)', borderRadius: '20px', padding: '24px', maxWidth: '380px', width: '100%', boxSizing: 'border-box' }}>
            <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', color: 'var(--text-primary)', marginBottom: '12px' }}>Delete session?</h3>
            {sessions.find(s => s.id === confirmDelete && s.confirmed_by_seeker && s.confirmed_by_provider) && (
              <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', marginBottom: '16px' }}>
                <p style={{ fontSize: '13px', color: '#FF6B6B', fontWeight: 600 }}>⚠️ This was a completed session</p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Deleting it will remove the Bestie Score earned from this session for both participants.</p>
              </div>
            )}
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>This action cannot be undone. The session will be permanently removed.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: '12px', borderRadius: '12px', fontSize: '14px', background: 'var(--overlay-2)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}>Cancel</button>
              <button
                onClick={() => deleteSession(sessions.find(s => s.id === confirmDelete))}
                disabled={deleting}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, background: 'rgba(255,80,80,0.15)', border: '1px solid rgba(255,80,80,0.3)', color: '#FF6B6B', cursor: 'pointer' }}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <Link href="/dashboard" style={{ fontSize: '14px', color: 'var(--text-muted)', textDecoration: 'none', padding: '8px 16px', borderRadius: '10px', border: '1px solid var(--border)' }}>← Dashboard</Link>
      </nav>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', color: 'var(--text-primary)', marginBottom: '4px' }}>My Sessions</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '32px' }}>{sessions.length} accepted {sessions.length === 1 ? 'session' : 'sessions'}</p>

        {sessions.length === 0 ? (
          <EmptyState
            Icon={Calendar}
            title="No sessions yet"
            description="Book your first session with a Bestie — your meetup history lives here."
            primaryCTA={{ label: 'Browse Besties', href: '/browse' }}
            accent="gold"
          />
        ) : (
          <>
            {needsConfirm.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#34D399', marginBottom: '12px' }}>⚡ WAITING FOR YOUR CONFIRMATION</p>
                {needsConfirm.map(s => {
                  const isSeeker = s.seeker_id === userId
                  const other = isSeeker ? s.provider : s.seeker
                  return (
                    <div key={s.id} style={{ background: 'linear-gradient(135deg, rgba(52,211,153,0.06) 0%, var(--surface-1) 100%)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: '20px', padding: '20px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', overflow: 'hidden', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {other?.avatar_url ? <img src={other.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#D4AF37', fontWeight: 700 }}>{other?.full_name?.[0]}</span>}
                        </div>
                        <div>
                          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{other?.full_name}</p>
                          <p style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><ActivityIcon type={s.package?.activity_type} size={14} color="#D4AF37" strokeWidth={1.8} /> {s.package?.title || 'Session'}</p>
                        </div>
                      </div>
                      <p style={{ fontSize: '13px', color: '#34D399', marginBottom: '12px' }}>
                        {other?.full_name?.split(' ')[0]} confirmed this session happened. Did it?
                      </p>
                      <button onClick={() => confirmSession(s)} style={{ width: '100%', padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, background: 'linear-gradient(135deg, #34D399 0%, #2AE600 100%)', color: '#09090F', border: 'none', cursor: 'pointer' }}>
                        ✓ Yes, confirm session
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {bothConfirmed.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#D4AF37', marginBottom: '12px' }}>⭐ RATE YOUR SESSION</p>
                {bothConfirmed.map(s => {
                  const isSeeker = s.seeker_id === userId
                  const other = isSeeker ? s.provider : s.seeker
                  const myRating = isSeeker ? s.rating_seeker : s.rating_provider
                  return (
                    <div key={s.id} style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, var(--surface-1) 100%)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '20px', padding: '20px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', overflow: 'hidden', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {other?.avatar_url ? <img src={other.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#D4AF37', fontWeight: 700 }}>{other?.full_name?.[0]}</span>}
                        </div>
                        <div>
                          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{other?.full_name}</p>
                          <p style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><ActivityIcon type={s.package?.activity_type} size={14} color="#D4AF37" strokeWidth={1.8} /> {s.package?.title || 'Session'}</p>
                        </div>
                      </div>
                      {myRating ? (
                        <p style={{ fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center' }}>{'⭐'.repeat(myRating)} — reviewed!</p>
                      ) : (
                        <Link href={`/review/${s.id}`} style={{ display: 'block', padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', textDecoration: 'none', textAlign: 'center' }}>
                          ⭐ Rate + Give Spark →
                        </Link>
                      )}
                      <SessionActions session={s} isCompleted={true} />
                    </div>
                  )
                })}
              </div>
            )}

            {upcoming.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: 'var(--text-muted)', marginBottom: '12px' }}>UPCOMING</p>
                {upcoming.map((s, i) => {
                  const isSeeker = s.seeker_id === userId
                  const other = isSeeker ? s.provider : s.seeker
                  const date = s.scheduled_at ? formatDate(s.scheduled_at) : null
                  const myConfirm = isSeeker ? s.confirmed_by_seeker : s.confirmed_by_provider
                  const isNext = i === 0
                  return (
                    <div key={s.id} style={{ background: isNext ? 'linear-gradient(135deg, var(--surface-1) 0%, var(--surface-3) 100%)' : 'var(--surface-1)', border: isNext ? '1px solid rgba(212,175,55,0.3)' : '1px solid var(--border)', borderRadius: '20px', padding: '20px', marginBottom: '12px', position: 'relative' }}>
                      {isNext && <div style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '999px', background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}>Next up</div>}
                      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                        <div style={{ width: '52px', height: '52px', borderRadius: '14px', overflow: 'hidden', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {other?.avatar_url ? <img src={other.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#D4AF37', fontWeight: 700, fontSize: '18px' }}>{other?.full_name?.[0]}</span>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{other?.full_name}</p>
                          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <ActivityIcon type={s.package?.activity_type} size={14} color="#D4AF37" strokeWidth={1.8} /> {s.package?.title || 'Session'}
                          </p>
                          {date && (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '999px', background: date.isToday ? 'rgba(52,211,153,0.1)' : 'rgba(212,175,55,0.1)', border: date.isToday ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(212,175,55,0.2)', color: date.isToday ? '#34D399' : '#D4AF37' }}>
                                {date.label}
                              </span>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{date.dateStr} · {date.timeStr}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                        <Link href={`/messages?to=${other?.username}`} style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, background: 'var(--surface-1b)', border: '1px solid var(--border)', color: 'var(--text-muted)', textDecoration: 'none', textAlign: 'center' }}>
                          💬 Message
                        </Link>
                        <CallButton toUserId={other?.id} toUserName={other?.full_name} bookingId={s.id} variant="full" />
                        {!myConfirm ? (
                          <button onClick={() => confirmSession(s)} style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#34D399', cursor: 'pointer' }}>
                            ✓ Session happened
                          </button>
                        ) : (
                          <div style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, background: 'rgba(52,211,153,0.04)', border: '1px solid rgba(52,211,153,0.1)', color: 'var(--text-muted)', textAlign: 'center' }}>
                            ✓ Waiting for them
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {past.length > 0 && (
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: 'var(--text-muted)', marginBottom: '12px' }}>PAST</p>
                {past.map(s => {
                  const isSeeker = s.seeker_id === userId
                  const other = isSeeker ? s.provider : s.seeker
                  const date = formatDate(s.scheduled_at)
                  const myRating = isSeeker ? s.rating_seeker : s.rating_provider
                  const bothConfirmed = s.confirmed_by_seeker && s.confirmed_by_provider
                  const myConfirm = isSeeker ? s.confirmed_by_seeker : s.confirmed_by_provider
                  const theirConfirm = isSeeker ? s.confirmed_by_provider : s.confirmed_by_seeker
                  return (
                    <div key={s.id} style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-1b)', borderRadius: '20px', padding: '20px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', overflow: 'hidden', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {other?.avatar_url ? <img src={other.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#D4AF37', fontWeight: 700 }}>{other?.full_name?.[0]}</span>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{other?.full_name}</p>
                          <p style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><ActivityIcon type={s.package?.activity_type} size={14} color="#D4AF37" strokeWidth={1.8} /> {s.package?.title || 'Session'} · {date?.dateStr}</p>
                        </div>
                      </div>
                      {myRating ? (
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{'⭐'.repeat(myRating)} — reviewed</p>
                      ) : bothConfirmed ? (
                        <Link href={`/review/${s.id}`} style={{ display: 'block', padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', color: '#D4AF37', textDecoration: 'none', textAlign: 'center' }}>
                          ⭐ Rate this session →
                        </Link>
                      ) : !myConfirm ? (
                        <button onClick={() => confirmSession(s)} style={{ width: '100%', padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#34D399', cursor: 'pointer' }}>
                          ✓ Confirm session happened
                        </button>
                      ) : (
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>
                          ⏳ Waiting for {other?.full_name?.split(' ')[0]} to confirm
                        </p>
                      )}
                      <SessionActions session={s} isCompleted={bothConfirmed} />
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
