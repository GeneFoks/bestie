// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ProviderCard from '@/components/ProviderCard'
import MatchModal from '@/components/MatchModal'
import {
  Zap, Gamepad2, BookOpen, Palette, Heart, Moon, Coffee,
  Contact, Trophy, Flame, CalendarDays, Bell, Users, Map, Globe,
  Share2, Camera, Sparkles, ShieldCheck, Search, UserCheck,
  Target, Star, Network,
} from 'lucide-react'

const ACTIVITY_GROUPS = [
  { id: 'active_outdoors', Icon: Zap, label: 'Active & Outdoors', types: ['hiking', 'running', 'gym_partner', 'cycling', 'swimming', 'cold_plunge', 'yoga', 'martial_arts', 'climbing', 'trail_crew', 'fishing_crew', 'meet_irl'] },
  { id: 'fun_social', Icon: Gamepad2, label: 'Fun & Social', types: ['game_night', 'movie_night', 'night_out', 'bar_hopping', 'karaoke', 'festival_crew', 'travel_buddy', 'wing_person', 'comedy_show', 'dance_crew', 'epic_journey', 'watch_together', 'meet_irl'] },
  { id: 'mind_growth', Icon: BookOpen, label: 'Mind & Growth', types: ['deep_chat', 'debate_club', 'book_club', 'language_exchange', 'career_talk', 'money_talk', 'journaling', 'accountability_partner', 'storytelling_night', 'real_talk', 'vibe_call'] },
  { id: 'creative_skills', Icon: Palette, label: 'Creative & Skills', types: ['music_lesson', 'art_together', 'photography_walk', 'cooking_together', 'dance', 'improv_acting', 'writing_club'] },
  { id: 'emotional_support', Icon: Heart, label: 'Emotional & Support', types: ['vent_session', '3am_talk', 'hype_person', 'sobriety_buddy', 'silence_buddy', 'grief_support', 'ugly_cry_buddy', 'deep_chat', 'real_talk'] },
  { id: 'spiritual_sacred', Icon: Moon, label: 'Spiritual & Sacred', types: ['meditation_circle', 'breathwork', 'sound_healing', 'cacao_ceremony', 'tarot', 'retreat_buddy', 'psychedelic_integration', 'nature_ritual', 'lucid_dream_club', 'yoga'] },
  { id: 'chill_everyday', Icon: Coffee, label: 'Chill & Everyday', types: ['coffee_chat', 'digital_detox_walk', 'skincare_night', 'smoke_buddy', 'astrology_session', 'coworking', 'errand_buddy', 'meet_irl', 'walk_meet', 'vibe_call'] },
]

const FEATURES = [
  { Icon: Contact,      title: 'Social Passport',       desc: 'Your verified profile: Bestie Score, session count, sparks, badges, streak, availability. One link to share it all.' },
  { Icon: Trophy,      title: 'Bestie Score & Badges', desc: 'Score grows with every confirmed session, spark, and week of consistency. Earn badges — Top 1%, Session King, streak milestones, Rising Star.' },
  { Icon: Flame,       title: 'Weekly Streak',         desc: 'Meet someone every week and your streak grows. 12-week streaks unlock the rarest badges and a bonus on your score.' },
  { Icon: CalendarDays,title: 'Availability Calendar', desc: 'Set your available days and time slots. Visible on your passport so people know the best time to reach out — no guessing.' },
  { Icon: Bell,        title: 'Knock',                 desc: 'Send an anonymous signal of interest. If they knock back — you match and can connect. No awkward cold messages.' },
  { Icon: Users,       title: 'Group Sessions',        desc: 'Host open meetups for 3–20 people. Set a date, location, and max size. Anyone can join, share, or leave.' },
  { Icon: Map,         title: 'Nearby Map',            desc: 'See Besties near you on a live map. Pins show their session tier — gold for veterans, white glow for the most active.' },
  { Icon: Globe,       title: 'City Pulse',            desc: "Live feed of who's free today, upcoming group sessions, and what's happening in your city right now." },
  { Icon: Network,     title: 'Connection Graph',      desc: 'A live web of every real connection made on Bestie. Clusters form naturally — your crew, your city, your world.' },
  { Icon: Camera,      title: 'Session Memories',      desc: 'After every session, record your mood, what you did, and add a photo. Your passport becomes a living story of real moments.' },
  { Icon: Sparkles,    title: 'Sparks',                desc: '30 rare tokens you earn at signup. Give up to 3 per person, 1 per type. The rarest signal of real trust.' },
  { Icon: ShieldCheck, title: 'Block & Report',        desc: 'Session-gated safety tools — only people who\'ve actually met can block or report. Keeps the community honest.' },
]

