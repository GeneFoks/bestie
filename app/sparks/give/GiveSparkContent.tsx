// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { PageLoader } from '@/components/Loading'
import { createNotification } from '@/lib/notifications'
import { celebrate, buzz } from '@/lib/celebrate'
import { ButtonLink } from '@/components/ui/Button'

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
  { id: 'focused', emoji: '🎯', label: 'Focused' },
  { id: 'insightful', emoji: '🧠', label: 'Insightful' },
  { id: 'motivating', emoji: '💪', label: 'Motivating' },
  { id: 'supportive', emoji: '🌱', label: 'Supportive' },
  { id: 'creative', emoji: '🎨', label: 'Creative' },
  { id: 'inspiring', emoji: '🔥', label: 'Inspiring' },
  { id: 'professional', emoji: '🤝', label: 'Professional' },
  { id: 'articulate', emoji: '💬', label: 'Articulate' },
  { id: 'calming', emoji: '🧘', label: 'Calming' },
  { id: 'high_energy', emoji: '⚡', label: 'High energy' },
  { id: 'worldly', emoji: '🌍', label: 'Worldly' },
  { id: 'knowledgeable', emoji: '🎓', label: 'Knowledgeable' },
]

// Minimum Bestie Score required to give Sparks (≈ a fully completed
// profile). Keep in sync with require_confirmed_session() in
// lib/migration_sparks_knock_gate.sql.
const MIN_SPARK_SCORE = 150

