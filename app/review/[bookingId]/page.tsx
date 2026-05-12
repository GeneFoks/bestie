// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const SPARK_TYPES = [
  { id: 'kind', emoji: '💛', label: 'Kind' },
  { id: 'fun', emoji: '🎉', label: 'Fun' },
  { id: 'reliable', emoji: '🔒', label: 'Reliable' },
  { id: 'genuine', emoji: '💎', label: 'Genuine' },
  { id: 'safe', emoji: '🛡️', label: 'Safe' },
  { id: 'energetic', emoji: '⚡', label: 'Energetic' },
  { id: 'good_listener', emoji: '👂', label: 'Good listener' },
  { id: 'social', emoji: '🌟', label: 'Social' },
  { id: 'punctual', emoji: '⏰', label: 'Punctual' },
  { id: 'open', emoji: '🌊', label: 'Open' },
]

export default function ReviewPage({ params }) {
  const router = useRouter()
  const [userId, setUserId] = useState(null)
  const [booking, setBooking] = useState(null)
  const [other, setOther] = useState(null)
  const [isSeeker, setIsSeeker] = useState(false)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(0)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [selectedSpark, setSelectedSpark] = useState(null)
  const [alreadyGiven, setAlreadyGiven] = useState([])
  const [sparksBalance, setSparksBalance] = useState(30)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }
        setUserId(user.id)

        const { data: b } = await supabase
          .from('bookings')
          .select('*, package:activity_packages(*)')
          .eq('id', params.bookingId)
          .single()

        if (!b) { router.push('/sessions'); return }
        if (!b.confirmed_by_seeker || !b.confirmed_by_provider) { router.push('/sessions'); return }

        const seeker = b.seeker_id === user.id
        setIsSeeker(seeker)
        setBooking(b)

        const otherUserId = seeker ? b.provider_id : b.seeker_id
        const { data: otherUser } = await supabase
          .from('users')
          .select('id, full_name, username, avatar_url')
          .eq('id', otherUserId)
          .single()
        setOther(otherUser)

        const { data: myProfile } = await supabase
          .from('users')
          .select('sparks_balance')
          .eq('id', user.id)
          .single()
        setSparksBalance(myProfile?.sparks_balance ?? 30)

        const { data: given } = await supabase
          .from('sparks')
          .select('spark_type')
          .eq('giver_id', user.id)
          .eq('receiver_id', otherUserId)
        setAlreadyGiven(given?.map(s => s.spark_type) || [])

        const myRating = seeker ? b.rating_seeker : b.rating_provider
        if (myRating) setDone(true)

      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const handleSubmit = async () => {
    if (!rating) return
    setSubmitting(true)

    try {
      // 1. Save rating to booking
      const ratingField = isSeeker ? 'rating_seeker' : 'rating_provider'
      await supabase.from('bookings').update({ [ratingField]: rating }).eq('id', booking.id)

      // 2. Give spark if selected
      if (selectedSpark && other) {
        await supabase.from('sparks').insert({
          giver_id: userId,
          receiver_id: other.id,
          spark_type: selectedSpark,
        })
        // Decrease giver balance
        await supabase.from('users').update({ sparks_balance: sparksBalance - 1 }).eq('id', userId)
        // Increase receiver sparks_received
        const { data: receiverData } = await supabase.from('users').select('sparks_received').eq('id', other.id).single()
        await supabase.from('users').update({ sparks_received: (receiverData?.sparks_received || 0) + 1 }).eq('id', other.id)
      }

      
// 3. Recalculate avg_rating and total_sessions for the other user
if (other) {
  // isSeeker сохранил рейтинг в rating_seeker — ищем все rating_seeker где provider = other
  // isProvider сохранил рейтинг в rating_provider — ищем все rating_provider где seeker = other
  const ratingColumn = isSeeker ? 'rating_seeker' : 'rating_provider'
  const otherIdColumn = isSeeker ? 'provider_id' : 'seeker_id'

  const { data: allRatings } = await supabase
    .from('bookings')
    .select(ratingColumn)
    .eq(otherIdColumn, other.id)
    .not(ratingColumn, 'is', null)

  if (allRatings && allRatings.length > 0) {
    const ratings = allRatings.map(r => r[ratingColumn]).filter(Boolean)
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length
    await supabase.from('users').update({
      avg_rating: Math.round(avg * 10) / 10,
      total_sessions: ratings.length,
    }).eq('id', other.id)
  }
}

      setDone(true)
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#080810', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '36px', height: '36px', border: '3px solid rgba(212,175,55,0.2)', borderTop: '3px solid #D4AF37', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (done) return (
    <div style={{ minHeight: '100vh', background: '#080810', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: '360px', padding: '0 24px' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
        <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', color: '#E8E0FF', marginBottom: '8px' }}>Done!</h2>
        <p style={{ fontSize: '15px', color: '#9B93C0', marginBottom: '28px' }}>
          Thanks for reviewing your session with {other?.full_name?.split(' ')[0]}.
        </p>
        <Link href="/sessions" style={{ display: 'inline-block', padding: '12px 28px', borderRadius: '14px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>
          Back to Sessions →
        </Link>
      </div>
    </div>
  )

  const givenCount = alreadyGiven.length
  const canGiveSpark = sparksBalance > 0 && givenCount < 3

  return (
    <div style={{ minHeight: '100vh', background: '#080810', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <Link href="/sessions" style={{ fontSize: '14px', color: '#9B93C0', textDecoration: 'none' }}>← Sessions</Link>
      </nav>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '48px 24px' }}>

        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '20px', overflow: 'hidden', background: '#1a1a35', border: '2px solid rgba(212,175,55,0.3)', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {other?.avatar_url
              ? <img src={other.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '32px', fontWeight: 700, color: '#D4AF37', fontFamily: 'DM Serif Display, serif' }}>{other?.full_name?.[0]}</span>
            }
          </div>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '24px', color: '#E8E0FF', marginBottom: '4px' }}>Review session</h1>
          <p style={{ fontSize: '14px', color: '#9B93C0' }}>with <span style={{ color: '#E8E0FF', fontWeight: 500 }}>{other?.full_name}</span></p>
        </div>

        <div style={{ background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '24px', marginBottom: '16px' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '1px', color: '#9B93C0', marginBottom: '16px' }}>RATE YOUR EXPERIENCE</p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            {[1,2,3,4,5].map(star => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                style={{ fontSize: '36px', background: 'none', border: 'none', cursor: 'pointer', opacity: star <= (hoveredStar || rating) ? 1 : 0.25, transition: 'all 0.1s', transform: star <= (hoveredStar || rating) ? 'scale(1.1)' : 'scale(1)' }}
              >⭐</button>
            ))}
          </div>
          {rating > 0 && (
            <p style={{ fontSize: '13px', color: '#D4AF37', textAlign: 'center', marginTop: '12px', fontWeight: 600 }}>
              {rating === 5 ? 'Amazing! 🔥' : rating === 4 ? 'Great! 👍' : rating === 3 ? 'Good 👌' : rating === 2 ? 'Could be better' : 'Not great'}
            </p>
          )}
        </div>

        <div style={{ background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '1px', color: '#9B93C0' }}>GIVE A SPARK ✨</p>
            <span style={{ fontSize: '12px', color: '#9B93C0' }}>{sparksBalance} left · max 3 per person</span>
          </div>

          {!canGiveSpark ? (
            <p style={{ fontSize: '13px', color: '#9B93C0', textAlign: 'center' }}>
              {sparksBalance <= 0 ? 'No Sparks left' : 'Already gave 3 Sparks to this person'}
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
              {SPARK_TYPES.map(s => {
                const given = alreadyGiven.includes(s.id)
                const selected = selectedSpark === s.id
                return (
                  <button
                    key={s.id}
                    onClick={() => !given && setSelectedSpark(selected ? null : s.id)}
                    disabled={given}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                      padding: '10px 6px', borderRadius: '12px', cursor: given ? 'not-allowed' : 'pointer',
                      background: selected ? 'rgba(212,175,55,0.15)' : given ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                      border: selected ? '1px solid rgba(212,175,55,0.5)' : given ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(255,255,255,0.08)',
                      opacity: given ? 0.35 : 1,
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>{s.emoji}</span>
                    <span style={{ fontSize: '10px', fontWeight: 500, color: selected ? '#D4AF37' : '#9B93C0', textAlign: 'center', lineHeight: 1.3 }}>{s.label}</span>
                    {given && <span style={{ fontSize: '9px', color: '#9B93C0' }}>✓</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!rating || submitting}
          style={{
            width: '100%', padding: '16px', borderRadius: '14px', fontSize: '15px', fontWeight: 700,
            background: rating ? 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)' : 'rgba(255,255,255,0.06)',
            color: rating ? '#080810' : '#9B93C0',
            border: 'none', cursor: rating ? 'pointer' : 'not-allowed',
          }}
        >
          {submitting ? 'Submitting...' : selectedSpark ? `Submit rating + ✨ ${SPARK_TYPES.find(s => s.id === selectedSpark)?.label}` : 'Submit rating'}
        </button>

        <p style={{ fontSize: '12px', color: '#9B93C0', textAlign: 'center', marginTop: '12px' }}>
          Spark is optional — rating is required
        </p>
      </div>
    </div>
  )
}
