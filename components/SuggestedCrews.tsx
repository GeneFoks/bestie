// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Users, MapPin, ArrowRight, Sparkles } from 'lucide-react'
import { compatPercent, compatTone } from '@/lib/crewCompat'

type AggregateType = {
  crew_id: string
  energy_type: string | null
  mind_type:   string | null
  vibe_type:   string | null
  typed_members: number
}

type Crew = {
  id: string
  name: string
  slug: string
  description: string | null
  avatar_url: string | null
  cover_url: string | null
  city: string | null
  is_public: boolean
  members: { count: number }[] | number
  agg?: AggregateType | null
  score?: number
  compat?: number | null
}

/**
 * Suggested crews block for the Dashboard.
 * Scores crews by:
 *  - city match with viewer (heavy weight)
 *  - Bestie Type compat (if both viewer and crew have aggregates)
 *  - activity overlap (light — bonus if any of viewer's activities matches a crew event activity)
 *
 * Hidden if the user is already in a crew, OR if no candidates score
 * above the minimum threshold.
 */
export default function SuggestedCrews() {
  const [crews, setCrews] = useState<Crew[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }

      const { data: me } = await supabase
        .from('users')
        .select('id, crew_id, city, energy_type, mind_type, vibe_type, bestie_type_completed, activity_packages(activity_type)')
        .eq('id', session.user.id)
        .single()

      // Already in a crew — nothing to suggest
      if (me?.crew_id) { setLoading(false); return }

      const { data: candidates } = await supabase
        .from('crews')
        .select(`
          id, name, slug, description, avatar_url, cover_url, is_public,
          members:crew_members(count)
        `)
        .eq('is_public', true)
        .limit(40)

      if (!candidates?.length) { setLoading(false); return }

      const crewIds = candidates.map((c: any) => c.id)
      const { data: aggregates } = await supabase
        .from('crew_aggregate_type')
        .select('crew_id, energy_type, mind_type, vibe_type, typed_members')
        .in('crew_id', crewIds)

      const aggByCrew: Record<string, AggregateType> = {}
      ;(aggregates || []).forEach((a: any) => { aggByCrew[a.crew_id] = a })

      // Optional: city — pull from any crew event with a location matching viewer's city
      const city = me?.city
      const { data: cityHints } = city
        ? await supabase
            .from('crew_events')
            .select('crew_id, location')
            .in('crew_id', crewIds)
            .ilike('location', `%${city}%`)
        : { data: [] }
      const cityCrewIds = new Set((cityHints || []).map((h: any) => h.crew_id))

      const scored: Crew[] = candidates.map((c: any) => {
        const agg = aggByCrew[c.id] || null
        const compat = me?.bestie_type_completed && agg?.energy_type
          ? compatPercent(me, agg)
          : null
        let score = 0
        if (compat !== null) score += compat // 0-100
        if (cityCrewIds.has(c.id)) score += 40
        // Tiny base bias by member count so cold start crews still surface
        const memberCount = Array.isArray(c.members) ? (c.members[0]?.count ?? 0) : 0
        score += Math.min(memberCount, 20) * 0.5
        return { ...c, agg, compat, score, members: memberCount } as Crew
      })

      // Top 3 with score >= 20 (skip totally irrelevant)
      scored.sort((a, b) => (b.score || 0) - (a.score || 0))
      const top = scored.filter(c => (c.score || 0) >= 20).slice(0, 3)
      setCrews(top)
      setLoading(false)
    }
    load().catch(() => setLoading(false))
  }, [])

  if (loading || crews.length === 0) return null

  return (
    <div style={{ marginBottom: '20px', padding: '18px 20px', borderRadius: '20px', background: 'var(--surface-1)', border: '1px solid rgba(155,127,255,0.18)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={16} color="#9B7FFF" strokeWidth={1.8} />
          <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '17px', color: 'var(--text-primary)', margin: 0 }}>Crews for you</h3>
        </div>
        <Link href="/crews" style={{ fontSize: '12px', color: '#9B7FFF', textDecoration: 'none', fontWeight: 600 }}>
          Browse all →
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {crews.map(c => {
          const tone = compatTone(c.compat ?? null)
          return (
            <Link key={c.id} href={`/crews/${c.slug}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '14px', background: 'var(--surface-1b)', border: '1px solid var(--border)', textDecoration: 'none' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', overflow: 'hidden', background: 'var(--surface-3)', flexShrink: 0, border: '1px solid rgba(155,127,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {c.avatar_url
                  ? <img src={c.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <Users size={20} color="#9B7FFF" strokeWidth={1.8} />
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <Users size={11} strokeWidth={2} /> {Array.isArray(c.members) ? (c.members[0]?.count || 0) : (c.members as number)}
                  </span>
                  {c.agg?.energy_type && (
                    <span style={{ color: '#9B7FFF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {c.agg.energy_type} · {c.agg.vibe_type}
                    </span>
                  )}
                  {tone && c.compat !== null && (
                    <span style={{ color: tone.color, fontWeight: 700 }}>{c.compat}% match</span>
                  )}
                </div>
              </div>
              <ArrowRight size={16} color="#9B7FFF" strokeWidth={1.8} style={{ flexShrink: 0 }} />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
