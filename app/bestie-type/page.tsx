// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const QUESTIONS = [
  {
    id: 'e1', block: 'energy', blockLabel: 'Energy',
    question: 'How do you usually initiate plans with people?',
    options: [
      { text: 'I come up with the idea and invite people myself', scores: { spark: 3, dynamo: 2 } },
      { text: 'I respond when invited and then fully commit', scores: { builder: 3, anchor: 1 } },
      { text: 'I wait for the right moment and invitation', scores: { guide: 3 } },
      { text: 'It depends on my mood and who\'s around', scores: { mirror: 3, dynamo: 1 } },
    ],
  },
  {
    id: 'e2', block: 'energy', blockLabel: 'Energy',
    question: 'After a full social day, you feel...',
    options: [
      { text: 'Energized — I want more', scores: { spark: 2, builder: 3 } },
      { text: 'Drained — I need time alone', scores: { guide: 3, mirror: 2 } },
      { text: 'It depends entirely on the company', scores: { mirror: 3 } },
      { text: 'Accomplished but tired — I did a lot', scores: { dynamo: 3 } },
    ],
  },
  {
    id: 'e3', block: 'energy', blockLabel: 'Energy',
    question: 'Your style in a group of people:',
    options: [
      { text: 'I set the direction and suggest what to do', scores: { spark: 3, dynamo: 2 } },
      { text: 'I do the work — reliably and in flow', scores: { builder: 3 } },
      { text: 'I read people deeply and offer valuable insight', scores: { guide: 3 } },
      { text: 'I mirror the group\'s energy and adapt', scores: { mirror: 3 } },
    ],
  },
  {
    id: 'e4', block: 'energy', blockLabel: 'Energy',
    question: 'How do you make decisions?',
    options: [
      { text: 'Fast and intuitive — I adjust later', scores: { spark: 2, dynamo: 3 } },
      { text: 'Methodically — once it\'s clear, I act', scores: { builder: 3 } },
      { text: 'I observe and wait for clarity — sometimes for a while', scores: { mirror: 3, guide: 2 } },
      { text: 'When someone asks me — that\'s when I think', scores: { guide: 3 } },
    ],
  },
  {
    id: 'm1', block: 'mind', blockLabel: 'Mind',
    question: 'What energizes you most in a conversation?',
    options: [
      { text: 'Ideas, concepts, "what if..." thinking', scores: { visionary: 3 } },
      { text: 'Depth, emotions, real connection', scores: { connector: 3 } },
      { text: 'Concrete plans and actionable steps', scores: { anchor: 3 } },
      { text: 'Spontaneity, humor, living in the moment', scores: { explorer: 3 } },
    ],
  },
  {
    id: 'm2', block: 'mind', blockLabel: 'Mind',
    question: 'How do you prepare to meet someone new?',
    options: [
      { text: 'I think of topics to discuss in advance', scores: { visionary: 2, anchor: 2 } },
      { text: 'I imagine how we might understand each other', scores: { connector: 3 } },
      { text: 'I confirm the place and time — that\'s it', scores: { anchor: 2, explorer: 2 } },
      { text: 'I don\'t prepare — I just show up', scores: { explorer: 3 } },
    ],
  },
  {
    id: 'm3', block: 'mind', blockLabel: 'Mind',
    question: 'What matters most to you in a friendship?',
    options: [
      { text: 'Intellectual stimulation and growth', scores: { visionary: 3 } },
      { text: 'Emotional closeness and understanding', scores: { connector: 3 } },
      { text: 'Reliability and stability', scores: { anchor: 3 } },
      { text: 'Shared adventures and fun', scores: { explorer: 3 } },
    ],
  },
  {
    id: 'm4', block: 'mind', blockLabel: 'Mind',
    question: 'How do you handle conflict?',
    options: [
      { text: 'I analyze and find a logical solution', scores: { visionary: 3 } },
      { text: 'I try to understand everyone\'s feelings', scores: { connector: 3 } },
      { text: 'I stick to agreements and principles', scores: { anchor: 3 } },
      { text: 'I defuse it with humor or step back', scores: { explorer: 3 } },
    ],
  },
  {
    id: 'v1', block: 'vibe', blockLabel: 'Vibe',
    question: 'What kind of activity appeals to you most?',
    options: [
      { text: 'Something new, exciting, with adrenaline', scores: { fire: 3 } },
      { text: 'Something calm and quality — hike, coffee, nature', scores: { earth: 3 } },
      { text: 'Conversations, ideas, meeting new people', scores: { air: 3 } },
      { text: 'Something deep and intimate — music, film, trust', scores: { water: 3 } },
    ],
  },
  {
    id: 'v2', block: 'vibe', blockLabel: 'Vibe',
    question: 'How do you feel at a big party?',
    options: [
      { text: 'In my element — this is my scene', scores: { fire: 3, air: 2 } },
      { text: 'Fine, but I\'d prefer a cozy dinner', scores: { earth: 3 } },
      { text: 'I love meeting new people', scores: { air: 3 } },
      { text: 'I get drained — too much surface level', scores: { water: 3 } },
    ],
  },
  {
    id: 'v3', block: 'vibe', blockLabel: 'Vibe',
    question: 'Which describes you best?',
    options: [
      { text: 'Passionate, bold, I ignite others', scores: { fire: 3 } },
      { text: 'Reliable, practical, I like order', scores: { earth: 3 } },
      { text: 'Social, curious, flexible', scores: { air: 3 } },
      { text: 'Sensitive, deep, intuitive', scores: { water: 3 } },
    ],
  },
  {
    id: 'v4', block: 'vibe', blockLabel: 'Vibe',
    question: 'What bothers you most in other people?',
    options: [
      { text: 'Passivity and indecisiveness', scores: { fire: 3 } },
      { text: 'Unreliability and chaos', scores: { earth: 3 } },
      { text: 'Closed-mindedness and dullness', scores: { air: 3 } },
      { text: 'Superficiality and insincerity', scores: { water: 3 } },
    ],
  },
]

