// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Send, Zap, Trophy } from 'lucide-react'

const COMPANION_STYLES = {
  spark: { color: '#39FF14', glow: 'rgba(57,255,20,0.3)', bg: 'rgba(57,255,20,0.06)', border: 'rgba(57,255,20,0.25)', emoji: '⚡' },
  sage:  { color: '#D4AF37', glow: 'rgba(212,175,55,0.3)', bg: 'rgba(212,175,55,0.06)', border: 'rgba(212,175,55,0.25)', emoji: '🔮' },
  nova:  { color: '#7B8FF5', glow: 'rgba(123,143,245,0.3)', bg: 'rgba(123,143,245,0.06)', border: 'rgba(123,143,245,0.25)', emoji: '🌀' },
}

const QUICK_PROMPTS = [
  'Кто похож на меня?',
  'Что мне сделать сегодня?',
  'Как поднять Bestie Score?',
  'Найди мне crew',
]

export default function CompanionWidget() {
  const [open, setOpen]           = useState(false)
  const [companion, setCompanion] = useState<any>(null)
  const [messages, setMessages]   = useState<any[]>([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [quests, setQuests]       = useState<any[]>([])
  const [tab, setTab]             = useState<'chat' | 'quests'>('chat')
  const [session, setSession]     = useState<any>(null)
  const [pulse, setPulse]         = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load companion + session
  useEffect(() => {
    const load = async () => {
      const { data: { session: s } } = await supabase.auth.getSession()
      if (!s) return
      setSession(s)

      const { data: c } = await supabase
        .from('companions')
        .select('*')
        .eq('user_id', s.user.id)
        .single()
      if (!c) return
      setCompanion(c)

      // Load recent chat
      const { data: msgs } = await supabase
        .from('companion_messages')
        .select('role, content, created_at')
        .eq('user_id', s.user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      setMessages((msgs || []).reverse())

      // Load active quests
      const { data: uq } = await supabase
        .from('user_quests')
        .select('status, quest:quests(slug, title, icon, xp_reward, bs_reward, sparks_reward)')
        .eq('user_id', s.user.id)
        .eq('status', 'active')
        .limit(5)
      setQuests(uq || [])

      // Pulse after 3s to draw attention
      setTimeout(() => setPulse(true), 3000)
      setTimeout(() => setPulse(false), 6000)
    }
    load()
  }, [])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim()
    if (!msg || loading || !session) return
    setInput('')
    setLoading(true)

    const userMsg = { role: 'user', content: msg }
    setMessages(prev => [...prev, userMsg])

    try {
      const res = await fetch('/api/companion/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ message: msg }),
      })
      const data = await res.json()
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
        // Refresh companion level
        const { data: updated } = await supabase.from('companions').select('*').eq('user_id', session.user.id).single()
        if (updated) setCompanion(updated)
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Что-то пошло не так. Попробуй ещё раз.' }])
    }
    setLoading(false)
  }

  if (!companion) return null

  const style = COMPANION_STYLES[companion.type] || COMPANION_STYLES.spark
  const levelProgress = (companion.xp % 100)

  return (
    <>
      <style>{`
        @keyframes cwFloat {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes cwPulse {
          0%,100% { box-shadow: 0 0 0 0 ${style.glow}; }
          50% { box-shadow: 0 0 0 12px transparent; }
        }
        @keyframes cwSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cwTyping {
          0%,100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '16px',
            width: '56px',
            height: '56px',
            borderRadius: '18px',
            background: `radial-gradient(circle at 40% 40%, ${style.glow}, #111120)`,
            border: `1.5px solid ${style.border}`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '26px',
            zIndex: 1000,
            animation: pulse ? 'cwPulse 1.5s ease-in-out 3, cwFloat 3s ease-in-out infinite' : 'cwFloat 3s ease-in-out infinite',
            boxShadow: `0 4px 20px ${style.glow}`,
            transition: 'all 0.2s',
          }}
          title={`Поговорить с ${companion.name}`}
        >
          {style.emoji}
        </button>
      )}

      {/* Chat drawer */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9998,
          display: 'flex',
          flexDirection: 'column',
          height: 'min(600px, 85vh)',
          background: '#0d0d1a',
          borderTop: `1.5px solid ${style.border}`,
          borderRadius: '24px 24px 0 0',
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          animation: 'cwSlideUp 0.3s ease',
          boxShadow: `0 -8px 40px rgba(0,0,0,0.6), 0 -2px 20px ${style.glow}`,
        }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            {/* Avatar */}
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: `radial-gradient(circle, ${style.glow} 0%, transparent 70%)`,
              border: `1.5px solid ${style.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              flexShrink: 0,
            }}>
              {style.emoji}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: style.color }}>{companion.name}</span>
                <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '999px', background: style.bg, border: `1px solid ${style.border}`, color: style.color, fontWeight: 600 }}>
                  LVL {companion.level}
                </span>
              </div>
              {/* XP bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <div style={{ flex: 1, height: '3px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)' }}>
                  <div style={{ width: `${levelProgress}%`, height: '100%', borderRadius: '999px', background: style.color, transition: 'width 0.5s ease' }} />
                </div>
                <span style={{ fontSize: '10px', color: '#A99ECC', whiteSpace: 'nowrap' }}>{companion.xp} XP</span>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '4px', background: '#111120', borderRadius: '10px', padding: '3px' }}>
              {(['chat', 'quests'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding: '5px 12px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: tab === t ? style.color : 'transparent',
                  color: tab === t ? '#09090F' : '#A99ECC',
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                }}>
                  {t === 'chat' ? '💬' : '⚡'}
                </button>
              ))}
            </div>

            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#A99ECC', cursor: 'pointer', padding: '4px', display: 'flex' }}>
              <X size={18} strokeWidth={2} />
            </button>
          </div>

          {/* Chat tab */}
          {tab === 'chat' && (
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>{style.emoji}</div>
                    <p style={{ fontSize: '14px', color: '#A99ECC' }}>Начни разговор с {companion.name}!</p>
                  </div>
                )}

                {messages.map((m, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                  }}>
                    {m.role === 'assistant' && (
                      <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: style.bg, border: `1px solid ${style.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0, marginRight: '8px', marginTop: '2px' }}>
                        {style.emoji}
                      </div>
                    )}
                    <div style={{
                      maxWidth: '80%',
                      padding: '10px 14px',
                      borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: m.role === 'user' ? `linear-gradient(135deg, ${style.color}22, ${style.glow})` : '#161628',
                      border: m.role === 'user' ? `1px solid ${style.border}` : '1px solid rgba(255,255,255,0.08)',
                      fontSize: '14px',
                      color: '#E8E0FF',
                      lineHeight: 1.6,
                    }}>
                      {m.content}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: style.bg, border: `1px solid ${style.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>{style.emoji}</div>
                    <div style={{ display: 'flex', gap: '4px', padding: '10px 14px', background: '#161628', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {[0,1,2].map(i => (
                        <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: style.color, animation: 'cwTyping 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s` }} />
                      ))}
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Quick prompts */}
              <div style={{ padding: '0 20px 8px', display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none', flexShrink: 0 }}>
                {QUICK_PROMPTS.map((p) => (
                  <button key={p} onClick={() => sendMessage(p)} style={{
                    whiteSpace: 'nowrap',
                    padding: '6px 12px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: 500,
                    background: style.bg,
                    border: `1px solid ${style.border}`,
                    color: style.color,
                    cursor: 'pointer',
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    flexShrink: 0,
                  }}>
                    {p}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div style={{ padding: '12px 20px 20px', display: 'flex', gap: '10px', flexShrink: 0 }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder={`Напиши ${companion.name}...`}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '14px',
                    fontSize: '14px',
                    outline: 'none',
                    background: '#111120',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#F0EAFF',
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                  }}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: input.trim() && !loading ? style.color : 'rgba(255,255,255,0.06)',
                    border: 'none',
                    cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.2s',
                  }}
                >
                  <Send size={16} strokeWidth={2.5} color={input.trim() && !loading ? '#09090F' : '#5A5375'} />
                </button>
              </div>
            </>
          )}

          {/* Quests tab */}
          {tab === 'quests' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '1.5px', color: '#A99ECC', marginBottom: '16px' }}>АКТИВНЫЕ КВЕСТЫ</h3>

              {quests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎯</div>
                  <p style={{ fontSize: '14px', color: '#A99ECC' }}>Квесты появятся скоро!</p>
                  <button onClick={() => sendMessage('Дай мне квест!')} style={{ marginTop: '12px', padding: '8px 20px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, background: style.bg, border: `1px solid ${style.border}`, color: style.color, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    Попросить квест
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {quests.map((uq, i) => {
                    const q = uq.quest
                    return (
                      <div key={i} style={{ padding: '14px 16px', borderRadius: '14px', background: '#111120', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '24px', flexShrink: 0 }}>{q.icon}</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '14px', fontWeight: 600, color: '#F0EAFF', marginBottom: '2px' }}>{q.title}</p>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {q.xp_reward > 0 && <span style={{ fontSize: '11px', color: style.color, fontWeight: 600 }}>+{q.xp_reward} XP</span>}
                            {q.bs_reward > 0 && <span style={{ fontSize: '11px', color: '#D4AF37', fontWeight: 600 }}>+{q.bs_reward} BS</span>}
                            {q.sparks_reward > 0 && <span style={{ fontSize: '11px', color: '#39FF14', fontWeight: 600 }}>+{q.sparks_reward} ⚡</span>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9997 }}
        />
      )}
    </>
  )
}
