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

export default function BrowsePage() {
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

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

      const { data } = await query.limit(24)
      setProviders(data || [])
      setLoading(false)
    }
    fetchProviders()
  }, [search, filter])

  return (
    <div style={{ minHeight: '100vh', background: '#080810', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <div style={{ display: 'flex', gap: '12px' }}>
         <Link href="/dashboard" style={{ fontSize: '14px', color: '#9B93C0', textDecoration: 'none', padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>Dashboard</Link>
          <Link href="/signup" style={{ fontSize: '14px', fontWeight: 600, padding: '8px 20px', borderRadius: '12px', background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>Join Free</Link>
        </div>
      </nav>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '36px', fontWeight: 700, color: '#E8E0FF', marginBottom: '8px' }}>Browse Besties</h1>
          <p style={{ fontSize: '15px', color: '#9B93C0' }}>
            {loading ? 'Loading...' : `${providers.length} Bestie${providers.length !== 1 ? 's' : ''} available`}
          </p>
        </div>

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
            {providers.map((p, i) => (
              <ProviderCard key={p.id} provider={p} featured={i === 0} />
            ))}
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
