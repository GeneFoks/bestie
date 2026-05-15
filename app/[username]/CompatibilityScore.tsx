'use client'
// @ts-nocheck
// Shows "You'd vibe at X% match" based on shared traits + city + activities

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  profile: {
    id: string
    city?: string
    energy_type?: string
    mind_type?: string
    vibe_type?: string
    activity_packages?: { activity_type: string }[]
  }
}

function calcCompat(me: any, them: any): number {
  if (!me) return 0
  let score = 40
  if (me.city && them.city && me.city.toLowerCase() === them.city.toLowerCase()) score += 20
  if (me.energy_type && me.energy_type === them.energy_type) score += 15
  if (me.mind_type && me.mind_type === them.mind_type) score += 10
  if (me.vibe_type && me.vibe_type === them.vibe_type) score += 10
  const myTypes = new Set((me.activity_packages || []).map((p: any) => p.activity_type))
  const themTypes = (them.activity_packages || []).map((p: any) => p.activity_type)
  const shared = themTypes.filter((t: string) => myTypes.has(t)).length
  score += Math.min(shared * 5, 15)
  return Math.min(score, 99)
}

export default function CompatibilityScore({ profile }: Props) {
  const [pct, setPct] = useState<number | null>(null)

  useEffect(() => {
    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      if (session.user.id === profile.id) return // own profile

      const { data: me } = await supabase
        .from('users')
        .select('city, energy_type, mind_type, vibe_type, activity_packages(activity_type)')
        .eq('id', session.user.id)
        .single()

      if (me) setPct(calcCompat(me, profile))
    }
    run()
  }, [profile.id])

  if (pct === null) return null

  const color = pct >= 80 ? '#39FF14' : pct >= 60 ? '#D4AF37' : '#9B93C0'
  const label = pct >= 80 ? 'Great match!' : pct >= 60 ? 'Good vibes' : 'Different worlds'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '14px', background: `rgba(${color === '#39FF14' ? '57,255,20' : color === '#D4AF37' ? '212,175,55' : '155,147,192'},0.07)`, border: `1px solid ${color}25`, marginBottom: '16px' }}>
      <div style={{ width: '44px', height: '44px', borderRadius: '50%', border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color, fontFamily: 'DM Serif Display, serif' }}>{pct}%</span>
      </div>
      <div>
        <p style={{ fontSize: '13px', fontWeight: 700, color, marginBottom: '2px' }}>You'd vibe at {pct}% · {label}</p>
        <p style={{ fontSize: '11px', color: '#9B93C0' }}>Based on location, personality & shared activities</p>
      </div>
    </div>
  )
}
