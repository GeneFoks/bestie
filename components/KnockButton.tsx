'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Hand, Sparkles, ArrowRight, X } from 'lucide-react'
import { celebrateMatch, buzz } from '@/lib/celebrate'
import MatchCelebration from '@/components/MatchCelebration'

type KnockStatus = 'loading' | 'idle' | 'sent' | 'matched' | 'received'

type Variant = 'inline' | 'card'

type Props = {
  profileId: string
  profileUsername?: string  // needed for the "Schedule a session" follow-up after a match
  variant?: Variant
}

const inlineRow: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '6px' }
const cardRow:   React.CSSProperties = { display: 'flex',        alignItems: 'center', justifyContent: 'center', gap: '6px' }

export default function KnockButton({ profileId, profileUsername, variant = 'inline' }: Props) {
  const [myId, setMyId] = useState<string | null>(null)
  const [status, setStatus] = useState<KnockStatus>('loading')
  const [acting, setActing] = useState(false)
  const [celebrating, setCelebrating] = useState(false)

  const isCard = variant === 'card'
  const layout = isCard ? cardRow : inlineRow
  const fullWidth: React.CSSProperties = isCard ? { flex: 1, padding: '11px 14px', fontSize: '14px' } : { padding: '8px 14px', fontSize: '13px' }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setStatus('idle'); return }
      const uid = session.user.id
      setMyId(uid)

      const { data } = await supabase
        .from('knocks')
        .select('is_mutual, sender_id, seen')
        .or(`and(sender_id.eq.${uid},receiver_id.eq.${profileId}),and(sender_id.eq.${profileId},receiver_id.eq.${uid})`)

      if (!data || data.length === 0) { setStatus('idle'); return }

      const myKnock = data.find(k => k.sender_id === uid)
      const theirKnock = data.find(k => k.sender_id === profileId)

      if (myKnock?.is_mutual || theirKnock?.is_mutual) setStatus('matched')
      else if (myKnock) setStatus('sent')
      else if (theirKnock) setStatus('received')
      else setStatus('idle')
    })
  }, [profileId])

  if (!myId || myId === profileId || status === 'loading') return null

  const knock = async () => {
    setActing(true)
    buzz('tap')
    const { data } = await supabase.rpc('send_knock', { p_receiver_id: profileId })
    if (data === 'matched') {
      setStatus('matched')
      celebrateMatch()
      setCelebrating(true)
    } else if (data === 'sent') {
      setStatus('sent')
      buzz('success')
    }
    setActing(false)
  }

  const cancelKnock = async () => {
    if (acting) return
    setActing(true)
    buzz('tap')
    const { data } = await supabase.rpc('cancel_knock', { p_receiver_id: profileId })
    if (data === 'cancelled' || data === 'not_found') {
      setStatus('idle')
    }
    setActing(false)
  }

  // After mutual match — replace the badge with a "Schedule a session →" link so
  // the user knows what to do next. Falls back to a static badge if no username.
  if (status === 'matched') {
    const matchBadge = (
      <div style={{ borderRadius: '12px', fontWeight: 700, background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.35)', color: '#34D399', ...fullWidth, ...layout }}>
        <Sparkles size={13} strokeWidth={2} /> {profileUsername ? 'Match — schedule a session' : 'Match!'}
        {profileUsername && <ArrowRight size={13} strokeWidth={2} />}
      </div>
    )
    return (
      <>
        {profileUsername
          ? <Link href={`/book/${profileUsername}`} style={{ flex: isCard ? 1 : undefined, textDecoration: 'none' }}>{matchBadge}</Link>
          : matchBadge}
        {celebrating && (
          <MatchCelebration profileUsername={profileUsername} onClose={() => setCelebrating(false)} />
        )}
      </>
    )
  }

  if (status === 'sent') {
    return (
      <button
        onClick={cancelKnock}
        disabled={acting}
        title="Tap to undo your knock"
        aria-label="Cancel knock"
        className="knock-sent-btn"
        style={{ borderRadius: '12px', fontWeight: 500, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', color: '#A99ECC', cursor: acting ? 'not-allowed' : 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', ...fullWidth, ...layout }}
      >
        {acting ? '…' : (
          <>
            <Hand size={13} strokeWidth={2} className="knock-sent-icon" />
            <X size={13} strokeWidth={2.4} className="knock-cancel-icon" style={{ display: 'none' }} />
            <span className="knock-sent-label">Knock sent</span>
          </>
        )}
        <style>{`
          .knock-sent-btn:hover .knock-sent-icon { display: none; }
          .knock-sent-btn:hover .knock-cancel-icon { display: inline-block !important; }
          .knock-sent-btn:hover .knock-sent-label::after { content: ' · undo'; opacity: 0.7; }
          .knock-sent-btn:hover { border-color: rgba(255,107,53,0.4); color: #FF6B35; }
        `}</style>
      </button>
    )
  }

  if (status === 'received') {
    return (
      <button
        onClick={knock}
        disabled={acting}
        aria-label="Knock back"
        style={{ borderRadius: '12px', fontWeight: 700, background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.4)', color: '#D4AF37', cursor: acting ? 'not-allowed' : 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', ...fullWidth, ...layout }}
      >
        {acting ? '…' : (<><Hand size={13} strokeWidth={2} /> Knock back!</>)}
      </button>
    )
  }

  // idle — prominent gold in card variant, muted in inline variant
  const idleCardStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)',
    border: 'none',
    color: '#09090F',
    boxShadow: '0 4px 16px rgba(212,175,55,0.18)',
  }
  const idleInlineStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.10)',
    color: '#A99ECC',
  }
  const idleStyle = isCard ? idleCardStyle : idleInlineStyle

  return (
    <button
      onClick={knock}
      disabled={acting}
      title="Anonymous — they only see you if they knock back"
      aria-label="Send a knock"
      style={{ borderRadius: '12px', fontWeight: 700, cursor: acting ? 'not-allowed' : 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', ...idleStyle, ...fullWidth, ...layout }}
    >
      {acting ? '…' : (<><Hand size={13} strokeWidth={2} /> Knock</>)}
    </button>
  )
}
