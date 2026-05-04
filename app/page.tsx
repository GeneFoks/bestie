'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ProviderCard from '@/components/ProviderCard'
import MatchModal from '@/components/MatchModal'

const ACTIVITY_GROUPS = [
  {
    id: 'active_outdoors',
    emoji: '🏃',
    label: 'Active & Outdoors',
    types: ['hiking', 'running', 'gym_partner', 'cycling', 'swimming', 'cold_plunge', 'yoga', 'martial_arts', 'climbing'],
  },
  {
    id: 'fun_social',
    emoji: '🎮',
    label: 'Fun & Social',
    types: ['game_night', 'movie_night', 'night_out', 'bar_hopping', 'karaoke', 'festival_crew', 'travel_buddy', 'wing_person', 'comedy_show'],
  },
  {
    id: 'mind_growth',
    emoji: '🧠',
    label: 'Mind & Growth',
    types: ['deep_chat', 'debate_club', 'book_club', 'language_exchange', 'career_talk', 'money_talk', 'journaling', 'accountability_partner', 'storytelling_night'],
  },
  {
    id: 'creative_skills',
    emoji: '🎨',
    label: 'Creative & Skills',
    types: ['music_lesson', 'art_together', 'photography_walk', 'cooking_together', 'dance', 'improv_acting', 'writing_club'],
  },
  {
    id: 'emotional_support',
    emoji: '🫂',
    label: 'Emotional & Support',
    types: ['vent_session', '3am_talk', 'hype_person', 'sobriety_buddy', 'silence_buddy', 'grief_support', 'ugly_cry_buddy'],
  },
  {
    id: 'spiritual_sacred',
    emoji: '🔮',
    label: 'Spiritual & Sacred',
    types: ['meditation_circle', 'breathwork', 'sound_healing', 'cacao_ceremony', 'tarot', 'retreat_buddy', 'psychedelic_integration', 'nature_ritual', 'lucid_dream_club'],
  },
  {
    id: 'chill_everyday',
    emoji: '☕',
    label: 'Chill & Everyday',
    types: ['coffee_chat', 'digital_detox_walk', 'skincare_night', 'smoke_buddy', 'astrology_session', 'coworking', 'errand_buddy'],
  },
]

