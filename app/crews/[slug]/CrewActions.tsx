'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Props = {
  crewId: string
  captainId: string
  isPublic: boolean
  isFull: boolean
  captainUsername: string
  crewSlug: string
}

function CrewActions({ crewId, captainId, isPublic, isFull, captainUsername, crewSlug }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [userId, setUserId] = useState<string | null>(null)
  const [userCrewId, setUserCrewId] = useState<string | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'declined' | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const inviteCode = searchParams.get('invite')

      if (!session) {
        // Save invite to localStorage so dashboard can apply it after login
        if (inviteCode) {
          localStorage.setItem('bestie_crew_invite', JSON.stringify({ crewId, crewSlug, inviteCode }))
        }
        setLoading(false)
        return
      }
      const uid = session.user.id
      setUserId(uid)

      const [{ data: profile }, { data: membership }, { data: request }] = await Promise.all([
        supabase.from('users').select('crew_id').eq('id', uid).single(),
        supabase.from('crew_members').select('crew_id').eq('crew_id', crewId).eq('user_id', uid).maybeSingle(),
        supabase.from('crew_join_requests').select('status').eq('crew_id', crewId).eq('user_id', uid).maybeSingle(),
      ])

      setUserCrewId(profile?.crew_id ?? null)
      setRequestStatus(request ? request.status : 'none')

      // Auto-join via invite if not already a member
      if (inviteCode && !membership && uid !== captainId) {
        const { data: result } = await supabase.rpc('join_crew_via_invite', {
          p_crew_id: crewId,
          p_invite_code: inviteCode,
        })
        if (result === 'joined' || result === 'already_member') {
          setIsMember(true)
          setUserCrewId(crewId)
          router.replace(`/crews/${crewSlug}`)
          setLoading(false)
          return
        }
        if (result === 'in_other_crew') {
          setError('You are already in another crew. Leave it first.')
        }
      } else {
        setIsMember(!!membership)
      }

      setLoading(false)
    })
  }, [crewId])

  const join = async () => {
    setActing(true)
    setError(null)
    const { error: err } = await supabase.from('crew_members').insert({ crew_id: crewId, user_id: userId })
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

  const requestJoin = async () => {
    setActing(true)
    setError(null)
    const { error: err } = await supabase
      .from('crew_join_requests').insert({ crew_id: crewId, user_id: userId })
    if (err) { setError(err.message); setActing(false); return }
    setRequestStatus('pending')
    setActing(false)
  }

  const cancelRequest = async () => {
    setActing(true)
    await supabase.from('crew_join_requests').delete().eq('crew_id', crewId).eq('user_id', userId)
    setRequestStatus('none')
    setActing(false)
  }

  if (loading) return null

  if (!userId) {
    return (
      <Link href="/login" style={{ display: 'block', padding: '14px', borderRadius: '14px', textAlign: 'center', fontSize: '15px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>
        Log in to join
      </Link>
    )
  }

  if (userId === captainId) {
    return (
      <div style={{ padding: '12px', borderRadius: '14px', textAlign: 'center', fontSize: '14px', fontWeight: 600, background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', color: '#D4AF37' }}>
        You are the Captain
      </div>
    )
  }

  if (isMember) {
    return (
      <button onClick={leave} disabled={acting} style={{ display: 'block', width: '100%', padding: '14px', borderRadius: '14px', textAlign: 'center', fontSize: '15px', fontWeight: 700, background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.25)', color: '#FF6B35', cursor: acting ? 'not-allowed' : 'pointer', opacity: acting ? 0.6 : 1 }}>
        {acting ? 'Leaving…' : 'Leave Crew'}
      </button>
    )
  }

  if (userCrewId && userCrewId !== crewId) {
    return (
      <div style={{ padding: '12px', borderRadius: '14px', textAlign: 'center', fontSize: '13px', color: '#9B93C0', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        You're already in another crew. Leave it first to join this one.
      </div>
    )
  }

  if (isFull) {
    return (
      <div style={{ padding: '12px', borderRadius: '14px', textAlign: 'center', fontSize: '13px', color: '#9B93C0', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        This crew is full (108/108)
      </div>
    )
  }

  // Private crew — request to join
  if (!isPublic) {
    if (requestStatus === 'pending') {
      return (
        <div>
          <div style={{ padding: '12px 14px', borderRadius: '14px', textAlign: 'center', fontSize: '14px', color: '#D4AF37', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', marginBottom: '8px' }}>
            Request sent · Waiting for Captain
          </div>
          <button onClick={cancelRequest} disabled={acting} style={{ display: 'block', width: '100%', padding: '10px', borderRadius: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 600, background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#9B93C0', cursor: 'pointer' }}>
            {acting ? '…' : 'Cancel request'}
          </button>
        </div>
      )
    }

    if (requestStatus === 'declined') {
      return (
        <div style={{ padding: '12px', borderRadius: '14px', textAlign: 'center', fontSize: '13px', color: '#9B93C0', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          Your request was declined
        </div>
      )
    }

    return (
      <div>
        <button onClick={requestJoin} disabled={acting} style={{ display: 'block', width: '100%', padding: '14px', borderRadius: '14px', textAlign: 'center', fontSize: '15px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', border: 'none', cursor: acting ? 'not-allowed' : 'pointer', opacity: acting ? 0.7 : 1 }}>
          {acting ? 'Sending…' : 'Request to Join'}
        </button>
        {error && <p style={{ fontSize: '12px', color: '#FF6B35', marginTop: '8px', textAlign: 'center' }}>{error}</p>}
      </div>
    )
  }

  // Open crew
  return (
    <div>
      <button onClick={join} disabled={acting} style={{ display: 'block', width: '100%', padding: '14px', borderRadius: '14px', textAlign: 'center', fontSize: '15px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', cursor: acting ? 'not-allowed' : 'pointer', opacity: acting ? 0.7 : 1, border: 'none' }}>
        {acting ? 'Joining…' : 'Join Crew'}
      </button>
      {error && <p style={{ fontSize: '12px', color: '#FF6B35', marginTop: '8px', textAlign: 'center' }}>{error}</p>}
    </div>
  )
}

export default function CrewActionsWrapper(props: Props) {
  return (
    <Suspense fallback={null}>
      <CrewActions {...props} />
    </Suspense>
  )
}
