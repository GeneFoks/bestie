'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Props = {
  eventId: string
  crewId: string
  captainId: string
  isMembersOnly: boolean
  isFull: boolean
}

export default function EventActions({ eventId, crewId, captainId, isMembersOnly, isFull }: Props) {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [isAttending, setIsAttending] = useState(false)
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
        supabase.from('crew_event_attendees').select('event_id').eq('event_id', eventId).eq('user_id', uid).maybeSingle(),
        supabase.from('crew_members').select('crew_id').eq('crew_id', crewId).eq('user_id', uid).maybeSingle(),
      ])

      setIsAttending(!!attending)
      setIsMember(!!membership)
      setLoading(false)
    })
  }, [eventId, crewId])

  const join = async () => {
    setActing(true)
    setError(null)
    const { error: err } = await supabase
      .from('crew_event_attendees').insert({ event_id: eventId, user_id: userId })
    if (err) { setError(err.message); setActing(false); return }
    setIsAttending(true)   // update local state immediately
    setActing(false)
    router.refresh()       // also refresh server component (updates attendee count)
  }

  const leave = async () => {
    setActing(true)
    await supabase.from('crew_event_attendees').delete().eq('event_id', eventId).eq('user_id', userId)
    setIsAttending(false)  // update local state immediately
    setActing(false)
    router.refresh()
  }

  if (loading) return null

  if (!userId) {
    return (
      <a href="/login" style={{ display: 'block', padding: '14px', borderRadius: '14px', textAlign: 'center', fontSize: '15px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>
        Log in to join
      </a>
    )
  }

  if (isAttending) {
    return (
      <button onClick={leave} disabled={acting} style={{ display: 'block', width: '100%', padding: '14px', borderRadius: '14px', fontSize: '15px', fontWeight: 700, background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.25)', color: '#FF6B35', cursor: acting ? 'not-allowed' : 'pointer', opacity: acting ? 0.6 : 1 }}>
        {acting ? 'Leaving…' : "Can't go anymore"}
      </button>
    )
  }

  if (isFull) {
    return (
      <div style={{ padding: '12px', borderRadius: '14px', textAlign: 'center', fontSize: '13px', color: '#9B93C0', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        Event is full
      </div>
    )
  }

  if (isMembersOnly && !isMember) {
    return (
      <div style={{ padding: '12px', borderRadius: '14px', textAlign: 'center', fontSize: '13px', color: '#9B93C0', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        This event is for crew members only
      </div>
    )
  }

  return (
    <div>
      <button onClick={join} disabled={acting} style={{ display: 'block', width: '100%', padding: '14px', borderRadius: '14px', fontSize: '15px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', border: 'none', cursor: acting ? 'not-allowed' : 'pointer', opacity: acting ? 0.7 : 1 }}>
        {acting ? 'Joining…' : "I'm going"}
      </button>
      {error && <p style={{ fontSize: '12px', color: '#FF6B35', marginTop: '8px', textAlign: 'center' }}>{error}</p>}
    </div>
  )
}