const FEATURES = [
  { emoji: '🪪', title: 'Social Passport', desc: 'Every user gets a verified profile with Bestie Score, sparks, sessions, and badge history.' },
  { emoji: '⭐', title: 'Mutual Reviews', desc: 'Both sides confirm the session happened, then rate each other. No fake reviews.' },
  { emoji: '✨', title: 'Sparks', desc: '30 rare tokens you earn at signup. Give up to 3 per person to signal real trust.' },
  { emoji: '📅', title: 'Session Calendar', desc: 'Book, accept, and track upcoming sessions. See what\'s next and who you\'re meeting.' },
  { emoji: '⚡', title: 'Going To', desc: '24h status stories — share what you\'re up to today and find someone to join you.' },
  { emoji: '💬', title: 'Direct Messages', desc: 'Chat with any Bestie directly. Conversations tied to bookings stay in context.' },
]

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [topProviders, setTopProviders] = useState<any[]>([])
  const [activeGroup, setActiveGroup] = useState(null)
  const [groupProviders, setGroupProviders] = useState([])
  const [groupLoading, setGroupLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setLoggedIn(!!session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setLoggedIn(!!session))

    // Загружаем топ 3 реальных пользователей
    supabase
      .from('users')
      .select('*, activity_packages(*)')
      .order('bestie_score', { ascending: false })
      .gt('bestie_score', 0)
      .limit(3)
      .then(({ data }) => setTopProviders(data || []))

    return () => subscription.unsubscribe()
  }, [])

  const handleGroupClick = async (group) => {
    if (activeGroup?.id === group.id) {
      setActiveGroup(null)
      setGroupProviders([])
      return
    }
    setActiveGroup(group)
    setGroupLoading(true)

    const { data: pkgs } = await supabase
      .from('activity_packages')
      .select('provider_id')
      .in('activity_type', group.types)

    const userIds = [...new Set(pkgs?.map(p => p.provider_id) || [])]

    if (userIds.length > 0) {
      const { data } = await supabase
        .from('users')
        .select('*, activity_packages(*)')
        .in('id', userIds)
        .order('bestie_score', { ascending: false })
        .limit(6)
      setGroupProviders(data || [])
    } else {
      setGroupProviders([])
    }
    setGroupLoading(false)
  }

  return (
    <div style={{ background: '#080810', minHeight: '100vh', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <style>{`
        .nav-links { display: flex; gap: 32px; font-size: 14px; }
        .mobile-menu-btn { display: none; }
        .mobile-menu { display: none; }
        .hero-title { font-size: clamp(36px, 8vw, 72px); }
        .providers-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
        .how-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 40px; }
        .score-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 64px; align-items: center; }
        .groups-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; }
        @media (max-width: 900px) { .groups-grid { grid-template-columns: repeat(4, 1fr); } }
        @media (max-width: 768px) {
          .nav-links { display: none; }
          .mobile-menu-btn { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; cursor: pointer; color: #E8E0FF; font-size: 18px; }
          .mobile-menu.open { display: flex; flex-direction: column; gap: 4px; position: fixed; top: 60px; left: 0; right: 0; z-index: 49; background: rgba(8,8,16,0.98); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.06); padding: 16px; }
          .mobile-menu a { padding: 12px 16px; border-radius: 12px; font-size: 15px; color: #9B93C0; }
          .providers-grid { grid-template-columns: 1fr; }
          .groups-grid { grid-template-columns: repeat(2, 1fr); }
          .score-grid { grid-template-columns: 1fr; gap: 32px; }
        }
        @media (max-width: 480px) {
          .providers-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <div className="nav-links">
          <Link href="/browse" style={{ color: '#9B93C0', textDecoration: 'none' }}>Browse</Link>
          <Link href="#how-it-works" style={{ color: '#9B93C0', textDecoration: 'none' }}>How It Works</Link>
          <Link href="#score" style={{ color: '#9B93C0', textDecoration: 'none' }}>Bestie Score</Link>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {loggedIn ? (
            <Link href="/dashboard" style={{ fontSize: '14px', fontWeight: 600, padding: '8px 16px', borderRadius: '12px', background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>Dashboard →</Link>
          ) : (
            <>
              <Link href="/login" style={{ fontSize: '14px', color: '#9B93C0', textDecoration: 'none' }}>Log in</Link>
              <Link href="/signup" style={{ fontSize: '14px', fontWeight: 600, padding: '8px 16px', borderRadius: '12px', background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>Join Free</Link>
            </>
          )}
          <button className="mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
        </div>
      </nav>

      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        <Link href="/browse" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none' }}>🔍 Browse</Link>
        <Link href="#how-it-works" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none' }}>💡 How It Works</Link>
        <Link href="#score" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none' }}>⭐ Bestie Score</Link>
        {!loggedIn && <Link href="/login" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none' }}>👤 Log in</Link>}
        {!loggedIn && <Link href="/signup" onClick={() => setMenuOpen(false)} style={{ color: '#D4AF37', textDecoration: 'none', fontWeight: 600 }}>✨ Join Free</Link>}
        {loggedIn && <Link href="/dashboard" onClick={() => setMenuOpen(false)} style={{ color: '#D4AF37', textDecoration: 'none', fontWeight: 600 }}>→ Dashboard</Link>}
      </div>

      {/* HERO */}
      <section style={{ position: 'relative', paddingTop: '100px', paddingBottom: '48px', paddingLeft: '20px', paddingRight: '20px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '600px', height: '500px', borderRadius: '50%', opacity: 0.07, pointerEvents: 'none', background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)' }} />
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '7px 14px', borderRadius: '999px', marginBottom: '24px', fontSize: '13px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', color: '#D4AF37' }}>
            <span style={{ color: '#39FF14' }}>●</span>
            Your social passport — live now in Austin
          </div>
          <h1 className="hero-title" style={{ fontFamily: 'DM Serif Display, serif', fontWeight: 700, color: '#E8E0FF', lineHeight: 1.1, marginBottom: '20px' }}>
            Real people.<br /><em style={{ color: '#D4AF37', fontStyle: 'italic' }}>Real moments.</em>
          </h1>
          <p style={{ fontSize: '16px', color: '#9B93C0', marginBottom: '32px', maxWidth: '480px', margin: '0 auto 32px', lineHeight: 1.6 }}>
            Find a Bestie for any activity. Verified profiles. Bestie Score. No awkwardness.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '520px', margin: '0 auto 16px', padding: '6px', background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px' }}>
            <span style={{ paddingLeft: '10px', fontSize: '18px' }}>🔍</span>
            <input type="text" placeholder="Search by name, activity, or city..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: '#E8E0FF', padding: '8px 0' }} />
            <Link href={`/browse${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ''}`} style={{ padding: '10px 18px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none', whiteSpace: 'nowrap' }}>Find</Link>
          </div>
          <button onClick={() => setShowMatchModal(true)} style={{ fontSize: '13px', color: '#9B93C0', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '4px' }}>
            ✨ Try Smart Match — let us find your Bestie
          </button>
        </div>
      </section>

      {/* ACTIVITY GROUPS */}
      <section style={{ padding: '0 20px 48px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#D4AF37', marginBottom: '16px', textAlign: 'center' }}>FIND BY VIBE</p>
          <div className="groups-grid">
            {ACTIVITY_GROUPS.map(group => {
              const active = activeGroup?.id === group.id
              return (
                <button
                  key={group.id}
                  onClick={() => handleGroupClick(group)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                    padding: '16px 8px', borderRadius: '16px', cursor: 'pointer',
                    background: active ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.04)',
                    border: active ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.06)',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: '28px' }}>{group.emoji}</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: active ? '#D4AF37' : '#9B93C0', textAlign: 'center', lineHeight: 1.3 }}>{group.label}</span>
                </button>
              )
            })}
          </div>

          {/* Group results */}
          {activeGroup && (
            <div style={{ marginTop: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', color: '#E8E0FF' }}>
                  {activeGroup.emoji} {activeGroup.label}
                </h2>
                <Link href="/browse" style={{ fontSize: '13px', color: '#D4AF37', textDecoration: 'none' }}>See all →</Link>
              </div>
              {groupLoading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {[1,2,3].map(i => (
                    <div key={i} style={{ height: '380px', borderRadius: '20px', background: '#0F0F1E', animation: 'pulse 1.5s ease-in-out infinite' }} />
                  ))}
                  <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
                </div>
              ) : groupProviders.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {groupProviders.map(p => <ProviderCard key={p.id} provider={p} />)}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', background: '#0F0F1E', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</p>
                  <p style={{ fontSize: '14px', color: '#9B93C0', marginBottom: '16px' }}>No Besties for this vibe yet</p>
                  <Link href="/signup" style={{ display: 'inline-block', padding: '10px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>Be the first →</Link>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* TOP BESTIES */}
      <section style={{ padding: '0 20px 64px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#D4AF37', marginBottom: '4px' }}>LEADERBOARD</p>
              <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 700, color: '#E8E0FF' }}>Top Besties</h2>
            </div>
            <Link href="/browse" style={{ fontSize: '14px', color: '#9B93C0', textDecoration: 'none' }}>See all →</Link>
          </div>
          {topProviders.length > 0 ? (
            <div className="providers-grid">
              {topProviders.map((provider, i) => (
                <div key={provider.id} style={{ position: 'relative' }}>
                  {i === 0 && (
                    <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', zIndex: 10, background: 'linear-gradient(135deg, #D4AF37, #B8960C)', borderRadius: '999px', padding: '4px 14px', fontSize: '11px', fontWeight: 700, color: '#080810', whiteSpace: 'nowrap' }}>
                      👑 #1 Top Bestie
                    </div>
                  )}
                  {i === 1 && (
                    <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', zIndex: 10, background: 'rgba(155,147,192,0.2)', border: '1px solid rgba(155,147,192,0.3)', borderRadius: '999px', padding: '4px 14px', fontSize: '11px', fontWeight: 700, color: '#9B93C0', whiteSpace: 'nowrap' }}>
                      🥈 #2
                    </div>
                  )}
                  {i === 2 && (
                    <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', zIndex: 10, background: 'rgba(180,100,40,0.2)', border: '1px solid rgba(180,100,40,0.3)', borderRadius: '999px', padding: '4px 14px', fontSize: '11px', fontWeight: 700, color: '#CD7F32', whiteSpace: 'nowrap' }}>
                      🥉 #3
                    </div>
                  )}
                  <ProviderCard provider={provider} featured={i === 0} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px', background: '#0F0F1E', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: '14px', color: '#9B93C0' }}>Be the first to build your Bestie Score</p>
              <Link href="/signup" style={{ display: 'inline-block', marginTop: '16px', padding: '10px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>Join Free →</Link>
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ padding: '64px 20px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', borderRadius: '24px', background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', padding: '48px 40px' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#D4AF37', marginBottom: '10px' }}>HOW IT WORKS</p>
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: 700, color: '#E8E0FF', marginBottom: '12px' }}>Simple. Safe. Human.</h2>
            <p style={{ fontSize: '15px', color: '#9B93C0' }}>Four steps from landing here to real company.</p>
          </div>
          <div className="how-grid">
            {[
              { num: '01', icon: '🪪', title: 'Create your Social Passport', desc: 'Fill in your bio, add activities, get verified. Your Bestie Score starts building from day one.' },
              { num: '02', icon: '🔍', title: 'Browse & book', desc: 'Filter by activity, city, and score. Send a booking request — no pressure, no awkwardness.' },
              { num: '03', icon: '🤝', title: 'Meet your Bestie', desc: 'Show up, connect, enjoy. After the session both sides confirm it happened.' },
              { num: '04', icon: '⭐', title: 'Rate & give Sparks', desc: 'Leave a star rating and give a Spark to signal real trust. Scores update automatically.' },
            ].map((step) => (
              <div key={step.num}>
                <div style={{ fontSize: '48px', fontWeight: 700, color: 'rgba(212,175,55,0.07)', fontFamily: 'DM Serif Display, serif', lineHeight: 1 }}>{step.num}</div>
                <div style={{ fontSize: '28px', margin: '8px 0' }}>{step.icon}</div>
                <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '17px', fontWeight: 700, color: '#E8E0FF', marginBottom: '8px' }}>{step.title}</h3>
                <p style={{ fontSize: '13px', color: '#9B93C0', lineHeight: 1.7 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: '0 20px 64px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#D4AF37', marginBottom: '10px' }}>WHAT'S INSIDE</p>
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 700, color: '#E8E0FF' }}>Everything you need to connect safely</h2>
          </div>
          <div className="features-grid">
            {FEATURES.map((f) => (
              <div key={f.title} style={{ background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '20px' }}>
                <div style={{ fontSize: '28px', marginBottom: '10px' }}>{f.emoji}</div>
                <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '16px', fontWeight: 700, color: '#E8E0FF', marginBottom: '6px' }}>{f.title}</h3>
                <p style={{ fontSize: '13px', color: '#9B93C0', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BESTIE SCORE */}
      <section id="score" style={{ padding: '64px 20px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div className="score-grid">
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#39FF14', marginBottom: '14px' }}>THE SOCIAL PASSPORT</p>
              <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 700, color: '#E8E0FF', lineHeight: 1.2, marginBottom: '20px' }}>
                Your <em style={{ color: '#D4AF37', fontStyle: 'italic' }}>Bestie Score</em> says it all.
              </h2>
              <p style={{ fontSize: '15px', color: '#9B93C0', marginBottom: '16px', lineHeight: 1.7 }}>Like a credit score — but for who you are as a person. Built from real sessions, ratings, sparks, and verification.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '28px' }}>
                {[
                  { label: '🌱 New Bestie', desc: 'Just joined — under 1 month' },
                  { label: '⭐ Regular', desc: '3+ months, consistent sessions' },
                  { label: '🔥 Veteran', desc: '6+ months, high rating' },
                  { label: '💎 Legend', desc: '1+ year, trusted by many' },
                  { label: '👑 OG Bestie', desc: '2+ years — the real ones' },
                ].map(b => (
                  <div key={b.label} style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '13px' }}>
                    <span style={{ color: '#E8E0FF', fontWeight: 600, minWidth: '110px' }}>{b.label}</span>
                    <span style={{ color: '#9B93C0' }}>{b.desc}</span>
                  </div>
                ))}
              </div>
              <Link href="/score-guide" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>Build your Bestie Score →</Link>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '260px', padding: '28px', borderRadius: '24px', textAlign: 'center', background: '#0F0F1E', border: '1px solid rgba(57,255,20,0.2)', boxShadow: '0 0 60px rgba(57,255,20,0.08)' }}>
                <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '2px', color: '#9B93C0', marginBottom: '6px' }}>BESTIE SCORE</p>
                <div style={{ fontSize: '72px', fontWeight: 700, color: '#39FF14', fontFamily: 'DM Serif Display, serif', lineHeight: 1, margin: '6px 0 14px' }}>874</div>
                <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', marginBottom: '6px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '87.4%', borderRadius: '999px', background: 'linear-gradient(90deg, #39FF14 0%, #D4AF37 100%)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9B93C0', marginBottom: '20px' }}>
                  <span>0</span><span style={{ color: '#39FF14', fontWeight: 600 }}>Excellent</span><span>1000</span>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {[{ label: 'Sessions', val: '43' }, { label: 'Rating', val: '4.9' }, { label: 'Sparks', val: '127' }].map((s) => (
                    <div key={s.label}>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#E8E0FF' }}>{s.val}</div>
                      <div style={{ fontSize: '10px', color: '#9B93C0' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SPARKS */}
      <section style={{ padding: '0 20px 64px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', borderRadius: '24px', background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(57,255,20,0.04) 100%)', border: '1px solid rgba(212,175,55,0.2)', textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ fontSize: '40px', marginBottom: '14px' }}>✨</div>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 700, color: '#E8E0FF', marginBottom: '14px' }}>Sparks — rare tokens of real trust</h2>
          <p style={{ fontSize: '15px', color: '#9B93C0', marginBottom: '28px', lineHeight: 1.7, maxWidth: '480px', margin: '0 auto 28px' }}>
            Every new member gets 30 Sparks. You can give max 3 to any one person — they say "I genuinely trust this person."
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '28px' }}>
            {[
              { emoji: '💛', label: 'Kind' }, { emoji: '🎉', label: 'Fun' }, { emoji: '🔒', label: 'Reliable' },
              { emoji: '💎', label: 'Genuine' }, { emoji: '🛡️', label: 'Safe' }, { emoji: '⚡', label: 'Energetic' },
              { emoji: '👂', label: 'Good listener' }, { emoji: '🌟', label: 'Social' }, { emoji: '⏰', label: 'Punctual' }, { emoji: '🌊', label: 'Open' },
            ].map(s => (
              <div key={s.label} style={{ padding: '7px 13px', borderRadius: '999px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', fontSize: '12px', color: '#E8E0FF', display: 'flex', gap: '5px', alignItems: 'center' }}>
                <span>{s.emoji}</span><span>{s.label}</span>
              </div>
            ))}
          </div>
          <Link href="/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>
            Get your 30 Sparks →
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '0 20px 64px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', borderRadius: '24px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(212,175,55,0.1) 0%, rgba(57,255,20,0.05) 100%)', border: '1px solid rgba(212,175,55,0.2)', padding: '48px 32px' }}>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 700, color: '#E8E0FF', marginBottom: '14px' }}>Ready to meet your Bestie?</h2>
          <p style={{ fontSize: '15px', color: '#9B93C0', marginBottom: '28px' }}>Join people building real connections in their city.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" style={{ padding: '13px 28px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>Become a Bestie →</Link>
            <Link href="/browse" style={{ padding: '13px 28px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#E8E0FF', textDecoration: 'none' }}>Browse Besties</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '28px 20px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37' }}>BESTIE</span>
          <div style={{ display: 'flex', gap: '20px', fontSize: '14px', flexWrap: 'wrap' }}>
            <Link href="/browse" style={{ color: '#9B93C0', textDecoration: 'none' }}>Browse</Link>
            <Link href="#how-it-works" style={{ color: '#9B93C0', textDecoration: 'none' }}>How It Works</Link>
            <Link href="/score-guide" style={{ color: '#9B93C0', textDecoration: 'none' }}>Bestie Score</Link>
            <Link href="/signup" style={{ color: '#9B93C0', textDecoration: 'none' }}>Join</Link>
          </div>
          <p style={{ fontSize: '12px', color: '#9B93C0' }}>© 2026 Bestie. Austin, TX. 18+</p>
        </div>
      </footer>

      {showMatchModal && <MatchModal onClose={() => setShowMatchModal(false)} />}
    </div>
  )
}
