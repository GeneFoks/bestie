// @ts-nocheck
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Crown, Star } from 'lucide-react'
import { createNotification } from '@/lib/notifications'

type Props = {
  crewId: string
  captainId: string
  isPublic: boolean
  isFull: boolean
  captainUsername: string
  crewSlug: string
  paid?: boolean
  gateEnabled?: boolean
}

function CrewActions({ crewId, captainId, isPublic, isFull, captainUsername, crewSlug, paid, gateEnabled }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [userId, setUserId] = useState<string | null>(null)
  const [userCrewId, setUserCrewId] = useState<string | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'declined' | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Entry gate (crews with gate_enabled): profile checklist + application
  const [me, setMe] = useState<any>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [ageVal, setAgeVal] = useState('')
  const [cityVal, setCityVal] = useState('')
  const [motivation, setMotivation] = useState('')
  const [shareProfile, setShareProfile] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const inviteCode = searchParams.get('invite')
      const referrerId = searchParams.get('ref')

      if (!session) {
        // Save invite to localStorage so dashboard can apply it after login
        if (inviteCode) {
          localStorage.setItem('bestie_crew_invite', JSON.stringify({ crewId, crewSlug, inviteCode, referrerId }))
        }
        setLoading(false)
        return
      }
      const uid = session.user.id
      setUserId(uid)

      const [{ data: profile }, { data: membership }, { data: request }] = await Promise.all([
        supabase.from('users').select('crew_id, bestie_type_completed, age, birth_date, city').eq('id', uid).single(),
        supabase.from('crew_members').select('crew_id').eq('crew_id', crewId).eq('user_id', uid).maybeSingle(),
        supabase.from('crew_join_requests').select('status').eq('crew_id', crewId).eq('user_id', uid).maybeSingle(),
      ])

      setUserCrewId(profile?.crew_id ?? null)
      setMe(profile ?? null)
      setRequestStatus(request ? request.status : 'none')

      // Auto-join via invite if not already a member
      if (inviteCode && !membership && uid !== captainId) {
        const { data: result } = await supabase.rpc('join_crew_via_invite', {
          p_crew_id: crewId,
          p_invite_code: inviteCode,
          p_referrer_id: referrerId || null,
        })
        if (result === 'joined' || result === 'already_member') {
          setIsMember(true)
          router.replace(`/crews/${crewSlug}`)
          setLoading(false)
          return
        }
      } else {
        setIsMember(!!membership)
      }

      setLoading(false)
    })
  }, [crewId])

  // Gate checklist state (only meaningful when gateEnabled)
  const testOk = !!me?.bestie_type_completed
  const ageOk = me?.age != null || !!me?.birth_date
  const cityOk = !!(me?.city || '').trim()
  const gateOk = testOk && ageOk && cityOk

  const friendly = (m: string | null) =>
    m && m.includes('crew_gate_profile_required')
      ? 'Finish the checklist above first — this crew requires a completed profile.'
      : m

  const saveProfileBits = async () => {
    setSavingProfile(true)
    setError(null)
    const patch: any = {}
    if (!ageOk && ageVal) patch.age = parseInt(ageVal, 10) || null
    if (!cityOk && cityVal.trim()) patch.city = cityVal.trim()
    const { error: err } = await supabase.from('users').update(patch).eq('id', userId)
    if (err) setError(err.message)
    else setMe((p: any) => ({ ...p, ...patch }))
    setSavingProfile(false)
  }

  const join = async () => {
    setActing(true)
    setError(null)
    const { error: err } = await supabase.from('crew_members').insert({
      crew_id: crewId,
      user_id: userId,
      ...(gateEnabled ? { share_profile: shareProfile } : {}),
    })
    if (err) { setError(err.message); setActing(false); return }
    // Set as featured only if user has no featured crew yet
    if (!userCrewId) {
      await supabase.from('users').update({ crew_id: crewId }).eq('id', userId)
    }
    setIsMember(true)
    setActing(false)
    router.refresh()
  }

  const setFeatured = async () => {
    setActing(true)
    await supabase.from('users').update({ crew_id: crewId }).eq('id', userId)
    setUserCrewId(crewId)
    setActing(false)
    router.refresh()
  }

  const leave = async () => {
    setActing(true)
    setError(null)
    await supabase.from('crew_members').delete().eq('crew_id', crewId).eq('user_id', userId)
    if (userCrewId === crewId) {
      await supabase.from('users').update({ crew_id: null }).eq('id', userId)
    }
    router.refresh()
  }

  const requestJoin = async () => {
    setActing(true)
    setError(null)
    const { error: err } = await supabase
      .from('crew_join_requests').insert({
        crew_id: crewId,
        user_id: userId,
        ...(gateEnabled ? { answers: { motivation: motivation.trim() }, share_profile: shareProfile } : {}),
      })
    if (err) { setError(err.message); setActing(false); return }
    setRequestStatus('pending')
    // Notify the captain
    const { data: me } = await supabase.from('users').select('full_name').eq('id', userId).single()
    const myName = me?.full_name?.split(' ')[0] || 'Someone'
    createNotification({
      userId: captainId,
      type: 'join_request',
      title: `${myName} wants to join your crew`,
      body: 'Tap to review the request',
      link: `/crews/${crewSlug}`,
    }).catch(() => {})
    setActing(false)
  }

  const cancelRequest = async () => {
    setActing(true)
    await supabase.from('crew_join_requests').delete().eq('crew_id', crewId).eq('user_id', userId)
    setRequestStatus('none')
    setActing(false)
  }

  // The entry-gate panel: profile checklist → short application → confirm.
  // Used by both the open-join and request-to-join paths when gateEnabled.
  const inp = { padding: '10px 12px', borderRadius: '10px', fontSize: '14px', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' } as const
  const gatePanel = (onConfirm: () => void, confirmLabel: string) => (
    <div style={{ padding: '14px', borderRadius: '14px', background: 'var(--surface-1b)', border: '1px solid rgba(212,175,55,0.25)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ fontSize: '13px', fontWeight: 700, color: '#D4AF37' }}>This crew asks you to complete your profile first</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{ fontSize: '13px', color: testOk ? '#34D399' : 'var(--text-primary)' }}>{testOk ? '✓ Bestie Type test' : 'Bestie Type test'}</span>
        {!testOk && <Link href="/bestie-type" style={{ fontSize: '12px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none', flexShrink: 0 }}>Take the test →</Link>}
      </div>
      {(!ageOk || !cityOk) ? (
        <div style={{ display: 'flex', gap: '8px' }}>
          {!ageOk && <input type="number" min={16} max={99} placeholder="Age" value={ageVal} onChange={(e) => setAgeVal(e.target.value)} style={{ ...inp, width: '72px' }} />}
          {!cityOk && <input placeholder="City" value={cityVal} onChange={(e) => setCityVal(e.target.value)} style={{ ...inp, flex: 1, minWidth: 0 }} />}
          <button
            onClick={saveProfileBits}
            disabled={savingProfile || (!ageOk && !ageVal) || (!cityOk && !cityVal.trim())}
            style={{ padding: '10px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37', cursor: 'pointer', flexShrink: 0 }}
          >
            {savingProfile ? '…' : 'Save'}
          </button>
        </div>
      ) : (
        <span style={{ fontSize: '13px', color: '#34D399' }}>✓ Age & city</span>
      )}
      {gateOk && (
        <>
          <textarea
            placeholder="Why do you want to join?"
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
            rows={3}
            style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }}
          />
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12.5px', color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1.5 }}>
            <input type="checkbox" checked={shareProfile} onChange={(e) => setShareProfile(e.target.checked)} style={{ marginTop: '2px' }} />
            Share my age, city & type with crew members (captains always see them)
          </label>
          <button
            onClick={onConfirm}
            disabled={acting || !motivation.trim()}
            style={{ width: '100%', padding: '13px', borderRadius: '12px', textAlign: 'center', fontSize: '14px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', border: 'none', cursor: acting || !motivation.trim() ? 'not-allowed' : 'pointer', opacity: acting || !motivation.trim() ? 0.6 : 1 }}
          >
            {acting ? '…' : confirmLabel}
          </button>
        </>
      )}
      {error && <p style={{ fontSize: '12px', color: '#FF6B35', margin: 0 }}>{friendly(error)}</p>}
    </div>
  )

  if (loading) return null

  if (!userId) {
    return (
      <Link href="/login" style={{ display: 'block', padding: '14px', borderRadius: '14px', textAlign: 'center', fontSize: '15px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', textDecoration: 'none' }}>
        Log in to join
      </Link>
    )
  }

  if (userId === captainId) {
    const isFeatured = userCrewId === crewId
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ padding: '12px', borderRadius: '14px', textAlign: 'center', fontSize: '14px', fontWeight: 600, background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', color: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <Crown size={16} strokeWidth={2} /> You are the Captain
        </div>
        {!isFeatured ? (
          <button onClick={setFeatured} disabled={acting} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 600, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', color: '#D4AF37', cursor: acting ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            {acting ? '…' : (<><Star size={13} fill="#D4AF37" strokeWidth={0} /> Set as featured on passport</>)}
          </button>
        ) : (
          <div style={{ padding: '8px 14px', borderRadius: '12px', textAlign: 'center', fontSize: '12px', color: '#D4AF37', background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Star size={12} fill="#D4AF37" strokeWidth={0} /> Featured on your passport
          </div>
        )}
      </div>
    )
  }

  if (isMember) {
    const isFeatured = userCrewId === crewId
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {!isFeatured && (
          <button onClick={setFeatured} disabled={acting} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', padding: '10px 14px', borderRadius: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 600, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', color: '#D4AF37', cursor: acting ? 'not-allowed' : 'pointer' }}>
            {acting ? '…' : (<><Star size={13} fill="#D4AF37" strokeWidth={0} /> Set as featured on passport</>)}
          </button>
        )}
        {isFeatured && (
          <div style={{ padding: '8px 14px', borderRadius: '12px', textAlign: 'center', fontSize: '12px', color: '#D4AF37', background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Star size={12} fill="#D4AF37" strokeWidth={0} /> Featured on your passport
          </div>
        )}
        <button onClick={leave} disabled={acting} style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 600, background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.2)', color: '#FF6B35', cursor: acting ? 'not-allowed' : 'pointer', opacity: acting ? 0.6 : 1 }}>
          {acting ? 'Leaving…' : 'Leave Crew'}
        </button>
      </div>
    )
  }

  if (isFull) {
    return (
      <div style={{ padding: '12px', borderRadius: '14px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', background: 'var(--surface-1b)', border: '1px solid var(--border)' }}>
        This crew is full (108/108)
      </div>
    )
  }

  // Paid crew — no free join; membership happens via the subscription block.
  if (paid) {
    return (
      <div style={{ padding: '12px 14px', borderRadius: '14px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', background: 'var(--surface-1b)', border: '1px solid rgba(212,175,55,0.2)' }}>
        This crew has a paid membership — join below 👇
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
          <button onClick={cancelRequest} disabled={acting} style={{ display: 'block', width: '100%', padding: '10px', borderRadius: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 600, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}>
            {acting ? '…' : 'Cancel request'}
          </button>
        </div>
      )
    }

    if (requestStatus === 'declined') {
      return (
        <div style={{ padding: '12px', borderRadius: '14px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', background: 'var(--surface-1b)', border: '1px solid var(--border)' }}>
          Your request was declined
        </div>
      )
    }

    if (gateEnabled && panelOpen) return gatePanel(requestJoin, 'Send application')

    return (
      <div>
        <button onClick={gateEnabled ? () => setPanelOpen(true) : requestJoin} disabled={acting} style={{ display: 'block', width: '100%', padding: '14px', borderRadius: '14px', textAlign: 'center', fontSize: '15px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', border: 'none', cursor: acting ? 'not-allowed' : 'pointer', opacity: acting ? 0.7 : 1 }}>
          {acting ? 'Sending…' : 'Request to Join'}
        </button>
        {error && <p style={{ fontSize: '12px', color: '#FF6B35', marginTop: '8px', textAlign: 'center' }}>{friendly(error)}</p>}
      </div>
    )
  }

  // Open crew
  if (gateEnabled && panelOpen) return gatePanel(join, 'Join Crew')

  return (
    <div>
      <button onClick={gateEnabled ? () => setPanelOpen(true) : join} disabled={acting} style={{ display: 'block', width: '100%', padding: '14px', borderRadius: '14px', textAlign: 'center', fontSize: '15px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', cursor: acting ? 'not-allowed' : 'pointer', opacity: acting ? 0.7 : 1, border: 'none' }}>
        {acting ? 'Joining…' : 'Join Crew'}
      </button>
      {error && <p style={{ fontSize: '12px', color: '#FF6B35', marginTop: '8px', textAlign: 'center' }}>{friendly(error)}</p>}
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
