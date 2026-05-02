// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ProviderCard from '@/components/ProviderCard'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'meet_irl', label: '🤝 Meet IRL' },
  { id: 'trail_crew', label: '🥾 Trail Crew' },
  { id: 'game_night', label: '🎮 Game Night' },
  { id: 'watch_together', label: '🎬 Watch Together' },
  { id: 'dance_crew', label: '💃 Dance Crew' },
  { id: 'deep_chat', label: '🫂 Deep Chat' },
  { id: 'vibe_call', label: '📱 Vibe Call' },
  { id: 'travel_buddy', label: '✈️ Travel Buddy' },
  { id: 'festival_crew', label: '🎪 Festival Crew' },
]

const VIBE_COMPAT = {
  fire: ['air', 'fire'],
  earth: ['water', 'earth'],
  air: ['fire', 'air'],
  water: ['earth', 'water'],
}

const MIND_COMPAT = {
  visionary: ['connector', 'visionary'],
  connector: ['visionary', 'connector'],
  anchor: ['explorer', 'anchor'],
  explorer: ['anchor', 'explorer'],
}

const ENERGY_COMPAT = {
  spark: ['builder', 'guide'],
  builder: ['spark', 'dynamo'],
  dynamo: ['builder', 'guide'],
  guide: ['spark', 'dynamo'],
  mirror: ['spark', 'builder', 'dynamo', 'guide', 'mirror'],
}

function compatScore(me, other) {
  if (!me?.energy_type) return 0
  let score = 0
  if (VIBE_COMPAT[me.vibe_type]?.includes(other.vibe_type)) score += 3
  if (MIND_COMPAT[me.mind_type]?.includes(other.mind_type)) score += 3
  if (ENERGY_COMPAT[me.energy_type]?.includes(other.energy_type)) score += 2
  return score
}

export default function BrowsePage() {
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [myProfile, setMyProfile] = useState(null)
  const [compatMode, setCompatMode] = useState(false)

  useEffect(() => {
    const loadMe = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('users').select('id, energy_type, mind_type, vibe_type, bestie_type_completed').eq('id', user.id).single()
        if (data?.bestie_type_completed) setMyProfile(data)
      }
    }
    loadMe()
  }, [])

  useEffect(() => {
    const fetchProviders = async () => {
      setLoading(true)
      let query = supabase
        .from('users')
        .select('*, activity_packages(*)')
        .order('bestie_score', { ascending: false })

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,city.ilike.%${search}%,bio.ilike.%${search}%`)
      }

      if (filter !== 'all') {
        const { data: pkgs } = await supabase
          .from('activity_packages')
          .select('provider_id')
          .eq('activity_type', filter)
          .eq('is_active', true)
        const userIds = pkgs?.map(p => p.provider_id) || []
        if (userIds.length > 0) {
          query = query.in('id', userIds)
        } else {
          setProviders([])
          setLoading(false)
          return
        }
      }

      const { data } = await query.limit(48)

      let result = data || []

      if (myProfile && compatMode) {
        result = result
          .filter(p => p.id !== myProfile.id)
          .map(p => ({ ...p, _compat: compatScore(myProfile, p) }))
          .sort((a, b) => b._compat - a._compat || b.bestie_score - a.bestie_score)
      } else {
        result = result.filter(p => p.id !== myProfile?.id)
      }

      setProviders(result.slice(0, 24))
      setLoading(false)
    }
    fetchProviders()
  }, [search, filter, compatMode, myProfile])

  const getCompatLabel = (p) => {
    if (!myProfile || !compatMode || !p._compat) return null
    if (p._compat >= 7) return { label: '🔥 Great match', color: '#39FF14' }
    if (p._compat >= 4) return { label: '✨ Good match', color: '#D4AF37' }
    return null
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080810', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/dashboard" style={{ fontSize: '14px', color: '#9B93C0', textDecoration: 'none', padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>Dashboard</Link>
          <Link href="/signup" style={{ fontSize: '14px', fontWeight: 600, padding: '8px 20px', borderRadius: '12px', background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>Join Free</Link>
        </div>
      </nav>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '36px', fontWeight: 700, color: '#E8E0FF', marginBottom: '8px' }}>Browse Besties</h1>
            <p style={{ fontSize: '15px', color: '#9B93C0' }}>
              {loading ? 'Loading...' : `${providers.length} Bestie${providers.length !== 1 ? 's' : ''} available`}
            </p>
          </div>

          {myProfile && (
            <button
              onClick={() => setCompatMode(!compatMode)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', background: compatMode ? 'rgba(57,255,20,0.12)' : 'rgba(255,255,255,0.04)', border: compatMode ? '1px solid rgba(57,255,20,0.35)' : '1px solid rgba(255,255,255,0.1)', color: compatMode ? '#39FF14' : '#9B93C0', transition: 'all 0.2s' }}
            >
              <span>✨</span>
              {compatMode ? 'Compatibility ON' : 'Compatibility'}
            </button>
          )}
        </div>

        {myProfile && compatMode && (
          <div style={{ marginBottom: '20px', padding: '14px 18px', borderRadius: '14px', background: 'rgba(57,255,20,0.06)', border: '1px solid rgba(57,255,20,0.2)', fontSize: '13px', color: '#9B93C0' }}>
            Showing people compatible with your type <span style={{ color: '#39FF14', fontWeight: 600 }}>{myProfile.energy_type} · {myProfile.mind_type} · {myProfile.vibe_type}</span> — best matches first
          </div>
        )}

        {!myProfile && (
          <div style={{ marginBottom: '20px', padding: '14px 18px', borderRadius: '14px', background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)', fontSize: '13px', color: '#9B93C0' }}>
            <Link href="/bestie-type" style={{ color: '#D4AF37', textDecoration: 'none', fontWeight: 600 }}>Take the Bestie Type quiz →</Link> and we'll show the most compatible people first
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px', background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', marginBottom: '16px' }}>
          <span style={{ fontSize: '18px' }}>🔍</span>
          <input
            type="text"
            placeholder="Search by name, city, or activity..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: '#E8E0FF', padding: '6px 0' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: '#9B93C0', cursor: 'pointer', fontSize: '18px' }}>×</button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '32px' }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{ padding: '8px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', background: filter === f.id ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)', border: filter === f.id ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.08)', color: filter === f.id ? '#D4AF37' : '#9B93C0' }}>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ height: '420px', borderRadius: '20px', background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
          </div>
        ) : providers.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {providers.map((p, i) => {
              const compat = getCompatLabel(p)
              return (
                <div key={p.id} style={{ position: 'relative' }}>
                  {compat && (
                    <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 10, padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, background: 'rgba(0,0,0,0.7)', border: `1px solid ${compat.color}40`, color: compat.color }}>
                      {compat.label}
                    </div>
                  )}
                  <ProviderCard provider={p} featured={i === 0 && !compatMode} />
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</p>
            <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#E8E0FF', marginBottom: '8px' }}>No Besties found</h3>
            <p style={{ fontSize: '14px', color: '#9B93C0', marginBottom: '24px' }}>Try a different search or filter</p>
            <button onClick={() => { setSearch(''); setFilter('all') }} style={{ padding: '10px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', border: 'none', cursor: 'pointer' }}>
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
