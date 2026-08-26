// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ProviderCard from '@/components/ProviderCard'
import {
  Contact, Trophy, Flame, CalendarDays, Bell, Users, Map, Globe,
  Camera, Sparkles, ShieldCheck, Search, UserCheck, Network,
} from 'lucide-react'
import { LAUNCH_CITY, CITY_FOCUS } from '@/lib/launchCity'

const FEATURES = [
  { Icon: Contact,      title: 'Social Passport',       desc: 'One page that proves you\'re real, active, and easy to meet.' },
  { Icon: Trophy,      title: 'Bestie Score & Badges', desc: 'Every real meetup makes you more trusted — and more invited.' },
  { Icon: Flame,       title: 'Weekly Streak',         desc: 'Meet someone every week and watch your consistency pay off.' },
  { Icon: CalendarDays,title: 'Availability Calendar', desc: 'People see when you\'re free, so plans actually happen.' },
  { Icon: Bell,        title: 'Knock',                 desc: 'Show interest anonymously — no rejection, no awkward first message.' },
  { Icon: Users,       title: 'Group Sessions',        desc: 'Walk into a room where everyone wants new friends.' },
  { Icon: Map,         title: 'Nearby Map',            desc: 'See who\'s around you right now and up for meeting.' },
  { Icon: Globe,       title: 'City Pulse',            desc: 'Know who\'s free today before you even ask.' },
  { Icon: Network,     title: 'My Circle',             desc: 'Watch your real-life friendships grow into a living map.' },
  { Icon: Camera,      title: 'Session Memories',      desc: 'Keep photos and notes from every meetup in one story.' },
  { Icon: Sparkles,    title: 'Sparks',                desc: 'Rare tokens you give only to people who earned your trust.' },
  { Icon: ShieldCheck, title: 'Block & Report',        desc: 'Only people who\'ve actually met can report — trolls stay out.' },
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
  const [loggedIn, setLoggedIn] = useState(false)
  const [topProviders, setTopProviders] = useState([])
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [hasType, setHasType] = useState(false)

  const [howRef, howVisible] = useReveal()
  const [featRef, featVisible] = useReveal()
  const [scoreRef, scoreVisible] = useReveal()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session)
      // Hide the test promo for people who already took it
      if (session) {
        supabase.from('users').select('bestie_type_completed, eterotype').eq('id', session.user.id).single()
          .then(({ data }) => setHasType(!!(data?.bestie_type_completed || data?.eterotype)))
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setLoggedIn(!!session))

    supabase
      .from('users')
      .select('*, activity_packages(*)')
      .order('bestie_score', { ascending: false })
      .gt('bestie_score', 0)
      .limit(6)
      .then(({ data }) => setTopProviders(data || []))

    // Upcoming events (group sessions + birthdays), merged & sorted by date.
    // The section renders only when there's something real to show.
    const now = new Date().toISOString()
    Promise.all([
      supabase.from('group_sessions')
        .select('id, title, activity_type, scheduled_at, location, host:users!host_id(full_name)')
        .in('status', ['open', 'full']).gte('scheduled_at', now)
        .order('scheduled_at').limit(6),
      supabase.from('birthday_events')
        .select('id, celebrant, title, event_date, location, share_slug')
        .gte('event_date', now).order('event_date').limit(6),
    ]).then(([gs, bd]) => {
      const a = (gs.data || []).map(e => ({ kind: 'session', id: e.id, title: e.title, when: e.scheduled_at, location: e.location, sub: e.host?.full_name ? `by ${e.host.full_name.split(' ')[0]}` : '', href: `/group-sessions/${e.id}` }))
      const b = (bd.data || []).map(e => ({ kind: 'birthday', id: e.id, title: e.title || `${e.celebrant}'s Birthday 🎂`, when: e.event_date, location: e.location, sub: 'Birthday', href: `/birthday/${e.share_slug}` }))
      setUpcomingEvents([...a, ...b].sort((x, y) => new Date(x.when) - new Date(y.when)).slice(0, 6))
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <style>{`
        /* ── Reset ── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── Nav ── */
        .nav-links { display: flex; gap: 28px; font-size: 14px; }
        .nav-link { color: var(--text-muted); text-decoration: none; transition: color 0.2s; }
        .nav-link:hover { color: var(--text-primary); }

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
        .hero-cta { animation: hero-in 0.7s cubic-bezier(.22,1,.36,1) 0.5s both; }

        /* ── Card interactions ── */
        .glass-card {
          background: var(--surface-1);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--border);
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
          background: var(--surface-2); border: 1px solid var(--border);
          color: var(--text-primary); text-decoration: none;
          transition: background 0.2s, border-color 0.2s, transform 0.2s;
        }
        .btn-ghost:hover { background: rgba(255,255,255,0.09); border-color: var(--border-strong); transform: translateY(-1px); }
        .btn-sm-gold {
          display: inline-flex; align-items: center;
          padding: 9px 20px; border-radius: 12px; font-size: 13px; font-weight: 700;
          background: linear-gradient(135deg, #D4AF37 0%, #B8960C 100%);
          color: #09090F; text-decoration: none;
          transition: filter 0.2s, transform 0.2s;
        }
        .btn-sm-gold:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .quiet-link { font-size: 13px; color: var(--text-muted); text-decoration: underline; text-decoration-color: rgba(155,147,192,0.4); text-underline-offset: 4px; transition: color 0.2s; }
        .quiet-link:hover { color: #D4AF37; }

        /* ── Score card glow ── */
        @keyframes score-glow { 0%,100%{box-shadow:0 0 40px rgba(52,211,153,0.08)} 50%{box-shadow:0 0 80px rgba(52,211,153,0.16)} }
        .score-card { animation: score-glow 3s ease-in-out infinite; }

        /* ── Section label ── */
        .section-label { font-size: 11px; font-weight: 700; letter-spacing: 2.5px; color: #D4AF37; text-transform: uppercase; margin-bottom: 10px; }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .nav-links { display: none; }
          .providers-grid { grid-template-columns: 1fr; }
          .features-grid { grid-template-columns: 1fr; }
          .how-grid { grid-template-columns: 1fr; gap: 24px; }
          .score-grid { grid-template-columns: 1fr; gap: 32px; }
        }
        @media (max-width: 480px) {
          .providers-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', background: 'var(--nav-bg)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none', letterSpacing: '-0.3px' }}>BESTIE</Link>
        <div className="nav-links">
          <Link href="/browse" className="nav-link">Browse</Link>
          <Link href="/events" className="nav-link">Events</Link>
          <Link href="/crews" className="nav-link">Crews</Link>
          <Link href="/world" className="nav-link" style={{ color: '#D4AF37' }}>World</Link>
          <Link href="/plans" className="nav-link">Plans</Link>
          <Link href="#how-it-works" className="nav-link">How It Works</Link>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* My Circle — always visible, desktop & mobile */}
          <Link href="/graph" aria-label="My Circle" title="My Circle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', color: 'var(--text-muted)', flexShrink: 0 }}>
            <Network size={17} strokeWidth={1.8} />
          </Link>
          {/* Desktop: full buttons. Mobile: only Join Free for logged-out */}
          {loggedIn ? (
            <Link href="/dashboard" className="btn-gold" style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '10px' }}>Dashboard →</Link>
          ) : (
            <>
              <Link href="/login" className="desktop-nav-cta" style={{ fontSize: '14px', color: 'var(--text-muted)', textDecoration: 'none' }}>Log in</Link>
              <Link href="/signup" className="btn-gold" style={{ padding: '8px 18px', borderRadius: '10px', fontSize: '13px' }}>Join Free</Link>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', paddingTop: '130px', paddingBottom: '70px', paddingLeft: '20px', paddingRight: '20px', overflow: 'hidden', minHeight: '600px' }}>

        {/* Background orbs */}
        <div style={{ position: 'absolute', top: '-60px', left: '50%', width: '700px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, #D4AF37 0%, transparent 65%)', opacity: 0.07, pointerEvents: 'none', animation: 'glow-breathe 5s ease-in-out infinite', transform: 'translateX(-50%)', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: '100px', left: '20%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, #A99ECC 0%, transparent 70%)', opacity: 0.04, pointerEvents: 'none', animation: 'glow-breathe-2 7s ease-in-out infinite', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: '80px', right: '15%', width: '260px', height: '260px', borderRadius: '50%', background: 'radial-gradient(circle, #34D399 0%, transparent 70%)', opacity: 0.03, pointerEvents: 'none', animation: 'glow-breathe-2 6s ease-in-out 1s infinite', zIndex: 0 }} />

        <div style={{ maxWidth: '820px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          {/* Founding member badge */}
          <div className="hero-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '7px 16px', borderRadius: '999px', marginBottom: '22px', fontSize: '13px', fontWeight: 600, background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.22)', color: '#D4AF37' }}>
            <span style={{ color: '#34D399', fontSize: '8px', animation: 'glow-breathe 2s ease-in-out infinite' }}>●</span>
            {CITY_FOCUS ? `Founding member spots open in ${LAUNCH_CITY.name}` : 'Founding member spots open'}
          </div>

          {/* Eyebrow tagline */}
          <p className="hero-badge" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2.5px', color: 'rgba(212,175,55,0.7)', textTransform: 'uppercase', marginBottom: '14px' }}>
            Real people. Real moments.
          </p>

          {/* Headline */}
          <h1 className="hero-h1" style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(34px, 7vw, 66px)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.08, marginBottom: '22px', letterSpacing: '-1px' }}>
            Making friends as an adult<br /><em style={{ color: '#D4AF37', fontStyle: 'italic' }}>shouldn't be this hard.</em>
          </h1>

          {/* Subtitle */}
          <p className="hero-sub" style={{ fontSize: 'clamp(15px, 2vw, 17px)', color: 'var(--text-muted)', maxWidth: '540px', margin: '0 auto 36px', lineHeight: 1.65 }}>
            Bestie matches you with people nearby for hikes, coffee, gym, game nights — verified by real meetups, not endless chats.
          </p>

          {/* ONE dominant CTA */}
          <div className="hero-cta">
            <Link href={hasType ? '/dashboard' : '/bestie-type'} className="btn-gold" style={{ padding: '17px 38px', fontSize: '16px', borderRadius: '16px' }}>
              {hasType ? 'Open your passport →' : 'Take the free 5-min test →'}
            </Link>
            {!loggedIn && (
              <div style={{ marginTop: '16px' }}>
                <Link href="/signup" className="quiet-link">or join free</Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" style={{ padding: '0 20px 64px' }}>
        <div ref={howRef} className={`reveal ${howVisible ? 'visible' : ''}`} style={{ maxWidth: '980px', margin: '0 auto' }}>
          {/* Glassmorphism container */}
          <div style={{ borderRadius: '28px', background: 'var(--surface-1)', border: '1px solid var(--border)', padding: '52px 44px', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 24px 80px rgba(0,0,0,0.35)' }}>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <p className="section-label">HOW IT WORKS</p>
              <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(24px, 5vw, 42px)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', lineHeight: 1.15 }}>
                From stranger to friend<br />in four steps.
              </h2>
              <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>Built for real human connection — not followers, not likes.</p>
            </div>
            <div className="how-grid">
              {[
                { num: '01', Icon: Contact,    title: 'Create your passport',  desc: 'Photo, city, favorite activities, and the times you\'re free each week.' },
                { num: '02', Icon: Search,    title: 'Find your people',      desc: 'Browse compatible people nearby, or knock anonymously — names reveal only on a mutual match.' },
                { num: '03', Icon: UserCheck, title: 'Meet in real life',     desc: 'Coffee, a hike, the gym — one-on-one or in a group session.' },
                { num: '04', Icon: Camera,    title: 'Show up again',         desc: 'Both confirm the meetup. Your score grows and real friendships stack up.' },
              ].map((step, idx) => (
                <div key={step.num} className={`how-card reveal-delay-${idx + 1}`}>
                  <div style={{ fontSize: '52px', fontWeight: 800, color: 'rgba(212,175,55,0.08)', fontFamily: 'DM Serif Display, serif', lineHeight: 1, marginBottom: '-8px' }}>{step.num}</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.15)', margin: '10px 0 14px' }}>
                    <step.Icon size={22} color="#D4AF37" strokeWidth={1.6} />
                  </div>
                  <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>{step.title}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.75 }}>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FREE TEST BANNER (public, no signup needed; hidden once taken) ── */}
      {!hasType && (
      <section style={{ padding: '0 20px 64px', overflow: 'hidden' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <Link href="/bestie-type" style={{ display: 'block', textDecoration: 'none', borderRadius: '24px', padding: 'clamp(24px, 4vw, 40px)', background: 'linear-gradient(135deg, rgba(212,175,55,0.10) 0%, rgba(155,127,255,0.08) 100%)', border: '1px solid rgba(212,175,55,0.25)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '220px', height: '220px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '52px', flexShrink: 0 }}>🧭</span>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: '#D4AF37', marginBottom: '6px' }}>FREE · 5 MINUTES · NO SIGNUP</p>
                <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(20px, 4vw, 28px)', color: 'var(--text-primary)', marginBottom: '6px', lineHeight: 1.2 }}>What's your friendship type?</h2>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '540px' }}>28 questions reveal one of 16 types — your eterotype shows who you'll naturally click with.</p>
              </div>
              <span style={{ flexShrink: 0, padding: '14px 26px', borderRadius: '14px', fontSize: '15px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', whiteSpace: 'nowrap' }}>Take the test →</span>
            </div>
          </Link>
        </div>
      </section>
      )}

      {/* ── BESTIE WORLD teaser — the door into the living map ── */}
      <section style={{ padding: '0 20px 64px', overflow: 'hidden' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <Link href="/world" style={{ display: 'block', textDecoration: 'none', borderRadius: '24px', padding: 'clamp(26px, 4vw, 44px)', background: 'radial-gradient(ellipse at 50% 120%, rgba(232,120,60,0.12) 0%, transparent 55%), linear-gradient(to bottom, #071009 0%, #04120B 100%)', border: '1px solid rgba(212,175,55,0.22)', position: 'relative', overflow: 'hidden' }}>
            {/* embers drifting in the dark */}
            <div style={{ position: 'absolute', left: '18%', bottom: '18%', width: '5px', height: '5px', borderRadius: '50%', background: '#FFC46B', boxShadow: '0 0 12px 3px rgba(255,180,90,0.5)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', left: '72%', bottom: '30%', width: '4px', height: '4px', borderRadius: '50%', background: '#FFD9A0', boxShadow: '0 0 10px 2px rgba(255,190,110,0.45)', opacity: 0.8, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', left: '55%', bottom: '60%', width: '3px', height: '3px', borderRadius: '50%', background: '#FFC46B', boxShadow: '0 0 8px 2px rgba(255,180,90,0.4)', opacity: 0.6, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: '-60px', right: '-40px', width: '260px', height: '260px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,150,60,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '48px', flexShrink: 0 }}>🔥</span>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: '#D4AF37', marginBottom: '6px' }}>NEW · A LIVING WORLD</p>
                <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(20px, 4vw, 28px)', color: '#F0EAFF', marginBottom: '6px', lineHeight: 1.2 }}>Step into Bestie World</h2>
                <p style={{ fontSize: '14px', color: '#A99ECC', lineHeight: 1.6, maxWidth: '560px' }}>A map of real crews as campfires — see who's burning tonight, join a fire, or light your own. Burning Man camps have their own city inside.</p>
              </div>
              <span style={{ flexShrink: 0, padding: '14px 26px', borderRadius: '14px', fontSize: '15px', fontWeight: 700, background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.45)', color: '#D4AF37', whiteSpace: 'nowrap' }}>Enter the world →</span>
            </div>
          </Link>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding: '0 20px 64px' }}>
        <div ref={featRef} className={`reveal ${featVisible ? 'visible' : ''}`} style={{ maxWidth: '980px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '44px' }}>
            <p className="section-label">WHAT'S INSIDE</p>
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(22px, 4vw, 38px)', fontWeight: 700, color: 'var(--text-primary)' }}>Everything you need to actually meet people</h2>
          </div>
          <div className="features-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="glass-card" style={{ padding: '22px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.12)', marginBottom: '14px' }}>
                  <f.Icon size={20} color="#D4AF37" strokeWidth={1.6} />
                </div>
                <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '7px' }}>{f.title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BESTIE SCORE ── */}
      <section id="score" style={{ padding: '0 20px 64px' }}>
        <div ref={scoreRef} className={`reveal ${scoreVisible ? 'visible' : ''}`} style={{ maxWidth: '980px', margin: '0 auto' }}>
          <div className="score-grid">
            {/* Left: explanation */}
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2.5px', color: '#34D399', textTransform: 'uppercase', marginBottom: '16px' }}>THE BESTIE SCORE</p>
              <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(28px, 5vw, 46px)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.15, marginBottom: '20px' }}>
                Proof you <em style={{ color: '#D4AF37', fontStyle: 'italic' }}>show up.</em>
              </h2>
              <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.75 }}>
                Your score grows with every confirmed meetup, rating, and week of consistency — real-life reliability, not follower counts.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
                {[
                  { label: '🌱 New Bestie', desc: 'Just joined — under 1 month' },
                  { label: '⭐ Regular', desc: '3+ months, consistent sessions' },
                  { label: '🔥 Veteran', desc: '6+ months, high rating' },
                  { label: '💎 Legend', desc: '1+ year, trusted by many' },
                  { label: '👑 OG Bestie', desc: '2+ years — the real ones' },
                ].map(b => (
                  <div key={b.label} style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '13px', padding: '8px 14px', borderRadius: '12px', background: 'var(--overlay)', border: '1px solid var(--surface-1b)' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600, minWidth: '120px' }}>{b.label}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{b.desc}</span>
                  </div>
                ))}
              </div>
              <Link href="/score-guide" className="btn-gold">Build your score →</Link>
            </div>

            {/* Right: score card */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div className="score-card" style={{ width: '280px', padding: '32px 28px', borderRadius: '28px', textAlign: 'center', background: 'var(--surface-1)', border: '1px solid rgba(52,211,153,0.2)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>BESTIE SCORE</p>
                <div style={{ fontSize: '80px', fontWeight: 700, color: '#34D399', fontFamily: 'DM Serif Display, serif', lineHeight: 1, margin: '4px 0 16px', textShadow: '0 0 40px rgba(52,211,153,0.4)' }}>874</div>
                {/* Progress bar */}
                <div style={{ height: '7px', borderRadius: '999px', background: 'rgba(255,255,255,0.10)', marginBottom: '8px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '87.4%', borderRadius: '999px', background: 'linear-gradient(90deg, #34D399 0%, #D4AF37 100%)', boxShadow: '0 0 12px rgba(52,211,153,0.5)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                  <span>0</span>
                  <span style={{ color: '#34D399', fontWeight: 700 }}>Excellent</span>
                  <span>1000</span>
                </div>
                {/* Stats */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {[{ label: 'Sessions', val: '43' }, { label: 'Rating', val: '4.9' }, { label: 'Sparks', val: '127' }].map((s) => (
                    <div key={s.label} style={{ padding: '10px 4px', borderRadius: '12px', background: 'var(--surface-1)' }}>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>{s.val}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── UPCOMING EVENTS (only when there are real events) ── */}
      {upcomingEvents.length > 0 && (
        <section style={{ padding: '0 20px 64px', overflow: 'hidden' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <p className="section-label">HAPPENING SOON</p>
                <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 700, color: 'var(--text-primary)' }}>Upcoming events</h2>
              </div>
              <Link href="/events" style={{ fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '2px' }}>See all →</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
              {upcomingEvents.map(ev => {
                const d = new Date(ev.when)
                return (
                  <Link key={`${ev.kind}-${ev.id}`} href={ev.href} style={{ display: 'flex', gap: '14px', padding: '16px', borderRadius: '16px', background: 'var(--surface-1)', border: ev.kind === 'birthday' ? '1px solid rgba(255,107,53,0.22)' : '1px solid var(--border)', textDecoration: 'none' }}>
                    <div style={{ flexShrink: 0, width: '44px', textAlign: 'center' }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, color: ev.kind === 'birthday' ? '#FF6B35' : '#D4AF37', letterSpacing: '1px' }}>{d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</p>
                      <p style={{ fontFamily: 'DM Serif Display, serif', fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{d.getDate()}</p>
                      <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ev.sub}{ev.location ? ` · ${ev.location}` : ''}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── TOP BESTIES (only when there is real data) ── */}
      {topProviders.length > 0 && (
        <section style={{ padding: '0 20px 64px', overflow: 'hidden' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '28px' }}>
              <div>
                <p className="section-label">LEADERBOARD</p>
                <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 700, color: 'var(--text-primary)' }}>{CITY_FOCUS ? `Top Besties in ${LAUNCH_CITY.name}` : 'Top Besties'}</h2>
              </div>
              <Link href="/browse" style={{ fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '2px', transition: 'color 0.2s' }} onMouseEnter={e=>e.target.style.color='#D4AF37'} onMouseLeave={e=>e.target.style.color='var(--text-muted)'}>See all →</Link>
            </div>
            <div className="providers-grid">
              {topProviders.map((provider, i) => {
                const badge = i === 0
                  ? { label: '👑 #1 Top Bestie', bg: 'linear-gradient(135deg, #D4AF37, #B8960C)', color: '#09090F', border: 'none' }
                  : i === 1
                  ? { label: '🥈 #2', bg: 'rgba(155,147,192,0.2)', color: 'var(--text-muted)', border: '1px solid rgba(155,147,192,0.3)' }
                  : i === 2
                  ? { label: '🥉 #3', bg: 'rgba(180,100,40,0.2)', color: '#CD7F32', border: '1px solid rgba(180,100,40,0.3)' }
                  : { label: `#${i + 1}`, bg: 'var(--surface-1b)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
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
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section style={{ padding: '0 20px 80px' }}>
        <div style={{ maxWidth: '740px', margin: '0 auto' }}>
          <div style={{ borderRadius: '28px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(212,175,55,0.09) 0%, rgba(52,211,153,0.04) 100%)', border: '1px solid rgba(212,175,55,0.2)', padding: '56px 36px', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', bottom: '-60px', right: '-60px', width: '260px', height: '260px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px', lineHeight: 1.15 }}>Your next friend is one meetup away.</h2>
              <p style={{ fontSize: '16px', color: 'var(--text-muted)', marginBottom: '32px' }}>{CITY_FOCUS ? `Be a founding member — help build ${LAUNCH_CITY.possessive} social scene.` : 'Be a founding member — help build the first real-life friendship network.'}</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/bestie-type" className="btn-gold">Take the free 5-min test →</Link>
                <Link href="/signup" className="btn-ghost">Join free</Link>
              </div>
              <div style={{ marginTop: '22px' }}>
                <Link href="/plans" className="quiet-link">Plans for crews →</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid var(--surface-2)', padding: '32px 24px' }}>
        <div style={{ maxWidth: '980px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37' }}>BESTIE</span>
          <div style={{ display: 'flex', gap: '20px', fontSize: '13px', flexWrap: 'wrap' }}>
            {[
              { href: '/browse', label: 'Browse' }, { href: '/crews', label: 'Crews' },
              { href: '/pulse', label: 'Pulse' }, { href: '/plans', label: 'Plans' }, { href: '#how-it-works', label: 'How It Works' }, { href: '/score-guide', label: 'Bestie Score' }, { href: '/terms', label: 'Terms' }, { href: '/privacy', label: 'Privacy' }, { href: '/signup', label: 'Join' },
            ].map(l => (
              <Link key={l.label} href={l.href} style={{ color: 'var(--text-dim)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e=>e.target.style.color='var(--text-muted)'} onMouseLeave={e=>e.target.style.color='var(--text-dim)'}>{l.label}</Link>
            ))}
          </div>
          <p style={{ fontSize: '12px', color: '#4A4268' }}>© 2026 Bestie. {CITY_FOCUS ? LAUNCH_CITY.full : 'Worldwide'}. 18+</p>
        </div>
      </footer>
    </div>
  )
}
