// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Props = {
  crewId: string
  captainId: string
  crewName: string
}

export default function CrewDeleteButton({ crewId, captainId, crewName }: Props) {
  const router = useRouter()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [step, setStep] = useState<'idle' | 'confirm' | 'deleting'>('idle')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null)
    })
  }, [])

  if (!currentUserId || currentUserId !== captainId) return null

  const deleteCrew = async () => {
    setStep('deleting')
    await supabase.from('users').update({ crew_id: null }).eq('crew_id', crewId)
    await supabase.from('crews').delete().eq('id', crewId)
    router.push('/crews')
  }

  if (step === 'confirm') {
    return (
      <div style={{ marginTop: '12px', padding: '16px', borderRadius: '14px', background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.25)' }}>
        <p style={{ fontSize: '14px', fontWeight: 600, color: '#FF6B35', marginBottom: '4px' }}>
          Dissolve "{crewName}"?
        </p>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
          All members will be removed. This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={deleteCrew}
            style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, background: '#FF6B35', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            Yes, dissolve crew
          </button>
          <button
            onClick={() => setStep('idle')}
            style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, background: 'var(--overlay-2)', color: 'var(--text-muted)', border: '1px solid var(--border)', cursor: 'pointer' }}
          >
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
      Dissolve Crew
    </button>
  )
}