export default function GiveSparkContent() {
  const params = useSearchParams()
  const router = useRouter()
  const toUsername = params.get('to')
  const preselectedType = params.get('type')

  const [me, setMe] = useState(null)
  const [myProfile, setMyProfile] = useState(null)
  const [recipient, setRecipient] = useState(null)
  const [selectedTypes, setSelectedTypes] = useState(preselectedType ? [preselectedType] : [])
  const [alreadyGiven, setAlreadyGiven] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [sentTypes, setSentTypes] = useState([])
  const [error, setError] = useState(null)
  const [revoking, setRevoking] = useState(null)
  // You can only Spark people you matched with (mutual knock) or had a
  // session with. Defaults to true so a transient query error fails open —
  // the DB gate (require_confirmed_session) is the real enforcement.
  const [hasRelationship, setHasRelationship] = useState(true)

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { router.push('/login'); return }
        setMe(session.user)

        const [{ data: myData }, { data: recipientData }] = await Promise.all([
          supabase.from('users').select('sparks_balance, full_name, username, bestie_score').eq('id', session.user.id).single(),
          supabase.from('users').select('id, full_name, username, avatar_url, bestie_score').eq('username', toUsername).single(),
        ])

        setMyProfile(myData)
        setRecipient(recipientData)

        if (recipientData) {
          // Which Spark types were already given to this person.
          const { data: given } = await supabase
            .from('sparks').select('spark_type')
            .eq('giver_id', session.user.id)
            .eq('receiver_id', recipientData.id)
          setAlreadyGiven(given?.map(s => s.spark_type) || [])

          // Relationship gate: a mutual knock (match) OR a real session
          // (booking accepted/completed). Mirrors can_message in the DB.
          const uid = session.user.id
          const rid = recipientData.id
          try {
            const [{ data: knock }, { data: sess }] = await Promise.all([
              supabase.from('knocks').select('id')
                .eq('is_mutual', true)
                .or(`and(sender_id.eq.${uid},receiver_id.eq.${rid}),and(sender_id.eq.${rid},receiver_id.eq.${uid})`)
                .limit(1),
              supabase.from('bookings').select('id')
                .in('status', ['accepted', 'completed'])
                .or(`and(seeker_id.eq.${uid},provider_id.eq.${rid}),and(seeker_id.eq.${rid},provider_id.eq.${uid})`)
                .limit(1),
            ])
            setHasRelationship((knock?.length || 0) > 0 || (sess?.length || 0) > 0)
          } catch {
            // Fail open — the DB still enforces the rule on insert.
            setHasRelationship(true)
          }
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const toggleType = (id) => {
    if (alreadyGiven.includes(id)) return
    setSelectedTypes(prev => {
      if (prev.includes(id)) return prev.filter(t => t !== id)
      const available = 3 - alreadyGiven.length
      if (prev.length >= available) return prev
      return [...prev, id]
    })
  }

  const handleGive = async () => {
    if (!selectedTypes.length || !recipient || !me) return
    setSending(true)
    setError(null)

    const inserts = selectedTypes.map(t => ({
      giver_id: me.id,
      receiver_id: recipient.id,
      spark_type: t,
    }))

    const { error: err } = await supabase.from('sparks').insert(inserts)

    if (err) {
      // Log the full error so we can see exactly what the DB rejected.
      console.error('Spark insert failed:', { code: err.code, message: err.message, details: err.details, hint: err.hint })
      const msg =
        err.code === '23505' ? 'You already gave one of these Sparks.'
        : (err.message || '').includes('spark_score_too_low') ? `Reach a Bestie Score of ${MIN_SPARK_SCORE} (complete your profile) to give Sparks.`
        : (err.message || '').includes('spark_no_relationship') ? 'You can only Spark someone you matched with (mutual knock) or had a session with.'
        : err.code === '23514' ? 'One of these Spark types isn’t enabled yet. Try a different one.'
        // Surface the real reason while we debug this.
        : `Couldn’t send: ${err.message || 'unknown error'}${err.code ? ` (${err.code})` : ''}`
      setError(msg)
      setSending(false)
      return
    }

    // Notify the recipient — sparks are the rarest trust signal, this should feel like a moment
    const labels = selectedTypes
      .map(id => SPARK_TYPES.find(s => s.id === id)?.label)
      .filter(Boolean) as string[]
    const myName = myProfile?.full_name?.split(' ')[0] || 'Someone'
    await createNotification({
      userId: recipient.id,
      type: 'spark_received',
      title: selectedTypes.length === 1 ? `${myName} gave you a Spark` : `${myName} gave you ${selectedTypes.length} Sparks`,
      body: labels.join(' · '),
      link: `/${recipient.username}`,
    })

    // Sensory reward for the giver
    celebrate({ count: 40, spread: 80 })
    buzz('success')

    setSentTypes(selectedTypes)
    setDone(true)
    setSending(false)
  }

  // Take back a Spark you already gave. Refunds +1 to your wallet and
  // recomputes the recipient's score (handled in the revoke_spark RPC).
  const revokeSpark = async (type) => {
    if (!recipient || revoking) return
    const label = SPARK_TYPES.find(s => s.id === type)?.label || 'this Spark'
    if (!window.confirm(`Take back “${label}”? It returns to your balance.`)) return
    setRevoking(type)
    setError(null)
    const { data, error: err } = await supabase.rpc('revoke_spark', {
      p_receiver_id: recipient.id,
      p_spark_type: type,
    })
    if (err || (data && data !== 'revoked' && data !== 'not_found')) {
      console.error('Revoke failed:', err)
      setError('Couldn’t take back that Spark. Try again.')
      setRevoking(null)
      return
    }
    // Reflect locally: drop from given list, refund the wallet.
    setAlreadyGiven(prev => prev.filter(t => t !== type))
    setMyProfile(p => p ? { ...p, sparks_balance: (p.sparks_balance ?? 0) + 1 } : p)
    setRevoking(null)
  }

  if (loading) return <PageLoader fullscreen={false} message="Loading…" />

  if (!recipient) return (
    <div style={{ minHeight: '100vh', background: '#09090F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</p>
        <p style={{ color: '#A99ECC' }}>User not found</p>
        <Link href="/browse" style={{ color: '#D4AF37', fontSize: '14px' }}>Browse Besties</Link>
      </div>
    </div>
  )

  // You need a minimum Bestie Score to give Sparks (≈ a complete profile).
  if ((myProfile?.bestie_score ?? 0) < MIN_SPARK_SCORE) return (
    <div style={{ minHeight: '100vh', background: '#09090F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: '380px', padding: '0 24px' }}>
        <p style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</p>
        <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '24px', color: '#F0EAFF', marginBottom: '8px' }}>Reach Bestie Score {MIN_SPARK_SCORE} to give Sparks</h2>
        <p style={{ fontSize: '15px', color: '#A99ECC', marginBottom: '12px', lineHeight: 1.5 }}>
          Sparks are a trust signal, so only members with an established profile can give them. Complete your profile — photo, bio, city and your Bestie Type — to get there.
        </p>
        <p style={{ fontSize: '13px', color: '#6B6490', marginBottom: '28px' }}>
          Your Bestie Score: <span style={{ color: '#D4AF37', fontWeight: 700 }}>{myProfile?.bestie_score ?? 0}</span> / {MIN_SPARK_SCORE}
        </p>
        <ButtonLink href="/profile/edit" variant="primary">
          Complete your profile →
        </ButtonLink>
      </div>
    </div>
  )

  // You can only Spark people you have a real connection with.
  if (!hasRelationship) return (
    <div style={{ minHeight: '100vh', background: '#09090F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: '380px', padding: '0 24px' }}>
        <p style={{ fontSize: '48px', marginBottom: '16px' }}>🤝</p>
        <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '24px', color: '#F0EAFF', marginBottom: '8px' }}>Connect first to give Sparks</h2>
        <p style={{ fontSize: '15px', color: '#A99ECC', marginBottom: '24px', lineHeight: 1.5 }}>
          Sparks are a personal endorsement. You can Spark <span style={{ color: '#F0EAFF', fontWeight: 500 }}>{recipient.full_name}</span> once you’ve matched (you both knocked) or had a session together.
        </p>
        <ButtonLink href={`/${recipient.username}`} variant="primary">
          Go to their profile to knock →
        </ButtonLink>
      </div>
    </div>
  )

  if (done) return (
    <div style={{ minHeight: '100vh', background: '#09090F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: '360px', padding: '0 24px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>
          {sentTypes.map(t => SPARK_TYPES.find(s => s.id === t)?.emoji).join(' ')}
        </div>
        <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', color: '#F0EAFF', marginBottom: '8px' }}>
          {sentTypes.length > 1 ? 'Sparks sent!' : 'Spark sent!'}
        </h2>
        <p style={{ fontSize: '15px', color: '#A99ECC', marginBottom: '28px' }}>
          You gave <span style={{ color: '#D4AF37', fontWeight: 600 }}>
            {sentTypes.map(t => SPARK_TYPES.find(s => s.id === t)?.label).join(', ')}
          </span> to {recipient.full_name}.
        </p>
        <ButtonLink href={`/${recipient.username}`} variant="primary">
          Back to profile →
        </ButtonLink>
      </div>
    </div>
  )

  const sparksLeft = myProfile?.sparks_balance ?? 30
  const givenCount = alreadyGiven.length
  const canGiveMore = 3 - givenCount
  const canSelect = canGiveMore - selectedTypes.length

  return (
    <div style={{ minHeight: '100vh', background: '#09090F', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <Link href={`/${recipient.username}`} style={{ fontSize: '14px', color: '#A99ECC', textDecoration: 'none' }}>← Back</Link>
      </nav>

      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '18px', overflow: 'hidden', background: '#1A1A2E', border: '2px solid rgba(212,175,55,0.3)', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {recipient.avatar_url
              ? <img src={recipient.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '28px', fontWeight: 700, color: '#D4AF37', fontFamily: 'DM Serif Display, serif' }}>{recipient.full_name?.[0]}</span>
            }
          </div>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '24px', color: '#F0EAFF', marginBottom: '4px' }}>Give Sparks ✨</h1>
          <p style={{ fontSize: '14px', color: '#A99ECC' }}>to <span style={{ color: '#F0EAFF', fontWeight: 500 }}>{recipient.full_name}</span></p>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <div style={{ flex: 1, background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#D4AF37', fontFamily: 'DM Serif Display, serif' }}>{sparksLeft}</div>
            <div style={{ fontSize: '11px', color: '#A99ECC', marginTop: '2px' }}>your balance</div>
          </div>
          <div style={{ flex: 1, background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: 700, color: canGiveMore === 0 ? '#FF6B6B' : '#F0EAFF', fontFamily: 'DM Serif Display, serif' }}>{canGiveMore}</div>
            <div style={{ fontSize: '11px', color: '#A99ECC', marginTop: '2px' }}>left for this person</div>
          </div>
          <div style={{ flex: 1, background: selectedTypes.length > 0 ? 'rgba(212,175,55,0.1)' : '#111120', border: selectedTypes.length > 0 ? '1px solid rgba(212,175,55,0.3)' : '1px solid rgba(255,255,255,0.10)', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#D4AF37', fontFamily: 'DM Serif Display, serif' }}>{selectedTypes.length}</div>
            <div style={{ fontSize: '11px', color: '#A99ECC', marginTop: '2px' }}>selected</div>
          </div>
        </div>

        {canGiveMore > 0 && canSelect > 0 && (
          <div style={{ padding: '10px 14px', borderRadius: '12px', background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)', marginBottom: '16px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: '#D4AF37' }}>Select up to {canGiveMore} Spark{canGiveMore > 1 ? 's' : ''} — {canSelect} more to pick</p>
          </div>
        )}

        {canGiveMore === 0 && (
          <div style={{ padding: '10px 14px', borderRadius: '12px', background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)', marginBottom: '16px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: '#FF6B6B' }}>You've given the max 3 Sparks to this person.</p>
          </div>
        )}

        {sparksLeft <= 0 && (
          <div style={{ padding: '10px 14px', borderRadius: '12px', background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)', marginBottom: '16px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: '#FF6B6B' }}>You've used all your Sparks.</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '24px' }}>
          {SPARK_TYPES.map(s => {
            const given = alreadyGiven.includes(s.id)
            const selected = selectedTypes.includes(s.id)
            const isRevoking = revoking === s.id
            // Given sparks are clickable to take back; others follow the select rules.
            const disabled = given ? isRevoking : (sparksLeft <= 0 || canGiveMore === 0 || (!selected && canSelect === 0))
            return (
              <button
                key={s.id}
                onClick={() => given ? revokeSpark(s.id) : toggleType(s.id)}
                disabled={disabled}
                title={given ? 'Tap to take this Spark back' : undefined}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                  padding: '12px 6px', borderRadius: '12px',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  background: selected ? 'rgba(212,175,55,0.15)' : given ? 'rgba(52,211,153,0.06)' : '#131323',
                  border: selected ? '1px solid rgba(212,175,55,0.5)' : given ? '1px solid rgba(52,211,153,0.25)' : '1px solid rgba(255,255,255,0.12)',
                  opacity: disabled && !selected && !given ? 0.4 : 1,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: '20px' }}>{s.emoji}</span>
                <span style={{ fontSize: '10px', fontWeight: 500, color: selected ? '#D4AF37' : given ? '#34D399' : '#A99ECC', textAlign: 'center', lineHeight: 1.3 }}>{s.label}</span>
                {given && <span style={{ fontSize: '9px', color: '#34D399' }}>{isRevoking ? '…' : '✓ tap to undo'}</span>}
                {selected && !given && <span style={{ fontSize: '9px', color: '#D4AF37' }}>✓</span>}
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
          disabled={!selectedTypes.length || sending || sparksLeft <= 0 || canGiveMore === 0}
          style={{
            width: '100%', padding: '16px', borderRadius: '14px', fontSize: '15px', fontWeight: 700,
            background: selectedTypes.length > 0 && sparksLeft > 0 && canGiveMore > 0
              ? 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)'
              : 'rgba(255,255,255,0.10)',
            color: selectedTypes.length > 0 && sparksLeft > 0 && canGiveMore > 0 ? '#09090F' : '#A99ECC',
            border: 'none', cursor: selectedTypes.length > 0 && sparksLeft > 0 && canGiveMore > 0 ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
          }}
        >
          {sending ? 'Sending...' : selectedTypes.length > 0
            ? `Give ${selectedTypes.map(t => SPARK_TYPES.find(s => s.id === t)?.emoji).join('')} ${selectedTypes.map(t => SPARK_TYPES.find(s => s.id === t)?.label).join(', ')}`
            : 'Select Sparks'}
        </button>

        <p style={{ fontSize: '12px', color: '#A99ECC', textAlign: 'center', marginTop: '16px' }}>
          Sparks are rare — you get 30 total, max 3 per person.
        </p>
      </div>
    </div>
  )
}
