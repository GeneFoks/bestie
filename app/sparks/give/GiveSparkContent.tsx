// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
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

export default function GiveSparkContent() {
  const params = useSearchParams()
  const router = useRouter()
  const toUsername = params.get('to')
  const preselectedType = params.get('type')

  const [me, setMe] = useState(null)
  const [myProfile, setMyProfile] = useState(null)
  const [recipient, setRecipient] = useState(null)
  const [selectedType, setSelectedType] = useState(preselectedType || null)
  const [alreadyGiven, setAlreadyGiven] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { router.push('/login'); return }

        setMe(session.user)

        const [{ data: myData }, { data: recipientData }] = await Promise.all([
          supabase.from('users').select('sparks_balance, full_name, username').eq('id', session.user.id).single(),
          supabase.from('users').select('id, full_name, username, avatar_url, bestie_score').eq('username', toUsername).single(),
        ])

        setMyProfile(myData)
        setRecipient(recipientData)

        if (recipientData) {
          const { data: given } = await supabase
            .from('sparks')
            .select('spark_type')
            .eq('giver_id', session.user.id)
            .eq('receiver_id', recipientData.id)
          setAlreadyGiven(given?.map(s => s.spark_type) || [])
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const handleGive = async () => {
    if (!selectedType || !recipient || !me) return
    setSending(true)
    setError(null)

    const { error: err } = await supabase.from('sparks').insert({
      giver_id: me.id,
      receiver_id: recipient.id,
      spark_type: selectedType,
    })

    if (err) {
      setError(err.code === '23505' ? 'You already gave this Spark.' : 'Something went wrong. Try again.')
      setSending(false)
      return
    }

    setDone(true)
    setSending(false)
  }

  const spark = SPARK_TYPES.find(s => s.id === selectedType)

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#080810', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '36px', height: '36px', border: '3px solid rgba(212,175,55,0.2)', borderTop: '3px solid #D4AF37', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (!recipient) return (
    <div style={{ minHeight: '100vh', background: '#080810', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</p>
        <p style={{ color: '#9B93C0' }}>User not found</p>
        <Link href="/browse" style={{ color: '#D4AF37', fontSize: '14px' }}>Browse Besties</Link>
      </div>
    </div>
  )

  if (done) return (
    <div style={{ minHeight: '100vh', background: '#080810', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: '360px', padding: '0 24px' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>{spark?.emoji}</div>
        <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', color: '#E8E0FF', marginBottom: '8px' }}>Spark sent!</h2>
        <p style={{ fontSize: '15px', color: '#9B93C0', marginBottom: '28px' }}>
          You gave <span style={{ color: '#D4AF37', fontWeight: 600 }}>{spark?.label}</span> to {recipient.full_name}.
          You have <span style={{ color: '#D4AF37', fontWeight: 600 }}>{(myProfile?.sparks_balance || 30) - 1}</span> Sparks left.
        </p>
        <Link href={`/${recipient.username}`} style={{ display: 'inline-block', padding: '12px 28px', borderRadius: '14px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>
          Back to profile →
        </Link>
      </div>
    </div>
  )

  const sparksLeft = myProfile?.sparks_balance ?? 30
  const givenCount = alreadyGiven.length

  return (
    <div style={{ minHeight: '100vh', background: '#080810', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <Link href={`/${recipient.username}`} style={{ fontSize: '14px', color: '#9B93C0', textDecoration: 'none' }}>← Back</Link>
      </nav>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '18px', overflow: 'hidden', background: '#1a1a35', border: '2px solid rgba(212,175,55,0.3)', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {recipient.avatar_url
              ? <img src={recipient.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '28px', fontWeight: 700, color: '#D4AF37', fontFamily: 'DM Serif Display, serif' }}>{recipient.full_name?.[0]}</span>
            }
          </div>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '24px', color: '#E8E0FF', marginBottom: '4px' }}>Give a Spark ✨</h1>
          <p style={{ fontSize: '14px', color: '#9B93C0' }}>to <span style={{ color: '#E8E0FF', fontWeight: 500 }}>{recipient.full_name}</span></p>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
          <div style={{ flex: 1, background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#D4AF37', fontFamily: 'DM Serif Display, serif' }}>{sparksLeft}</div>
            <div style={{ fontSize: '11px', color: '#9B93C0', marginTop: '2px' }}>your balance</div>
          </div>
          <div style={{ flex: 1, background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: 700, color: givenCount >= 3 ? '#FF6B6B' : '#E8E0FF', fontFamily: 'DM Serif Display, serif' }}>{3 - givenCount}</div>
            <div style={{ fontSize: '11px', color: '#9B93C0', marginTop: '2px' }}>left for this person</div>
          </div>
        </div>

        {sparksLeft <= 0 && (
          <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '14px', padding: '16px', textAlign: 'center', marginBottom: '20px' }}>
            <p style={{ fontSize: '14px', color: '#FF6B6B' }}>You've used all your Sparks.</p>
          </div>
        )}

        {givenCount >= 3 && sparksLeft > 0 && (
          <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '14px', padding: '16px', textAlign: 'center', marginBottom: '20px' }}>
            <p style={{ fontSize: '14px', color: '#FF6B6B' }}>You've given 3 Sparks to this person already — that's the max.</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '24px' }}>
          {SPARK_TYPES.map(s => {
            const given = alreadyGiven.includes(s.id)
            const selected = selectedType === s.id
            return (
              <button
                key={s.id}
                onClick={() => !given && setSelectedType(s.id)}
                disabled={given || sparksLeft <= 0 || givenCount >= 3}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                  padding: '10px 6px', borderRadius: '12px', cursor: given ? 'not-allowed' : 'pointer',
                  background: selected ? 'rgba(212,175,55,0.15)' : given ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                  border: selected ? '1px solid rgba(212,175,55,0.5)' : given ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(255,255,255,0.08)',
                  opacity: given ? 0.4 : 1, transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: '20px' }}>{s.emoji}</span>
                <span style={{ fontSize: '10px', fontWeight: 500, color: selected ? '#D4AF37' : '#9B93C0', textAlign: 'center', lineHeight: 1.3 }}>{s.label}</span>
                {given && <span style={{ fontSize: '9px', color: '#9B93C0' }}>✓ given</span>}
              </button>
            )
          })}
        </div>

        {error && (
          <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '12px', padding: '12px', textAlign: 'center', marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', color: '#FF6B6B' }}>{error}</p>
          </div>
        )}

        <button
          onClick={handleGive}
          disabled={!selectedType || sending || sparksLeft <= 0 || givenCount >= 3}
          style={{
            width: '100%', padding: '16px', borderRadius: '14px', fontSize: '15px', fontWeight: 700,
            background: selectedType && sparksLeft > 0 && givenCount < 3 ? 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)' : 'rgba(255,255,255,0.06)',
            color: selectedType && sparksLeft > 0 && givenCount < 3 ? '#080810' : '#9B93C0',
            border: 'none', cursor: selectedType && sparksLeft > 0 && givenCount < 3 ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
          }}
        >
          {sending ? 'Sending...' : selectedType ? `Give ${spark?.emoji} ${spark?.label}` : 'Select a Spark'}
        </button>

        <p style={{ fontSize: '12px', color: '#9B93C0', textAlign: 'center', marginTop: '16px' }}>
          Sparks are rare — you get 30 total, max 3 per person.
        </p>
      </div>
    </div>
  )
}
