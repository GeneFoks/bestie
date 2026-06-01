// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Zap, Send, Settings, CheckCircle, AlertCircle, Loader } from 'lucide-react'

const PROVIDERS = [
  { id: 'claude', label: 'Claude', emoji: '🟣' },
  { id: 'openai', label: 'ChatGPT', emoji: '🟢' },
  { id: 'grok',   label: 'Grok',   emoji: '⚡' },
]

const EXAMPLE_QUERIES = [
  'Need a partner to launch a podcast',
  'Looking for a co-founder for a fitness app',
  'Who can help me with video editing?',
  'Need someone to practice public speaking with',
  'Looking for an accountability partner for my startup',
]

export default function SwarmPage() {
  const { slug } = useParams()
  const router = useRouter()

  const [session, setSession]     = useState<any>(null)
  const [crew, setCrew]           = useState<any>(null)
  const [agent, setAgent]         = useState<any>(null)
  const [loading, setLoading]     = useState(true)
  const [planError, setPlanError] = useState(false)

  // Agent form
  const [upgrading, setUpgrading]         = useState<string | null>(null)
  const [upgradeError, setUpgradeError]   = useState('')
  const [showAgentForm, setShowAgentForm] = useState(false)
  const [agentSkills, setAgentSkills]     = useState('')
  const [agentProvider, setAgentProvider] = useState('claude')
  const [agentKey, setAgentKey]           = useState('')
  const [savingAgent, setSavingAgent]     = useState(false)
  const [agentSaved, setAgentSaved]       = useState(false)

  // Swarm
  const [query, setQuery]         = useState('')
  const [searching, setSearching] = useState(false)
  const [result, setResult]       = useState<any>(null)
  const [history, setHistory]     = useState<any[]>([])

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { session: s } } = await supabase.auth.getSession()
      if (!s) { router.push('/login'); return }
      setSession(s)

      // Load crew
      const { data: c } = await supabase
        .from('crews')
        .select('id, name, slug, plan, plan_expires_at, captain_id')
        .eq('slug', slug)
        .single()

      if (!c) { router.push('/crews'); return }
      setCrew(c)

      const planOk = c.plan !== 'free' &&
        (!c.plan_expires_at || new Date(c.plan_expires_at) > new Date())
      if (!planOk) { setPlanError(true); setLoading(false); return }

      // Load my agent
      const { data: a } = await supabase
        .from('crew_ai_agents')
        .select('*')
        .eq('crew_id', c.id)
        .eq('user_id', s.user.id)
        .single()

      if (a) {
        setAgent(a)
        setAgentSkills(a.skills || '')
        setAgentProvider(a.provider || 'claude')
      } else {
        // No agent yet — show form
        setShowAgentForm(true)
      }

      // Load swarm history
      const { data: hist } = await supabase
        .from('swarm_requests')
        .select('id, query, result, created_at')
        .eq('crew_id', c.id)
        .eq('requester_id', s.user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      setHistory(hist || [])
      setLoading(false)
    }
    load()
  }, [slug])

  const saveAgent = async () => {
    if (!agentSkills.trim() || !session || savingAgent) return
    setSavingAgent(true)

    const payload = {
      user_id: session.user.id,
      crew_id: crew.id,
      provider: agentProvider,
      skills: agentSkills.trim(),
      is_active: true,
      updated_at: new Date().toISOString(),
      ...(agentKey.trim() ? { api_key: agentKey.trim() } : {}),
    }

    const { data } = await supabase
      .from('crew_ai_agents')
      .upsert(payload, { onConflict: 'user_id,crew_id' })
      .select()
      .single()

    setAgent(data)
    setSavingAgent(false)
    setAgentSaved(true)
    setTimeout(() => { setAgentSaved(false); setShowAgentForm(false) }, 1500)
  }

  const startCheckout = async (plan: string) => {
    if (!session || upgrading) return
    setUpgrading(plan)
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ crew_id: crew.id, plan }),
    })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      setUpgradeError(data.error || 'Something went wrong. Try again.')
      setUpgrading(null)
    }
  }

  const runSwarm = async (q?: string) => {
    const queryText = q || query.trim()
    if (!queryText || searching || !session) return
    setQuery('')
    setSearching(true)
    setResult(null)

    const res = await fetch('/api/swarm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ crew_id: crew.id, query: queryText }),
    })

    const data = await res.json()
    setSearching(false)

    if (!res.ok) {
      setResult({ error: data.error || 'Something went wrong' })
      return
    }

    setResult({ query: queryText, ...data })
    // Prepend to history
    setHistory(prev => [{ id: Date.now(), query: queryText, result: data, created_at: new Date().toISOString() }, ...prev].slice(0, 5))
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#09090F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader size={28} color="#9B7FFF" style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ── Upgrade wall ──────────────────────────────────────────────────
  if (planError) {
    return (
      <div style={{ minHeight: '100vh', background: '#09090F', fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#F0EAFF' }}>
        <div style={{ maxWidth: '520px', margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>🐝</div>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '32px', marginBottom: '12px' }}>AI Swarm</h1>
          <p style={{ fontSize: '15px', color: '#A99ECC', marginBottom: '32px', lineHeight: 1.7 }}>
            AI Swarm is available on <strong style={{ color: '#D4AF37' }}>Community</strong> and <strong style={{ color: '#9B7FFF' }}>Pro</strong> plans.
            Upgrade your Crew to unlock intelligent matching across all members.
          </p>

          {upgradeError && (
            <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,69,96,0.08)', border: '1px solid rgba(255,69,96,0.25)', color: '#FF4560', fontSize: '13px' }}>
              ⚠️ {upgradeError}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {[
              { id: 'community', label: 'Community', price: '$49/mo', color: '#D4AF37', limit: 'Up to 50 members', features: ['AI Swarm matching', 'Full swarm history', 'All member agents'] },
              { id: 'pro',       label: 'Pro',       price: '$149/mo', color: '#9B7FFF', limit: 'Up to 200 members', features: ['Everything in Community', 'Priority AI processing', 'Custom agent personas', 'Analytics dashboard'] },
            ].map(tier => (
              <div key={tier.id} style={{ padding: '20px', borderRadius: '16px', background: '#111120', border: `1px solid ${tier.color}40`, textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: tier.color }}>{tier.label}</span>
                  <span style={{ fontSize: '20px', fontWeight: 800, color: '#F0EAFF' }}>{tier.price}</span>
                </div>
                <p style={{ fontSize: '12px', color: '#A99ECC', marginBottom: '10px' }}>{tier.limit}</p>
                {tier.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#C8BFEE', marginBottom: '4px' }}>
                    <CheckCircle size={12} color={tier.color} /> {f}
                  </div>
                ))}
                <button
                  onClick={() => startCheckout(tier.id)}
                  disabled={!!upgrading}
                  style={{
                    marginTop: '16px', width: '100%', padding: '12px', borderRadius: '12px',
                    fontSize: '14px', fontWeight: 700, border: 'none', cursor: upgrading ? 'not-allowed' : 'pointer',
                    background: upgrading === tier.id ? `${tier.color}30` : tier.color,
                    color: upgrading === tier.id ? tier.color : '#09090F',
                    fontFamily: 'Plus Jakarta Sans, sans-serif', transition: 'all 0.2s',
                  }}
                >
                  {upgrading === tier.id ? 'Redirecting to Stripe...' : `Upgrade to ${tier.label} →`}
                </button>
              </div>
            ))}
          </div>

          <Link href={`/crews/${slug}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#A99ECC', textDecoration: 'none' }}>
            <ArrowLeft size={14} /> Back to {crew?.name}
          </Link>
        </div>
      </div>
    )
  }

  // ── Main Swarm UI ─────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#09090F', fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#F0EAFF' }}>
      <style>{`
        @keyframes swarmFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes swarmPulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(155,127,255,0.15)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(155,127,255,0.03)' }}>
        <Link href={`/crews/${slug}`} style={{ display: 'flex', alignItems: 'center', color: '#A99ECC', textDecoration: 'none' }}>
          <ArrowLeft size={18} strokeWidth={2} />
        </Link>
        <div style={{ fontSize: '22px', animation: 'swarmFloat 3s ease-in-out infinite' }}>🐝</div>
        <div>
          <h1 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#F0EAFF' }}>AI Swarm</h1>
          <p style={{ fontSize: '11px', color: '#9B7FFF', margin: 0 }}>{crew?.name} · {crew?.plan === 'pro' ? 'Pro' : 'Community'}</p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={() => setShowAgentForm(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
            background: showAgentForm ? 'rgba(155,127,255,0.15)' : '#111120',
            border: '1px solid rgba(155,127,255,0.25)', color: '#9B7FFF', cursor: 'pointer',
          }}>
            <Settings size={13} /> My Agent
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '24px 20px' }}>

        {/* Agent Setup Form */}
        {showAgentForm && (
          <div style={{ marginBottom: '24px', padding: '20px', borderRadius: '16px', background: '#111120', border: '1px solid rgba(155,127,255,0.25)', animation: 'fadeIn 0.25s ease' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#9B7FFF', marginBottom: '16px', letterSpacing: '0.5px' }}>
              {agent ? '✏️ Edit My Agent' : '🤖 Connect Your Agent'}
            </h2>

            <p style={{ fontSize: '13px', color: '#A99ECC', marginBottom: '16px', lineHeight: 1.6 }}>
              Tell the swarm what you can help with. The more specific, the better your matches.
            </p>

            <textarea
              value={agentSkills}
              onChange={e => setAgentSkills(e.target.value)}
              placeholder="e.g. I'm a UX designer with 5 years experience. I can help with product design, wireframes, user research, and Figma. Open to co-founding, consulting, or collaboration on early-stage products."
              rows={4}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: '12px', fontSize: '14px',
                background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EAFF',
                fontFamily: 'Plus Jakarta Sans, sans-serif', resize: 'vertical', boxSizing: 'border-box',
                marginBottom: '14px', outline: 'none', lineHeight: 1.6,
              }}
            />

            <p style={{ fontSize: '12px', fontWeight: 700, color: '#A99ECC', marginBottom: '8px', letterSpacing: '0.5px' }}>AI PROVIDER</p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              {PROVIDERS.map(p => (
                <button key={p.id} onClick={() => setAgentProvider(p.id)} style={{
                  flex: 1, padding: '8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
                  background: agentProvider === p.id ? 'rgba(155,127,255,0.15)' : '#0d0d1a',
                  border: agentProvider === p.id ? '1.5px solid #9B7FFF' : '1px solid rgba(255,255,255,0.08)',
                  color: agentProvider === p.id ? '#9B7FFF' : '#A99ECC',
                  cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif',
                }}>
                  {p.emoji} {p.label}
                </button>
              ))}
            </div>

            <input
              type="password"
              value={agentKey}
              onChange={e => setAgentKey(e.target.value)}
              placeholder="API key (optional — for your personalized agent)"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '13px',
                background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.08)', color: '#F0EAFF',
                fontFamily: 'Plus Jakarta Sans, sans-serif', boxSizing: 'border-box', marginBottom: '14px', outline: 'none',
              }}
            />

            <button onClick={saveAgent} disabled={!agentSkills.trim() || savingAgent} style={{
              width: '100%', padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 700,
              background: agentSaved ? 'rgba(52,211,153,0.15)' : !agentSkills.trim() ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #9B7FFF, #7B5FE5)',
              border: agentSaved ? '1px solid rgba(52,211,153,0.4)' : 'none',
              color: agentSaved ? '#34D399' : !agentSkills.trim() ? '#5A5375' : '#fff',
              cursor: !agentSkills.trim() || savingAgent ? 'not-allowed' : 'pointer',
              fontFamily: 'Plus Jakarta Sans, sans-serif', transition: 'all 0.2s',
            }}>
              {savingAgent ? 'Saving...' : agentSaved ? '✓ Agent activated!' : agent ? 'Update agent' : 'Activate my agent'}
            </button>
          </div>
        )}

        {/* No agent warning */}
        {!agent && !showAgentForm && (
          <div style={{ marginBottom: '20px', padding: '14px 16px', borderRadius: '12px', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <AlertCircle size={16} color="#D4AF37" />
            <p style={{ fontSize: '13px', color: '#D4AF37', margin: 0 }}>
              Set up your agent so others can match with you too.{' '}
              <button onClick={() => setShowAgentForm(true)} style={{ background: 'none', border: 'none', color: '#D4AF37', fontWeight: 700, cursor: 'pointer', fontSize: '13px', padding: 0, textDecoration: 'underline' }}>
                Add skills →
              </button>
            </p>
          </div>
        )}

        {/* Swarm search */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{
            padding: '20px', borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(155,127,255,0.08), rgba(123,95,229,0.05))',
            border: '1px solid rgba(155,127,255,0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span style={{ fontSize: '24px', animation: 'swarmFloat 3s ease-in-out infinite' }}>🐝</span>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#F0EAFF', margin: 0 }}>What do you need?</p>
                <p style={{ fontSize: '12px', color: '#9B7FFF', margin: 0 }}>The swarm will find the best match in your crew</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runSwarm()}
                placeholder="e.g. Need a partner to launch a podcast"
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: '12px', fontSize: '14px',
                  background: '#0d0d1a', border: '1px solid rgba(155,127,255,0.2)',
                  color: '#F0EAFF', fontFamily: 'Plus Jakarta Sans, sans-serif', outline: 'none',
                }}
              />
              <button onClick={() => runSwarm()} disabled={!query.trim() || searching} style={{
                width: '46px', height: '46px', borderRadius: '12px', border: 'none',
                background: query.trim() && !searching ? 'linear-gradient(135deg, #9B7FFF, #7B5FE5)' : 'rgba(255,255,255,0.06)',
                cursor: query.trim() && !searching ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {searching
                  ? <Loader size={16} color="#9B7FFF" style={{ animation: 'spin 1s linear infinite' }} />
                  : <Send size={16} color={query.trim() ? '#fff' : '#5A5375'} strokeWidth={2} />
                }
              </button>
            </div>

            {/* Example queries */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
              {EXAMPLE_QUERIES.map(q => (
                <button key={q} onClick={() => runSwarm(q)} style={{
                  padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 500,
                  background: 'rgba(155,127,255,0.08)', border: '1px solid rgba(155,127,255,0.2)',
                  color: '#9B7FFF', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif',
                }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Searching state */}
        {searching && (
          <div style={{ textAlign: 'center', padding: '40px 0', animation: 'fadeIn 0.3s ease' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'swarmFloat 1s ease-in-out infinite' }}>🐝</div>
            <p style={{ fontSize: '14px', color: '#9B7FFF', fontWeight: 600 }}>Swarm is analyzing your crew...</p>
            <p style={{ fontSize: '12px', color: '#5A5375' }}>Reading profiles and finding your best matches</p>
          </div>
        )}

        {/* Results */}
        {result && !searching && (
          <div style={{ animation: 'fadeIn 0.35s ease', marginBottom: '32px' }}>
            {result.error ? (
              <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,69,96,0.08)', border: '1px solid rgba(255,69,96,0.2)', color: '#FF4560', fontSize: '14px' }}>
                ⚠️ {result.error}
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: '#9B7FFF', marginBottom: '4px' }}>SWARM RESULTS</p>
                  <p style={{ fontSize: '13px', color: '#A99ECC', fontStyle: 'italic' }}>"{result.query}"</p>
                </div>

                {result.matches?.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px', background: '#111120', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</p>
                    <p style={{ fontSize: '14px', color: '#A99ECC' }}>No close matches found yet.</p>
                    <p style={{ fontSize: '12px', color: '#5A5375' }}>Encourage more members to activate their agent.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {result.matches.map((m, i) => (
                      <div key={i} style={{
                        padding: '16px 18px', borderRadius: '16px',
                        background: i === 0 ? 'linear-gradient(135deg, rgba(155,127,255,0.1), rgba(123,95,229,0.06))' : '#111120',
                        border: i === 0 ? '1.5px solid rgba(155,127,255,0.35)' : '1px solid rgba(255,255,255,0.08)',
                        position: 'relative',
                      }}>
                        {i === 0 && (
                          <span style={{ position: 'absolute', top: '12px', right: '14px', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: 'rgba(155,127,255,0.2)', color: '#9B7FFF', border: '1px solid rgba(155,127,255,0.3)' }}>
                            BEST MATCH
                          </span>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                          <div style={{
                            width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                            background: m.avatar_url ? `url(${m.avatar_url}) center/cover` : 'linear-gradient(135deg, #9B7FFF44, #7B5FE544)',
                            border: `2px solid ${i === 0 ? '#9B7FFF' : 'rgba(255,255,255,0.1)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
                          }}>
                            {!m.avatar_url && '👤'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '15px', fontWeight: 700, color: '#F0EAFF', margin: 0 }}>{m.name}</p>
                            <p style={{ fontSize: '12px', color: '#A99ECC', margin: 0 }}>@{m.username}</p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '20px', fontWeight: 800, color: i === 0 ? '#9B7FFF' : '#A99ECC' }}>{m.match_score}%</div>
                            <div style={{ fontSize: '10px', color: '#5A5375' }}>match</div>
                          </div>
                        </div>

                        {/* Match score bar */}
                        <div style={{ height: '3px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', marginBottom: '10px' }}>
                          <div style={{ width: `${m.match_score}%`, height: '100%', borderRadius: '999px', background: i === 0 ? 'linear-gradient(90deg, #9B7FFF, #7B5FE5)' : 'rgba(155,127,255,0.4)', transition: 'width 1s ease' }} />
                        </div>

                        <p style={{ fontSize: '13px', color: '#C8BFEE', lineHeight: 1.6, margin: '0 0 12px' }}>{m.reason}</p>

                        <Link
                          href={`/messages?to=${m.username}`}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            padding: '7px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
                            background: i === 0 ? 'rgba(155,127,255,0.15)' : 'rgba(255,255,255,0.06)',
                            border: i === 0 ? '1px solid rgba(155,127,255,0.3)' : '1px solid rgba(255,255,255,0.08)',
                            color: i === 0 ? '#9B7FFF' : '#A99ECC', textDecoration: 'none',
                          }}
                        >
                          <Zap size={12} /> Connect →
                        </Link>
                      </div>
                    ))}
                  </div>
                )}

                {result.summary && (
                  <p style={{ fontSize: '12px', color: '#5A5375', fontStyle: 'italic', marginTop: '12px', textAlign: 'center' }}>
                    🐝 {result.summary}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* History */}
        {history.length > 0 && !result && (
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: '#5A5375', marginBottom: '12px' }}>RECENT SEARCHES</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {history.map((h, i) => (
                <button key={h.id || i} onClick={() => runSwarm(h.query)} style={{
                  padding: '12px 14px', borderRadius: '12px', background: '#111120',
                  border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', textAlign: 'left',
                  fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#A99ECC', fontSize: '13px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span>"{h.query}"</span>
                  <span style={{ fontSize: '11px', color: '#5A5375' }}>↩ re-run</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
