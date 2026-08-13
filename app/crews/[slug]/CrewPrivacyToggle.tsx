'use client'
// @ts-nocheck
// Captain-only: flip a crew between Open (anyone can join) and Private
// (join requires approval). Renders nothing for non-captains.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Lock, Globe } from 'lucide-react'

export default function CrewPrivacyToggle({ crewId, captainId, isPublic }: { crewId: string; captainId: string; isPublic: boolean }) {
  const router = useRouter()
  const [me, setMe] = useState<string | null>(null)
  const [pub, setPub] = useState(isPublic)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setMe(user?.id ?? null))
  }, [])

  if (!me || me !== captainId) return null

  const toggle = async () => {
    const next = !pub
    if (!confirm(next
      ? 'Make this crew Open? Anyone will be able to join instantly.'
      : 'Make this crew Private? New members will need your approval to join.')) return
    setBusy(true)
    const { error } = await supabase.from('crews').update({ is_public: next }).eq('id', crewId)
    setBusy(false)
    if (error) { alert(`Could not change: ${error.message}`); return }
    setPub(next)
    router.refresh()
  }

  return (
    <button onClick={toggle} disabled={busy} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '12px', borderRadius: '13px', fontSize: '13px', fontWeight: 600, cursor: busy ? 'wait' : 'pointer', background: '#131323', border: '1px solid rgba(255,255,255,0.12)', color: '#A99ECC', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      {pub
        ? <><Lock size={14} strokeWidth={2} /> Make crew Private (approve joins)</>
        : <><Globe size={14} strokeWidth={2} /> Make crew Open (anyone can join)</>}
    </button>
  )
}