// Scroll reveal hook
function useReveal() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.12 }
    )
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return [ref, visible]
}

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [topProviders, setTopProviders] = useState([])
  const [activeGroup, setActiveGroup] = useState(null)
  const [groupProviders, setGroupProviders] = useState([])
  const [groupLoading, setGroupLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const [groupsRef, groupsVisible] = useReveal()
  const [leaderRef, leaderVisible] = useReveal()
  const [howRef, howVisible] = useReveal()
  const [featRef, featVisible] = useReveal()
  const [crewsRef, crewsVisible] = useReveal()
  const [plansRef, plansVisible] = useReveal()
  const [scoreRef, scoreVisible] = useReveal()
  const [sparksRef, sparksVisible] = useReveal()
  const [graphRef, graphVisible] = useReveal()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setLoggedIn(!!session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setLoggedIn(!!session))

    supabase
      .from('users')
      .select('*, activity_packages(*)')
      .order('bestie_score', { ascending: false })
      .gt('bestie_score', 0)
      .limit(5)
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
      // Honest empty: no fallback masquerading as filtered results.
      setGroupProviders([])
    }
    setGroupLoading(false)
  }

  return (
    <div style={{ background: '#09090F', minHeight: '100vh', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <style>{`
        /* ── Reset ── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── Nav ── */
        .nav-links { display: flex; gap: 28px; font-size: 14px; }
        .nav-link { color: #A99ECC; text-decoration: none; transition: color 0.2s; }
        .nav-link:hover { color: #F0EAFF; }
        .mobile-menu-btn { display: none; }
        .mobile-menu { display: none; }

        /* ── Layout grids ── */
        .providers-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; width: 100%; max-width: 100%; }
        .providers-grid > * { min-width: 0; max-width: 100%; }
        /* Force single column on narrow phones where 280px min could overflow */
        @media (max-width: 360px) {
          .providers-grid { grid-template-columns: 1fr; }
        }
        .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
        .how-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 40px; }
        .score-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 64px; align-items: center; }
        .groups-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; width: 100%; }
        .groups-grid > * { min-width: 0; }


        /* ── Mobile horizontal swipe for long card lists ── */
        @media (max-width: 768px) {
          .features-grid, .how-grid {
            display: flex !important;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            gap: 12px;
            margin: 0 -20px;
            padding: 4px 20px 12px;
          }
          .features-grid::-webkit-scrollbar,
          .how-grid::-webkit-scrollbar { display: none; }
          .features-grid > *, .how-grid > * {
            flex: 0 0 82%;
            scroll-snap-align: start;
          }
        }

        /* ── Skeleton pulse ── */
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }

        /* ── Scroll reveal ── */
        .reveal { opacity: 0; transform: translateY(28px); transition: opacity 0.65s cubic-bezier(.22,1,.36,1), transform 0.65s cubic-bezier(.22,1,.36,1); }
        .reveal.visible { opacity: 1; transform: none; }
        .reveal-delay-1 { transition-delay: 0.08s; }
        .reveal-delay-2 { transition-delay: 0.16s; }
        .reveal-delay-3 { transition-delay: 0.24s; }
        .reveal-delay-4 { transition-delay: 0.32s; }

        /* ── Hero glow pulse ── */
        @keyframes glow-breathe { 0%,100%{opacity:0.07} 50%{opacity:0.13} }
        @keyframes glow-breathe-2 { 0%,100%{opacity:0.04} 50%{opacity:0.08} }
        @keyframes badge-pop { 0%{opacity:0; transform:translateY(-6px) scale(.95)} 100%{opacity:1; transform:none} }
        @keyframes hero-in { 0%{opacity:0;transform:translateY(20px)} 100%{opacity:1;transform:none} }
        .hero-badge { animation: badge-pop 0.6s cubic-bezier(.22,1,.36,1) 0.1s both; }
        .hero-h1 { animation: hero-in 0.7s cubic-bezier(.22,1,.36,1) 0.25s both; }
        .hero-sub { animation: hero-in 0.7s cubic-bezier(.22,1,.36,1) 0.38s both; }
        .hero-search { animation: hero-in 0.7s cubic-bezier(.22,1,.36,1) 0.5s both; }
        .hero-match { animation: hero-in 0.7s cubic-bezier(.22,1,.36,1) 0.6s both; }

        /* ── Floating orb ── */
        @keyframes float-orb { 0%,100%{transform:translateY(0) translateX(-50%)} 50%{transform:translateY(-18px) translateX(-50%)} }

        /* ── Card interactions ── */
        .glass-card {
          background: rgba(15,15,30,0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.11);
          border-radius: 20px;
          transition: border-color 0.25s, box-shadow 0.25s, transform 0.25s;
        }
        .glass-card:hover {
          border-color: rgba(212,175,55,0.2);
          box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(212,175,55,0.06);
          transform: translateY(-2px);
        }
        .how-card {
          position: relative;
          transition: transform 0.25s;
        }
        .how-card:hover { transform: translateY(-4px); }

        /* ── Group button ── */
        .group-btn {
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          padding: 18px 8px; border-radius: 18px; cursor: pointer;
          background: #111120;
          border: 1px solid rgba(255,255,255,0.11);
          transition: all 0.22s cubic-bezier(.22,1,.36,1);
          position: relative; overflow: hidden;
        }
        .group-btn::after {
          content: ''; position: absolute; inset: 0; border-radius: 18px;
          opacity: 0; transition: opacity 0.22s;
          background: radial-gradient(circle at center, rgba(212,175,55,0.12) 0%, transparent 70%);
        }
        .group-btn:hover { border-color: rgba(212,175,55,0.25); transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
        .group-btn:hover::after { opacity: 1; }
        .group-btn.active { background: rgba(212,175,55,0.1); border-color: rgba(212,175,55,0.4); box-shadow: 0 0 24px rgba(212,175,55,0.08); }
        .group-btn.active::after { opacity: 1; }
        .group-btn .group-icon { transition: transform 0.22s; }
        .group-btn:hover .group-icon { transform: scale(1.15); }

        /* ── CTA Button ── */
        .btn-gold {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 13px 28px; border-radius: 14px; font-size: 14px; font-weight: 700;
          background: linear-gradient(135deg, #D4AF37 0%, #B8960C 100%);
          color: #09090F; text-decoration: none;
          transition: filter 0.2s, transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(212,175,55,0.25);
        }
        .btn-gold:hover { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 8px 28px rgba(212,175,55,0.35); }
        .btn-ghost {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 13px 28px; border-radius: 14px; font-size: 14px; font-weight: 600;
          background: #161628; border: 1px solid rgba(255,255,255,0.12);
          color: #F0EAFF; text-decoration: none;
          transition: background 0.2s, border-color 0.2s, transform 0.2s;
        }
        .btn-ghost:hover { background: rgba(255,255,255,0.09); border-color: rgba(255,255,255,0.2); transform: translateY(-1px); }
        .btn-sm-gold {
          display: inline-flex; align-items: center;
          padding: 9px 20px; border-radius: 12px; font-size: 13px; font-weight: 700;
          background: linear-gradient(135deg, #D4AF37 0%, #B8960C 100%);
          color: #09090F; text-decoration: none;
          transition: filter 0.2s, transform 0.2s;
        }
        .btn-sm-gold:hover { filter: brightness(1.1); transform: translateY(-1px); }

        /* ── Score card glow ── */
        @keyframes score-glow { 0%,100%{box-shadow:0 0 40px rgba(57,255,20,0.08)} 50%{box-shadow:0 0 80px rgba(57,255,20,0.16)} }
        .score-card { animation: score-glow 3s ease-in-out infinite; }

        /* ── Spark badge ── */
        .spark-badge {
          padding: 7px 14px; border-radius: 999px;
          background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.18);
          font-size: 12px; color: #F0EAFF; display: inline-flex; gap: 5px; align-items: center;
          transition: background 0.2s, border-color 0.2s, transform 0.2s;
        }
        .spark-badge:hover { background: rgba(212,175,55,0.16); border-color: rgba(212,175,55,0.35); transform: scale(1.04); }

        /* ── Section label ── */
        .section-label { font-size: 11px; font-weight: 700; letter-spacing: 2.5px; color: #D4AF37; text-transform: uppercase; margin-bottom: 10px; }

        /* ── Responsive ── */
        @media (max-width: 900px) { .groups-grid { grid-template-columns: repeat(4, 1fr); } }
        @media (max-width: 768px) {
          .nav-links { display: none; }
          .mobile-menu-btn { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; cursor: pointer; color: #F0EAFF; font-size: 18px; }
          .mobile-menu.open { display: flex; flex-direction: column; gap: 4px; position: fixed; top: 60px; left: 0; right: 0; z-index: 49; background: rgba(8,8,16,0.98); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.10); padding: 16px; max-height: calc(100vh - 70px); overflow-y: auto; }
          .mobile-menu a { padding: 12px 16px; border-radius: 12px; font-size: 15px; color: #A99ECC; }
          .providers-grid { grid-template-columns: 1fr; }
          .features-grid { grid-template-columns: 1fr; }
          .how-grid { grid-template-columns: 1fr; gap: 24px; }
          .groups-grid { grid-template-columns: repeat(3, 1fr); gap: 8px; }
          .score-grid { grid-template-columns: 1fr; gap: 32px; }
        }
        @media (max-width: 480px) {
          .providers-grid { grid-template-columns: 1fr; }
          .groups-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', background: 'rgba(8,8,16,0.85)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none', letterSpacing: '-0.3px' }}>BESTIE</Link>
        <div className="nav-links">
          <Link href="/browse" className="nav-link">Browse</Link>
          <Link href="/crews" className="nav-link">Crews</Link>
<Link href="/pulse" className="nav-link">Pulse</Link>
          <Link href="/graph" className="nav-link">Graph</Link>
          <Link href="#plans" className="nav-link">Plans</Link>
          <Link href="#how-it-works" className="nav-link">How It Works</Link>
          <Link href="#score" className="nav-link">Bestie Score</Link>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Desktop: full buttons. Mobile: only Join Free for logged-out */}
          {loggedIn ? (
            <Link href="/dashboard" className="btn-gold" style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '10px' }}>Dashboard →</Link>
          ) : (
            <>
              <Link href="/login" className="desktop-nav-cta" style={{ fontSize: '14px', color: '#A99ECC', textDecoration: 'none' }}>Log in</Link>
              <Link href="/signup" className="btn-gold" style={{ padding: '8px 18px', borderRadius: '10px', fontSize: '13px' }}>Join Free</Link>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', paddingTop: '130px', paddingBottom: '60px', paddingLeft: '20px', paddingRight: '20px', overflow: 'hidden', minHeight: '660px' }}>

        {/* Background orbs (kept, behave as gentle accent atop video) */}
        <div style={{ position: 'absolute', top: '-60px', left: '50%', width: '700px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, #D4AF37 0%, transparent 65%)', opacity: 0.07, pointerEvents: 'none', animation: 'glow-breathe 5s ease-in-out infinite', transform: 'translateX(-50%)', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: '100px', left: '20%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, #A99ECC 0%, transparent 70%)', opacity: 0.04, pointerEvents: 'none', animation: 'glow-breathe-2 7s ease-in-out infinite', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: '80px', right: '15%', width: '260px', height: '260px', borderRadius: '50%', background: 'radial-gradient(circle, #34D399 0%, transparent 70%)', opacity: 0.03, pointerEvents: 'none', animation: 'glow-breathe-2 6s ease-in-out 1s infinite', zIndex: 0 }} />

        <div style={{ maxWidth: '820px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          {/* Live badge */}
          <div className="hero-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '7px 16px', borderRadius: '999px', marginBottom: '28px', fontSize: '13px', fontWeight: 600, background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.22)', color: '#D4AF37' }}>
            <span style={{ color: '#34D399', fontSize: '8px', animation: 'glow-breathe 2s ease-in-out infinite' }}>●</span>
            Your social passport — live worldwide
          </div>

          {/* Headline */}
          <h1 className="hero-h1" style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(38px, 8.5vw, 78px)', fontWeight: 700, color: '#F0EAFF', lineHeight: 1.05, marginBottom: '22px', letterSpacing: '-1px' }}>
            Real people.<br /><em style={{ color: '#D4AF37', fontStyle: 'italic' }}>Real moments.</em>
          </h1>

          {/* Subtitle */}
          <p className="hero-sub" style={{ fontSize: 'clamp(15px, 2vw, 17px)', color: '#A99ECC', marginBottom: '36px', maxWidth: '460px', margin: '0 auto 36px', lineHeight: 1.65 }}>
            Find a Bestie for any activity. Verified profiles. Bestie Score. No awkwardness.
          </p>

          {/* Search bar */}
          <div className="hero-search" style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '540px', margin: '0 auto 14px', padding: '7px', background: 'rgba(15,15,30,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', backdropFilter: 'blur(12px)', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
            <span style={{ paddingLeft: '10px', flexShrink: 0, display: 'flex', alignItems: 'center' }}><Search size={17} color="#A99ECC" strokeWidth={2} /></span>
            <input
              type="text"
              placeholder="Search by name, activity, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: '#F0EAFF', padding: '8px 0' }}
            />
            <Link href={`/browse${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ''}`} className="btn-sm-gold">Find</Link>
          </div>

          {/* Smart match */}
          <button
            className="hero-match"
            onClick={() => setShowMatchModal(true)}
            style={{ fontSize: '13px', color: '#A99ECC', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(155,147,192,0.4)', textUnderlineOffset: '4px', transition: 'color 0.2s' }}
            onMouseEnter={e => e.target.style.color = '#D4AF37'}
            onMouseLeave={e => e.target.style.color = '#A99ECC'}
          >
            ✨ Try Smart Match — let us find your Bestie
          </button>
        </div>
      </section>

      {/* ── ACTIVITY GROUPS ── */}
      <section style={{ padding: '0 20px 56px', overflow: 'hidden' }}>
        <div ref={groupsRef} className={`reveal ${groupsVisible ? 'visible' : ''}`} style={{ maxWidth: '1100px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          <p className="section-label" style={{ textAlign: 'center' }}>FIND BY VIBE</p>
          <div className="groups-grid">
            {ACTIVITY_GROUPS.map(group => {
              const active = activeGroup?.id === group.id
              return (
                <button
                  key={group.id}
                  className={`group-btn ${active ? 'active' : ''}`}
                  onClick={() => handleGroupClick(group)}
                >
                  <span className="group-icon"><group.Icon size={22} color={active ? '#D4AF37' : '#A99ECC'} strokeWidth={1.8} /></span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: active ? '#D4AF37' : '#A99ECC', textAlign: 'center', lineHeight: 1.3 }}>{group.label}</span>
                </button>
              )
            })}
          </div>

          {activeGroup && (
            <div style={{ marginTop: '36px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', color: '#F0EAFF', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <activeGroup.Icon size={20} color="#D4AF37" strokeWidth={1.8} />
                  {activeGroup.label}
                </h2>
                <Link href="/browse" style={{ fontSize: '13px', color: '#D4AF37', textDecoration: 'none', transition: 'opacity 0.2s' }} onMouseEnter={e=>e.target.style.opacity='.7'} onMouseLeave={e=>e.target.style.opacity='1'}>See all →</Link>
              </div>
              {groupLoading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{ height: '380px', borderRadius: '20px', background: 'linear-gradient(90deg, #111120 25%, #141424 50%, #111120 75%)', backgroundSize: '400px 100%', animation: 'shimmer 1.5s infinite' }} />
                  ))}
                </div>
              ) : groupProviders.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {groupProviders.map(p => <ProviderCard key={p.id} provider={p} />)}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '48px', background: 'rgba(15,15,30,0.7)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.10)', backdropFilter: 'blur(12px)' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(212,175,55,0.10)', border: '1px solid rgba(212,175,55,0.18)', marginBottom: '14px' }}>
                    <Search size={24} color="#D4AF37" strokeWidth={1.6} />
                  </div>
                  <p style={{ fontSize: '14px', color: '#A99ECC', marginBottom: '18px' }}>No Besties for this vibe yet</p>
                  <Link href="/signup" className="btn-sm-gold">Be the first →</Link>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── TOP BESTIES ── */}
      <section style={{ padding: '0 20px 72px', overflow: 'hidden' }}>
        <div ref={leaderRef} className={`reveal ${leaderVisible ? 'visible' : ''}`} style={{ maxWidth: '1100px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '28px' }}>
            <div>
              <p className="section-label">LEADERBOARD</p>
              <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 700, color: '#F0EAFF' }}>Top Besties</h2>
            </div>
            <Link href="/browse" style={{ fontSize: '13px', color: '#A99ECC', textDecoration: 'none', marginBottom: '2px', transition: 'color 0.2s' }} onMouseEnter={e=>e.target.style.color='#D4AF37'} onMouseLeave={e=>e.target.style.color='#A99ECC'}>See all →</Link>
          </div>
          {topProviders.length > 0 ? (
            <>
              <div className="providers-grid">
                {topProviders.map((provider, i) => {
                  const badge = i === 0
                    ? { label: '👑 #1 Top Bestie', bg: 'linear-gradient(135deg, #D4AF37, #B8960C)', color: '#09090F', border: 'none' }
                    : i === 1
                    ? { label: '🥈 #2', bg: 'rgba(155,147,192,0.2)', color: '#A99ECC', border: '1px solid rgba(155,147,192,0.3)' }
                    : i === 2
                    ? { label: '🥉 #3', bg: 'rgba(180,100,40,0.2)', color: '#CD7F32', border: '1px solid rgba(180,100,40,0.3)' }
                    : { label: `#${i + 1}`, bg: '#131323', color: '#A99ECC', border: '1px solid rgba(255,255,255,0.12)' }
                  return (
                    <div key={provider.id} style={{ position: 'relative', paddingTop: '16px', width: '100%', boxSizing: 'border-box' }}>
                      <div style={{ position: 'absolute', top: '0', left: '50%', transform: 'translateX(-50%)', zIndex: 10, background: badge.bg, border: badge.border, borderRadius: '999px', padding: '4px 14px', fontSize: '11px', fontWeight: 700, color: badge.color, whiteSpace: 'nowrap', maxWidth: 'calc(100% - 24px)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {badge.label}
                      </div>
                      <ProviderCard provider={provider} featured={i === 0} />
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '32px' }}>
                <Link href="/browse" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 28px', borderRadius: '14px', fontSize: '15px', fontWeight: 700, background: 'rgba(212,175,55,0.10)', border: '1px solid rgba(212,175,55,0.35)', color: '#D4AF37', textDecoration: 'none', transition: 'all 0.2s' }} onMouseEnter={e=>{e.currentTarget.style.background='rgba(212,175,55,0.18)'; e.currentTarget.style.borderColor='rgba(212,175,55,0.6)'}} onMouseLeave={e=>{e.currentTarget.style.background='rgba(212,175,55,0.10)'; e.currentTarget.style.borderColor='rgba(212,175,55,0.35)'}}>
                  See more Besties →
                </Link>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px', background: 'rgba(15,15,30,0.7)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.10)', backdropFilter: 'blur(12px)' }}>
              <p style={{ fontSize: '14px', color: '#A99ECC', marginBottom: '18px' }}>Be the first to build your Bestie Score</p>
              <Link href="/signup" className="btn-sm-gold">Join Free →</Link>
            </div>
          )}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" style={{ padding: '72px 20px' }}>
        <div ref={howRef} className={`reveal ${howVisible ? 'visible' : ''}`} style={{ maxWidth: '980px', margin: '0 auto' }}>
          {/* Glassmorphism container */}
          <div style={{ borderRadius: '28px', background: 'rgba(15,15,30,0.6)', border: '1px solid rgba(255,255,255,0.11)', padding: '52px 44px', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 24px 80px rgba(0,0,0,0.35)' }}>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <p className="section-label">HOW IT WORKS</p>
              <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(24px, 5vw, 42px)', fontWeight: 700, color: '#F0EAFF', marginBottom: '12px', lineHeight: 1.15 }}>
                From stranger to Bestie<br />in four steps.
              </h2>
              <p style={{ fontSize: '15px', color: '#A99ECC' }}>Built for real human connection — not followers, not likes.</p>
            </div>
            <div className="how-grid">
              {[
                { num: '01', Icon: Contact,    title: 'Build your Social Passport', desc: 'Add your bio, photo, city, activities, and set your weekly availability. Take the Bestie Type quiz — your energy, mind, and vibe type appear on your passport and power the compatibility engine.' },
                { num: '02', Icon: Search,    title: 'Discover your people', desc: 'Browse with type compatibility, explore the Nearby Map, check City Pulse for who\'s free today, or send a Knock to someone interesting — an anonymous signal that only reveals your identity on a mutual match.' },
                { num: '03', Icon: UserCheck, title: 'Meet IRL', desc: 'Book a 1-on-1 session, join a Group Session hosted by someone in your city, or flip "I\'m free today" on Pulse for spontaneous meetups. Show up — that\'s all it takes.' },
                { num: '04', Icon: Camera,    title: 'Build your story', desc: 'Both sides confirm the session and rate each other. Record a memory — mood, note, photo. Give Sparks. Your streak grows, badges unlock, your passport becomes proof of a life well lived.' },
              ].map((step, idx) => (
                <div key={step.num} className={`how-card reveal-delay-${idx + 1}`}>
                  <div style={{ fontSize: '52px', fontWeight: 800, color: 'rgba(212,175,55,0.08)', fontFamily: 'DM Serif Display, serif', lineHeight: 1, marginBottom: '-8px' }}>{step.num}</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.15)', margin: '10px 0 14px' }}>
                    <step.Icon size={22} color="#D4AF37" strokeWidth={1.6} />
                  </div>
                  <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '17px', fontWeight: 700, color: '#F0EAFF', marginBottom: '10px' }}>{step.title}</h3>
                  <p style={{ fontSize: '13px', color: '#A99ECC', lineHeight: 1.75 }}>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding: '0 20px 72px' }}>
        <div ref={featRef} className={`reveal ${featVisible ? 'visible' : ''}`} style={{ maxWidth: '980px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '44px' }}>
            <p className="section-label">WHAT'S INSIDE</p>
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(22px, 4vw, 38px)', fontWeight: 700, color: '#F0EAFF' }}>A full world for real-life connection</h2>
          </div>
          <div className="features-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="glass-card" style={{ padding: '22px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.12)', marginBottom: '14px' }}>
                  <f.Icon size={20} color="#D4AF37" strokeWidth={1.6} />
                </div>
                <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '16px', fontWeight: 700, color: '#F0EAFF', marginBottom: '7px' }}>{f.title}</h3>
                <p style={{ fontSize: '13px', color: '#A99ECC', lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONNECTION GRAPH ── */}
      <section id="graph" style={{ padding: '0 20px 80px' }}>
        <div ref={graphRef} className={`reveal ${graphVisible ? 'visible' : ''}`} style={{ maxWidth: '980px', margin: '0 auto' }}>
          <div style={{ borderRadius: '28px', background: 'rgba(15,15,30,0.6)', border: '1px solid rgba(155,147,192,0.12)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', alignItems: 'center' }}>

              {/* Left: SVG graph mockup */}
              <div style={{ padding: '40px 32px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(8,8,16,0.5)', minHeight: '360px', position: 'relative' }}>
                {/* Ambient glow behind graph */}
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(155,147,192,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <svg viewBox="0 0 340 300" style={{ width: '100%', maxWidth: '340px', height: 'auto', position: 'relative', zIndex: 1 }}>
                  <defs>
                    <radialGradient id="nodeGold" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="nodePurple" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#A99ECC" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#A99ECC" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="nodeGreen" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#34D399" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#34D399" stopOpacity="0" />
                    </radialGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <style>{`
                      @keyframes edge-draw { from { stroke-dashoffset: 200 } to { stroke-dashoffset: 0 } }
                      @keyframes node-pop { 0%{transform:scale(0)} 70%{transform:scale(1.1)} 100%{transform:scale(1)} }
                      @keyframes pulse-ring { 0%,100%{r:18px;opacity:0.3} 50%{r:22px;opacity:0} }
                      .edge { stroke-dasharray: 200; animation: edge-draw 1.2s ease forwards; }
                      .e1{animation-delay:0.1s} .e2{animation-delay:0.3s} .e3{animation-delay:0.5s}
                      .e4{animation-delay:0.7s} .e5{animation-delay:0.9s} .e6{animation-delay:1.1s}
                      .e7{animation-delay:1.3s} .e8{animation-delay:1.5s}
                      .node-g { transform-origin: center center; }
                    `}</style>
                  </defs>

                  {/* Edges — drawn in animation order */}
                  <line className="edge e1" x1="170" y1="100" x2="90"  y2="60"  stroke="#D4AF37" strokeWidth="1.5" strokeOpacity="0.5" />
                  <line className="edge e2" x1="170" y1="100" x2="260" y2="70"  stroke="#D4AF37" strokeWidth="1.5" strokeOpacity="0.5" />
                  <line className="edge e3" x1="170" y1="100" x2="110" y2="185" stroke="#A99ECC" strokeWidth="1.2" strokeOpacity="0.4" />
                  <line className="edge e4" x1="170" y1="100" x2="240" y2="190" stroke="#A99ECC" strokeWidth="1.2" strokeOpacity="0.4" />
                  <line className="edge e5" x1="90"  y1="60"  x2="260" y2="70"  stroke="#D4AF37" strokeWidth="1"   strokeOpacity="0.25" />
                  <line className="edge e6" x1="110" y1="185" x2="55"  y2="240" stroke="#A99ECC" strokeWidth="1"   strokeOpacity="0.3" />
                  <line className="edge e7" x1="240" y1="190" x2="300" y2="245" stroke="#A99ECC" strokeWidth="1"   strokeOpacity="0.3" />
                  <line className="edge e8" x1="110" y1="185" x2="240" y2="190" stroke="#A99ECC" strokeWidth="1"   strokeOpacity="0.2" />

                  {/* Center node — YOU (gold) */}
                  <circle cx="170" cy="100" r="26" fill="url(#nodeGold)" />
                  <circle cx="170" cy="100" r="18" fill="#1A1A35" stroke="#D4AF37" strokeWidth="2" filter="url(#glow)" />
                  <text x="170" y="105" textAnchor="middle" fontSize="11" fontWeight="700" fill="#D4AF37" fontFamily="Plus Jakarta Sans, sans-serif">YOU</text>

                  {/* Top-left node */}
                  <circle cx="90" cy="60" r="20" fill="url(#nodePurple)" />
                  <circle cx="90" cy="60" r="14" fill="#1A1A35" stroke="#A99ECC" strokeWidth="1.5" />
                  <text x="90" y="64" textAnchor="middle" fontSize="10" fontWeight="600" fill="#F0EAFF" fontFamily="Plus Jakarta Sans, sans-serif">Alex</text>

                  {/* Top-right node */}
                  <circle cx="260" cy="70" r="20" fill="url(#nodePurple)" />
                  <circle cx="260" cy="70" r="14" fill="#1A1A35" stroke="#A99ECC" strokeWidth="1.5" />
                  <text x="260" y="74" textAnchor="middle" fontSize="10" fontWeight="600" fill="#F0EAFF" fontFamily="Plus Jakarta Sans, sans-serif">Mila</text>

                  {/* Bottom-left node */}
                  <circle cx="110" cy="185" r="18" fill="url(#nodePurple)" />
                  <circle cx="110" cy="185" r="12" fill="#1A1A35" stroke="#A99ECC" strokeWidth="1.5" />
                  <text x="110" y="189" textAnchor="middle" fontSize="9" fontWeight="600" fill="#F0EAFF" fontFamily="Plus Jakarta Sans, sans-serif">Dan</text>

                  {/* Bottom-right node */}
                  <circle cx="240" cy="190" r="18" fill="url(#nodePurple)" />
                  <circle cx="240" cy="190" r="12" fill="#1A1A35" stroke="#A99ECC" strokeWidth="1.5" />
                  <text x="240" y="194" textAnchor="middle" fontSize="9" fontWeight="600" fill="#F0EAFF" fontFamily="Plus Jakarta Sans, sans-serif">Kate</text>

                  {/* 2nd-degree nodes (smaller, green tint) */}
                  <circle cx="55"  cy="240" r="10" fill="#1A1A35" stroke="rgba(57,255,20,0.4)" strokeWidth="1" />
                  <text x="55"  y="244" textAnchor="middle" fontSize="8" fill="#A99ECC" fontFamily="Plus Jakarta Sans, sans-serif">Lev</text>

                  <circle cx="300" cy="245" r="10" fill="#1A1A35" stroke="rgba(57,255,20,0.4)" strokeWidth="1" />
                  <text x="300" y="249" textAnchor="middle" fontSize="8" fill="#A99ECC" fontFamily="Plus Jakarta Sans, sans-serif">Sam</text>

                  {/* Labels */}
                  <text x="130" y="130" fontSize="9" fill="#D4AF37" fontFamily="Plus Jakarta Sans, sans-serif" opacity="0.7">✓ 3 sessions</text>
                  <text x="170" y="145" fontSize="9" fill="#D4AF37" fontFamily="Plus Jakarta Sans, sans-serif" opacity="0.5">✓ 1 session</text>

                  {/* "2nd degree" hint */}
                  <text x="30"  y="262" fontSize="8" fill="#6B6490" fontFamily="Plus Jakarta Sans, sans-serif">2nd degree</text>
                  <text x="268" y="262" fontSize="8" fill="#6B6490" fontFamily="Plus Jakarta Sans, sans-serif">2nd degree</text>
                </svg>
              </div>

              {/* Right: explanation (compact) */}
              <div style={{ padding: '32px 28px' }}>
                <p className="section-label">CONNECTION GRAPH</p>
                <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 700, color: '#F0EAFF', lineHeight: 1.2, marginBottom: '12px' }}>
                  Your social web,<br /><em style={{ color: '#A99ECC', fontStyle: 'italic' }}>built automatically.</em>
                </h2>
                <p style={{ fontSize: '14px', color: '#A99ECC', lineHeight: 1.7, marginBottom: '20px' }}>
                  Every confirmed session draws a line between two people. No followers, no tags — only real IRL connections. Thicker edge = more sessions.
                </p>
                <Link href="/graph" className="btn-gold" style={{ fontSize: '13px', padding: '10px 22px' }}>Open Connection Graph →</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CREWS ── */}
      <section style={{ padding: '0 20px 72px' }}>
        <div ref={crewsRef} className={`reveal ${crewsVisible ? 'visible' : ''}`} style={{ maxWidth: '980px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '44px' }}>
            <p className="section-label">CREWS</p>
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(22px, 4vw, 38px)', fontWeight: 700, color: '#F0EAFF', marginBottom: '14px' }}>Your people. Your group.</h2>
            <p style={{ fontSize: '15px', color: '#A99ECC', maxWidth: '500px', margin: '0 auto', lineHeight: 1.7 }}>
              A Crew is a group of Besties who regularly show up for each other. Create one, invite friends, run events — or join an existing one.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '36px' }}>
            {[
              { Icon: Target,      title: 'Create or join',    desc: 'Public crews are open to anyone. Private crews require a request or a captain\'s invite link — it bypasses the queue instantly.' },
              { Icon: CalendarDays,title: 'Run crew events',   desc: 'Captains post events visible to all members. New events show up as notifications on your dashboard.' },
              { Icon: Star,        title: 'Crew Rating',       desc: 'Members rate their crew 1–5 stars. The average is shown on the crew card. Highly-rated crews rank higher in the public listings.' },
              { Icon: Trophy,      title: 'Crew leaderboard',  desc: 'Crews are ranked by rating and size. A great vibe, active events, and happy members push your crew up the charts.' },
            ].map(f => (
              <div key={f.title} className="glass-card" style={{ padding: '22px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.12)', marginBottom: '14px' }}>
                  <f.Icon size={20} color="#D4AF37" strokeWidth={1.6} />
                </div>
                <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '16px', fontWeight: 700, color: '#F0EAFF', marginBottom: '7px' }}>{f.title}</h3>
                <p style={{ fontSize: '13px', color: '#A99ECC', lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center' }}>
            <Link href="/crews" className="btn-gold">Explore Crews →</Link>
          </div>
        </div>
      </section>

      {/* ── AI SWARM + PLANS ── */}
      <section id="plans" style={{ padding: '0 20px 80px' }}>
        <div ref={plansRef} className={`reveal ${plansVisible ? 'visible' : ''}`} style={{ maxWidth: '1040px', margin: '0 auto' }}>

          {/* Intro: the problem AI Swarm solves */}
          <div style={{ borderRadius: '28px', background: 'linear-gradient(135deg, rgba(155,127,255,0.10) 0%, rgba(123,95,229,0.04) 100%)', border: '1px solid rgba(155,127,255,0.22)', padding: '44px 36px', marginBottom: '40px', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2.5px', color: '#9B7FFF', textTransform: 'uppercase', marginBottom: '12px' }}>AI SWARM FOR CREWS</p>
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: 700, color: '#F0EAFF', marginBottom: '16px', lineHeight: 1.15 }}>
              Your community's <em style={{ color: '#9B7FFF', fontStyle: 'italic' }}>collective brain.</em>
            </h2>
            <p style={{ fontSize: '15px', color: '#A99ECC', maxWidth: '620px', margin: '0 auto 28px', lineHeight: 1.75 }}>
              In big groups the right person is always there — you just can't find them. Each member connects their AI agent and describes what they do. Ask the swarm for anything — <em>“who can help me launch a podcast?”</em> — and it instantly finds your best matches inside the crew.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', textAlign: 'left' }}>
              {[
                { Icon: Search,  title: 'Find anyone instantly', desc: 'No more scrolling member lists or asking in chat. Describe the need — the swarm surfaces the right people.' },
                { Icon: Network, title: 'Two-sided matches',     desc: 'When the swarm picks someone, they get notified too. Connections happen both ways, not one cold DM.' },
                { Icon: Sparkles,title: 'It works for you',       desc: 'A shared board of needs & offers plus weekly auto-suggestions — the swarm connects people on its own.' },
              ].map(b => (
                <div key={b.title} style={{ padding: '18px', borderRadius: '16px', background: 'rgba(15,15,30,0.5)', border: '1px solid rgba(155,127,255,0.14)' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(155,127,255,0.12)', border: '1px solid rgba(155,127,255,0.2)', marginBottom: '12px' }}>
                    <b.Icon size={19} color="#9B7FFF" strokeWidth={1.7} />
                  </div>
                  <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '15px', fontWeight: 700, color: '#F0EAFF', marginBottom: '6px' }}>{b.title}</h3>
                  <p style={{ fontSize: '12.5px', color: '#A99ECC', lineHeight: 1.6 }}>{b.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing tiers */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <p className="section-label">PLANS</p>
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 700, color: '#F0EAFF', marginBottom: '10px' }}>Pick your crew's size</h2>
            <p style={{ fontSize: '14px', color: '#A99ECC' }}>Start free. Unlock the AI Swarm as your community grows.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px', alignItems: 'stretch' }}>
            {[
              {
                name: 'Free', price: '$0', period: '', accent: '#A99ECC', highlight: false,
                tagline: 'For small circles getting started.',
                features: ['Up to 10 members', 'Crew events & ratings', 'Crew leaderboard', 'AI Swarm not included'],
                solves: 'Perfect to gather your first friends in one place.',
              },
              {
                name: 'Community', price: '$49', period: '/mo', accent: '#9B7FFF', highlight: true,
                tagline: 'For active communities that collaborate.',
                features: ['Up to 50 members', 'Full AI Swarm access', 'Shared needs & offers board', 'Weekly auto-matching', 'Connect your own AI key'],
                solves: 'Turns a group chat into a real network where people find and help each other.',
              },
              {
                name: 'Pro', price: '$149', period: '/mo', accent: '#D4AF37', highlight: false,
                tagline: 'For large, serious communities.',
                features: ['Up to 200 members', 'Everything in Community', 'Priority swarm matching', 'Advanced agent insights'],
                solves: 'Scales matchmaking across hundreds of people without losing the personal touch.',
              },
            ].map(plan => (
              <div key={plan.name} style={{
                position: 'relative', display: 'flex', flexDirection: 'column',
                padding: '28px 24px', borderRadius: '22px',
                background: plan.highlight ? 'linear-gradient(160deg, rgba(155,127,255,0.12) 0%, rgba(15,15,30,0.8) 60%)' : 'rgba(15,15,30,0.7)',
                border: plan.highlight ? '1.5px solid rgba(155,127,255,0.45)' : '1px solid rgba(255,255,255,0.10)',
                boxShadow: plan.highlight ? '0 16px 50px rgba(155,127,255,0.18)' : '0 8px 32px rgba(0,0,0,0.3)',
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
              }}>
                {plan.highlight && (
                  <span style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', padding: '4px 14px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', background: 'linear-gradient(135deg, #9B7FFF, #7B5FE5)', color: '#fff', whiteSpace: 'nowrap' }}>
                    MOST POPULAR
                  </span>
                )}
                <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: plan.accent, marginBottom: '4px' }}>{plan.name}</h3>
                <p style={{ fontSize: '12.5px', color: '#A99ECC', marginBottom: '14px', lineHeight: 1.5, minHeight: '36px' }}>{plan.tagline}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '18px' }}>
                  <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: '40px', fontWeight: 700, color: '#F0EAFF', lineHeight: 1 }}>{plan.price}</span>
                  <span style={{ fontSize: '14px', color: '#A99ECC' }}>{plan.period}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '18px', flex: 1 }}>
                  {plan.features.map(f => {
                    const off = f.includes('not included')
                    return (
                      <div key={f} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '13px', color: off ? '#6B6490' : '#D6CFEC', lineHeight: 1.5 }}>
                        <span style={{ color: off ? '#6B6490' : plan.accent, flexShrink: 0, fontWeight: 700 }}>{off ? '–' : '✓'}</span>
                        <span style={{ textDecoration: off ? 'line-through' : 'none' }}>{f}</span>
                      </div>
                    )
                  })}
                </div>
                <p style={{ fontSize: '12px', color: '#8B83A8', fontStyle: 'italic', lineHeight: 1.5, marginBottom: '18px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  {plan.solves}
                </p>
                <Link href="/crews" style={{
                  display: 'block', textAlign: 'center', padding: '12px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, textDecoration: 'none',
                  background: plan.highlight ? 'linear-gradient(135deg, #9B7FFF, #7B5FE5)' : 'rgba(255,255,255,0.06)',
                  color: plan.highlight ? '#fff' : '#F0EAFF',
                  border: plan.highlight ? 'none' : '1px solid rgba(255,255,255,0.12)',
                }}>
                  {plan.name === 'Free' ? 'Start free →' : `Choose ${plan.name} →`}
                </Link>
              </div>
            ))}
          </div>

          <p style={{ textAlign: 'center', fontSize: '12px', color: '#6B6490', marginTop: '20px' }}>
            Only a crew captain can upgrade. Cancel anytime — your crew stays, the swarm pauses.
          </p>

          {/* Personal Bestie Plus */}
          <div style={{ marginTop: '48px', borderRadius: '28px', background: 'linear-gradient(135deg, rgba(155,127,255,0.14) 0%, rgba(124,92,255,0.05) 100%)', border: '1px solid rgba(155,127,255,0.32)', padding: '40px 36px', textAlign: 'center', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2.5px', color: '#9B7FFF', textTransform: 'uppercase', marginBottom: '12px' }}>JUST FOR YOU</p>
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 700, color: '#F0EAFF', marginBottom: '10px', lineHeight: 1.15 }}>
              Bestie <em style={{ color: '#9B7FFF', fontStyle: 'italic' }}>Plus</em> — everything for $8<span style={{ fontSize: '0.5em', color: '#A99ECC' }}>/mo</span>
            </h2>
            <p style={{ fontSize: '14px', color: '#A99ECC', maxWidth: '560px', margin: '0 auto 28px', lineHeight: 1.7 }}>
              A personal upgrade for you — not your crew. One simple plan, cancel anytime.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', textAlign: 'left', marginBottom: '30px' }}>
              {[
                { icon: '🤖', title: 'Premium AI companion', desc: 'Connect your own AI key (Claude, OpenAI or Grok) and chat with no limits.' },
                { icon: '🕸️', title: 'Join the graph',        desc: "Don't just watch the connection web — appear on it and let people find you." },
                { icon: '💰', title: 'Paid sessions',          desc: 'Offer your time and skills for money. Set a price and get booked.' },
              ].map(b => (
                <div key={b.title} style={{ padding: '20px', borderRadius: '16px', background: 'rgba(15,15,30,0.5)', border: '1px solid rgba(155,127,255,0.14)' }}>
                  <div style={{ fontSize: '26px', marginBottom: '10px', lineHeight: 1 }}>{b.icon}</div>
                  <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '15px', fontWeight: 700, color: '#F0EAFF', marginBottom: '6px' }}>{b.title}</h3>
                  <p style={{ fontSize: '12.5px', color: '#A99ECC', lineHeight: 1.6 }}>{b.desc}</p>
                </div>
              ))}
            </div>
            <Link href="/plus" style={{ display: 'inline-block', padding: '14px 32px', borderRadius: '14px', fontSize: '15px', fontWeight: 700, textDecoration: 'none', background: 'linear-gradient(135deg, #9B7FFF, #7C5CFF)', color: '#fff' }}>
              Get Bestie Plus — $8/mo →
            </Link>
          </div>
        </div>
      </section>

      {/* ── BESTIE SCORE ── */}
      <section id="score" style={{ padding: '72px 20px' }}>
        <div ref={scoreRef} className={`reveal ${scoreVisible ? 'visible' : ''}`} style={{ maxWidth: '980px', margin: '0 auto' }}>
          <div className="score-grid">
            {/* Left: explanation */}
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2.5px', color: '#34D399', textTransform: 'uppercase', marginBottom: '16px' }}>THE SOCIAL PASSPORT</p>
              <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(28px, 5vw, 46px)', fontWeight: 700, color: '#F0EAFF', lineHeight: 1.15, marginBottom: '20px' }}>
                Your <em style={{ color: '#D4AF37', fontStyle: 'italic' }}>Bestie Score</em><br />says it all.
              </h2>
              <p style={{ fontSize: '15px', color: '#A99ECC', marginBottom: '24px', lineHeight: 1.75 }}>
                Like a credit score — but for who you are as a person. Built from real sessions, ratings, sparks, and verification.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
                {[
                  { label: '🌱 New Bestie', desc: 'Just joined — under 1 month' },
                  { label: '⭐ Regular', desc: '3+ months, consistent sessions' },
                  { label: '🔥 Veteran', desc: '6+ months, high rating' },
                  { label: '💎 Legend', desc: '1+ year, trusted by many' },
                  { label: '👑 OG Bestie', desc: '2+ years — the real ones' },
                ].map(b => (
                  <div key={b.label} style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '13px', padding: '8px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid #131323' }}>
                    <span style={{ color: '#F0EAFF', fontWeight: 600, minWidth: '120px' }}>{b.label}</span>
                    <span style={{ color: '#A99ECC' }}>{b.desc}</span>
                  </div>
                ))}
              </div>
              <Link href="/score-guide" className="btn-gold">Build your Bestie Score →</Link>
            </div>

            {/* Right: score card */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div className="score-card" style={{ width: '280px', padding: '32px 28px', borderRadius: '28px', textAlign: 'center', background: 'rgba(15,15,30,0.8)', border: '1px solid rgba(57,255,20,0.2)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', color: '#A99ECC', marginBottom: '8px', textTransform: 'uppercase' }}>BESTIE SCORE</p>
                <div style={{ fontSize: '80px', fontWeight: 700, color: '#34D399', fontFamily: 'DM Serif Display, serif', lineHeight: 1, margin: '4px 0 16px', textShadow: '0 0 40px rgba(57,255,20,0.4)' }}>874</div>
                {/* Progress bar */}
                <div style={{ height: '7px', borderRadius: '999px', background: 'rgba(255,255,255,0.10)', marginBottom: '8px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '87.4%', borderRadius: '999px', background: 'linear-gradient(90deg, #34D399 0%, #D4AF37 100%)', boxShadow: '0 0 12px rgba(57,255,20,0.5)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#A99ECC', marginBottom: '24px' }}>
                  <span>0</span>
                  <span style={{ color: '#34D399', fontWeight: 700 }}>Excellent</span>
                  <span>1000</span>
                </div>
                {/* Stats */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.10)', paddingTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {[{ label: 'Sessions', val: '43' }, { label: 'Rating', val: '4.9' }, { label: 'Sparks', val: '127' }].map((s) => (
                    <div key={s.label} style={{ padding: '10px 4px', borderRadius: '12px', background: '#111120' }}>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: '#F0EAFF', marginBottom: '2px' }}>{s.val}</div>
                      <div style={{ fontSize: '10px', color: '#A99ECC', fontWeight: 600, letterSpacing: '0.5px' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SPARKS (compact) ── */}
      <section style={{ padding: '0 20px 56px' }}>
        <div ref={sparksRef} className={`reveal ${sparksVisible ? 'visible' : ''}`} style={{ maxWidth: '740px', margin: '0 auto' }}>
          <div style={{ borderRadius: '24px', background: 'linear-gradient(135deg, rgba(212,175,55,0.07) 0%, rgba(57,255,20,0.03) 100%)', border: '1px solid rgba(212,175,55,0.18)', padding: '28px', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(212,175,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Sparkles size={26} color="#D4AF37" strokeWidth={1.6} />
            </div>
            <div style={{ flex: 1, minWidth: '180px' }}>
              <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(20px, 3.5vw, 26px)', fontWeight: 700, color: '#F0EAFF', marginBottom: '6px' }}>Sparks — rare tokens of trust</h2>
              <p style={{ fontSize: '13px', color: '#A99ECC', lineHeight: 1.6 }}>
                30 Sparks at signup, max 3 per person. The rarest signal of real trust on Bestie.
              </p>
            </div>
            <Link href="/signup" className="btn-sm-gold" style={{ flexShrink: 0 }}>Get yours →</Link>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '0 20px 80px' }}>
        <div style={{ maxWidth: '740px', margin: '0 auto' }}>
          <div style={{ borderRadius: '28px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(212,175,55,0.09) 0%, rgba(57,255,20,0.04) 100%)', border: '1px solid rgba(212,175,55,0.2)', padding: '56px 36px', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', bottom: '-60px', right: '-60px', width: '260px', height: '260px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: 700, color: '#F0EAFF', marginBottom: '14px', lineHeight: 1.15 }}>Ready to meet your Bestie?</h2>
              <p style={{ fontSize: '16px', color: '#A99ECC', marginBottom: '32px' }}>Join people building real connections in their city.</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/signup" className="btn-gold">Become a Bestie →</Link>
                <Link href="/browse" className="btn-ghost">Browse Besties</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid #161628', padding: '32px 24px' }}>
        <div style={{ maxWidth: '980px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37' }}>BESTIE</span>
          <div style={{ display: 'flex', gap: '20px', fontSize: '13px', flexWrap: 'wrap' }}>
            {[
              { href: '/browse', label: 'Browse' }, { href: '/crews', label: 'Crews' },
              { href: '/pulse', label: 'Pulse' }, { href: '#plans', label: 'Plans' }, { href: '#how-it-works', label: 'How It Works' }, { href: '/score-guide', label: 'Bestie Score' }, { href: '/signup', label: 'Join' },
            ].map(l => (
              <Link key={l.label} href={l.href} style={{ color: '#6B6490', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e=>e.target.style.color='#A99ECC'} onMouseLeave={e=>e.target.style.color='#6B6490'}>{l.label}</Link>
            ))}
          </div>
          <p style={{ fontSize: '12px', color: '#4A4268' }}>© 2026 Bestie. Worldwide. 18+</p>
        </div>
      </footer>

      {showMatchModal && <MatchModal onClose={() => setShowMatchModal(false)} />}
    </div>
  )
}
