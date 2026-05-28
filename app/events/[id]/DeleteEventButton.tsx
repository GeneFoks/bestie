'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Props = {
  eventId: string
  captainId: string
  crewSlug: string
  eventTitle: string
}

export default function DeleteEventButton({ eventId, captainId, crewSlug, eventTitle }: Props) {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [step, setStep] = useState<'idle' | 'confirm' | 'deleting'>('idle')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null)
    })
  }, [])

  if (!userId || userId !== captainId) return null

  const deleteEvent = async () => {
    setStep('deleting')
    await supabase.from('crew_events').delete().eq('id', eventId)
    router.push(`/crews/${crewSlug}`)
  }

  if (step === 'deleting') {
    return (
      <div style={{ marginTop: '12px', padding: '14px', borderRadius: '14px', textAlign: 'center', fontSize: '13px', color: '#A99ECC', background: 'rgba(255,107,53,0.06)', border: '1px solid rgba(255,107,53,0.15)' }}>
        Deleting…
      </div>
    )
  }

  if (step === 'confirm') {
    return (
      <div style={{ marginTop: '12px', padding: '16px', borderRadius: '14px', background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.25)' }}>
        <p style={{ fontSize: '14px', fontWeight: 600, color: '#FF6B35', marginBottom: '4px' }}>Delete "{eventTitle}"?</p>
        <p style={{ fontSize: '13px', color: '#A99ECC', marginBottom: '14px' }}>All attendees will be removed. This cannot be undone.</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={deleteEvent} style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, background: '#FF6B35', color: '#fff', border: 'none', cursor: 'pointer' }}>
            Yes, delete event
          </button>
          <button onClick={() => setStep('idle')} style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, background: 'rgba(255,255,255,0.10)', color: '#A99ECC', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setStep('confirm')}
      style={{ marginTop: '12px', width: '100%', padding: '10px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, background: 'transparent', border: '1px solid rgba(255,107,53,0.2)', color: 'rgba(255,107,53,0.7)', cursor: 'pointer' }}
    >
      Delete Event
    </button>
  )
}
