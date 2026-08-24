// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Zap, Send, Settings, CheckCircle, AlertCircle, Loader, Trash2 } from 'lucide-react'

// ── Original brand icons (inline SVG) ───────────────────────────────
const ClaudeIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="#D97757" strokeWidth="2.2" strokeLinecap="round">
    <line x1="12" y1="2.5" x2="12" y2="21.5" />
    <line x1="2.5" y1="12" x2="21.5" y2="12" />
    <line x1="5.3" y1="5.3" x2="18.7" y2="18.7" />
    <line x1="18.7" y1="5.3" x2="5.3" y2="18.7" />
  </svg>
)
const OpenAIIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#10A37F">
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
  </svg>
)
const GrokIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="var(--text-primary)">
    <path d="M9.27 15.29l7.978-5.897c.39-.29.95-.177 1.137.272.98 2.369.542 5.215-1.41 7.169-1.951 1.953-4.667 2.382-7.149 1.406L7.116 19.5c3.889 2.66 8.611 1.96 11.562-.993 2.341-2.342 3.066-5.538 2.388-8.42l.006.006c-.983-4.232.242-5.924 2.75-9.382.06-.083.12-.165.179-.248l-3.301 3.305v-.01L9.267 15.292M7.623 16.723c-2.792-2.66-2.303-6.802.388-9.495 1.991-1.993 5.262-2.804 8.022-1.243l2.706-1.25c-.519-.394-1.205-.792-1.974-1.106-3.522-1.527-7.71-.847-10.62 2.066-2.808 2.813-3.675 7.012-1.755 10.646 1.434 2.717.768 4.732-.529 6.766-.13.205-.262.41-.392.616l3.348-3.35-.193-.617.998-2.998z"/>
  </svg>
)

