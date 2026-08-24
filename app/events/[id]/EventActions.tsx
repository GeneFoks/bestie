// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Check, HelpCircle, X } from 'lucide-react'

type RSVP = 'going' | 'maybe' | 'cant_make'

type Props = {
  eventId: string
  crewId: string
  captainId: string
  isMembersOnly: boolean
  isFull: boolean
}

const OPTIONS: { id: RSVP; label: string; Icon: any; color: string; bg: string; border: string }[] = [
  { id: 'going',     label: 'Going',           Icon: Check,      color: '#34D399', bg: 'rgba(52,211,153,0.15)',  border: 'rgba(52,211,153,0.40)' },
  { id: 'maybe',     label: 'Maybe',           Icon: HelpCircle, color: '#D4AF37', bg: 'rgba(212,175,55,0.15)',  border: 'rgba(212,175,55,0.40)' },
  { id: 'cant_make', label: "Can't make it",   Icon: X,          color: '#FF6B35', bg: 'rgba(255,107,53,0.10)',  border: 'rgba(255,107,53,0.30)' },
]

export default function EventActions({ eventId, crewId, captainId, isMembersOnly, isFull }: Props) {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [rsvp, setRsvp] = useState<RSVP | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      const uid = session.user.id
      setUserId(uid)

      const [{ data: attending }, { data: membership }] = await Promise.all([
        supabase.from('crew_event_attendees').select('status').eq('event_id', eventId).eq('user_id', uid).maybeSingle(),
        supabase.from('crew_members').select('crew_id').eq('crew_id', crewId).eq('user_id', uid).maybeSingle(),
      ])

      setRsvp((attending?.status as RSVP) || null)
      setIsMember(!!membership)
      setLoading(false)
    })
  }, [eventId, crewId])

  const setStatus = async (next: RSVP | null) => {
    if (!userId || acting) return
    setActing(true)
    setError(null)
    if (next === null) {
      await supabase.from('crew_event_attendees').delete().eq('event_id', eventId).eq('user_id', userId)
      setRsvp(null)
    } else if (!rsvp) {
      const { error: err } = await supabase.from('crew_event_attendees').insert({ event_id: eventId, user_id: userId, status: next })
      if (err) { setError(err.message); setActing(false); return }
      setRsvp(next)
    } else {
      const { error: err } = await supabase.from('crew_event_attendees').update({ status: next }).eq('event_id', eventId).eq('user_id', userId)
      if (err) { setError(err.message); setActing(false); return }
      setRsvp(next)
    }
    setActing(false)
    router.refresh()
  }

  if (loading) return null

  if (!userId) {
    return (
      <a href="/login" style={{ display: 'block', padding: '14px', borderRadius: '14px', textAlign: 'center', fontSize: '15px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', textDecoration: 'none' }}>
        Log in to RSVP
      </a>
    )
  }

  if (isMembersOnly && !isMember) {
    return (
      <div style={{ padding: '12px', borderRadius: '14px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', background: 'var(--surface-1b)', border: '1px solid var(--border)' }}>
        This event is for crew members only
      </div>
    )
  }

  if (isFull && rsvp !== 'going') {
    return (
      <div style={{ padding: '12px', borderRadius: '14px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', background: 'var(--surface-1b)', border: '1px solid var(--border)' }}>
        Event is full — try selecting Maybe so the host knows
        <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
          {OPTIONS.filter(o => o.id !== 'going').map(opt => {
            const active = rsvp === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => setStatus(active ? null : opt.id)}
                disabled={acting}
                style={{
                  flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  padding: '10px', borderRadius: '12px', fontSize: '13px', fontWeight: 700,
                  cursor: acting ? 'not-allowed' : 'pointer',
                  background: active ? opt.bg : 'var(--surface-1)',
                  border: `1px solid ${active ? opt.border : 'var(--border)'}`,
                  color: active ? opt.color : 'var(--text-muted)',
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                }}
              >
                <opt.Icon size={14} strokeWidth={2.2} /> {opt.label}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px', color: 'var(--text-muted)', marginBottom: '10px' }}>YOUR RSVP</p>
      <div style={{ display: 'flex', gap: '8px' }}>
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
                padding: '13px 8px', borderRadius: '14px', fontSize: '14px', fontWeight: 700,
                cursor: acting ? 'not-allowed' : 'pointer',
                background: active ? opt.bg : 'var(--surface-1b)',
                border: `1px solid ${active ? opt.border : 'var(--border)'}`,
                color: active ? opt.color : 'var(--text-muted)',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                transition: 'all 0.15s',
              }}
            >
              <opt.Icon size={15} strokeWidth={2.2} /> {opt.label}
            </button>
          )
        })}
      </div>
      {error && <p style={{ fontSize: '12px', color: '#FF6B35', marginTop: '8px', textAlign: 'center' }}>{error}</p>}
    </div>
  )
}