const ENERGY_INFO = {
  spark:   { emoji: '⚡', label: 'The Spark',   desc: 'You initiate, ignite, and create movement. Your energy is powerful — in bursts.' },
  builder: { emoji: '🔥', label: 'The Builder',  desc: 'Reliable and in flow. Once you\'re in — you go all the way.' },
  dynamo:  { emoji: '🌀', label: 'The Dynamo',   desc: 'Fast, multitasking, always moving. You\'re everywhere at once.' },
  guide:   { emoji: '🌙', label: 'The Guide',    desc: 'You see people deeply. It\'s rare to feel truly heard — you make that happen.' },
  mirror:  { emoji: '🪞', label: 'The Mirror',   desc: 'You reflect your environment. Highly attuned to atmosphere and the people around you.' },
}

const MIND_INFO = {
  visionary: { emoji: '💡', label: 'Visionary', desc: 'Strategic and idea-driven. You love deep discussions and systems thinking.' },
  connector: { emoji: '💛', label: 'Connector', desc: 'Empathetic and meaning-seeking. You\'re here for real connection.' },
  anchor:    { emoji: '⚓', label: 'Anchor',    desc: 'Reliable and grounded. You show up on time and keep your word.' },
  explorer:  { emoji: '🧭', label: 'Explorer',  desc: 'You live in the moment. Spontaneous, active, always up for something new.' },
}

const VIBE_INFO = {
  fire:  { emoji: '🔥', label: 'Fire',  desc: 'Passionate and driven. You want action, excitement, and inspiration.' },
  earth: { emoji: '🌿', label: 'Earth', desc: 'Stable and grounded. You value quality, consistency, and the real.' },
  air:   { emoji: '💨', label: 'Air',   desc: 'Intellectual and social. You\'re the best conversation partner in the room.' },
  water: { emoji: '🌊', label: 'Water', desc: 'Intuitive and deep. You\'re searching for genuine, lasting connection.' },
}

function calcType(answers: Record<string, any>) {
  const energy: Record<string, number> = { spark: 0, builder: 0, dynamo: 0, guide: 0, mirror: 0 }
  const mind: Record<string, number> = { visionary: 0, connector: 0, anchor: 0, explorer: 0 }
  const vibe: Record<string, number> = { fire: 0, earth: 0, air: 0, water: 0 }

  Object.entries(answers).forEach(([qId, optIdx]) => {
    const q = QUESTIONS.find(q => q.id === qId)
    if (!q) return
    const scores = q.options[optIdx as number]?.scores || {}
    Object.entries(scores).forEach(([key, val]) => {
      if (key in energy) energy[key] += val as number
      if (key in mind) mind[key] += val as number
      if (key in vibe) vibe[key] += val as number
    })
  })

  return {
    energy: Object.entries(energy).sort((a, b) => b[1] - a[1])[0][0],
    mind: Object.entries(mind).sort((a, b) => b[1] - a[1])[0][0],
    vibe: Object.entries(vibe).sort((a, b) => b[1] - a[1])[0][0],
  }
}

