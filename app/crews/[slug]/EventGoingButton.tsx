'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Props = {
  eventId: string
  isFull: boolean
}

export default function EventGoingButton({ eventId, isFull }: Props) {
  const [userId, setUserId] = useState<string | null>(null)
  const [isGoing, setIsGoing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      const uid = session.user.id
      setUserId(uid)
      const { data } = await supabase
        .from('crew_event_attendees')
        .select('event_id')
        .eq('event_id', eventId)
        .eq('user_id', uid)
        .maybeSingle()
      setIsGoing(!!data)
      setLoading(false)
    })
  }, [eventId])

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!userId || acting) return
    setActing(true)
    if (isGoing) {
      await supabase.from('crew_event_attendees').delete().eq('event_id', eventId).eq('user_id', userId)
      setIsGoing(false)
    } else {
      await supabase.from('crew_event_attendees').insert({ event_id: eventId, user_id: userId })
      setIsGoing(true)
    }
    setActing(false)
  }

  // Not logged in → link to event page
  if (!loading && !userId) {
    return (
      <Link
        href={`/events/${eventId}`}
        style={{ display: 'block', marginTop: '16px', padding: '13px', borderRadius: '12px', textAlign: 'center', fontSize: '15px', fontWeight: 800, background: '#39FF14', color: '#080810', textDecoration: 'none' }}
      >
        I'm going →
      </Link>
    )
  }

  if (loading) {
    return (
      <div style={{ marginTop: '16px', padding: '13px', borderRadius: '12px', textAlign: 'center', fontSize: '15px', fontWeight: 800, background: 'rgba(255,255,255,0.06)', color: '#9B93C0' }}>
        …
      </div>
    )
  }

  if (isFull && !isGoing) {
    return (
      <Link
        href={`/events/${eventId}`}
        style={{ display: 'block', marginTop: '16px', padding: '13px', borderRadius: '12px', textAlign: 'center', fontSize: '14px', fontWeight: 600, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#9B93C0', textDecoration: 'none' }}
      >
        Event full · View →
      </Link>
    )
  }

  return (
    <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
      <button
        onClick={toggle}
        disabled={acting}
        style={{
          flex: 1, padding: '13px', borderRadius: '12px', textAlign: 'center', fontSize: '15px', fontWeight: 800,
          border: 'none', cursor: acting ? 'not-allowed' : 'pointer', opacity: acting ? 0.7 : 1,
          background: isGoing ? 'rgba(57,255,20,0.12)' : '#39FF14',
          color: isGoing ? '#39FF14' : '#080810',
          outline: isGoing ? '1px solid rgba(57,255,20,0.35)' : 'none',
          fontFamily: 'Plus Jakarta Sans, sans-serif',
        }}
      >
        {acting ? '…' : isGoing ? '✓ Going' : "I'm going →"}
      </button>
      <Link
        href={`/events/${eventId}`}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#9B93C0', textDecoration: 'none', fontSize: '16px', flexShrink: 0 }}
        title="View event"
      >
        →
      </Link>
    </div>
  )
}
