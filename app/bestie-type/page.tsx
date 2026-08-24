// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { showToast } from '@/components/Toast'
import { celebrate, buzz } from '@/lib/celebrate'
import TypeCrest from '@/components/TypeCrest'
import {
  QUESTIONS, TYPES, FAMILY, COLLECTIVE, POLES, ELEMENTS, computeKey,
  QUESTIONS_RU, TYPES_RU, FAMILY_RU, COLLECTIVE_RU, POLES_RU, ELEMENTS_RU,
} from '@/lib/socionics'

const GOLD = '#D4AF37'
const BG = '#09090F'
const CARD = '#111120'
const TXT = '#F0EAFF'
const MUT = '#A99ECC'

const UI = {
  en: {
    title: 'Discover your Bestie Type',
    lead: 'A 5-minute test. You’ll learn your Bestie Type — one of 16 personality types: your family (core values) and collective (how you act). It appears on your Social Passport and powers your matches.',
    honest: 'Choose not «what’s right» but how it most often happens by itself. There are no wrong answers.',
    birth: 'Date of birth', optional: '(optional)', start: 'Start →', skip: 'Skip for now',
    birthBenefit: 'Add your birthday to unlock birthday features',
    credit: 'The Bestie Type test is built on classical socionics — a 16-type personality typology.',
    yourType: 'YOUR BESTIE TYPE', proto: 'prototype in classic socionics',
    flavor: 'Your Bestie Type — we call it your eterotype.',
    family: 'Family', collective: 'Collective',
    values: 'YOUR VALUES · FAMILY', mode: 'YOUR MODE OF ACTION · COLLECTIVE', strengths: 'YOUR STRENGTHS',
    save: 'Save to my passport →', saving: 'Saving…',
    join: 'Join Bestie — save it & meet your matches →',
    kept: 'Your result is kept — it saves to your passport automatically after you sign up.',
    share: '↗ Share my type', sharePreparing: 'Preparing your card…', shared: 'Link copied ✓', retake: 'Retake',
    reading: 'Reading your answers…',
    shareText: (name: string) => `I’m a ${name} on Bestie — what’s your friendship type? bestiehere.com/bestie-type`,
  },
  ru: {
    title: 'Узнай свой Bestie Type',
    lead: 'Тест на 5 минут. Ты узнаешь свой Bestie Type — один из 16 типов личности: семью — твои глубинные ценности, и коллектив — твою природную форму деятельности. Тип появится в твоём социальном паспорте и будет влиять на подбор людей.',
    honest: 'Выбирай не «как правильно», а как чаще всего происходит само. Здесь нет неправильных ответов.',
    birth: 'Дата рождения', optional: '(необязательно)', start: 'Начать →', skip: 'Пропустить',
    birthBenefit: 'Добавь дату рождения, чтобы открыть функции дня рождения',
    credit: 'Тест Bestie Type построен на классической соционике — типологии из 16 типов личности.',
    yourType: 'ТВОЙ BESTIE TYPE', proto: 'прототип в классической соционике',
    flavor: 'Твой Bestie Type — мы называем его этеротип.',
    family: 'Семья', collective: 'Коллектив',
    values: 'ТВОИ ЦЕННОСТИ · СЕМЬЯ', mode: 'ТВОЯ ФОРМА ДЕЯТЕЛЬНОСТИ · КОЛЛЕКТИВ', strengths: 'ТВОЯ СИЛА',
    save: 'Сохранить в паспорт →', saving: 'Сохраняю…',
    join: 'Вступить в Bestie — сохранить и увидеть своих →',
    kept: 'Результат не потеряется — сохранится в паспорт автоматически после регистрации.',
    share: '↗ Поделиться типом', sharePreparing: 'Готовлю карточку…', shared: '✓ Скопировано — отправь другу', retake: 'Пройти заново',
    reading: 'Читаю твои ответы…',
    shareText: (name: string, fam: string, col: string) => `Мой Bestie Type: ${name} 🧭 Семья: ${fam} · Коллектив: ${col}. А ты кто?`,
  },
}

