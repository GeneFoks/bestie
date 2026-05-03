'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ProviderCard from '@/components/ProviderCard'
import MatchModal from '@/components/MatchModal'
import { supabase } from '@/lib/supabase'

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
]

const ACTIVITIES = [
  { id: 'meet_irl', emoji: '🤝', label: 'Meet IRL' },
  { id: 'deep_chat', emoji: '🫂', label: 'Deep Chat' },
  { id: 'game_night', emoji: '🎮', label: 'Game Night' },
  { id: 'travel_buddy', emoji: '✈️', label: 'Travel Buddy' },
  { id: 'trail_crew', emoji: '🥾', label: 'Trail Crew' },
  { id: 'dance_crew', emoji: '💃', label: 'Dance Crew' },
  { id: 'watch_together', emoji: '🎬', label: 'Watch Together' },
  { id: 'vibe_call', emoji: '📱', label: 'Vibe Call' },
  { id: 'festival_crew', emoji: '🎪', label: 'Festival Crew' },
  { id: 'epic_journey', emoji: '🌍', label: 'Epic Journey' },
  { id: 'fishing_crew', emoji: '🎣', label: 'Fishing Crew' },
  { id: 'real_talk', emoji: '💬', label: 'Real Talk' },
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
  const [activeActivity, setActiveActivity] = useState<string | null>(null)
  const [loggedIn, setLoggedIn] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setLoggedIn(!!session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setLoggedIn(!!session))
    return () => subscription.unsubscribe()
  }, [])

  return (
    <div style={{ background: '#080810', minHeight: '100vh', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>

      <style>{`
        .nav-links { display: flex; gap: 32px; font-size: 14px; }
        .nav-actions { display: flex; gap: 12px; align-items: center; }
        .mobile-menu-btn { display: none; }
        .mobile-menu { display: none; }
        .hero-title { font-size: clamp(36px, 8vw, 72px); }
        .hero-sub { font-size: 18px; }
        .hero-search { max-width: 520px; }
        .providers-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
        .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
        .how-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 40px; }
        .score-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 64px; align-items: center; }
        .section-pad { padding: 80px 24px; }
        .how-inner { padding: 64px 48px; }
        .sparks-inner { padding: 48px 40px; }
        .cta-inner { padding: 56px 32px; }
        .footer-inner { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
        .footer-links { display: flex; gap: 24px; font-size: 14px; }
        .activity-pills { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
        .sparks-pills { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-bottom: 32px; }

        @media (max-width: 768px) {
          .nav-links { display: none; }
          .mobile-menu-btn { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; cursor: pointer; color: #E8E0FF; font-size: 18px; }
          .mobile-menu.open { display: flex; flex-direction: column; gap: 4px; position: fixed; top: 60px; left: 0; right: 0; z-index: 49; background: rgba(8,8,16,0.98); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.06); padding: 16px; }
          .mobile-menu a { padding: 12px 16px; border-radius: 12px; font-size: 15px; color: #9B93C0; }
          .hero-sub { font-size: 15px; }
          .hero-search { max-width: 100%; }
          .providers-grid { grid-template-columns: 1fr 1fr; gap: 12px; }
          .features-grid { grid-template-columns: 1fr; }
          .how-grid { grid-template-columns: 1fr 1fr; gap: 24px; }
          .score-grid { grid-template-columns: 1fr; gap: 32px; }
          .section-pad { padding: 48px 16px; }
          .how-inner { padding: 32px 20px; }
          .sparks-inner { padding: 32px 20px; }
          .cta-inner { padding: 36px 20px; }
          .footer-inner { flex-direction: column; align-items: flex-start; gap: 12px; }
          .footer-links { flex-wrap: wrap; gap: 16px; }
          .activity-pills { flex-wrap: nowrap; overflow-x: auto; justify-content: flex-start; padding-bottom: 8px; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
          .activity-pills::-webkit-scrollbar { display: none; }
          .sparks-pills { gap: 8px; }
        }

        @media (max-width: 480px) {
          .providers-grid { grid-template-columns: 1fr; }
          .how-grid { grid-template-columns: 1fr; gap: 24px; }
          .nav-actions { gap: 8px; }
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

        <div className="nav-actions">
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

      {/* MOBILE MENU */}
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
          <p className="hero-sub" style={{ color: '#9B93C0', marginBottom: '32px', maxWidth: '480px', margin: '0 auto 32px', lineHeight: 1.6 }}>
            Find a Bestie for any activity — hiking, deep chats, game nights. Verified profiles. Bestie Score. No awkwardness.
          </p>
          <div className="hero-search" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto 16px', padding: '6px', background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px' }}>
            <span style={{ paddingLeft: '10px', fontSize: '18px' }}>🔍</span>
            <input type="text" placeholder="Search by name, activity, or city..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: '#E8E0FF', padding: '8px 0' }} />
            <Link href={`/browse${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ''}`} style={{ padding: '10px 18px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none', whiteSpace: 'nowrap' }}>Find</Link>
          </div>
          <button onClick={() => setShowMatchModal(true)} style={{ fontSize: '13px', color: '#9B93C0', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '4px' }}>
            ✨ Try Smart Match — let us find your Bestie
          </button>
        </div>
      </section>

      {/* ACTIVITY PILLS */}
      <section style={{ paddingBottom: '40px', paddingLeft: '20px', paddingRight: '20px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div className="activity-pills">
            {ACTIVITIES.map((a) => {
              const active = activeActivity === a.id
              return (
                <button key={a.id} onClick={() => setActiveActivity(active ? null : a.id)} style={{ padding: '8px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s', background: active ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)', border: active ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.08)', color: active ? '#D4AF37' : '#9B93C0' }}>
                  {a.emoji} {a.label}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* FEATURED BESTIES */}
      <section style={{ paddingBottom: '64px', paddingLeft: '20px', paddingRight: '20px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 700, color: '#E8E0FF' }}>Featured Besties</h2>
            <Link href="/browse" style={{ fontSize: '14px', color: '#9B93C0', textDecoration: 'none' }}>See all →</Link>
          </div>
          <div className="providers-grid">
            {MOCK_PROVIDERS.map((provider, i) => (
              <ProviderCard key={provider.id} provider={provider} featured={i === 0} />
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="section-pad">
        <div style={{ maxWidth: '960px', margin: '0 auto', borderRadius: '24px', background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="how-inner">
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
      <section id="score" className="section-pad">
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
                    <div key={s.label} style={{ textAlign: 'center' }}>
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
        <div style={{ maxWidth: '720px', margin: '0 auto', borderRadius: '24px', background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(57,255,20,0.04) 100%)', border: '1px solid rgba(212,175,55,0.2)', textAlign: 'center' }}>
          <div className="sparks-inner">
            <div style={{ fontSize: '40px', marginBottom: '14px' }}>✨</div>
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 700, color: '#E8E0FF', marginBottom: '14px' }}>Sparks — rare tokens of real trust</h2>
            <p style={{ fontSize: '15px', color: '#9B93C0', marginBottom: '28px', lineHeight: 1.7, maxWidth: '480px', margin: '0 auto 28px' }}>
              Every new member gets 30 Sparks. You can give max 3 to any one person. Sparks signal something deeper than a star rating — they say "I genuinely trust this person."
            </p>
            <div className="sparks-pills">
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
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '0 20px 64px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', borderRadius: '24px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(212,175,55,0.1) 0%, rgba(57,255,20,0.05) 100%)', border: '1px solid rgba(212,175,55,0.2)' }}>
          <div className="cta-inner">
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 700, color: '#E8E0FF', marginBottom: '14px' }}>Ready to meet your Bestie?</h2>
            <p style={{ fontSize: '15px', color: '#9B93C0', marginBottom: '28px' }}>Join people building real connections in their city.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/signup" style={{ padding: '13px 28px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>Become a Bestie →</Link>
              <Link href="/browse" style={{ padding: '13px 28px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#E8E0FF', textDecoration: 'none' }}>Browse Besties</Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '28px 20px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div className="footer-inner">
            <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37' }}>BESTIE</span>
            <div className="footer-links">
              <Link href="/browse" style={{ color: '#9B93C0', textDecoration: 'none' }}>Browse</Link>
              <Link href="#how-it-works" style={{ color: '#9B93C0', textDecoration: 'none' }}>How It Works</Link>
              <Link href="/score-guide" style={{ color: '#9B93C0', textDecoration: 'none' }}>Bestie Score</Link>
              <Link href="/signup" style={{ color: '#9B93C0', textDecoration: 'none' }}>Join</Link>
            </div>
            <p style={{ fontSize: '12px', color: '#9B93C0' }}>© 2026 Bestie. Austin, TX. 18+</p>
          </div>
        </div>
      </footer>

      {showMatchModal && <MatchModal onClose={() => setShowMatchModal(false)} />}
    </div>
  )
}
