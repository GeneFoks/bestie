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
    activity_packages: [{ title: 'Sunrise Trail Run', activity_type: 'trail_crew', price_per_session: 15 }, { title: 'Weekend Adventure', activity_type: 'epic_journey', price_per_session: 35 }],
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
  { id: 'hiking', emoji: '🥾', label: 'Hiking' },
  { id: 'deep_chat', emoji: '🫂', label: 'Deep Chat' },
  { id: 'game_night', emoji: '🎮', label: 'Game Night' },
  { id: 'travel_buddy', emoji: '✈️', label: 'Travel Buddy' },
  { id: 'meditation', emoji: '🧘', label: 'Meditation' },
  { id: 'coffee_chat', emoji: '☕', label: 'Coffee Chat' },
  { id: 'music_lesson', emoji: '🎸', label: 'Music Lesson' },
  { id: 'night_out', emoji: '🍸', label: 'Night Out' },
  { id: 'breathwork', emoji: '🌬️', label: 'Breathwork' },
  { id: 'book_club', emoji: '📚', label: 'Book Club' },
  { id: 'festival_crew', emoji: '🎪', label: 'Festival Crew' },
  { id: 'vent_session', emoji: '💬', label: 'Vent Session' },
  { id: 'yoga', emoji: '🧘', label: 'Yoga' },
  { id: 'talk_3am', emoji: '🌙', label: '3am Talk' },
  { id: 'coworking', emoji: '💻', label: 'Coworking' },
]

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [activeActivity, setActiveActivity] = useState<string | null>(null)
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setLoggedIn(!!session)
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <div style={{ background: '#080810', minHeight: '100vh', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <div style={{ display: 'flex', gap: '32px', fontSize: '14px' }}>
          <Link href="/browse" style={{ color: '#9B93C0', textDecoration: 'none' }}>Browse</Link>
          <Link href="#how-it-works" style={{ color: '#9B93C0', textDecoration: 'none' }}>How It Works</Link>
          <Link href="#score" style={{ color: '#9B93C0', textDecoration: 'none' }}>Bestie Score</Link>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {loggedIn ? (
            <Link href="/dashboard" style={{ fontSize: '14px', fontWeight: 600, padding: '8px 20px', borderRadius: '12px', background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>
              Dashboard →
            </Link>
          ) : (
            <>
              <Link href="/login" style={{ fontSize: '14px', color: '#9B93C0', textDecoration: 'none' }}>Log in</Link>
              <Link href="/signup" style={{ fontSize: '14px', fontWeight: 600, padding: '8px 20px', borderRadius: '12px', background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>Join Free</Link>
            </>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position: 'relative', paddingTop: '128px', paddingBottom: '64px', paddingLeft: '24px', paddingRight: '24px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '800px', height: '600px', borderRadius: '50%', opacity: 0.08, pointerEvents: 'none', background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)' }} />
        <div style={{ maxWidth: '896px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '999px', marginBottom: '32px', fontSize: '13px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', color: '#D4AF37' }}>
            <span style={{ color: '#39FF14' }}>●</span>
            Your social passport — live now in Austin
          </div>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(40px, 8vw, 72px)', fontWeight: 700, color: '#E8E0FF', lineHeight: 1.1, marginBottom: '24px' }}>
            Real people.<br /><em style={{ color: '#D4AF37', fontStyle: 'italic' }}>Real moments.</em>
          </h1>
          <p style={{ fontSize: '18px', color: '#9B93C0', marginBottom: '40px', maxWidth: '560px', margin: '0 auto 40px', lineHeight: 1.6 }}>
            Find a Bestie for any activity — hiking, deep chats, game nights. Verified profiles. Bestie Score. No awkwardness.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '520px', margin: '0 auto 20px', padding: '8px', background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}>
            <span style={{ paddingLeft: '12px', fontSize: '20px' }}>🔍</span>
            <input type="text" placeholder="Search by name, activity, or city..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: '#E8E0FF', padding: '8px 0' }} />
            <Link href={`/browse${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ''}`} style={{ padding: '10px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>Find</Link>
          </div>
          <button onClick={() => setShowMatchModal(true)} style={{ fontSize: '14px', color: '#9B93C0', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '4px' }}>
            ✨ Try Smart Match — let us find your Bestie
          </button>
        </div>
      </section>

      {/* ACTIVITY PILLS */}
      <section style={{ paddingBottom: '48px', paddingLeft: '24px', paddingRight: '24px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
          {ACTIVITIES.map((a) => {
            const active = activeActivity === a.id
            return (
              <button key={a.id} onClick={() => setActiveActivity(active ? null : a.id)} style={{ padding: '8px 16px', borderRadius: '999px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', background: active ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)', border: active ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.08)', color: active ? '#D4AF37' : '#9B93C0' }}>
                {a.emoji} {a.label}
              </button>
            )
          })}
        </div>
      </section>

      {/* PROVIDER CARDS */}
      <section style={{ paddingBottom: '80px', paddingLeft: '24px', paddingRight: '24px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', fontWeight: 700, color: '#E8E0FF' }}>Featured Besties</h2>
            <Link href="/browse" style={{ fontSize: '14px', color: '#9B93C0', textDecoration: 'none' }}>See all →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {MOCK_PROVIDERS.map((provider, i) => (
              <ProviderCard key={provider.id} provider={provider} featured={i === 0} />
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', borderRadius: '24px', padding: '64px 48px', background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '2px', color: '#D4AF37', marginBottom: '12px' }}>HOW IT WORKS</p>
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 700, color: '#E8E0FF', marginBottom: '16px' }}>Simple. Safe. Human.</h2>
            <p style={{ fontSize: '16px', color: '#9B93C0' }}>Three steps from landing here to real company.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '40px' }}>
            {[
              { num: '01', icon: '🎯', title: 'Tell us what you need', desc: "Pick an activity, your city, and when you're free. Smart Match finds Besties who fit." },
              { num: '02', icon: '📋', title: 'Browse & book', desc: 'View verified profiles, read real reviews, and send a booking request — no pressure.' },
              { num: '03', icon: '🤝', title: 'Meet your Bestie', desc: 'Show up, connect, and leave a review. Every session is rated so quality stays high.' },
            ].map((step) => (
              <div key={step.num}>
                <div style={{ fontSize: '64px', fontWeight: 700, color: 'rgba(212,175,55,0.07)', fontFamily: 'DM Serif Display, serif', lineHeight: 1 }}>{step.num}</div>
                <div style={{ fontSize: '32px', margin: '12px 0' }}>{step.icon}</div>
                <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#E8E0FF', marginBottom: '12px' }}>{step.title}</h3>
                <p style={{ fontSize: '14px', color: '#9B93C0', lineHeight: 1.7 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BESTIE SCORE */}
      <section id="score" style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '64px', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '2px', color: '#39FF14', marginBottom: '16px' }}>THE SOCIAL PASSPORT</p>
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 700, color: '#E8E0FF', lineHeight: 1.2, marginBottom: '24px' }}>
              Your <em style={{ color: '#D4AF37', fontStyle: 'italic' }}>Bestie Score</em> says it all.
            </h2>
            <p style={{ fontSize: '16px', color: '#9B93C0', marginBottom: '24px', lineHeight: 1.7 }}>Like a credit score — but for who you are as a person.</p>
            <blockquote style={{ borderLeft: '2px solid #D4AF37', paddingLeft: '16px', marginBottom: '32px', fontSize: '16px', color: '#9B93C0', fontStyle: 'italic' }}>"Check them on Bestie."</blockquote>
            <Link href="/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>Build your Bestie Score →</Link>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '280px', padding: '32px', borderRadius: '24px', textAlign: 'center', background: '#0F0F1E', border: '1px solid rgba(57,255,20,0.2)', boxShadow: '0 0 60px rgba(57,255,20,0.08)' }}>
              <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#9B93C0', marginBottom: '8px' }}>BESTIE SCORE</p>
              <div style={{ fontSize: '80px', fontWeight: 700, color: '#39FF14', fontFamily: 'DM Serif Display, serif', lineHeight: 1, margin: '8px 0 16px' }}>874</div>
              <div style={{ height: '8px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', marginBottom: '8px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '87.4%', borderRadius: '999px', background: 'linear-gradient(90deg, #39FF14 0%, #D4AF37 100%)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9B93C0', marginBottom: '24px' }}>
                <span>0</span><span style={{ color: '#39FF14', fontWeight: 600 }}>Excellent</span><span>1000</span>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {[{ label: 'Sessions', val: '43' }, { label: 'Rating', val: '4.9' }, { label: 'Lights', val: '127' }].map((s) => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#E8E0FF' }}>{s.val}</div>
                    <div style={{ fontSize: '11px', color: '#9B93C0' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '40px 24px 80px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', borderRadius: '24px', padding: '56px 32px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(212,175,55,0.1) 0%, rgba(57,255,20,0.05) 100%)', border: '1px solid rgba(212,175,55,0.2)' }}>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 700, color: '#E8E0FF', marginBottom: '16px' }}>Ready to meet your Bestie?</h2>
          <p style={{ fontSize: '16px', color: '#9B93C0', marginBottom: '32px' }}>Join thousands building real connections in their city.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" style={{ padding: '14px 32px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>Become a Bestie →</Link>
            <Link href="/browse" style={{ padding: '14px 32px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#E8E0FF', textDecoration: 'none' }}>Browse Besties</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 24px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37' }}>BESTIE</span>
          <div style={{ display: 'flex', gap: '24px', fontSize: '14px' }}>
            <Link href="/browse" style={{ color: '#9B93C0', textDecoration: 'none' }}>Browse Besties</Link>
            <Link href="#how-it-works" style={{ color: '#9B93C0', textDecoration: 'none' }}>How It Works</Link>
            <Link href="/signup" style={{ color: '#9B93C0', textDecoration: 'none' }}>Become a Bestie</Link>
          </div>
          <p style={{ fontSize: '12px', color: '#9B93C0' }}>© 2026 Bestie. Austin, TX. 18+</p>
        </div>
      </footer>

      {showMatchModal && <MatchModal onClose={() => setShowMatchModal(false)} />}
    </div>
  )
}
