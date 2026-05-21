'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Check, HelpCircle, X } from 'lucide-react'

type RSVP = 'going' | 'maybe' | 'cant_make'

type Props = {
  eventId: string
  isFull: boolean
}

const OPTIONS: { id: RSVP; label: string; Icon: any; color: string; bg: string; border: string }[] = [
  { id: 'going',     label: 'Going',  Icon: Check,      color: '#34D399', bg: 'rgba(52,211,153,0.15)',  border: 'rgba(52,211,153,0.40)' },
  { id: 'maybe',     label: 'Maybe',  Icon: HelpCircle, color: '#D4AF37', bg: 'rgba(212,175,55,0.15)',  border: 'rgba(212,175,55,0.40)' },
  { id: 'cant_make', label: "Can't",  Icon: X,          color: '#FF6B35', bg: 'rgba(255,107,53,0.10)',  border: 'rgba(255,107,53,0.30)' },
]

export default function EventGoingButton({ eventId, isFull }: Props) {
  const [userId, setUserId] = useState<string | null>(null)
  const [rsvp, setRsvp] = useState<RSVP | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      const uid = session.user.id
      setUserId(uid)
      const { data } = await supabase
        .from('crew_event_attendees')
        .select('status')
        .eq('event_id', eventId)
        .eq('user_id', uid)
        .maybeSingle()
      setRsvp((data?.status as RSVP) || null)
      setLoading(false)
    })
  }, [eventId])

  const setStatus = async (next: RSVP | null) => {
    if (!userId || acting) return
    setActing(true)
    if (next === null) {
      await supabase.from('crew_event_attendees').delete().eq('event_id', eventId).eq('user_id', userId)
      setRsvp(null)
    } else if (!rsvp) {
      await supabase.from('crew_event_attendees').insert({ event_id: eventId, user_id: userId, status: next })
      setRsvp(next)
    } else {
      await supabase.from('crew_event_attendees').update({ status: next }).eq('event_id', eventId).eq('user_id', userId)
      setRsvp(next)
    }
    setActing(false)
  }

  // Not logged in → link to event page
  if (!loading && !userId) {
    return (
      <Link
        href={`/events/${eventId}`}
        style={{ display: 'block', marginTop: '16px', padding: '13px', borderRadius: '12px', textAlign: 'center', fontSize: '15px', fontWeight: 700, background: 'linear-gradient(135deg, #34D399 0%, #2AAA75 100%)', color: '#09090F', textDecoration: 'none' }}
      >
        RSVP — sign in →
      </Link>
    )
  }

  if (loading) {
    return (
      <div style={{ marginTop: '16px', padding: '13px', borderRadius: '12px', textAlign: 'center', fontSize: '15px', background: 'rgba(255,255,255,0.06)', color: '#A99ECC' }}>
        …
      </div>
    )
  }

  if (isFull && rsvp !== 'going') {
    return (
      <Link
        href={`/events/${eventId}`}
        style={{ display: 'block', marginTop: '16px', padding: '13px', borderRadius: '12px', textAlign: 'center', fontSize: '14px', fontWeight: 600, background: '#131323', border: '1px solid rgba(255,255,255,0.12)', color: '#A99ECC', textDecoration: 'none' }}
      >
        Event full · View →
      </Link>
    )
  }

  return (
    <div style={{ marginTop: '14px' }}>
      <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px', color: '#A99ECC', marginBottom: '8px' }}>YOUR RSVP</p>
      <div style={{ display: 'flex', gap: '6px' }}>
        {OPTIONS.map(opt => {
          const active = rsvp === opt.id
          return (
            <button
              key={opt.id}
              onClick={() => setStatus(active ? null : opt.id)}
              disabled={acting}
              aria-label={opt.label}
              aria-pressed={active}
              style={{
                flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '11px 8px', borderRadius: '12px', fontSize: '13px', fontWeight: 700,
                cursor: acting ? 'not-allowed' : 'pointer',
                background: active ? opt.bg : '#131323',
                border: `1px solid ${active ? opt.border : 'rgba(255,255,255,0.10)'}`,
                color: active ? opt.color : '#A99ECC',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                transition: 'all 0.15s',
              }}
            >
              <opt.Icon size={14} strokeWidth={2.2} />
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
