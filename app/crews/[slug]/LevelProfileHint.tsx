// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { showToast } from '@/components/Toast'
import { TrendingUp } from 'lucide-react'

// Shown to a MEMBER of a gated crew whose profile is incomplete:
// levels 2–6 require the Bestie Type test + age + city. Joining stays free —
// this only explains how to grow, and lets them fill age/city right here.
export default function LevelProfileHint({ crewId, gated }: { crewId: string; gated: boolean }) {
  const [state, setState] = useState<any>(null) // { testOk, ageOk, cityOk }
  const [ageVal, setAgeVal] = useState('')
  const [cityVal, setCityVal] = useState('')
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    if (!gated) return
    let cancelled = false
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const uid = session.user.id
      const [{ data: membership }, { data: me }] = await Promise.all([
        supabase.from('crew_members').select('user_id, level, role').eq('crew_id', crewId).eq('user_id', uid).maybeSingle(),
        supabase.from('users').select('bestie_type_completed, age, birth_date, city').eq('id', uid).single(),
      ])
      if (cancelled || !membership || !me) return
      if (membership.role === 'captain') return
      const testOk = !!me.bestie_type_completed
      const ageOk = me.age != null || !!me.birth_date
      const cityOk = !!(me.city || '').trim()
      if (testOk && ageOk && cityOk) return
      setUserId(uid)
      setState({ testOk, ageOk, cityOk })
    }
    load()
    return () => { cancelled = true }
  }, [crewId, gated])

  if (!gated || !state) return null

  const save = async () => {
    setSaving(true)
    const patch: any = {}
    if (!state.ageOk && ageVal) patch.age = parseInt(ageVal, 10) || null
    if (!state.cityOk && cityVal.trim()) patch.city = cityVal.trim()
    const { error } = await supabase.from('users').update(patch).eq('id', userId)
    setSaving(false)
    if (error) {
      showToast("Couldn't save — try again", { type: 'error' })
      return
    }
    showToast('Saved ✓', { type: 'success' })
    setState((s: any) => ({
      ...s,
      ageOk: s.ageOk || !!patch.age,
      cityOk: s.cityOk || !!patch.city,
    }))
  }

  const inp = { padding: '9px 11px', borderRadius: '10px', fontSize: '13px', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }

  return (
    <div style={{ marginBottom: '20px', padding: '13px 16px', borderRadius: '14px', background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.25)', display: 'flex', flexDirection: 'column', gap: '9px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#D4AF37' }}>
        <TrendingUp size={15} strokeWidth={2} /> Want to grow past Level 1?
      </div>
      <p style={{ margin: 0, fontSize: '12.5px', lineHeight: 1.6, color: 'var(--text-muted)' }}>
        Levels 2–6 in this crew open up once your profile is complete. It's your choice — joining and staying is free either way.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12.5px', color: state.testOk ? '#34D399' : 'var(--text-primary)' }}>
          {state.testOk ? '✓ Bestie Type test' : 'Bestie Type test'}
        </span>
        {!state.testOk && (
          <Link href="/bestie-type" style={{ fontSize: '12px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>Take the test →</Link>
        )}
      </div>
      {(!state.ageOk || !state.cityOk) ? (
        <div style={{ display: 'flex', gap: '8px' }}>
          {!state.ageOk && <input type="number" min={16} max={99} placeholder="Age" value={ageVal} onChange={(e) => setAgeVal(e.target.value)} style={{ ...inp, width: '68px' }} />}
          {!state.cityOk && <input placeholder="City" value={cityVal} onChange={(e) => setCityVal(e.target.value)} style={{ ...inp, flex: 1, minWidth: 0 }} />}
          <button
            onClick={save}
            disabled={saving || (!state.ageOk && !ageVal) || (!state.cityOk && !cityVal.trim())}
            style={{ padding: '9px 14px', borderRadius: '10px', fontSize: '12.5px', fontWeight: 700, background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37', cursor: 'pointer', flexShrink: 0 }}
          >
            {saving ? '…' : 'Save'}
          </button>
        </div>
      ) : (
        <span style={{ fontSize: '12.5px', color: '#34D399' }}>✓ Age & city</span>
      )}
    </div>
  )
}