export default function BestieTypePage() {
  const router = useRouter()
  const [step, setStep] = useState<'intro' | 'quiz' | 'reading' | 'result'>('intro')
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<(number | undefined)[]>([])
  const [birthDate, setBirthDate] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState(null)
  const [shared, setShared] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [lang, setLang] = useState<'en' | 'ru'>('en')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('bestie_lang')
      if (saved === 'ru' || saved === 'en') setLang(saved)
    } catch {}
  }, [])
  const switchLang = (l: 'en' | 'ru') => {
    setLang(l)
    try { localStorage.setItem('bestie_lang', l) } catch {}
  }
  const T = UI[lang]

  const LangToggle = () => (
    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '18px' }}>
      {(['en', 'ru'] as const).map(l => (
        <button key={l} onClick={() => switchLang(l)} style={{ padding: '5px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', fontFamily: 'Plus Jakarta Sans, sans-serif',
          background: lang === l ? GOLD : 'rgba(255,255,255,0.06)',
          border: lang === l ? 'none' : '1px solid rgba(255,255,255,0.12)',
          color: lang === l ? BG : MUT }}>
          {l}
        </button>
      ))}
    </div>
  )

  // The test is public — guests can take it. Their result is kept in
  // localStorage so it survives the signup detour and can be saved later.
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
      try {
        const pending = localStorage.getItem('bestie_pending_type')
        if (pending) {
          const p = JSON.parse(pending)
          if (p?.key && TYPES[p.key]) {
            setResult(p.key)
            if (p.birthDate) setBirthDate(p.birthDate)
            setStep('result')
          }
        }
      } catch {}
    })
  }, [])

  const start = () => { setAnswers([]); setCurrentQ(0); setStep('quiz') }

  const handleAnswer = (pole: number) => {
    const next = [...answers]; next[currentQ] = pole; setAnswers(next)
    if (currentQ < QUESTIONS.length - 1) setCurrentQ(currentQ + 1)
    else {
      const key = computeKey(next)
      setResult(key)
      try { localStorage.setItem('bestie_pending_type', JSON.stringify({ key, birthDate })) } catch {}
      // Staged reveal: a short "reading" beat before the ceremony, not an instant swap.
      setStep('reading')
    }
  }

  // The reveal itself: after the interstitial, show the result and fire confetti
  // tinted to the type's element colors.
  useEffect(() => {
    if (step !== 'reading') return
    const id = setTimeout(() => {
      setStep('result')
      const t = result ? TYPES[result] : null
      celebrate({
        count: 70, spread: 95, origin: { x: 0.5, y: 0.35 },
        ...(t ? { colors: [ELEMENTS[t.fam].color, ELEMENTS[t.col].color, GOLD, '#F0EAFF'] } : {}),
      })
      buzz('success')
    }, 1800)
    return () => clearTimeout(id)
  }, [step, result])

  const handleShare = async () => {
    if (!result || sharing) return
    const t = TYPES[result]
    const text = lang === 'ru'
      ? UI.ru.shareText(TYPES_RU[result].name, ELEMENTS_RU[t.fam], ELEMENTS_RU[t.col])
      : UI.en.shareText(t.name)
    const url = 'https://bestiehere.com/bestie-type'
    setSharing(true)
    try {
      // Render the 9:16 story card and hand it to the native share sheet.
      const res = await fetch('/api/type-card/' + result)
      if (!res.ok) throw new Error('card render failed')
      const blob = await res.blob()
      const file = new File([blob], `bestie-type-${result.toLowerCase()}.png`, { type: 'image/png' })
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: 'My Bestie Type', text }) } catch {}
        setSharing(false)
        return
      }
      // No file-share support (desktop): download the PNG + copy the test link.
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = `bestie-type-${result.toLowerCase()}.png`
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(objectUrl), 4000)
    } catch {
      // Card unavailable — fall back to the plain text share.
      if (typeof navigator !== 'undefined' && navigator.share) {
        try { await navigator.share({ title: 'My Bestie Type', text, url }); setSharing(false); return } catch {}
      }
    }
    try { await navigator.clipboard.writeText(`${text}\n${url}`) } catch {}
    setSharing(false)
    setShared(true); setTimeout(() => setShared(false), 2000)
  }

  const handleSave = async () => {
    if (!result || !userId) return
    const t = TYPES[result]
    setSaving(true)
    const { error } = await supabase.from('users').update({
      eterotype: result,
      eterotype_name: t.name,
      eterotype_family: t.fam,
      eterotype_collective: t.col,
      bestie_type_completed: true,
      // Finishing the test also completes onboarding — prevents the dashboard
      // guard from bouncing the user back to step 1.
      onboarding_completed: true,
      ...(birthDate ? { birth_date: birthDate } : {}),
    }).eq('id', userId)
    try { localStorage.removeItem('bestie_pending_type') } catch {}
    setSaving(false)
    if (error) { console.error(error); showToast("Couldn't save your result — try again", { type: 'error' }); return }
    // Straight to their matches, not an empty dashboard — the moment of intent.
    router.push('/browse?matched=1')
  }

  // ---------- INTRO ----------
  if (step === 'intro') return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: 'Plus Jakarta Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: '480px', padding: '48px 24px', textAlign: 'center' }}>
        <LangToggle />
        <div style={{ fontSize: '52px', marginBottom: '20px' }}>🧭</div>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '34px', color: TXT, marginBottom: '12px' }}>{T.title}</h1>
        <p style={{ fontSize: '15px', color: MUT, lineHeight: 1.7, marginBottom: '28px' }}>{T.lead}</p>
        <p style={{ fontSize: '13px', color: MUT, lineHeight: 1.6, marginBottom: '28px' }}>{T.honest}</p>
        <button onClick={start} style={{ width: '100%', padding: '16px', borderRadius: '14px', fontSize: '15px', fontWeight: 700, background: `linear-gradient(135deg, ${GOLD} 0%, #B8960C 100%)`, color: BG, border: 'none', cursor: 'pointer' }}>
          {T.start}
        </button>
        <Link href="/dashboard" style={{ display: 'block', marginTop: '16px', fontSize: '13px', color: MUT, textDecoration: 'none' }}>{T.skip}</Link>
        <p style={{ fontSize: '11px', color: '#6B5EA8', marginTop: '24px' }}>{T.credit}</p>
      </div>
    </div>
  )

  // ---------- QUIZ ----------
  if (step === 'quiz') {
    const q = lang === 'ru'
      ? { ...QUESTIONS_RU[currentQ], scale: QUESTIONS[currentQ].scale }
      : QUESTIONS[currentQ]
    const swap = currentQ % 2 === 1
    const optA = swap ? q.b : q.a
    const optB = swap ? q.a : q.b
    const poleA = swap ? 1 : 0
    const poleB = swap ? 0 : 1
    const progress = (currentQ / QUESTIONS.length) * 100
    const blocks: Record<string, string> = lang === 'ru'
      ? { LF: 'Логика', SN: 'Восприятие', EI: 'Энергия', RX: 'Ритм' }
      : { LF: 'Logic', SN: 'Sensing', EI: 'Energy', RX: 'Rhythm' }
    return (
      <div style={{ minHeight: '100vh', background: BG, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 24px' }}>
          <div style={{ marginBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '999px', background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.4)', color: GOLD }}>{blocks[q.scale]}</span>
              <span style={{ fontSize: '13px', color: MUT }}>{currentQ + 1} / {QUESTIONS.length}</span>
            </div>
            <div style={{ height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.10)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, borderRadius: '999px', background: `linear-gradient(90deg, ${GOLD}, #34D399)`, transition: 'width 0.3s' }} />
            </div>
          </div>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '25px', color: TXT, marginBottom: '28px', lineHeight: 1.4 }}>{q.q}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[[optA, poleA], [optB, poleB]].map(([text, pole], i) => (
              <button key={i} onClick={() => handleAnswer(pole as number)}
                style={{ padding: '18px 20px', borderRadius: '16px', fontSize: '15px', textAlign: 'left', background: CARD, border: '1px solid rgba(255,255,255,0.12)', color: TXT, cursor: 'pointer', transition: 'all 0.15s', lineHeight: 1.5 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.border = '1px solid rgba(212,175,55,0.4)'; (e.currentTarget as HTMLElement).style.background = 'rgba(212,175,55,0.06)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.border = '1px solid rgba(255,255,255,0.12)'; (e.currentTarget as HTMLElement).style.background = CARD }}>
                {text as string}
              </button>
            ))}
          </div>
          {currentQ > 0 && (
            <button onClick={() => setCurrentQ(currentQ - 1)} style={{ marginTop: '24px', background: 'none', border: 'none', fontSize: '13px', color: MUT, cursor: 'pointer' }}>← Back</button>
          )}
        </div>
      </div>
    )
  }

  // ---------- READING INTERSTITIAL ----------
  // A 1.8s beat between the last answer and the reveal — the ceremony's inhale.
  if (step === 'reading') {
    const famColor = result && TYPES[result] ? ELEMENTS[TYPES[result].fam].color : GOLD
    return (
      <div style={{ minHeight: '100vh', background: BG, fontFamily: 'Plus Jakarta Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`
          @keyframes btPulse { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.12); opacity: 1; } }
          @keyframes btShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        `}</style>
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <div style={{ fontSize: '58px', lineHeight: 1, animation: 'btPulse 1.2s ease-in-out infinite', textShadow: `0 0 46px ${famColor}` }}>🧭</div>
          <p style={{
            marginTop: '24px', fontSize: '15px', fontWeight: 600, letterSpacing: '0.4px',
            background: `linear-gradient(90deg, ${MUT} 30%, ${TXT} 50%, ${MUT} 70%)`,
            backgroundSize: '200% 100%',
            WebkitBackgroundClip: 'text', backgroundClip: 'text',
            color: 'transparent', WebkitTextFillColor: 'transparent',
            animation: 'btShimmer 1.7s linear infinite',
          }}>{T.reading}</p>
        </div>
      </div>
    )
  }

  // ---------- RESULT ----------
  if (step === 'result' && result) {
    const t = TYPES[result]
    const tr = TYPES_RU[result]
    const fam = ELEMENTS[t.fam], col = ELEMENTS[t.col]
    const famName = lang === 'ru' ? ELEMENTS_RU[t.fam] : fam.name
    const colName = lang === 'ru' ? ELEMENTS_RU[t.col] : col.name
    const typeName = lang === 'ru' ? tr.name : t.name
    const poles = [result[0], result[1], result[2], result[3]] as string[]
    return (
      <div style={{ minHeight: '100vh', background: BG, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 24px' }}>
          <style>{`
            @keyframes btReveal { from { opacity: 0; transform: scale(0.85) translateY(12px); } to { opacity: 1; transform: scale(1) translateY(0); } }
          `}</style>
          <LangToggle />
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '2px', color: GOLD, marginBottom: '14px' }}>{T.yourType}</p>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px', animation: 'btReveal 0.7s cubic-bezier(0.22, 1, 0.36, 1) both' }}>
              <TypeCrest typeId={result} size={156} />
            </div>
            <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '38px', color: TXT, marginBottom: '4px', animation: 'btReveal 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both' }}>{typeName}</h1>
            <p style={{ fontSize: '13px', color: MUT }}>{T.proto} — «{lang === 'ru' ? tr.proto : t.proto}»</p>
            <p style={{ fontSize: '12px', color: '#6B5EA8', marginTop: '6px' }}>{T.flavor}</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
              <span style={{ padding: '5px 14px', borderRadius: '999px', background: fam.color, color: '#0a0a14', fontSize: '12px', fontWeight: 700 }}>{T.family}: {famName}</span>
              <span style={{ padding: '5px 14px', borderRadius: '999px', background: col.color, color: '#0a0a14', fontSize: '12px', fontWeight: 700 }}>{T.collective}: {colName}</span>
            </div>
          </div>

          <div style={{ background: CARD, border: '1px solid rgba(212,175,55,0.25)', borderRadius: '20px', padding: '24px', marginBottom: '16px' }}>
            <p style={{ fontSize: '15px', color: TXT, lineHeight: 1.7 }}>{lang === 'ru' ? tr.intro : t.intro}</p>
          </div>

          <div style={{ background: CARD, border: '1px solid rgba(255,255,255,0.10)', borderRadius: '20px', padding: '24px', marginBottom: '16px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px', color: MUT, marginBottom: '8px' }}>{T.values}</p>
            <p style={{ fontSize: '14px', color: MUT, lineHeight: 1.6, marginBottom: '18px' }}>{lang === 'ru' ? FAMILY_RU[t.fam] : FAMILY[t.fam]}</p>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px', color: MUT, marginBottom: '8px' }}>{T.mode}</p>
            <p style={{ fontSize: '14px', color: MUT, lineHeight: 1.6 }}>{lang === 'ru' ? COLLECTIVE_RU[t.col] : COLLECTIVE[t.col]}</p>
          </div>

          <div style={{ background: CARD, border: '1px solid rgba(255,255,255,0.10)', borderRadius: '20px', padding: '24px', marginBottom: '20px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px', color: MUT, marginBottom: '12px' }}>{T.strengths}</p>
            <ul style={{ margin: 0, paddingLeft: '18px', color: MUT, fontSize: '14px', lineHeight: 1.7 }}>
              {poles.map(p => (
                <li key={p}>
                  <b style={{ color: TXT }}>{lang === 'ru' ? POLES_RU[p].label : POLES[p].label}:</b>{' '}
                  {lang === 'ru' ? POLES_RU[p].plus : POLES[p].plus}
                </li>
              ))}
            </ul>
          </div>

          <div style={{ background: CARD, border: '1px solid rgba(255,255,255,0.10)', borderRadius: '20px', padding: '20px 24px', marginBottom: '20px' }}>
            <label style={{ fontSize: '13px', color: MUT, display: 'block', marginBottom: '8px' }}>
              {T.birth} <span style={{ color: '#6B5EA8' }}>{T.optional}</span>
            </label>
            <input type="date" value={birthDate} onChange={e => {
              const v = e.target.value
              setBirthDate(v)
              // Keep the guest-pending result in sync so the birthday survives signup.
              try {
                const pending = localStorage.getItem('bestie_pending_type')
                if (pending) localStorage.setItem('bestie_pending_type', JSON.stringify({ ...JSON.parse(pending), birthDate: v }))
              } catch {}
            }}
              style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', background: '#0E0E1B', border: '1px solid rgba(255,255,255,0.1)', color: TXT, outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }} />
            <p style={{ fontSize: '12px', color: MUT, marginTop: '8px', marginBottom: 0 }}>{T.birthBenefit}</p>
          </div>

          {userId ? (
            <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '16px', borderRadius: '14px', fontSize: '15px', fontWeight: 700, background: `linear-gradient(135deg, ${GOLD} 0%, #B8960C 100%)`, color: BG, border: 'none', cursor: 'pointer' }}>
              {saving ? T.saving : T.save}
            </button>
          ) : (
            <>
              <Link href="/signup" style={{ display: 'block', textAlign: 'center', width: '100%', padding: '16px', borderRadius: '14px', fontSize: '15px', fontWeight: 700, background: `linear-gradient(135deg, ${GOLD} 0%, #B8960C 100%)`, color: BG, textDecoration: 'none', boxSizing: 'border-box' }}>
                {T.join}
              </Link>
              <p style={{ fontSize: '12px', color: MUT, textAlign: 'center', marginTop: '10px' }}>{T.kept}</p>
            </>
          )}
          <button onClick={handleShare} disabled={sharing} style={{ width: '100%', marginTop: '12px', padding: '14px', borderRadius: '14px', fontSize: '14px', fontWeight: 700, background: shared ? 'rgba(52,211,153,0.12)' : '#131323', border: shared ? '1px solid rgba(52,211,153,0.35)' : '1px solid rgba(255,255,255,0.12)', color: shared ? '#34D399' : TXT, cursor: sharing ? 'wait' : 'pointer', opacity: sharing ? 0.75 : 1 }}>
            {sharing ? T.sharePreparing : shared ? T.shared : T.share}
          </button>
          <button onClick={start} style={{ display: 'block', margin: '18px auto 0', padding: '4px 8px', background: 'none', border: 'none', fontSize: '13px', color: MUT, textDecoration: 'underline', cursor: 'pointer' }}>
            {T.retake}
          </button>
        </div>
      </div>
    )
  }

  return null
}