const PROVIDERS = [
  {
    id: 'claude', label: 'Claude', Icon: ClaudeIcon,
    keyPrefix: 'sk-ant-…',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    keySteps: [
      'Open console.anthropic.com and log in',
      'Left menu → "API Keys"',
      'Click "Create Key", name it, then Copy',
      'The key starts with sk-ant-…',
    ],
  },
  {
    id: 'openai', label: 'ChatGPT', Icon: OpenAIIcon,
    keyPrefix: 'sk-…',
    keyUrl: 'https://platform.openai.com/api-keys',
    keySteps: [
      'Open platform.openai.com and log in',
      'Go to "API keys"',
      'Click "Create new secret key" → Copy',
      'The key starts with sk-…',
    ],
  },
  {
    id: 'grok', label: 'Grok', Icon: GrokIcon,
    keyPrefix: 'xai-…',
    keyUrl: 'https://console.x.ai',
    keySteps: [
      'Open console.x.ai and log in',
      'Go to "API Keys"',
      'Click "Create API Key" → Copy',
      'The key starts with xai-…',
    ],
  },
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
  const [helpProvider, setHelpProvider]   = useState<string | null>(null)
  const [savingAgent, setSavingAgent]     = useState(false)
  const [agentSaved, setAgentSaved]       = useState(false)

  // Swarm
  const [query, setQuery]         = useState('')
  const [searching, setSearching] = useState(false)
  const [result, setResult]       = useState<any>(null)
  const [history, setHistory]     = useState<any[]>([])
  const [deletingId, setDeletingId] = useState<any>(null)
  const [members, setMembers]     = useState<any[]>([])

  // Swarm board (shared needs & offers)
  const [board, setBoard]         = useState<any[]>([])
  const [boardKind, setBoardKind] = useState<'need' | 'offer'>('need')
  const [boardText, setBoardText] = useState('')
  const [posting, setPosting]     = useState(false)

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

      // Load crew directory: members + profiles + their agents
      const { data: cm } = await supabase
        .from('crew_members')
        .select('user_id')
        .eq('crew_id', c.id)

      const ids = (cm || []).map((m: any) => m.user_id)
      if (ids.length) {
        const [{ data: profs }, { data: ags }] = await Promise.all([
          supabase
            .from('users')
            .select('id, full_name, username, avatar_url, city, bestie_score')
            .in('id', ids),
          supabase
            .from('crew_ai_agents')
            .select('user_id, skills, provider, is_active')
            .eq('crew_id', c.id)
            .in('user_id', ids),
        ])
        const agentMap: Record<string, any> = {}
        for (const ag of ags || []) agentMap[ag.user_id] = ag
        const dir = (profs || []).map((p: any) => ({
          ...p,
          agent: agentMap[p.id] || null,
          isMe: p.id === s.user.id,
        }))
        // People with an active agent first, then by score
        dir.sort((a: any, b: any) => {
          const av = a.agent?.is_active ? 1 : 0
          const bv = b.agent?.is_active ? 1 : 0
          if (av !== bv) return bv - av
          return (b.bestie_score || 0) - (a.bestie_score || 0)
        })
        setMembers(dir)

        // Load shared board + attach author profiles
        const { data: posts } = await supabase
          .from('swarm_board')
          .select('id, author_id, kind, body, status, created_at')
          .eq('crew_id', c.id)
          .order('created_at', { ascending: false })
          .limit(30)

        const pMap: Record<string, any> = {}
        for (const p of profs || []) pMap[p.id] = p
        setBoard((posts || []).map((post: any) => ({
          ...post,
          author: pMap[post.author_id] || null,
          isMine: post.author_id === s.user.id,
        })))
      }

      setLoading(false)
    }
    load()
  }, [slug])

  const postToBoard = async () => {
    if (!boardText.trim() || !crew || !session || posting) return
    setPosting(true)
    const { data, error } = await supabase
      .from('swarm_board')
      .insert({ crew_id: crew.id, author_id: session.user.id, kind: boardKind, body: boardText.trim() })
      .select('id, author_id, kind, body, status, created_at')
      .single()
    if (!error && data) {
      const me = members.find(m => m.isMe) || null
      setBoard(prev => [{ ...data, author: me, isMine: true }, ...prev])
      setBoardText('')
    } else if (error) {
      console.error('[board] post error:', error.message)
    }
    setPosting(false)
  }

  const deleteBoardPost = async (id: string) => {
    const prev = board
    setBoard(b => b.filter(x => x.id !== id))
    const { error } = await supabase.from('swarm_board').delete().eq('id', id)
    if (error) { console.error('[board] delete error:', error.message); setBoard(prev) }
  }

  const toggleBoardStatus = async (post: any) => {
    const next = post.status === 'open' ? 'closed' : 'open'
    setBoard(b => b.map(x => x.id === post.id ? { ...x, status: next } : x))
    const { error } = await supabase.from('swarm_board').update({ status: next }).eq('id', post.id)
    if (error) { console.error('[board] status error:', error.message) }
  }

  const deleteHistory = async (id: any) => {
    if (deletingId) return
    setDeletingId(id)
    // Optimistically remove from UI
    const prev = history
    setHistory(h => h.filter(x => x.id !== id))
    // Only purely-local entries have a numeric id; DB rows are UUID strings
    if (typeof id === 'string') {
      const { error } = await supabase.from('swarm_requests').delete().eq('id', id)
      if (error) {
        console.error('[swarm] delete error:', error.message)
        setHistory(prev)   // restore on failure
      }
    }
    setDeletingId(null)
  }

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
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader size={28} color="#9B7FFF" style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ── Upgrade wall ──────────────────────────────────────────────────
  if (planError) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'Plus Jakarta Sans, sans-serif', color: 'var(--text-primary)' }}>
        <div style={{ maxWidth: '520px', margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>🐝</div>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '32px', marginBottom: '12px' }}>AI Swarm</h1>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '32px', lineHeight: 1.7 }}>
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
              <div key={tier.id} style={{ padding: '20px', borderRadius: '16px', background: 'var(--surface-1)', border: `1px solid ${tier.color}40`, textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: tier.color }}>{tier.label}</span>
                  <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>{tier.price}</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>{tier.limit}</p>
                {tier.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>
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

          <Link href={`/crews/${slug}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--text-muted)', textDecoration: 'none' }}>
            <ArrowLeft size={14} /> Back to {crew?.name}
          </Link>
        </div>
      </div>
    )
  }

  // ── Main Swarm UI ─────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'Plus Jakarta Sans, sans-serif', color: 'var(--text-primary)' }}>
      <style>{`
        @keyframes swarmFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes swarmPulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(155,127,255,0.15)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(155,127,255,0.03)' }}>
        <Link href={`/crews/${slug}`} style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', textDecoration: 'none' }}>
          <ArrowLeft size={18} strokeWidth={2} />
        </Link>
        <div style={{ fontSize: '22px', animation: 'swarmFloat 3s ease-in-out infinite' }}>🐝</div>
        <div>
          <h1 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>AI Swarm</h1>
          <p style={{ fontSize: '11px', color: '#9B7FFF', margin: 0 }}>{crew?.name} · {crew?.plan === 'pro' ? 'Pro' : 'Community'}</p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={() => setShowAgentForm(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
            background: showAgentForm ? 'rgba(155,127,255,0.15)' : 'var(--surface-1)',
            border: '1px solid rgba(155,127,255,0.25)', color: '#9B7FFF', cursor: 'pointer',
          }}>
            <Settings size={13} /> My Agent
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '24px 20px' }}>

        {/* Agent Setup Form */}
        {showAgentForm && (
          <div style={{ marginBottom: '24px', padding: '20px', borderRadius: '16px', background: 'var(--surface-1)', border: '1px solid rgba(155,127,255,0.25)', animation: 'fadeIn 0.25s ease' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#9B7FFF', marginBottom: '16px', letterSpacing: '0.5px' }}>
              {agent ? '✏️ Edit My Agent' : '🤖 Connect Your Agent'}
            </h2>

            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.6 }}>
              Tell the swarm what you can help with. The more specific, the better your matches.
            </p>

            <textarea
              value={agentSkills}
              onChange={e => setAgentSkills(e.target.value)}
              placeholder="e.g. I'm a UX designer with 5 years experience. I can help with product design, wireframes, user research, and Figma. Open to co-founding, consulting, or collaboration on early-stage products."
              rows={4}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: '12px', fontSize: '14px',
                background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-primary)',
                fontFamily: 'Plus Jakarta Sans, sans-serif', resize: 'vertical', boxSizing: 'border-box',
                marginBottom: '14px', outline: 'none', lineHeight: 1.6,
              }}
            />

            <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.5px' }}>AI PROVIDER</p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              {PROVIDERS.map(p => {
                const active = agentProvider === p.id
                return (
                  <div key={p.id} style={{ flex: 1, position: 'relative' }}>
                    <button onClick={() => setAgentProvider(p.id)} style={{
                      width: '100%', padding: '10px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      background: active ? 'rgba(155,127,255,0.15)' : 'var(--bg)',
                      border: active ? '1.5px solid #9B7FFF' : '1px solid var(--border)',
                      color: active ? '#9B7FFF' : 'var(--text-muted)',
                      cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif',
                    }}>
                      <p.Icon size={16} /> {p.label}
                    </button>

                    {/* "?" help toggle */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setHelpProvider(helpProvider === p.id ? null : p.id) }}
                      aria-label={`How to get your ${p.label} API key`}
                      style={{
                        position: 'absolute', top: '-7px', right: '-7px',
                        width: '18px', height: '18px', borderRadius: '50%', padding: 0,
                        background: helpProvider === p.id ? '#9B7FFF' : 'var(--surface-3)',
                        border: '1px solid rgba(155,127,255,0.5)',
                        color: helpProvider === p.id ? '#fff' : 'var(--text-muted)',
                        fontSize: '11px', fontWeight: 700, lineHeight: 1, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>?</button>

                    {/* Help popover */}
                    {helpProvider === p.id && (
                      <div style={{
                        position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
                        width: '240px', zIndex: 20, padding: '12px 14px', borderRadius: '12px',
                        background: 'var(--surface-2)', border: '1px solid rgba(155,127,255,0.3)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.45)', textAlign: 'left',
                      }}>
                        <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                          Where to find your {p.label} key
                        </p>
                        <ol style={{ margin: 0, padding: '0 0 0 16px', color: 'var(--text-muted)', fontSize: '11.5px', lineHeight: 1.7 }}>
                          {p.keySteps.map((s, i) => <li key={i}>{s}</li>)}
                        </ol>
                        <a href={p.keyUrl} target="_blank" rel="noopener noreferrer"
                          style={{
                            display: 'inline-block', marginTop: '10px', fontSize: '11.5px', fontWeight: 700,
                            color: '#9B7FFF', textDecoration: 'none',
                          }}>
                          Open {p.label} dashboard →
                        </a>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <input
              type="password"
              value={agentKey}
              onChange={e => setAgentKey(e.target.value)}
              placeholder={`${PROVIDERS.find(p => p.id === agentProvider)?.label} API key (optional) — ${PROVIDERS.find(p => p.id === agentProvider)?.keyPrefix}`}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '13px',
                background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-primary)',
                fontFamily: 'Plus Jakarta Sans, sans-serif', boxSizing: 'border-box', marginBottom: '14px', outline: 'none',
              }}
            />

            <button onClick={saveAgent} disabled={!agentSkills.trim() || savingAgent} style={{
              width: '100%', padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 700,
              background: agentSaved ? 'rgba(52,211,153,0.15)' : !agentSkills.trim() ? 'var(--overlay-2)' : 'linear-gradient(135deg, #9B7FFF, #7B5FE5)',
              border: agentSaved ? '1px solid rgba(52,211,153,0.4)' : 'none',
              color: agentSaved ? '#34D399' : !agentSkills.trim() ? 'var(--text-dim)' : '#fff',
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
                <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>What do you need?</p>
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
                  background: 'var(--bg)', border: '1px solid rgba(155,127,255,0.2)',
                  color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans, sans-serif', outline: 'none',
                }}
              />
              <button onClick={() => runSwarm()} disabled={!query.trim() || searching} style={{
                width: '46px', height: '46px', borderRadius: '12px', border: 'none',
                background: query.trim() && !searching ? 'linear-gradient(135deg, #9B7FFF, #7B5FE5)' : 'var(--overlay-2)',
                cursor: query.trim() && !searching ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {searching
                  ? <Loader size={16} color="#9B7FFF" style={{ animation: 'spin 1s linear infinite' }} />
                  : <Send size={16} color={query.trim() ? '#fff' : 'var(--text-dim)'} strokeWidth={2} />
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
            <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Reading profiles and finding your best matches</p>
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
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>"{result.query}"</p>
                </div>

                {result.matches?.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px', background: 'var(--surface-1)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</p>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>No close matches found yet.</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Encourage more members to activate their agent.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {result.matches.map((m, i) => (
                      <div key={i} style={{
                        padding: '16px 18px', borderRadius: '16px',
                        background: i === 0 ? 'linear-gradient(135deg, rgba(155,127,255,0.1), rgba(123,95,229,0.06))' : 'var(--surface-1)',
                        border: i === 0 ? '1.5px solid rgba(155,127,255,0.35)' : '1px solid var(--border)',
                        position: 'relative',
                      }}>
                        {i === 0 && (
                          <span style={{ display: 'inline-block', marginBottom: '10px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', padding: '3px 9px', borderRadius: '999px', background: 'rgba(155,127,255,0.2)', color: '#9B7FFF', border: '1px solid rgba(155,127,255,0.3)' }}>
                            ★ BEST MATCH
                          </span>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                          <div style={{
                            width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                            background: m.avatar_url ? `url(${m.avatar_url}) center/cover` : 'linear-gradient(135deg, #9B7FFF44, #7B5FE544)',
                            border: `2px solid ${i === 0 ? '#9B7FFF' : 'var(--border)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
                          }}>
                            {!m.avatar_url && '👤'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{m.name}</p>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>@{m.username}</p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '20px', fontWeight: 800, color: i === 0 ? '#9B7FFF' : 'var(--text-muted)' }}>{m.match_score}%</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>match</div>
                          </div>
                        </div>

                        {/* Match score bar */}
                        <div style={{ height: '3px', borderRadius: '999px', background: 'var(--overlay-2)', marginBottom: '10px' }}>
                          <div style={{ width: `${m.match_score}%`, height: '100%', borderRadius: '999px', background: i === 0 ? 'linear-gradient(90deg, #9B7FFF, #7B5FE5)' : 'rgba(155,127,255,0.4)', transition: 'width 1s ease' }} />
                        </div>

                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 12px' }}>{m.reason}</p>

                        <Link
                          href={`/messages?to=${m.username}`}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            padding: '7px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
                            background: i === 0 ? 'rgba(155,127,255,0.15)' : 'var(--overlay-2)',
                            border: i === 0 ? '1px solid rgba(155,127,255,0.3)' : '1px solid var(--border)',
                            color: i === 0 ? '#9B7FFF' : 'var(--text-muted)', textDecoration: 'none',
                          }}
                        >
                          <Zap size={12} /> Connect →
                        </Link>
                      </div>
                    ))}
                  </div>
                )}

                {result.summary && (
                  <p style={{ fontSize: '12px', color: 'var(--text-dim)', fontStyle: 'italic', marginTop: '12px', textAlign: 'center' }}>
                    🐝 {result.summary}
                  </p>
                )}

                {result.engine && (
                  <p style={{ fontSize: '11px', color: result.engine.personal ? '#16A34A' : 'var(--text-dim)', marginTop: '8px', textAlign: 'center' }}>
                    {result.engine.personal
                      ? `✅ Powered by your connected ${result.engine.provider} key`
                      : '⚡ Powered by Bestie AI (connect your own key above)'}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* Shared board — needs & offers for the whole crew */}
        {!result && (
          <div style={{ marginBottom: '28px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: 'var(--text-dim)', marginBottom: '12px' }}>CREW BOARD</p>

            {/* Composer */}
            <div style={{ padding: '14px', borderRadius: '14px', background: 'var(--surface-1)', border: '1px solid rgba(155,127,255,0.18)', marginBottom: '14px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                {(['need', 'offer'] as const).map(k => (
                  <button key={k} onClick={() => setBoardKind(k)} style={{
                    flex: 1, padding: '8px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                    background: boardKind === k ? (k === 'need' ? 'rgba(155,127,255,0.18)' : 'rgba(52,211,153,0.15)') : 'var(--bg)',
                    border: boardKind === k ? `1.5px solid ${k === 'need' ? '#9B7FFF' : '#34D399'}` : '1px solid var(--border)',
                    color: boardKind === k ? (k === 'need' ? '#9B7FFF' : '#34D399') : 'var(--text-muted)',
                    cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif',
                  }}>
                    {k === 'need' ? '🙋 I need…' : '✋ I can help…'}
                  </button>
                ))}
              </div>
              <textarea
                value={boardText}
                onChange={e => setBoardText(e.target.value)}
                placeholder={boardKind === 'need' ? 'What are you looking for? e.g. a designer to redo our pitch deck' : 'What can you offer the crew? e.g. free 30-min marketing audits'}
                rows={2}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px',
                  background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-primary)',
                  fontFamily: 'Plus Jakarta Sans, sans-serif', resize: 'vertical', boxSizing: 'border-box',
                  marginBottom: '10px', outline: 'none', lineHeight: 1.5,
                }}
              />
              <button onClick={postToBoard} disabled={!boardText.trim() || posting} style={{
                width: '100%', padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
                background: !boardText.trim() ? 'var(--overlay-2)' : 'linear-gradient(135deg, #9B7FFF, #7B5FE5)',
                border: 'none', color: !boardText.trim() ? 'var(--text-dim)' : '#fff',
                cursor: !boardText.trim() || posting ? 'not-allowed' : 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif',
              }}>
                {posting ? 'Posting…' : 'Post to crew'}
              </button>
            </div>

            {/* Feed */}
            {board.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center', padding: '12px' }}>
                No posts yet — be the first to share what you need or offer.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {board.map(post => {
                  const isNeed = post.kind === 'need'
                  const closed = post.status === 'closed'
                  return (
                    <div key={post.id} style={{
                      padding: '12px 14px', borderRadius: '12px', background: 'var(--surface-1)',
                      border: `1px solid ${isNeed ? 'rgba(155,127,255,0.18)' : 'rgba(52,211,153,0.18)'}`,
                      opacity: closed ? 0.5 : 1,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{
                          fontSize: '9px', fontWeight: 700, letterSpacing: '0.4px', padding: '2px 7px', borderRadius: '999px',
                          background: isNeed ? 'rgba(155,127,255,0.15)' : 'rgba(52,211,153,0.15)',
                          color: isNeed ? '#9B7FFF' : '#34D399',
                        }}>
                          {isNeed ? 'NEEDS' : 'OFFERS'}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {post.author?.full_name || post.author?.username || 'Member'}
                        </span>
                        {closed && <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>· closed</span>}
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 8px', lineHeight: 1.5, textDecoration: closed ? 'line-through' : 'none' }}>
                        {post.body}
                      </p>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {!post.isMine && post.author?.username && (
                          <Link href={`/messages?to=${post.author.username}`} style={{
                            fontSize: '12px', fontWeight: 600, color: isNeed ? '#9B7FFF' : '#34D399', textDecoration: 'none',
                          }}>
                            {isNeed ? 'I can help →' : 'Reach out →'}
                          </Link>
                        )}
                        {post.isMine && (
                          <>
                            <button onClick={() => toggleBoardStatus(post)} style={{
                              background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', padding: 0, fontFamily: 'Plus Jakarta Sans, sans-serif',
                            }}>
                              {closed ? 'Reopen' : 'Mark resolved'}
                            </button>
                            <button onClick={() => deleteBoardPost(post.id)} style={{
                              background: 'none', border: 'none', color: '#FF4560', fontSize: '12px', cursor: 'pointer', padding: 0, fontFamily: 'Plus Jakarta Sans, sans-serif',
                            }}>
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* History */}
        {history.length > 0 && !result && (
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: 'var(--text-dim)', marginBottom: '12px' }}>RECENT SEARCHES</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {history.map((h, i) => (
                <div key={h.id || i} style={{
                  padding: '12px 14px', borderRadius: '12px', background: 'var(--surface-1)',
                  border: '1px solid var(--border)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px',
                }}>
                  <span
                    onClick={() => runSwarm(h.query)}
                    style={{ flex: 1, cursor: 'pointer', color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5 }}
                  >
                    "{h.query}"
                  </span>
                  <span
                    onClick={() => runSwarm(h.query)}
                    style={{ fontSize: '11px', color: 'var(--text-dim)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >↩ re-run</span>
                  <button
                    onClick={() => deleteHistory(h.id)}
                    disabled={deletingId === h.id}
                    aria-label="Delete search"
                    style={{
                      flexShrink: 0, width: '26px', height: '26px', borderRadius: '8px', padding: 0,
                      background: 'rgba(255,69,96,0.08)', border: '1px solid rgba(255,69,96,0.2)',
                      color: '#FF4560', cursor: deletingId === h.id ? 'wait' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Crew directory — everyone's skills & agents */}
        {members.length > 0 && !result && (
          <div style={{ marginTop: history.length > 0 ? '28px' : '0' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '12px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: 'var(--text-dim)', margin: 0 }}>YOUR CREW</p>
              <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: 0 }}>
                {members.filter(m => m.agent?.is_active).length} of {members.length} agents active
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {members.map((m) => {
                const active = !!m.agent?.is_active
                return (
                  <div key={m.id} style={{
                    padding: '14px', borderRadius: '14px', background: 'var(--surface-1)',
                    border: active ? '1px solid rgba(155,127,255,0.25)' : '1px solid var(--border)',
                    display: 'flex', gap: '12px', alignItems: 'flex-start',
                  }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                      background: m.avatar_url ? `url(${m.avatar_url}) center/cover` : 'linear-gradient(135deg, #9B7FFF44, #7B5FE544)',
                      border: `2px solid ${active ? '#9B7FFF' : 'var(--border)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
                    }}>
                      {!m.avatar_url && '👤'}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {m.full_name || m.username}{m.isMe ? ' (you)' : ''}
                        </span>
                        {active ? (
                          <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.4px', padding: '2px 7px', borderRadius: '999px', background: 'rgba(52,211,153,0.12)', color: '#34D399', border: '1px solid rgba(52,211,153,0.3)' }}>
                            ● AGENT ON
                          </span>
                        ) : (
                          <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.4px', padding: '2px 7px', borderRadius: '999px', background: 'var(--overlay)', color: 'var(--text-dim)', border: '1px solid var(--border)' }}>
                            NO AGENT
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                        @{m.username}{m.city ? ` · ${m.city}` : ''}
                      </p>
                      {active && m.agent?.skills && (
                        <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '8px 0 0', lineHeight: 1.5 }}>
                          {m.agent.skills.length > 160 ? m.agent.skills.slice(0, 160) + '…' : m.agent.skills}
                        </p>
                      )}
                    </div>

                    {!m.isMe && (
                      <Link href={`/messages?to=${m.username}`} style={{
                        flexShrink: 0, padding: '7px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
                        background: 'rgba(155,127,255,0.12)', border: '1px solid rgba(155,127,255,0.25)',
                        color: '#9B7FFF', textDecoration: 'none', whiteSpace: 'nowrap',
                      }}>
                        Message
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
