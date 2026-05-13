'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Props = {
  crewId: string
  captainId: string
  isPublic: boolean
  isFull: boolean
  captainUsername: string
}

export default function CrewActions({ crewId, captainId, isPublic, isFull, captainUsername }: Props) {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [userCrewId, setUserCrewId] = useState<string | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      const uid = session.user.id
      setUserId(uid)

      const { data: profile } = await supabase
        .from('users').select('crew_id').eq('id', uid).single()
      setUserCrewId(profile?.crew_id ?? null)

      const { data: membership } = await supabase
        .from('crew_members').select('crew_id').eq('crew_id', crewId).eq('user_id', uid).maybeSingle()
      setIsMember(!!membership)
      setLoading(false)
    })
  }, [crewId])

  const join = async () => {
    setActing(true)
    setError(null)
    const { error: err } = await supabase
      .from('crew_members').insert({ crew_id: crewId, user_id: userId })
    if (err) { setError(err.message); setActing(false); return }
    await supabase.from('users').update({ crew_id: crewId }).eq('id', userId)
    router.refresh()
  }

  const leave = async () => {
    setActing(true)
    setError(null)
    await supabase.from('crew_members').delete().eq('crew_id', crewId).eq('user_id', userId)
    await supabase.from('users').update({ crew_id: null }).eq('id', userId)
    router.refresh()
  }

  if (loading) return null

  // Not logged in
  if (!userId) {
    return (
      <Link href="/login" style={{ display: 'block', padding: '14px', borderRadius: '14px', textAlign: 'center', fontSize: '15px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>
        Log in to join
      </Link>
    )
  }

  // Captain — show manage link
  if (userId === captainId) {
    return (
      <div style={{ padding: '12px', borderRadius: '14px', textAlign: 'center', fontSize: '14px', fontWeight: 600, background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', color: '#D4AF37' }}>
        ⚔️ You are the Captain
      </div>
    )
  }

  // Already a member
  if (isMember) {
    return (
      <button onClick={leave} disabled={acting} style={{ display: 'block', width: '100%', padding: '14px', borderRadius: '14px', textAlign: 'center', fontSize: '15px', fontWeight: 700, background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.25)', color: '#FF6B35', cursor: acting ? 'not-allowed' : 'pointer', opacity: acting ? 0.6 : 1 }}>
        {acting ? 'Leaving…' : 'Leave Crew'}
      </button>
    )
  }

  // Already in another crew
  if (userCrewId && userCrewId !== crewId) {
    return (
      <div style={{ padding: '12px', borderRadius: '14px', textAlign: 'center', fontSize: '13px', color: '#9B93C0', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        You're already in another crew. Leave it first to join this one.
      </div>
    )
  }

  // Full crew
  if (isFull) {
    return (
      <div style={{ padding: '12px', borderRadius: '14px', textAlign: 'center', fontSize: '13px', color: '#9B93C0', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        This crew is full (108/108)
      </div>
    )
  }

  // Private crew — message captain
  if (!isPublic) {
    return (
      <Link href={`/messages?to=${captainUsername}`} style={{ display: 'block', padding: '14px', borderRadius: '14px', textAlign: 'center', fontSize: '15px', fontWeight: 700, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8E0FF', textDecoration: 'none' }}>
        💬 Message Captain to Join
      </Link>
    )
  }

  // Open crew — join
  return (
    <div>
      <button onClick={join} disabled={acting} style={{ display: 'block', width: '100%', padding: '14px', borderRadius: '14px', textAlign: 'center', fontSize: '15px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', cursor: acting ? 'not-allowed' : 'pointer', opacity: acting ? 0.7 : 1, border: 'none' }}>
        {acting ? 'Joining…' : '⚔️ Join Crew'}
      </button>
      {error && <p style={{ fontSize: '12px', color: '#FF6B35', marginTop: '8px', textAlign: 'center' }}>{error}</p>}
    </div>
  )
}
