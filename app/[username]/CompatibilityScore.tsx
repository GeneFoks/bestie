// @ts-nocheck
'use client'
// Shows "You'd vibe at X% match" based on shared traits + city + activities

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { relation as socRelation } from '@/lib/socionics'

interface Props {
  profile: {
    id: string
    city?: string
    eterotype?: string
    activity_packages?: { activity_type: string }[]
  }
}

// Compatibility = socionics intertype relation (Duality highest, Conflict lowest)
// nudged by shared city and activities.
function calcCompat(me: any, them: any): { pct: number; label: string; note: string } {
  const rel = socRelation(me?.eterotype, them?.eterotype)
  let base = rel ? rel.score : 50
  let label = rel ? rel.label : 'Getting to know you'
  let note = rel ? rel.note : 'Take the eterotype test to unlock a real match score.'
  if (me?.city && them?.city && me.city.toLowerCase() === them.city.toLowerCase()) base += 6
  const myTypes = new Set((me?.activity_packages || []).map((p: any) => p.activity_type))
  const themTypes = (them?.activity_packages || []).map((p: any) => p.activity_type)
  const shared = themTypes.filter((t: string) => myTypes.has(t)).length
  base += Math.min(shared * 3, 9)
  return { pct: Math.min(Math.round(base), 99), label, note }
}

export default function CompatibilityScore({ profile }: Props) {
  const [res, setRes] = useState<{ pct: number; label: string; note: string } | null>(null)

  useEffect(() => {
    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      if (session.user.id === profile.id) return // own profile

      const { data: me } = await supabase
        .from('users')
        .select('city, eterotype, activity_packages(activity_type)')
        .eq('id', session.user.id)
        .single()

      if (me) setRes(calcCompat(me, profile))
    }
    run()
  }, [profile.id])

  if (res === null) return null
  const pct = res.pct
  const color = pct >= 80 ? '#34D399' : pct >= 60 ? '#D4AF37' : '#A99ECC'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '14px', background: `rgba(${color === '#34D399' ? '52,211,153' : color === '#D4AF37' ? '212,175,55' : '155,147,192'},0.07)`, border: `1px solid ${color}25`, marginBottom: '16px' }}>
      <div style={{ width: '44px', height: '44px', borderRadius: '50%', border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color, fontFamily: 'DM Serif Display, serif' }}>{pct}%</span>
      </div>
      <div>
        <p style={{ fontSize: '13px', fontWeight: 700, color, marginBottom: '2px' }}>{res.label} · {pct}% match</p>
        <p style={{ fontSize: '11px', color: '#A99ECC' }}>{res.note}</p>
      </div>
    </div>
  )
}
