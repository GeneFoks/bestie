// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ProviderCard from '@/components/ProviderCard'
import ProfileNav from '@/components/ProfileNav'
import { ActivityIcon } from '@/lib/activityIcons'
import { EmptyState } from '@/components/EmptyState'
import { CardSkeleton } from '@/components/Loading'
import { Search, Sparkles, Flame, X, Zap, Gamepad2, BookOpen, Palette, Heart, Moon, Coffee, Users } from 'lucide-react'
import { relation, TYPES } from '@/lib/socionics'

const FILTER_GROUPS = [
  { id: 'active',    label: 'Active & Outdoors',  Icon: Zap,       filters: [
    { id: 'hiking', label: 'Hiking' },{ id: 'running', label: 'Running' },{ id: 'gym_partner', label: 'Gym Partner' },{ id: 'cycling', label: 'Cycling' },{ id: 'swimming', label: 'Swimming' },{ id: 'cold_plunge', label: 'Cold Plunge' },{ id: 'yoga', label: 'Yoga' },{ id: 'martial_arts', label: 'Martial Arts' },{ id: 'climbing', label: 'Climbing' },{ id: 'pickleball', label: 'Pickleball' },
  ] },
  { id: 'social',    label: 'Fun & Social',       Icon: Gamepad2,  filters: [
    { id: 'game_night', label: 'Game Night' },{ id: 'movie_night', label: 'Movie Night' },{ id: 'night_out', label: 'Night Out' },{ id: 'bar_hopping', label: 'Bar Hopping' },{ id: 'karaoke', label: 'Karaoke' },{ id: 'festival_crew', label: 'Festival Crew' },{ id: 'travel_buddy', label: 'Travel Buddy' },{ id: 'wing_person', label: 'Wing Person' },{ id: 'comedy_show', label: 'Comedy Show' },
  ] },
  { id: 'mind',      label: 'Mind & Growth',      Icon: BookOpen,  filters: [
    { id: 'deep_chat', label: 'Deep Chat' },{ id: 'debate_club', label: 'Debate Club' },{ id: 'book_club', label: 'Book Club' },{ id: 'language_exchange', label: 'Language Exchange' },{ id: 'career_talk', label: 'Career Talk' },{ id: 'money_talk', label: 'Money Talk' },{ id: 'journaling', label: 'Journaling' },{ id: 'accountability_partner', label: 'Accountability' },{ id: 'storytelling_night', label: 'Storytelling' },
  ] },
  { id: 'creative',  label: 'Creative & Skills',  Icon: Palette,   filters: [
    { id: 'music_lesson', label: 'Music Lesson' },{ id: 'art_together', label: 'Art Together' },{ id: 'photography_walk', label: 'Photography' },{ id: 'cooking_together', label: 'Cooking' },{ id: 'dance', label: 'Dance' },{ id: 'improv_acting', label: 'Improv' },{ id: 'writing_club', label: 'Writing Club' },
  ] },
  { id: 'support',   label: 'Emotional & Support', Icon: Heart,    filters: [
    { id: 'vent_session', label: 'Vent Session' },{ id: '3am_talk', label: '3am Talk' },{ id: 'hype_person', label: 'Hype Person' },{ id: 'sobriety_buddy', label: 'Sobriety Buddy' },{ id: 'silence_buddy', label: 'Silence Buddy' },{ id: 'grief_support', label: 'Grief Support' },{ id: 'ugly_cry_buddy', label: 'Ugly Cry Buddy' },
  ] },
  { id: 'spiritual', label: 'Spiritual & Sacred', Icon: Moon,      filters: [
    { id: 'meditation_circle', label: 'Meditation' },{ id: 'breathwork', label: 'Breathwork' },{ id: 'sound_healing', label: 'Sound Healing' },{ id: 'cacao_ceremony', label: 'Cacao Ceremony' },{ id: 'tarot', label: 'Tarot' },{ id: 'retreat_buddy', label: 'Retreat Buddy' },{ id: 'psychedelic_integration', label: 'Psychedelic' },{ id: 'nature_ritual', label: 'Nature Ritual' },{ id: 'lucid_dream_club', label: 'Lucid Dream' },{ id: 'girls_circle', label: 'Girls Circle' },{ id: 'mens_circle', label: "Men's Circle" },
  ] },
  { id: 'chill',     label: 'Chill & Everyday',   Icon: Coffee,    filters: [
    { id: 'coffee_chat', label: 'Coffee Chat' },{ id: 'digital_detox_walk', label: 'Digital Detox' },{ id: 'skincare_night', label: 'Skincare Night' },{ id: 'smoke_buddy', label: 'Smoke Buddy' },{ id: 'astrology_session', label: 'Astrology' },{ id: 'coworking', label: 'Coworking' },{ id: 'errand_buddy', label: 'Errand Buddy' },
  ] },
]

