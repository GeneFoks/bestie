// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const QUESTIONS = [
  // Energy Type (4 вопроса)
  {
    id: 'e1', block: 'energy', blockLabel: 'Energy',
    question: 'Как ты обычно инициируешь встречи?',
    options: [
      { text: 'Сам предлагаю идею и зову людей', scores: { spark: 3, dynamo: 2 } },
      { text: 'Отвечаю когда меня зовут, и тогда включаюсь полностью', scores: { builder: 3, anchor: 1 } },
      { text: 'Жду подходящего момента и приглашения', scores: { guide: 3 } },
      { text: 'Зависит от настроения и людей вокруг', scores: { mirror: 3, dynamo: 1 } },
    ],
  },
  {
    id: 'e2', block: 'energy', blockLabel: 'Energy',
    question: 'После насыщенного социального дня ты чувствуешь...',
    options: [
      { text: 'Подъём — хочется ещё', scores: { spark: 2, builder: 3 } },
      { text: 'Усталость, нужно побыть одному', scores: { guide: 3, mirror: 2 } },
      { text: 'Всё зависит от компании', scores: { mirror: 3 } },
      { text: 'Успел сделать кучу всего и теперь устал', scores: { dynamo: 3 } },
    ],
  },
  {
    id: 'e3', block: 'energy', blockLabel: 'Energy',
    question: 'Твой стиль в группе людей:',
    options: [
      { text: 'Задаю направление, предлагаю что делать', scores: { spark: 3, dynamo: 2 } },
      { text: 'Делаю работу — надёжно и в потоке', scores: { builder: 3 } },
      { text: 'Вижу людей насквозь, даю ценный совет', scores: { guide: 3 } },
      { text: 'Отражаю энергию группы, адаптируюсь', scores: { mirror: 3 } },
    ],
  },
  {
    id: 'e4', block: 'energy', blockLabel: 'Energy',
    question: 'Как ты принимаешь решения?',
    options: [
      { text: 'Быстро, интуитивно, потом корректирую', scores: { spark: 2, dynamo: 3 } },
      { text: 'Методично, когда всё понятно — действую', scores: { builder: 3 } },
      { text: 'Наблюдаю, жду ясности — иногда долго', scores: { mirror: 3, guide: 2 } },
      { text: 'Когда меня спрашивают — тогда думаю', scores: { guide: 3 } },
    ],
  },
  // Mind Type (4 вопроса)
  {
    id: 'm1', block: 'mind', blockLabel: 'Mind',
    question: 'Что тебя больше всего заряжает в разговоре?',
    options: [
      { text: 'Идеи, концепции, "а что если..."', scores: { visionary: 3 } },
      { text: 'Глубина, эмоции, настоящая связь', scores: { connector: 3 } },
      { text: 'Конкретика, планы, реальные шаги', scores: { anchor: 3 } },
      { text: 'Спонтанность, юмор, живой момент', scores: { explorer: 3 } },
    ],
  },
  {
    id: 'm2', block: 'mind', blockLabel: 'Mind',
    question: 'Как ты готовишься к встрече с новым человеком?',
    options: [
      { text: 'Думаю о темах для разговора заранее', scores: { visionary: 2, anchor: 2 } },
      { text: 'Представляю как мы могли бы понять друг друга', scores: { connector: 3 } },
      { text: 'Договариваюсь о месте и времени — и всё', scores: { anchor: 2, explorer: 2 } },
      { text: 'Не готовлюсь — просто иду', scores: { explorer: 3 } },
    ],
  },
  {
    id: 'm3', block: 'mind', blockLabel: 'Mind',
    question: 'Что для тебя важнее в дружбе?',
    options: [
      { text: 'Интеллектуальная стимуляция и рост', scores: { visionary: 3 } },
      { text: 'Эмоциональная близость и понимание', scores: { connector: 3 } },
      { text: 'Надёжность и стабильность', scores: { anchor: 3 } },
      { text: 'Совместные приключения и веселье', scores: { explorer: 3 } },
    ],
  },
  {
    id: 'm4', block: 'mind', blockLabel: 'Mind',
    question: 'Как ты реагируешь на конфликт?',
    options: [
      { text: 'Анализирую и нахожу логическое решение', scores: { visionary: 3 } },
      { text: 'Стараюсь понять чувства всех сторон', scores: { connector: 3 } },
      { text: 'Придерживаюсь договорённостей и правил', scores: { anchor: 3 } },
      { text: 'Разряжаю обстановку юмором или дистанцией', scores: { explorer: 3 } },
    ],
  },
  // Vibe Type (4 вопроса)
  {
    id: 'v1', block: 'vibe', blockLabel: 'Vibe',
    question: 'Какая активность тебя больше всего привлекает?',
    options: [
      { text: 'Что-то новое, яркое, с адреналином', scores: { fire: 3 } },
      { text: 'Спокойное и качественное — поход, кофе, природа', scores: { earth: 3 } },
      { text: 'Разговоры, идеи, новые знакомства', scores: { air: 3 } },
      { text: 'Глубокое и камерное — музыка, кино, доверие', scores: { water: 3 } },
    ],
  },
  {
    id: 'v2', block: 'vibe', blockLabel: 'Vibe',
    question: 'Как ты себя чувствуешь на большой вечеринке?',
    options: [
      { text: 'В своей стихии — это моё', scores: { fire: 3, air: 2 } },
      { text: 'Нормально, но предпочту уютный ужин', scores: { earth: 3 } },
      { text: 'Люблю познакомиться с новыми людьми', scores: { air: 3 } },
      { text: 'Устаю — слишком много поверхностного', scores: { water: 3 } },
    ],
  },
  {
    id: 'v3', block: 'vibe', blockLabel: 'Vibe',
    question: 'Что тебя описывает лучше всего?',
    options: [
      { text: 'Страстный, смелый, зажигаю других', scores: { fire: 3 } },
      { text: 'Надёжный, практичный, люблю порядок', scores: { earth: 3 } },
      { text: 'Общительный, любопытный, гибкий', scores: { air: 3 } },
      { text: 'Чуткий, глубокий, интуитивный', scores: { water: 3 } },
    ],
  },
  {
    id: 'v4', block: 'vibe', blockLabel: 'Vibe',
    question: 'Что тебя больше всего раздражает в людях?',
    options: [
      { text: 'Пассивность и нерешительность', scores: { fire: 3 } },
      { text: 'Ненадёжность и хаос', scores: { earth: 3 } },
      { text: 'Закрытость и скука', scores: { air: 3 } },
      { text: 'Поверхностность и неискренность', scores: { water: 3 } },
    ],
  },
]

