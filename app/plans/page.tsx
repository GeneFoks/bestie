// @ts-nocheck
import Link from 'next/link'
import { Search, Network, Sparkles, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Plans — Bestie',
  description: 'Crew plans with AI Swarm, and the personal Bestie Plus upgrade.',
}

const CREW_PLANS = [
  {
    name: 'Free', price: '$0', period: '', accent: 'var(--text-muted)', highlight: false,
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
]

export default function PlansPage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .nav-link { color: var(--text-muted); text-decoration: none; transition: color 0.2s; font-size: 14px; }
        .nav-link:hover { color: var(--text-primary); }
        .btn-gold {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 13px 28px; border-radius: 14px; font-size: 14px; font-weight: 700;
          background: linear-gradient(135deg, #D4AF37 0%, #B8960C 100%);
          color: #09090F; text-decoration: none;
          transition: filter 0.2s, transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(212,175,55,0.25);
        }
        .btn-gold:hover { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 8px 28px rgba(212,175,55,0.35); }
        .plan-cta { transition: filter 0.2s, transform 0.2s; }
        .plan-cta:hover { filter: brightness(1.12); transform: translateY(-1px); }
        .section-label { font-size: 11px; font-weight: 700; letter-spacing: 2.5px; color: #D4AF37; text-transform: uppercase; margin-bottom: 10px; }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', background: 'var(--nav-bg)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none', letterSpacing: '-0.3px' }}>BESTIE</Link>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link href="/" className="nav-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={15} strokeWidth={2} /> Back home
          </Link>
          <Link href="/signup" className="btn-gold" style={{ padding: '8px 18px', borderRadius: '10px', fontSize: '13px' }}>Join Free</Link>
        </div>
      </nav>

      {/* ── HEADER ── */}
      <header style={{ position: 'relative', paddingTop: '120px', paddingBottom: '20px', paddingLeft: '20px', paddingRight: '20px', overflow: 'hidden', textAlign: 'center' }}>
        <div style={{ position: 'absolute', top: '-60px', left: '50%', width: '700px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, #9B7FFF 0%, transparent 65%)', opacity: 0.06, pointerEvents: 'none', transform: 'translateX(-50%)', zIndex: 0 }} />
        <div style={{ maxWidth: '720px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <p className="section-label">PLANS</p>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(30px, 6vw, 52px)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1, marginBottom: '16px', letterSpacing: '-0.5px' }}>
            Plans for crews<br /><em style={{ color: '#9B7FFF', fontStyle: 'italic' }}>and for you.</em>
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', maxWidth: '520px', margin: '0 auto', lineHeight: 1.7 }}>
            Bestie is free to use. Upgrade a crew to unlock the AI Swarm, or upgrade yourself with Bestie Plus.
          </p>
        </div>
      </header>

      {/* ── AI SWARM + CREW PLANS ── */}
      <section style={{ padding: '40px 20px 80px' }}>
        <div style={{ maxWidth: '1040px', margin: '0 auto' }}>

          {/* Intro: the problem AI Swarm solves */}
          <div style={{ borderRadius: '28px', background: 'linear-gradient(135deg, rgba(155,127,255,0.10) 0%, rgba(123,95,229,0.04) 100%)', border: '1px solid rgba(155,127,255,0.22)', padding: '44px 36px', marginBottom: '40px', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2.5px', color: '#9B7FFF', textTransform: 'uppercase', marginBottom: '12px' }}>AI SWARM FOR CREWS</p>
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px', lineHeight: 1.15 }}>
              Your community's <em style={{ color: '#9B7FFF', fontStyle: 'italic' }}>collective brain.</em>
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--text-muted)', maxWidth: '620px', margin: '0 auto 28px', lineHeight: 1.75 }}>
              In big groups the right person is always there — you just can't find them. Each member connects their AI agent and describes what they do. Ask the swarm for anything — <em>“who can help me launch a podcast?”</em> — and it instantly finds your best matches inside the crew.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', textAlign: 'left' }}>
              {[
                { Icon: Search,  title: 'Find anyone instantly', desc: 'No more scrolling member lists or asking in chat. Describe the need — the swarm surfaces the right people.' },
                { Icon: Network, title: 'Two-sided matches',     desc: 'When the swarm picks someone, they get notified too. Connections happen both ways, not one cold DM.' },
                { Icon: Sparkles,title: 'It works for you',       desc: 'A shared board of needs & offers plus weekly auto-suggestions — the swarm connects people on its own.' },
              ].map(b => (
                <div key={b.title} style={{ padding: '18px', borderRadius: '16px', background: 'var(--surface-1)', border: '1px solid rgba(155,127,255,0.14)' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(155,127,255,0.12)', border: '1px solid rgba(155,127,255,0.2)', marginBottom: '12px' }}>
                    <b.Icon size={19} color="#9B7FFF" strokeWidth={1.7} />
                  </div>
                  <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>{b.title}</h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{b.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing tiers */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <p className="section-label">CREW PLANS</p>
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>Pick your crew's size</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Start free. Unlock the AI Swarm as your community grows.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px', alignItems: 'stretch' }}>
            {CREW_PLANS.map(plan => (
              <div key={plan.name} style={{
                position: 'relative', display: 'flex', flexDirection: 'column',
                padding: '28px 24px', borderRadius: '22px',
                background: plan.highlight ? 'linear-gradient(160deg, rgba(155,127,255,0.12) 0%, var(--surface-1) 60%)' : 'var(--surface-1)',
                border: plan.highlight ? '1.5px solid rgba(155,127,255,0.45)' : '1px solid var(--border)',
                boxShadow: plan.highlight ? '0 16px 50px rgba(155,127,255,0.18)' : '0 8px 32px rgba(0,0,0,0.3)',
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
              }}>
                {plan.highlight && (
                  <span style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', padding: '4px 14px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', background: 'linear-gradient(135deg, #9B7FFF, #7B5FE5)', color: '#fff', whiteSpace: 'nowrap' }}>
                    MOST POPULAR
                  </span>
                )}
                <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: plan.accent, marginBottom: '4px' }}>{plan.name}</h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.5, minHeight: '36px' }}>{plan.tagline}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '18px' }}>
                  <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: '40px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{plan.price}</span>
                  <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{plan.period}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '18px', flex: 1 }}>
                  {plan.features.map(f => {
                    const off = f.includes('not included')
                    return (
                      <div key={f} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '13px', color: off ? 'var(--text-dim)' : 'var(--text-primary)', lineHeight: 1.5 }}>
                        <span style={{ color: off ? 'var(--text-dim)' : plan.accent, flexShrink: 0, fontWeight: 700 }}>{off ? '–' : '✓'}</span>
                        <span style={{ textDecoration: off ? 'line-through' : 'none' }}>{f}</span>
                      </div>
                    )
                  })}
                </div>
                <p style={{ fontSize: '12px', color: '#8B83A8', fontStyle: 'italic', lineHeight: 1.5, marginBottom: '18px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  {plan.solves}
                </p>
                <Link href="/crews" className="plan-cta" style={{
                  display: 'block', textAlign: 'center', padding: '12px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, textDecoration: 'none',
                  background: plan.highlight ? 'linear-gradient(135deg, #9B7FFF, #7B5FE5)' : 'var(--overlay-2)',
                  color: plan.highlight ? '#fff' : 'var(--text-primary)',
                  border: plan.highlight ? 'none' : '1px solid var(--border)',
                }}>
                  {plan.name === 'Free' ? 'Start free →' : `Choose ${plan.name} →`}
                </Link>
              </div>
            ))}
          </div>

          <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)', marginTop: '20px' }}>
            Only a crew captain can upgrade. Cancel anytime — your crew stays, the swarm pauses.
          </p>

          {/* Personal Bestie Plus */}
          <div style={{ marginTop: '48px', borderRadius: '28px', background: 'linear-gradient(135deg, rgba(155,127,255,0.14) 0%, rgba(124,92,255,0.05) 100%)', border: '1px solid rgba(155,127,255,0.32)', padding: '40px 36px', textAlign: 'center', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2.5px', color: '#9B7FFF', textTransform: 'uppercase', marginBottom: '12px' }}>JUST FOR YOU</p>
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px', lineHeight: 1.15 }}>
              Bestie <em style={{ color: '#9B7FFF', fontStyle: 'italic' }}>Plus</em> — everything for $8<span style={{ fontSize: '0.5em', color: 'var(--text-muted)' }}>/mo</span>
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '560px', margin: '0 auto 28px', lineHeight: 1.7 }}>
              A personal upgrade for you — not your crew. One simple plan, cancel anytime.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', textAlign: 'left', marginBottom: '30px' }}>
              {[
                { icon: '🤖', title: 'Premium AI companion', desc: 'Connect your own AI key (Claude, OpenAI or Grok) and chat with no limits.' },
                { icon: '🕸️', title: 'Join the graph',        desc: "Don't just watch the connection web — appear on it and let people find you." },
                { icon: '💰', title: 'Paid sessions',          desc: 'Offer your time and skills for money. Set a price and get booked.' },
              ].map(b => (
                <div key={b.title} style={{ padding: '20px', borderRadius: '16px', background: 'var(--surface-1)', border: '1px solid rgba(155,127,255,0.14)' }}>
                  <div style={{ fontSize: '26px', marginBottom: '10px', lineHeight: 1 }}>{b.icon}</div>
                  <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>{b.title}</h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{b.desc}</p>
                </div>
              ))}
            </div>
            <Link href="/plus" className="plan-cta" style={{ display: 'inline-block', padding: '14px 32px', borderRadius: '14px', fontSize: '15px', fontWeight: 700, textDecoration: 'none', background: 'linear-gradient(135deg, #9B7FFF, #7C5CFF)', color: '#fff' }}>
              Get Bestie Plus — $8/mo →
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid var(--surface-2)', padding: '32px 24px' }}>
        <div style={{ maxWidth: '980px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37' }}>BESTIE</span>
          <div style={{ display: 'flex', gap: '20px', fontSize: '13px', flexWrap: 'wrap' }}>
            <Link href="/" style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>Home</Link>
            <Link href="/crews" style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>Crews</Link>
            <Link href="/plus" style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>Bestie Plus</Link>
            <Link href="/terms" style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>Terms</Link>
            <Link href="/privacy" style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>Privacy</Link>
            <Link href="/signup" style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>Join</Link>
          </div>
          <p style={{ fontSize: '12px', color: '#4A4268' }}>© 2026 Bestie. 18+</p>
        </div>
      </footer>
    </div>
  )
}