const ALL_FILTERS = FILTER_GROUPS.flatMap(g => g.filters)

const SPARK_TYPES = [
  { id: 'kind', emoji: '💛', label: 'Kind' },
  { id: 'fun', emoji: '🎉', label: 'Fun' },
  { id: 'reliable', emoji: '🔒', label: 'Reliable' },
  { id: 'genuine', emoji: '💎', label: 'Genuine' },
  { id: 'safe', emoji: '🛡️', label: 'Safe' },
  { id: 'energetic', emoji: '⚡', label: 'Energetic' },
  { id: 'good_listener', emoji: '👂', label: 'Good listener' },
  { id: 'social', emoji: '🌟', label: 'Social' },
  { id: 'punctual', emoji: '⏰', label: 'Punctual' },
  { id: 'open', emoji: '🌊', label: 'Open' },
  { id: 'focused', emoji: '🎯', label: 'Focused' },
  { id: 'insightful', emoji: '🧠', label: 'Insightful' },
  { id: 'motivating', emoji: '💪', label: 'Motivating' },
  { id: 'supportive', emoji: '🌱', label: 'Supportive' },
  { id: 'creative', emoji: '🎨', label: 'Creative' },
  { id: 'inspiring', emoji: '🔥', label: 'Inspiring' },
  { id: 'professional', emoji: '🤝', label: 'Professional' },
  { id: 'articulate', emoji: '💬', label: 'Articulate' },
  { id: 'calming', emoji: '🧘', label: 'Calming' },
  { id: 'high_energy', emoji: '⚡', label: 'High energy' },
  { id: 'worldly', emoji: '🌍', label: 'Worldly' },
  { id: 'knowledgeable', emoji: '🎓', label: 'Knowledgeable' },
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

// Compatibility now runs on the eterotype (socionics) — Duality highest,
// Conflict lowest. Falls back to 0 if either side hasn't taken the test.
function compatScore(me, other) {
  const rel = relation(me?.eterotype, other?.eterotype)
  return rel ? rel.score : 0
}

export default function BrowsePage() {
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [activeGroup, setActiveGroup] = useState(null)
  const [myProfile, setMyProfile] = useState(null)
  const [compatMode, setCompatMode] = useState(false)
  const [justMatched, setJustMatched] = useState(false)
  const [inviteCopied, setInviteCopied] = useState(false)

  const [blockedIds, setBlockedIds] = useState<string[]>([])

  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('matched')) {
      setJustMatched(true)
    }
  }, [])

  useEffect(() => {
    const loadMe = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const [{ data: profile }, { data: blocks }] = await Promise.all([
          supabase.from('users').select('id, username, city, eterotype, eterotype_name, bestie_type_completed').eq('id', user.id).single(),
          supabase.from('user_blocks').select('blocked_id').eq('blocker_id', user.id),
        ])
        // Store the profile for every logged-in user (invite link + self-filter
        // need it), but only turn compatibility on when they have a type.
        if (profile) {
          setMyProfile(profile)
          if (profile.eterotype) setCompatMode(true)
        }
        if (blocks) setBlockedIds(blocks.map(b => b.blocked_id))
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
        // Strip characters that have meaning in the PostgREST or() filter
        // grammar — commas/parentheses separate & group conditions, and %/*
        // are ilike wildcards — so a crafted term can't inject extra filters.
        const safe = search.replace(/[,()%*\\:"']/g, ' ').trim()
        if (safe) {
          query = query.or(`full_name.ilike.%${safe}%,city.ilike.%${safe}%,bio.ilike.%${safe}%`)
        }
      }

      if (filter !== 'all') {
        const { data: pkgs } = await supabase
          .from('activity_packages')
          .select('user_id')
          .eq('activity_type', filter)
        const userIds = pkgs?.map(p => p.user_id) || []
        if (userIds.length > 0) {
          query = query.in('id', userIds)
        } else {
          setProviders([])
          setLoading(false)
          return
        }
      }

      const { data } = await query.limit(200)
      let result = (data || []).filter(p => !blockedIds.includes(p.id))

      if (result.length > 0) {
        const userIds = result.map(p => p.id)

        // Fetch sparks
        const { data: sparksData } = await supabase
          .from('sparks').select('receiver_id, spark_type').in('receiver_id', userIds)

        const sparksByUser = {}
        sparksData?.forEach(s => {
          if (!sparksByUser[s.receiver_id]) sparksByUser[s.receiver_id] = {}
          sparksByUser[s.receiver_id][s.spark_type] = (sparksByUser[s.receiver_id][s.spark_type] || 0) + 1
        })

        result = result.map(p => {
          const userSparks = sparksByUser[p.id] || {}
          const topSparks = SPARK_TYPES
            .map(s => ({ ...s, count: userSparks[s.id] || 0 }))
            .filter(s => s.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 3)
          // rating_count is now a column on users (from migration_rating_count.sql)
          return { ...p, top_sparks: topSparks }
        })
      }

      // Never show the current user their own card — even without an eterotype.
      result = result.filter(p => p.id !== myProfile?.id)

      if (myProfile?.eterotype && compatMode) {
        result = result
          .map(p => ({ ...p, _compat: compatScore(myProfile, p) }))
          .sort((a, b) => b._compat - a._compat || b.bestie_score - a.bestie_score)
      }

      setProviders(result.slice(0, 200))
      setLoading(false)
    }
    fetchProviders()
  }, [search, filter, compatMode, myProfile])

  // Native share sheet when available (mobile); otherwise copy the invite
  // link and flash a "copied" state on the button.
  const handleInvite = async () => {
    const url = myProfile?.username ? `https://bestiehere.com/invite/${myProfile.username}` : 'https://bestiehere.com'
    const text = `Be my first Bestie — real people, real moments. Join with my link and we both get +10 Sparks ⚡`
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title: 'Join me on Bestie', text, url }); return } catch { return }
    }
    try { await navigator.clipboard.writeText(`${text}\n${url}`) } catch {}
    setInviteCopied(true)
    setTimeout(() => setInviteCopied(false), 2000)
  }

  const getCompatLabel = (p) => {
    if (!myProfile || !compatMode || !p._compat) return null
    if (p._compat >= 7) return { Icon: Flame,    label: 'Great match', color: '#34D399' }
    if (p._compat >= 4) return { Icon: Sparkles, label: 'Good match',  color: '#D4AF37' }
    return null
  }

  const toggleGroup = (groupId) => {
    setActiveGroup(prev => prev === groupId ? null : groupId)
    setFilter('all')
  }

  const currentGroup = activeGroup ? FILTER_GROUPS.find(g => g.id === activeGroup) : null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <ProfileNav />
      </nav>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '36px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Browse Besties</h1>
            <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>
              {loading ? 'Loading...' : `${providers.length} Bestie${providers.length !== 1 ? 's' : ''} available`}
            </p>
            <Link href="/offers" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '13px', fontWeight: 600, color: '#D4AF37', textDecoration: 'none' }}>
              🧭 Browse all offers →
            </Link>
          </div>
          {myProfile?.eterotype && (
            <button onClick={() => setCompatMode(!compatMode)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', background: compatMode ? 'rgba(52,211,153,0.12)' : 'var(--surface-1b)', border: compatMode ? '1px solid rgba(52,211,153,0.35)' : '1px solid var(--border)', color: compatMode ? '#34D399' : 'var(--text-muted)', transition: 'all 0.2s' }}>
              <Sparkles size={14} strokeWidth={1.8} />
              {compatMode ? 'Compatibility ON' : 'Compatibility'}
            </button>
          )}
        </div>

        {justMatched && myProfile?.eterotype && !loading && providers.length > 0 && (
          <div style={{ marginBottom: '16px', padding: '18px 20px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(212,175,55,0.14) 0%, rgba(155,127,255,0.10) 100%)', border: '1px solid rgba(212,175,55,0.3)' }}>
            <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
              Your Bestie Type is <span style={{ color: '#D4AF37' }}>🧭 {myProfile.eterotype_name || myProfile.eterotype}</span> 🎉
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              Here are the people you'll naturally click with. Open a profile and send a <b style={{ color: 'var(--text-primary)' }}>knock 👋</b> — an anonymous hello. If they knock back, it's a match.
            </p>
          </div>
        )}

        {myProfile?.eterotype && compatMode && !justMatched && (
          <div style={{ marginBottom: '20px', padding: '14px 18px', borderRadius: '14px', background: 'rgba(57,255,20,0.06)', border: '1px solid rgba(57,255,20,0.2)', fontSize: '13px', color: 'var(--text-muted)' }}>
            Showing people compatible with your Bestie Type <span style={{ color: '#34D399', fontWeight: 600 }}>🧭 {myProfile.eterotype_name || myProfile.eterotype}</span> — best matches first
          </div>
        )}

        {!myProfile?.eterotype && (
          <div style={{ marginBottom: '20px', padding: '14px 18px', borderRadius: '14px', background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)', fontSize: '13px', color: 'var(--text-muted)' }}>
            <Link href="/bestie-type" style={{ color: '#D4AF37', textDecoration: 'none', fontWeight: 600 }}>🧭 Take the Bestie Type test →</Link> and we'll show the most compatible people first
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '14px', marginBottom: '16px' }}>
          <Search size={18} color="var(--text-muted)" strokeWidth={2} />
          <input type="text" placeholder="Search by name, city, or activity..." aria-label="Search Besties" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: 'var(--text-primary)', padding: '6px 0', minWidth: 0 }} />
          {search && (
            <button onClick={() => setSearch('')} aria-label="Clear search" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
              <X size={16} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Group tabs */}
        <div className="filters-scroll" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '12px' }}>
          <button onClick={() => { setActiveGroup(null); setFilter('all') }} style={{ padding: '8px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, background: !activeGroup && filter === 'all' ? 'rgba(212,175,55,0.15)' : 'var(--surface-1b)', border: !activeGroup && filter === 'all' ? '1px solid rgba(212,175,55,0.4)' : '1px solid var(--border-strong)', color: !activeGroup && filter === 'all' ? '#D4AF37' : 'var(--text-muted)' }}>
            All
          </button>
          {FILTER_GROUPS.map(group => (
            <button key={group.id} onClick={() => toggleGroup(group.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, background: activeGroup === group.id ? 'rgba(212,175,55,0.15)' : 'var(--surface-1b)', border: activeGroup === group.id ? '1px solid rgba(212,175,55,0.4)' : '1px solid var(--border-strong)', color: activeGroup === group.id ? '#D4AF37' : 'var(--text-muted)' }}>
              <group.Icon size={13} strokeWidth={1.8} />
              {group.label}
            </button>
          ))}
        </div>

        {/* Sub-filters when group selected */}
        {currentGroup && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px', padding: '16px', background: 'var(--surface-1)', borderRadius: '14px', border: '1px solid var(--border)' }}>
            {currentGroup.filters.map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', background: filter === f.id ? 'rgba(212,175,55,0.15)' : 'var(--surface-1b)', border: filter === f.id ? '1px solid rgba(212,175,55,0.4)' : '1px solid var(--border)', color: filter === f.id ? '#D4AF37' : 'var(--text-muted)' }}>
                <ActivityIcon type={f.id} size={12} color={filter === f.id ? '#D4AF37' : 'var(--text-muted)'} strokeWidth={1.8} />
                {f.label}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {[1,2,3,4,5,6].map(i => <CardSkeleton key={i} height={420} radius={20} />)}
          </div>
        ) : providers.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {providers.map((p, i) => {
              const compat = getCompatLabel(p)
              return (
                <div key={p.id} style={{ position: 'relative' }}>
                  {compat && (
                    <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 10, padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, background: 'rgba(0,0,0,0.7)', border: `1px solid ${compat.color}40`, color: compat.color, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <compat.Icon size={11} strokeWidth={2} fill={compat.color} />
                      {compat.label}
                    </div>
                  )}
                  <ProviderCard provider={p} featured={i === 0 && !compatMode} />
                </div>
              )
            })}
          </div>
        ) : justMatched && myProfile?.eterotype && !(search || filter !== 'all' || activeGroup) ? (
          /* Pioneer moment — they just got their type but nobody else is here yet */
          <div style={{ padding: '44px 28px', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(212,175,55,0.14) 0%, rgba(155,127,255,0.10) 100%)', border: '1px solid rgba(212,175,55,0.3)', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🧭</div>
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
              You're the first <span style={{ color: '#D4AF37' }}>{myProfile.eterotype_name || myProfile.eterotype}</span> {myProfile.city ? `in ${myProfile.city}` : 'around here'}
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '0 0 22px', lineHeight: 1.6 }}>
              Founding Besties set the tone — here's how to start:
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={handleInvite} style={{ padding: '11px 22px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', border: 'none', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', whiteSpace: 'nowrap' }}>
                {inviteCopied ? 'Link copied ✓' : 'Invite a friend (+10 ⚡ each)'}
              </button>
              <Link href="/group-sessions/new" style={{ padding: '11px 22px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, background: 'var(--overlay)', border: '1px solid var(--border-strong)', color: 'var(--text-muted)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                Host a session
              </Link>
            </div>
          </div>
        ) : (
          <EmptyState
            Icon={Search}
            title="No Besties found"
            description={search || filter !== 'all' || activeGroup ? 'Try a different search or clear filters to see everyone.' : 'Be the first Bestie in your city — invite a friend or fill out your activities.'}
            primaryCTA={search || filter !== 'all' || activeGroup
              ? { label: 'Clear filters', onClick: () => { setSearch(''); setFilter('all'); setActiveGroup(null) } }
              : myProfile
                ? { label: inviteCopied ? 'Link copied ✓' : 'Invite a friend (+10 ⚡)', onClick: handleInvite }
                : { label: 'Add your activities', href: '/profile/edit' }}
            secondaryCTA={!(search || filter !== 'all' || activeGroup) && myProfile
              ? { label: 'Add your activities', href: '/profile/edit' }
              : undefined}
            accent="gold"
          />
        )}
      </div>
    </div>
  )
}
