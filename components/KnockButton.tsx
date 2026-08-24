// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Hand, Sparkles, ArrowRight, X } from 'lucide-react'
import { celebrateMatch, buzz } from '@/lib/celebrate'
import MatchCelebration from '@/components/MatchCelebration'

type KnockStatus = 'loading' | 'idle' | 'sent' | 'matched' | 'received'

type Variant = 'inline' | 'card' | 'hero'

type Props = {
  profileId: string
  profileUsername?: string  // needed for the "Schedule a session" follow-up after a match
  variant?: Variant
}

const inlineRow: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '6px' }
const cardRow:   React.CSSProperties = { display: 'flex',        alignItems: 'center', justifyContent: 'center', gap: '6px' }

export default function KnockButton({ profileId, profileUsername, variant = 'inline' }: Props) {
  const [myId, setMyId] = useState<string | null>(null)
  const [myName, setMyName] = useState<string | null>(null)
  const [myUsername, setMyUsername] = useState<string | null>(null)
  const [theirName, setTheirName] = useState<string | null>(null)
  const [theirAvatar, setTheirAvatar] = useState<string | null>(null)
  const [status, setStatus] = useState<KnockStatus>('loading')
  const [acting, setActing] = useState(false)
  const [celebrating, setCelebrating] = useState(false)

  const isCard = variant === 'card'
  const isHero = variant === 'hero'
  const layout = (isCard || isHero) ? cardRow : inlineRow
  const fullWidth: React.CSSProperties = isHero
    ? { width: '100%', padding: '14px 18px', fontSize: '15px', boxSizing: 'border-box' }
    : isCard
      ? { flex: 1, padding: '11px 14px', fontSize: '14px' }
      : { padding: '8px 14px', fontSize: '13px' }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setStatus('idle'); return }
      const uid = session.user.id
      setMyId(uid)

      // Grab my name/username for the "It's a match" email shown to the other side.
      supabase.from('users').select('full_name, username').eq('id', uid).single()
        .then(({ data: me }) => {
          if (me) { setMyName(me.full_name || null); setMyUsername(me.username || null) }
        })

      // Grab the profile's name/avatar so the match celebration can show WHO
      // you matched with (not just a generic "It's a match").
      supabase.from('users').select('full_name, avatar_url').eq('id', profileId).single()
        .then(({ data: them }) => {
          if (them) { setTheirName(them.full_name || null); setTheirAvatar(them.avatar_url || null) }
        })

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
      // Record it in the same guard the dashboard uses, so the dashboard
      // doesn't replay this exact celebration on the next visit.
      try {
        const arr = JSON.parse(localStorage.getItem('celebrated_matches') || '[]')
        if (!arr.includes(profileId)) localStorage.setItem('celebrated_matches', JSON.stringify([...arr, profileId]))
      } catch {}
      // Email the OTHER person (they knocked earlier and are likely not in-app
      // right now) that it's a match. Fire-and-forget — never block the UI.
      notifyByEmail('new_match')
    } else if (data === 'sent') {
      setStatus('sent')
      buzz('success')
      // Anonymous "someone knocked" teaser pulls the receiver back into the app.
      notifyByEmail('new_knock')
    }
    setActing(false)
  }

  // Best-effort email so a knock/match reaches people who aren't currently in
  // the app — this is the core re-engagement loop. The route resolves the
  // recipient's address server-side from receiverId (keeps knocks anonymous).
  const notifyByEmail = (type: 'new_knock' | 'new_match') => {
    const data: Record<string, unknown> = { receiverId: profileId }
    if (type === 'new_match') {
      data.matcherName = myName || undefined
      data.matcherUsername = myUsername || undefined
    }
    fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, data }),
    }).catch(() => {})
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
          ? <Link href={`/book/${profileUsername}`} style={{ flex: isCard ? 1 : undefined, width: isHero ? '100%' : undefined, textDecoration: 'none' }}>{matchBadge}</Link>
          : matchBadge}
        {celebrating && (
          <MatchCelebration
            profileUsername={profileUsername}
            profileName={theirName || undefined}
            profileAvatarUrl={theirAvatar || undefined}
            onClose={() => setCelebrating(false)}
          />
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
        style={{ borderRadius: '12px', fontWeight: 500, background: 'var(--overlay)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: acting ? 'not-allowed' : 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', ...fullWidth, ...layout }}
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

  // idle — prominent gold in card/hero variants, muted in inline variant.
  // 'hero' is the full-width gold treatment for profile-page heroes where the
  // knock is THE primary action and must not be quiet.
  const idleCardStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)',
    border: 'none',
    color: '#09090F',
    boxShadow: '0 4px 16px rgba(212,175,55,0.18)',
  }
  const idleHeroStyle: React.CSSProperties = {
    ...idleCardStyle,
    boxShadow: '0 6px 22px rgba(212,175,55,0.28)',
  }
  const idleInlineStyle: React.CSSProperties = {
    background: 'var(--overlay)',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
  }
  const idleStyle = isHero ? idleHeroStyle : isCard ? idleCardStyle : idleInlineStyle

  return (
    <button
      onClick={knock}
      disabled={acting}
      title="Anonymous — they only see you if they knock back"
      aria-label="Send a knock"
      style={{ borderRadius: '12px', fontWeight: 700, cursor: acting ? 'not-allowed' : 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', ...idleStyle, ...fullWidth, ...layout }}
    >
      {acting ? '…' : (<><Hand size={isHero ? 16 : 13} strokeWidth={2} /> Knock</>)}
    </button>
  )
}
