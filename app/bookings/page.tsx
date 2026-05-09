// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const STATUS_STYLES = {
  pending:   { bg: 'rgba(212,175,55,0.1)',  border: 'rgba(212,175,55,0.3)',  color: '#D4AF37',  label: 'Pending' },
  accepted:  { bg: 'rgba(57,255,20,0.1)',   border: 'rgba(57,255,20,0.3)',   color: '#39FF14',  label: 'Accepted' },
  declined:  { bg: 'rgba(255,80,80,0.1)',   border: 'rgba(255,80,80,0.3)',   color: '#ff6b6b',  label: 'Declined' },
  completed: { bg: 'rgba(57,255,20,0.1)',   border: 'rgba(57,255,20,0.3)',   color: '#39FF14',  label: 'Completed' },
  cancelled: { bg: 'rgba(155,147,192,0.1)', border: 'rgba(155,147,192,0.3)', color: '#9B93C0',  label: 'Cancelled' },
}

export default function BookingsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState(null)
  const [bookings, setBookings] = useState([])
  const [tab, setTab] = useState('incoming')
  const [loading, setLoading] = useState(true)

  const loadBookings = async (uid) => {
    const { data } = await supabase
      .from('bookings')
      .select(`*, package:activity_packages(*), seeker:users!bookings_seeker_id_fkey(id,full_name,username,avatar_url,bestie_score,email), provider:users!bookings_provider_id_fkey(id,full_name,username,avatar_url,bestie_score,email)`)
      .or(`seeker_id.eq.${uid},provider_id.eq.${uid}`)
      .order('created_at', { ascending: false })
    setBookings(data || [])
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      await loadBookings(user.id)
      setLoading(false)

      const channel = supabase
        .channel('bookings-realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `seeker_id=eq.${user.id}`,
        }, () => loadBookings(user.id))
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `provider_id=eq.${user.id}`,
        }, () => loadBookings(user.id))
        .subscribe()

      return () => supabase.removeChannel(channel)
    }
    init()
  }, [])

  const sendEmail = async (type, to, data) => {
    try {
      await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, to, data })
      })
    } catch (e) {
      console.error('Email send failed:', e)
    }
  }

  const updateStatus = async (id, status) => {
    const booking = bookings.find(b => b.id === id)
    await supabase.from('bookings').update({ status }).eq('id', id)
    setBookings(b => b.map(b2 => b2.id === id ? { ...b2, status } : b2))

    const activityTitle = booking.package?.title || 'Session'

    if (status === 'accepted' && booking?.seeker?.email) {
      await sendEmail('booking_accepted', booking.seeker.email, {
        providerName: booking.provider?.full_name || 'Your Bestie',
        activityTitle,
      })
    }

    if (status === 'declined' && booking?.seeker?.email) {
      await sendEmail('booking_declined', booking.seeker.email, {
        providerName: booking.provider?.full_name || 'Your Bestie',
        activityTitle,
      })
    }

    if (status === 'cancelled' && booking?.provider?.email) {
      await sendEmail('booking_cancelled', booking.provider.email, {
        seekerName: booking.seeker?.full_name || 'Someone',
        activityTitle,
      })
    }

    if (status === 'completed' && booking?.seeker?.email) {
      await sendEmail('booking_completed', booking.seeker.email, {
        providerName: booking.provider?.full_name || 'Your Bestie',
        activityTitle,
        reviewUrl: `https://bestiehere.com/review/${id}`,
      })
    }
  }

  const incoming = bookings.filter(b => b.provider_id === userId)
  const outgoing = bookings.filter(b => b.seeker_id === userId)
  const current = tab === 'incoming' ? incoming : outgoing

  const formatDate = (ts) => ts ? new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#080810', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid rgba(212,175,55,0.2)', borderTop: '3px solid #D4AF37', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#080810', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <Link href="/dashboard" style={{ fontSize: '14px', color: '#9B93C0', textDecoration: 'none', padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>← Dashboard</Link>
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', fontWeight: 700, color: '#E8E0FF', marginBottom: '24px' }}>Bookings</h1>

        <div style={{ display: 'flex', gap: '4px', background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '4px', marginBottom: '24px' }}>
          {[
            { id: 'incoming', label: `Incoming (${incoming.length})` },
            { id: 'outgoing', label: `My requests (${outgoing.length})` },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer', background: tab === t.id ? 'rgba(212,175,55,0.12)' : 'transparent', color: tab === t.id ? '#D4AF37' : '#9B93C0' }}>
              {t.label}
            </button>
          ))}
        </div>

        {current.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontSize: '40px', marginBottom: '16px' }}>📋</p>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#E8E0FF', marginBottom: '8px' }}>No bookings yet</h3>
            <p style={{ fontSize: '14px', color: '#9B93C0', marginBottom: '24px' }}>
              {tab === 'incoming' ? 'When someone books you, it will appear here' : 'Find a Bestie and send your first request'}
            </p>
            {tab === 'outgoing' && (
              <Link href="/browse" style={{ padding: '10px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>Browse Besties</Link>
            )}
          </div>
        ) : current.map(booking => {
          const other = tab === 'incoming' ? booking.seeker : booking.provider
          const st = STATUS_STYLES[booking.status] || STATUS_STYLES.pending
          return (
            <div key={booking.id} style={{ background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '20px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', overflow: 'hidden', background: '#1a1a35', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {other?.avatar_url
                    ? <img src={other.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ color: '#D4AF37', fontWeight: 700 }}>{other?.full_name?.[0]}</span>
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <div>
                      <p style={{ fontSize: '15px', fontWeight: 600, color: '#E8E0FF' }}>{other?.full_name}</p>
                      <p style={{ fontSize: '13px', color: '#9B93C0' }}>@{other?.username}</p>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '999px', background: st.bg, border: `1px solid ${st.border}`, color: st.color }}>
                      {st.label}
                    </span>
                  </div>
                  <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', marginTop: '8px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#E8E0FF', marginBottom: '2px' }}>{booking.package?.title}</p>
                    <p style={{ fontSize: '12px', color: '#9B93C0' }}>
                      {booking.package?.is_free ? 'Free' : `$${booking.package?.price_per_session}/session`}
                      {booking.scheduled_at && ` · 📅 ${formatDate(booking.scheduled_at)}`}
                    </p>
                  </div>
                  {booking.message && (
                    <p style={{ fontSize: '13px', color: '#9B93C0', marginTop: '10px', fontStyle: 'italic' }}>"{booking.message}"</p>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {tab === 'incoming' && booking.status === 'pending' && (
                  <>
                    <button onClick={() => updateStatus(booking.id, 'accepted')} style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, background: 'rgba(57,255,20,0.12)', border: '1px solid rgba(57,255,20,0.3)', color: '#39FF14', cursor: 'pointer' }}>
                      ✓ Accept
                    </button>
                    <button onClick={() => updateStatus(booking.id, 'declined')} style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', color: '#ff6b6b', cursor: 'pointer' }}>
                      ✕ Decline
                    </button>
                  </>
                )}
                {tab === 'incoming' && booking.status === 'accepted' && (
                  <button onClick={() => updateStatus(booking.id, 'completed')} style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', border: 'none', cursor: 'pointer' }}>
                    ✓ Mark as completed
                  </button>
                )}
                {tab === 'outgoing' && booking.status === 'pending' && (
                  <button onClick={() => updateStatus(booking.id, 'cancelled')} style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#9B93C0', cursor: 'pointer' }}>
                    Cancel request
                  </button>
                )}
                <Link href={`/messages?to=${other?.username}`} style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#9B93C0', textDecoration: 'none', textAlign: 'center' }}>
                  💬 Message
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