const ENERGY_INFO = {
  spark:   { emoji: '⚡', label: 'The Spark',   desc: 'Инициируешь, зажигаешь, создаёшь движение. Твоя энергия мощная — вспышками.' },
  builder: { emoji: '🔥', label: 'The Builder',  desc: 'Надёжный и в потоке. Когда включаешься — идёшь до конца.' },
  dynamo:  { emoji: '🌀', label: 'The Dynamo',   desc: 'Быстрый, многозадачный. Скучно не бывает — ты везде.' },
  guide:   { emoji: '🌙', label: 'The Guide',    desc: 'Видишь людей глубоко. Редкий дар — быть по-настоящему услышанным тобой.' },
  mirror:  { emoji: '🪞', label: 'The Mirror',   desc: 'Отражаешь среду. Очень чуткий к атмосфере и людям вокруг.' },
}

const MIND_INFO = {
  visionary: { emoji: '💡', label: 'Visionary', desc: 'Стратег и идейный. Любишь глубокие дискуссии и системное мышление.' },
  connector: { emoji: '💛', label: 'Connector', desc: 'Эмпатичный, ищешь смысл и настоящую связь с людьми.' },
  anchor:    { emoji: '⚓', label: 'Anchor',    desc: 'Надёжный и конкретный. Всегда приходишь вовремя и держишь слово.' },
  explorer:  { emoji: '🧭', label: 'Explorer',  desc: 'Живёшь моментом. Спонтанный, физически активный, любишь новое.' },
}

const VIBE_INFO = {
  fire:  { emoji: '🔥', label: 'Fire',  desc: 'Страстный и инициативный. Хочешь экшн и вдохновение.' },
  earth: { emoji: '🌿', label: 'Earth', desc: 'Стабильный и надёжный. Ценишь качество и конкретику.' },
  air:   { emoji: '💨', label: 'Air',   desc: 'Интеллектуальный и общительный. Лучший собеседник.' },
  water: { emoji: '🌊', label: 'Water', desc: 'Интуитивный и глубокий. Ищешь настоящую связь.' },
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
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '36px', color: '#E8E0FF', marginBottom: '12px' }}>Узнай свой Bestie Type</h1>
        <p style={{ fontSize: '15px', color: '#9B93C0', lineHeight: 1.7, marginBottom: '32px' }}>
          12 вопросов. Три слоя — Energy, Mind, Vibe. Результат появится на твоём Social Passport.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '32px' }}>
          {[
            { emoji: '⚡', label: 'Energy', sub: 'Как ты социально заряжаешься' },
            { emoji: '💡', label: 'Mind', sub: 'Как ты думаешь и общаешься' },
            { emoji: '🌊', label: 'Vibe', sub: 'Твой природный темперамент' },
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
            Дата рождения <span style={{ color: '#6B5EA8' }}>(необязательно — для Vibe)</span>
          </label>
          <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
            style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.1)', color: '#E8E0FF', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }} />
        </div>
        <button onClick={() => setStep('quiz')} style={{ width: '100%', padding: '16px', borderRadius: '14px', fontSize: '15px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', border: 'none', cursor: 'pointer' }}>
          Начать →
        </button>
        <Link href="/dashboard" style={{ display: 'block', marginTop: '16px', fontSize: '13px', color: '#9B93C0', textDecoration: 'none' }}>Пропустить</Link>
      </div>
    </div>
  )

  if (step === 'quiz') return (
    <div style={{ minHeight: '100vh', background: '#080810', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Progress */}
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

        {/* Question */}
        <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '26px', color: '#E8E0FF', marginBottom: '32px', lineHeight: 1.4 }}>
          {q.question}
        </h2>

        {/* Options */}
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
          <button onClick={() => setCurrentQ(currentQ - 1)} style={{ marginTop: '24px', background: 'none', border: 'none', fontSize: '13px', color: '#9B93C0', cursor: 'pointer' }}>← Назад</button>
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
            <p style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '2px', color: '#D4AF37', marginBottom: '16px' }}>ТВОЙ BESTIE TYPE</p>
            <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '32px', color: '#E8E0FF', marginBottom: '8px' }}>
              {e.emoji} {e.label} · {m.label} · {v.label}
            </h1>
            <p style={{ fontSize: '14px', color: '#9B93C0' }}>Уникальная комбинация из ~400 возможных</p>
          </div>

          {/* Three cards */}
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
            {saving ? 'Сохраняем...' : 'Сохранить и добавить в паспорт →'}
          </button>

          <button onClick={() => { setStep('quiz'); setCurrentQ(0); setAnswers({}) }} style={{ width: '100%', marginTop: '12px', padding: '14px', borderRadius: '14px', fontSize: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#9B93C0', cursor: 'pointer' }}>
            Пройти заново
          </button>
        </div>
      </div>
    )
  }

  return null
}
