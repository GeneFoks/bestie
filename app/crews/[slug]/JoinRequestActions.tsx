'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Props = {
  requestId: string
  userId: string
  crewId: string
  captainId: string
  onDone?: () => void
}

export default function JoinRequestActions({ requestId, userId, crewId, captainId, onDone }: Props) {
  const router = useRouter()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [acting, setActing] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null)
    })
  }, [])

  if (!currentUserId || currentUserId !== captainId || done) return null

  const accept = async () => {
    setActing(true)
    await supabase.from('crew_join_requests').update({ status: 'accepted' }).eq('id', requestId)
    await supabase.from('crew_members').insert({ crew_id: crewId, user_id: userId })
    await supabase.from('users').update({ crew_id: crewId }).eq('id', userId)
    setDone(true)
    onDone?.()
    router.refresh()
  }

  const decline = async () => {
    setActing(true)
    await supabase.from('crew_join_requests').update({ status: 'declined' }).eq('id', requestId)
    setDone(true)
    onDone?.()
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
      <button onClick={accept} disabled={acting} style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', border: 'none', cursor: acting ? 'not-allowed' : 'pointer', opacity: acting ? 0.6 : 1 }}>
        Accept
      </button>
      <button onClick={decline} disabled={acting} style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.25)', color: '#FF6B35', cursor: acting ? 'not-allowed' : 'pointer', opacity: acting ? 0.6 : 1 }}>
        Decline
      </button>
    </div>
  )
}