function calcVibeFromBirth(dateStr: string) {
  const d = new Date(dateStr)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const doy = month * 100 + day
  if ((doy >= 321 && doy <= 419) || (doy >= 723 && doy <= 822) || (doy >= 1123 && doy <= 1221)) return 'fire'
  if ((doy >= 420 && doy <= 520) || (doy >= 823 && doy <= 922) || (doy >= 1222 || doy <= 119)) return 'earth'
  if ((doy >= 521 && doy <= 620) || (doy >= 923 && doy <= 1022) || (doy >= 120 && doy <= 218)) return 'air'
  return 'water'
}

export default function BestieTypePage() {
  const router = useRouter()
  const [step, setStep] = useState<'intro' | 'quiz' | 'result'>('intro')
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [birthDate, setBirthDate] = useState('')
  const [result, setResult] = useState<{ energy: string; mind: string; vibe: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login')
      else setUserId(user.id)
    })
  }, [])

  const handleAnswer = (optIdx: number) => {
    const q = QUESTIONS[currentQ]
    const newAnswers = { ...answers, [q.id]: optIdx }
    setAnswers(newAnswers)
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(currentQ + 1)
    } else {
      const calc = calcType(newAnswers)
      if (birthDate) calc.vibe = calcVibeFromBirth(birthDate)
      setResult(calc)
      setStep('result')
    }
  }

  const handleSave = async () => {
    if (!result || !userId) return
    setSaving(true)
    await supabase.from('users').update({
      energy_type: result.energy,
      mind_type: result.mind,
      vibe_type: result.vibe,
      bestie_type_completed: true,
      ...(birthDate ? { birth_date: birthDate } : {}),
    }).eq('id', userId)
    setSaving(false)
    router.push('/dashboard')
  }

  const progress = ((currentQ) / QUESTIONS.length) * 100
  const q = QUESTIONS[currentQ]
  const blocks = ['Energy', 'Mind', 'Vibe']
  const currentBlock = q?.blockLabel

  if (step === 'intro') return (
    <div style={{ minHeight: '100vh', background: '#080810', fontFamily: 'Plus Jakarta Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: '480px', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '56px', marginBottom: '24px' }}>✨</div>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '36px', color: '#E8E0FF', marginBottom: '12px' }}>Discover your Bestie Type</h1>
        <p style={{ fontSize: '15px', color: '#9B93C0', lineHeight: 1.7, marginBottom: '32px' }}>
          12 questions. Three layers — Energy, Mind, Vibe. Your result will appear on your Social Passport.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '32px' }}>
          {[
            { emoji: '⚡', label: 'Energy', sub: 'How you charge socially' },
            { emoji: '💡', label: 'Mind', sub: 'How you think and connect' },
            { emoji: '🌊', label: 'Vibe', sub: 'Your natural temperament' },
          ].map(b => (
            <div key={b.label} style={{ flex: 1, padding: '16px 12px', borderRadius: '16px', background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>{b.emoji}</div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#E8E0FF', marginBottom: '4px' }}>{b.label}</p>
              <p style={{ fontSize: '11px', color: '#9B93C0', lineHeight: 1.4 }}>{b.sub}</p>
            </div>
          ))}
        </div>
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '13px', color: '#9B93C0', display: 'block', marginBottom: '8px', textAlign: 'left' }}>
            Date of birth <span style={{ color: '#6B5EA8' }}>(optional — used for Vibe)</span>
          </label>
          <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
            style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.1)', color: '#E8E0FF', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }} />
        </div>
        <button onClick={() => setStep('quiz')} style={{ width: '100%', padding: '16px', borderRadius: '14px', fontSize: '15px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', border: 'none', cursor: 'pointer' }}>
          Start →
        </button>
        <Link href="/dashboard" style={{ display: 'block', marginTop: '16px', fontSize: '13px', color: '#9B93C0', textDecoration: 'none' }}>Skip for now</Link>
      </div>
    </div>
  )

  if (step === 'quiz') return (
    <div style={{ minHeight: '100vh', background: '#080810', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {blocks.map(b => (
                <span key={b} style={{ fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '999px', background: b === currentBlock ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)', border: b === currentBlock ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.06)', color: b === currentBlock ? '#D4AF37' : '#9B93C0' }}>{b}</span>
              ))}
            </div>
            <span style={{ fontSize: '13px', color: '#9B93C0' }}>{currentQ + 1} / {QUESTIONS.length}</span>
          </div>
          <div style={{ height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, borderRadius: '999px', background: 'linear-gradient(90deg, #D4AF37, #39FF14)', transition: 'width 0.3s' }} />
          </div>
        </div>

        <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '26px', color: '#E8E0FF', marginBottom: '32px', lineHeight: 1.4 }}>
          {q.question}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {q.options.map((opt, i) => (
            <button key={i} onClick={() => handleAnswer(i)} style={{ padding: '18px 20px', borderRadius: '16px', fontSize: '15px', textAlign: 'left', background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.08)', color: '#E8E0FF', cursor: 'pointer', transition: 'all 0.15s', lineHeight: 1.5 }}
              onMouseEnter={e => { (e.target as HTMLElement).style.border = '1px solid rgba(212,175,55,0.4)'; (e.target as HTMLElement).style.background = 'rgba(212,175,55,0.06)' }}
              onMouseLeave={e => { (e.target as HTMLElement).style.border = '1px solid rgba(255,255,255,0.08)'; (e.target as HTMLElement).style.background = '#0F0F1E' }}
            >
              {opt.text}
            </button>
          ))}
        </div>

        {currentQ > 0 && (
          <button onClick={() => setCurrentQ(currentQ - 1)} style={{ marginTop: '24px', background: 'none', border: 'none', fontSize: '13px', color: '#9B93C0', cursor: 'pointer' }}>← Back</button>
        )}
      </div>
    </div>
  )

  if (step === 'result' && result) {
    const e = ENERGY_INFO[result.energy]
    const m = MIND_INFO[result.mind]
    const v = VIBE_INFO[result.vibe]
    return (
      <div style={{ minHeight: '100vh', background: '#080810', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '2px', color: '#D4AF37', marginBottom: '16px' }}>YOUR BESTIE TYPE</p>
            <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '32px', color: '#E8E0FF', marginBottom: '8px' }}>
              {e.emoji} {e.label} · {m.label} · {v.label}
            </h1>
            <p style={{ fontSize: '14px', color: '#9B93C0' }}>One of ~400 unique combinations</p>
          </div>

          {[
            { info: e, label: 'Energy', color: '#D4AF37', borderColor: 'rgba(212,175,55,0.3)' },
            { info: m, label: 'Mind', color: '#9B8FFF', borderColor: 'rgba(155,143,255,0.3)' },
            { info: v, label: 'Vibe', color: '#39FF14', borderColor: 'rgba(57,255,20,0.3)' },
          ].map(({ info, label, color, borderColor }) => (
            <div key={label} style={{ background: '#0F0F1E', border: `1px solid ${borderColor}`, borderRadius: '20px', padding: '24px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '32px' }}>{info.emoji}</span>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px', color, marginBottom: '2px' }}>{label.toUpperCase()}</p>
                  <p style={{ fontSize: '18px', fontWeight: 700, color: '#E8E0FF', fontFamily: 'DM Serif Display, serif' }}>{info.label}</p>
                </div>
              </div>
              <p style={{ fontSize: '14px', color: '#9B93C0', lineHeight: 1.6 }}>{info.desc}</p>
            </div>
          ))}

          <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '16px', borderRadius: '14px', fontSize: '15px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', border: 'none', cursor: 'pointer', marginTop: '8px' }}>
            {saving ? 'Saving...' : 'Save and add to passport →'}
          </button>

          <button onClick={() => { setStep('quiz'); setCurrentQ(0); setAnswers({}) }} style={{ width: '100%', marginTop: '12px', padding: '14px', borderRadius: '14px', fontSize: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#9B93C0', cursor: 'pointer' }}>
            Retake quiz
          </button>
        </div>
      </div>
    )
  }

  return null
}
