// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { createNotification } from '@/lib/notifications'
import { PageLoader } from '@/components/Loading'
import { ActivityIcon } from '@/lib/activityIcons'
import { showToast } from '@/components/Toast'

export default function BookPage({ params }) {
  const router = useRouter()
  const [provider, setProvider] = useState(null)
  const [userId, setUserId] = useState(null)
  const [myProfile, setMyProfile] = useState(null)
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [message, setMessage] = useState('')
  const [date, setDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)

      const [{ data: providerData }, { data: meData }] = await Promise.all([
        supabase.from('users').select('*, activity_packages(*)').eq('username', params.username).single(),
        supabase.from('users').select('full_name, email').eq('id', session.user.id).single(),
      ])

      if (!providerData) { router.push('/browse'); return }
      if (providerData.id === session.user.id) { router.push('/dashboard'); return }

      setProvider(providerData)
      setMyProfile(meData)
      if (providerData.activity_packages?.length > 0) setSelectedPackage(providerData.activity_packages[0])
      setLoading(false)
    }
    init()
  }, [])

  const handleBook = async () => {
    if (!selectedPackage) return
    setSending(true)

    const { error: bookingError } = await supabase.from('bookings').insert({
      seeker_id: userId,
      provider_id: provider.id,
      package_id: selectedPackage.id,
      message,
      scheduled_at: date ? new Date(date).toISOString() : null,
      status: 'pending',
    })

    if (bookingError) {
      console.error('Booking insert failed:', bookingError.message)
      showToast("Couldn't send your request — try again.", { type: 'error' })
      setSending(false)
      return
    }

    if (provider.email) {
      await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_booking',
          to: provider.email,
          data: {
            seekerName: myProfile?.full_name || 'Someone',
            activityTitle: selectedPackage.title,
          }
        })
      })
    }

    await createNotification({
      userId: provider.id,
      type: 'booking_request',
      title: `${myProfile?.full_name || 'Someone'} wants to hang out`,
      body: selectedPackage.title,
      link: '/bookings',
    })

    setSent(true)
    setSending(false)
  }

  const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', outline: 'none', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)', boxSizing: 'border-box', fontFamily: 'Plus Jakarta Sans, sans-serif' }

  if (loading) return <PageLoader message="Loading…" />

  if (sent) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px', padding: '24px' }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎉</div>
        <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', color: 'var(--text-primary)', marginBottom: '12px' }}>Request sent!</h2>
        <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '8px' }}>
          Your request has been sent to <strong style={{ color: 'var(--text-primary)' }}>{provider.full_name}</strong>.
        </p>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '32px' }}>They'll respond soon. You'll see updates in your plans.</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Link href="/bookings" style={{ padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', textDecoration: 'none' }}>View bookings</Link>
          <Link href="/browse" style={{ padding: '12px 24px', borderRadius: '12px', fontSize: '14px', color: 'var(--text-muted)', border: '1px solid var(--border)', textDecoration: 'none' }}>Browse more</Link>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <Link href={`/${params.username}`} style={{ fontSize: '14px', color: 'var(--text-muted)', textDecoration: 'none', padding: '8px 16px', borderRadius: '10px', border: '1px solid var(--border)' }}>← Back to profile</Link>
      </nav>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Plan a hangout</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '32px' }}>with {provider.full_name}</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '16px', marginBottom: '24px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', overflow: 'hidden', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {provider.avatar_url
              ? <img src={provider.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: '#D4AF37', fontWeight: 700 }}>{provider.full_name?.[0]}</span>
            }
          </div>
          <div>
            <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{provider.full_name}</p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {provider.city && `📍 ${provider.city} · `}
              ★ {provider.bestie_score || 0}
              {provider.avg_rating > 0 && ` · ⭐ ${Number(provider.avg_rating).toFixed(1)}`}
            </p>
          </div>
        </div>

        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '20px', padding: '24px', marginBottom: '16px' }}>
          <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '16px' }}>Select activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {provider.activity_packages?.map(pkg => (
              <button key={pkg.id} onClick={() => setSelectedPackage(pkg)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '14px', border: selectedPackage?.id === pkg.id ? '2px solid rgba(212,175,55,0.5)' : '1px solid var(--border)', background: selectedPackage?.id === pkg.id ? 'rgba(212,175,55,0.08)' : 'var(--surface-1)', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(212,175,55,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ActivityIcon type={pkg.activity_type} size={16} color="#D4AF37" strokeWidth={1.8} />
                  </span>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{pkg.title}</p>
                    {pkg.description && <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{pkg.description}</p>}
                  </div>
                </div>
                <span style={{ fontSize: '15px', fontWeight: 700, color: pkg.is_free ? '#34D399' : 'var(--text-primary)', flexShrink: 0 }}>
                  {pkg.is_free ? 'Free' : `$${pkg.price_per_session}`}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '20px', padding: '24px', marginBottom: '16px' }}>
          <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '16px' }}>Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Preferred date & time <span style={{ fontWeight: 400 }}>(optional)</span></label>
              <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' }} />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Message to {provider.full_name?.split(' ')[0]}</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={`Hi ${provider.full_name?.split(' ')[0]}! I'd love to hang out...`} rows={4} style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }} />
            </div>
          </div>
        </div>

        {selectedPackage && (
          <div style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>You're planning</p>
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedPackage.title}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Total</p>
                <p style={{ fontSize: '20px', fontWeight: 700, color: selectedPackage.is_free ? '#34D399' : '#D4AF37' }}>
                  {selectedPackage.is_free ? 'Free' : `$${selectedPackage.price_per_session}`}
                </p>
              </div>
            </div>
          </div>
        )}

        <button onClick={handleBook} disabled={sending || !selectedPackage} style={{ width: '100%', padding: '16px', borderRadius: '14px', fontSize: '15px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', border: 'none', cursor: sending || !selectedPackage ? 'not-allowed' : 'pointer', opacity: !selectedPackage ? 0.5 : 1 }}>
          {sending ? 'Sending request...' : 'Send request →'}
        </button>
      </div>
    </div>
  )
}
