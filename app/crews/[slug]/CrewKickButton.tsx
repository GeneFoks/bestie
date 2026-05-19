'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Props = {
  crewId: string
  captainId: string
  memberId: string
}

export default function CrewKickButton({ crewId, captainId, memberId }: Props) {
  const router = useRouter()
  const [myId, setMyId] = useState<string | null>(null)
  const [kicking, setKicking] = useState(false)
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setMyId(session?.user?.id ?? null)
    })
  }, [])

  if (!myId || myId !== captainId || memberId === captainId) return null

  const kick = async () => {
    setKicking(true)
    await supabase.from('crew_members').delete().eq('crew_id', crewId).eq('user_id', memberId)
    // Clear featured crew if this was their featured crew
    await supabase.from('users').update({ crew_id: null }).eq('id', memberId).eq('crew_id', crewId)
    setKicking(false)
    setConfirm(false)
    router.refresh()
  }

  if (confirm) {
    return (
      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
        <button onClick={() => setConfirm(false)} style={{ padding: '5px 8px', borderRadius: '7px', fontSize: '11px', background: '#131323', border: '1px solid rgba(255,255,255,0.12)', color: '#A99ECC', cursor: 'pointer' }}>
          Cancel
        </button>
        <button onClick={kick} disabled={kicking} style={{ padding: '5px 8px', borderRadius: '7px', fontSize: '11px', fontWeight: 700, background: 'rgba(255,80,80,0.15)', border: '1px solid rgba(255,80,80,0.3)', color: '#FF6B6B', cursor: 'pointer' }}>
          {kicking ? '…' : 'Kick'}
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={e => { e.preventDefault(); setConfirm(true) }}
      style={{ flexShrink: 0, padding: '5px 10px', borderRadius: '8px', fontSize: '12px', background: '#111120', border: '1px solid rgba(255,255,255,0.12)', color: '#555', cursor: 'pointer' }}
    >
      ✕
    </button>
  )
}
