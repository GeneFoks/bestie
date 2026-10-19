'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { createNotification } from '@/lib/notifications'
import { showToast } from '@/components/Toast'

type Props = {
  requestId: string
  userId: string
  crewId: string
  captainId: string
  shareProfile?: boolean
  onDone?: () => void
}

export default function JoinRequestActions({ requestId, userId, crewId, captainId, shareProfile, onDone }: Props) {
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
    // Membership FIRST. If the crew gate (or anything else) blocks the insert,
    // the request must stay pending — otherwise the person silently vanishes.
    const { error: memberErr } = await supabase
      .from('crew_members')
      .insert({ crew_id: crewId, user_id: userId, share_profile: !!shareProfile })
    const alreadyMember = memberErr && (memberErr.code === '23505' || (memberErr.message || '').includes('duplicate'))
    if (memberErr && !alreadyMember) {
      setActing(false)
      const gated = (memberErr.message || '').includes('crew_gate_profile_required')
      showToast(
        gated
          ? 'Can’t accept yet — their profile is incomplete (Bestie Type test, age or city). Ask them to finish it, then accept again.'
          : 'Couldn’t accept — try again',
        { type: 'error' }
      )
      return
    }
    await supabase.from('crew_join_requests').update({ status: 'accepted' }).eq('id', requestId)
    await supabase.from('users').update({ crew_id: crewId }).eq('id', userId)
    // Notify the requester
    const { data: crew } = await supabase.from('crews').select('name, slug').eq('id', crewId).single()
    if (crew) {
      createNotification({
        userId,
        type: 'join_accepted',
        title: `You're in! Welcome to ${crew.name}`,
        body: 'Tap to see your new crew',
        link: `/crews/${crew.slug}`,
      }).catch(() => {})
    }
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
      <button onClick={accept} disabled={acting} style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', border: 'none', cursor: acting ? 'not-allowed' : 'pointer', opacity: acting ? 0.6 : 1 }}>
        Accept
      </button>
      <button onClick={decline} disabled={acting} style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.25)', color: '#FF6B35', cursor: acting ? 'not-allowed' : 'pointer', opacity: acting ? 0.6 : 1 }}>
        Decline
      </button>
    </div>
  )
}
