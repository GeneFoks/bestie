'use client'

import { useState } from 'react'
import Link from 'next/link'
import ProviderCard from '@/components/ProviderCard'

const MOCK_PROVIDERS = [
  {
    id: '1', username: 'isolde_park', full_name: 'Isolde Park',
    avatar_url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&q=80',
    city: 'Seoul', country: 'KR', bio: 'Watch parties, late-night chats, festival companion. I love film, indie music, and good stories.',
    bestie_score: 921, is_verified: true, avg_rating: 5.0, total_sessions: 61,
    activity_packages: [{ title: 'Cozy Watch Party Night', activity_type: 'watch_together', price_per_session: 20 }],
  },
  {
    id: '2', username: 'marco_vega', full_name: 'Marco Vega',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80',
    city: 'Austin', country: 'TX', bio: 'Hiking trails, outdoor adventures, and real conversations under open skies.',
    bestie_score: 874, is_verified: true, avg_rating: 4.9, total_sessions: 43,
    activity_packages: [{ title: 'Sunrise Trail Run', activity_type: 'trail_crew', price_per_session: 15 }],
  },
  {
    id: '3', username: 'yuna_kim', full_name: 'Yuna Kim',
    avatar_url: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=600&q=80',
    city: 'New York', country: 'NY', bio: "Deep talks, jazz bars, gallery walks. Let's have a real conversation over good coffee.",
    bestie_score: 756, is_verified: false, avg_rating: 4.7, total_sessions: 28,
    activity_packages: [{ title: 'Coffee & Deep Chat', activity_type: 'deep_chat', price_per_session: 12 }],
  },
  {
    id: '4', username: 'alex_chen', full_name: 'Alex Chen',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&q=80',
    city: 'Austin', country: 'TX', bio: 'Game nights, board games, and epic RPG campaigns. Let me be your player 2.',
    bestie_score: 698, is_verified: false, avg_rating: 4.8, total_sessions: 19,
    activity_packages: [{ title: 'Epic Game Night', activity_type: 'game_night', price_per_session: 0, is_free: true }],
  },
  {
    id: '5', username: 'sofia_reyes', full_name: 'Sofia Reyes',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80',
    city: 'Miami', country: 'FL', bio: 'Dance floors, salsa nights, and festival adventures. Energy guaranteed.',
    bestie_score: 832, is_verified: true, avg_rating: 4.9, total_sessions: 37,
    activity_packages: [{ title: 'Salsa Night Out', activity_type: 'dance_crew', price_per_session: 18 }],
  },
  {
    id: '6', username: 'james_w', full_name: 'James Wilson',
    avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&q=80',
    city: 'Austin', country: 'TX', bio: 'Travel stories, real talk, and spontaneous adventures. Zero small talk.',
    bestie_score: 610, is_verified: false, avg_rating: 4.6, total_sessions: 12,
    activity_packages: [{ title: 'Real Talk Coffee', activity_type: 'real_talk', is_free: true }],
  },
]

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'meet_irl', label: '🤝 Meet IRL' },
  { id: 'trail_crew', label: '🥾 Trail Crew' },
  { id: 'game_night', label: '🎮 Game Night' },
  { id: 'watch_together', label: '🎬 Watch Together' },
  { id: 'dance_crew', label: '💃 Dance Crew' },
  { id: 'deep_chat', label: '🫂 Deep Chat' },
]

export default function BrowsePage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const filtered = MOCK_PROVIDERS.filter((p) => {
    const matchSearch =
      !search ||
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.city?.toLowerCase().includes(search.toLowerCase()) ||
      p.bio?.toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'all' || p.activity_packages?.some((pkg) => pkg.activity_type === filter)
    return matchSearch && matchFilter
  })

  return (
    <div style={{ minHeight: '100vh', background: '#080810', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>
          BESTIE
        </Link>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/login" style={{ fontSize: '14px', color: '#9B93C0', textDecoration: 'none' }}>Log in</Link>
          <Link href="/signup" style={{ fontSize: '14px', fontWeight: 600, padding: '8px 20px', borderRadius: '12px', background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>
            Join Free
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '36px', fontWeight: 700, color: '#E8E0FF', marginBottom: '8px' }}>
            Browse Besties
          </h1>
          <p style={{ fontSize: '15px', color: '#9B93C0' }}>
            {filtered.length} Bestie{filtered.length !== 1 ? 's' : ''} available
          </p>
        </div>

        {/* Search + Filters */}
        <div style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px',
            background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px',
          }}>
            <span style={{ fontSize: '18px' }}>🔍</span>
            <input
              type="text"
              placeholder="Search by name, city, or activity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: '#E8E0FF', padding: '6px 0' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                style={{
                  padding: '8px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                  background: filter === f.id ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)',
                  border: filter === f.id ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  color: filter === f.id ? '#D4AF37' : '#9B93C0',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {filtered.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {filtered.map((p) => (
              <ProviderCard key={p.id} provider={p} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ fontSize: '40px', marginBottom: '16px' }}>🔍</p>
            <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#E8E0FF', marginBottom: '8px' }}>No Besties found</h3>
            <p style={{ fontSize: '14px', color: '#9B93C0' }}>Try a different search or filter</p>
          </div>
        )}
      </div>
    </div>
  )
}
