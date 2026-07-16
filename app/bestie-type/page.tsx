// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { QUESTIONS, TYPES, FAMILY, COLLECTIVE, POLES, ELEMENTS, computeKey } from '@/lib/socionics'

const GOLD = '#D4AF37'
const BG = '#09090F'
const CARD = '#111120'
const TXT = '#F0EAFF'
const MUT = '#A99ECC'

export default function BestieTypePage() {
  const router = useRouter()
  const [step, setStep] = useState<'intro' | 'quiz' | 'result'>('intro')
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<(number | undefined)[]>([])
  const [birthDate, setBirthDate] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState(null)
  const [shared, setShared] = useState(false)

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
      setStep('result')
    }
  }

  const handleShare = async () => {
    if (!result) return
    const t = TYPES[result]
    const text = `My eterotype: ${t.name} 🧭 ${ELEMENTS[t.fam].name} family · ${ELEMENTS[t.col].name} collective. What's yours?`
    const url = 'https://bestiehere.com/bestie-type'
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title: 'My eterotype', text, url }); return } catch { return }
    }
    navigator.clipboard.writeText(`${text}\n${url}`)
    setShared(true); setTimeout(() => setShared(false), 2000)
  }

  const handleSave = async () => {
    if (!result || !userId) return
    const t = TYPES[result]
    setSaving(true)
    await supabase.from('users').update({
      eterotype: result,
      eterotype_name: t.name,
      eterotype_family: t.fam,
      eterotype_collective: t.col,
      bestie_type_completed: true,
      ...(birthDate ? { birth_date: birthDate } : {}),
    }).eq('id', userId)
    try { localStorage.removeItem('bestie_pending_type') } catch {}
    setSaving(false)
    router.push('/dashboard')
  }

  // ---------- INTRO ----------
  if (step === 'intro') return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: 'Plus Jakarta Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: '480px', padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '52px', marginBottom: '20px' }}>🧭</div>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '34px', color: TXT, marginBottom: '12px' }}>Discover your eterotype</h1>
        <p style={{ fontSize: '15px', color: MUT, lineHeight: 1.7, marginBottom: '28px' }}>
          28 questions · about 5 minutes. You’ll learn your personality type in the «Socionics of the Elements» system — your <b style={{ color: TXT }}>family</b> (core values) and <b style={{ color: TXT }}>collective</b> (how you act). It appears on your Social Passport and powers your matches.
        </p>
        <p style={{ fontSize: '13px', color: MUT, lineHeight: 1.6, marginBottom: '28px' }}>
          Choose not «what’s right» but <b style={{ color: TXT }}>how it most often happens by itself</b>. There are no wrong answers.
        </p>
        <div style={{ marginBottom: '22px', textAlign: 'left' }}>
          <label style={{ fontSize: '13px', color: MUT, display: 'block', marginBottom: '8px' }}>
            Date of birth <span style={{ color: '#6B5EA8' }}>(optional)</span>
          </label>
          <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
            style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', background: CARD, border: '1px solid rgba(255,255,255,0.1)', color: TXT, outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }} />
        </div>
        <button onClick={start} style={{ width: '100%', padding: '16px', borderRadius: '14px', fontSize: '15px', fontWeight: 700, background: `linear-gradient(135deg, ${GOLD} 0%, #B8960C 100%)`, color: BG, border: 'none', cursor: 'pointer' }}>
          Start →
        </button>
        <Link href="/dashboard" style={{ display: 'block', marginTop: '16px', fontSize: '13px', color: MUT, textDecoration: 'none' }}>Skip for now</Link>
        <p style={{ fontSize: '11px', color: '#6B5EA8', marginTop: '24px' }}>Based on the «Socionics of the Elements» system by A. Bozhko.</p>
      </div>
    </div>
  )

  // ---------- QUIZ ----------
  if (step === 'quiz') {
    const q = QUESTIONS[currentQ]
    const swap = currentQ % 2 === 1
    const optA = swap ? q.b : q.a
    const optB = swap ? q.a : q.b
    const poleA = swap ? 1 : 0
    const poleB = swap ? 0 : 1
    const progress = (currentQ / QUESTIONS.length) * 100
    const blocks: Record<string, string> = { LF: 'Logic', SN: 'Sensing', EI: 'Energy', RX: 'Rhythm' }
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

  // ---------- RESULT ----------
  if (step === 'result' && result) {
    const t = TYPES[result]
    const fam = ELEMENTS[t.fam], col = ELEMENTS[t.col]
    const poles = [result[0], result[1], result[2], result[3]] as string[]
    return (
      <div style={{ minHeight: '100vh', background: BG, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '2px', color: GOLD, marginBottom: '14px' }}>YOUR ETEROTYPE</p>
            <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '38px', color: TXT, marginBottom: '4px' }}>{t.name}</h1>
            <p style={{ fontSize: '13px', color: MUT }}>prototype in classic socionics — «{t.proto}»</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
              <span style={{ padding: '5px 14px', borderRadius: '999px', background: fam.color, color: '#0a0a14', fontSize: '12px', fontWeight: 700 }}>Family: {fam.name}</span>
              <span style={{ padding: '5px 14px', borderRadius: '999px', background: col.color, color: '#0a0a14', fontSize: '12px', fontWeight: 700 }}>Collective: {col.name}</span>
            </div>
          </div>

          <div style={{ background: CARD, border: '1px solid rgba(212,175,55,0.25)', borderRadius: '20px', padding: '24px', marginBottom: '16px' }}>
            <p style={{ fontSize: '15px', color: TXT, lineHeight: 1.7 }}>{t.intro}</p>
          </div>

          <div style={{ background: CARD, border: '1px solid rgba(255,255,255,0.10)', borderRadius: '20px', padding: '24px', marginBottom: '16px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px', color: MUT, marginBottom: '8px' }}>YOUR VALUES · FAMILY</p>
            <p style={{ fontSize: '14px', color: MUT, lineHeight: 1.6, marginBottom: '18px' }}>{FAMILY[t.fam]}</p>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px', color: MUT, marginBottom: '8px' }}>YOUR MODE OF ACTION · COLLECTIVE</p>
            <p style={{ fontSize: '14px', color: MUT, lineHeight: 1.6 }}>{COLLECTIVE[t.col]}</p>
          </div>

          <div style={{ background: CARD, border: '1px solid rgba(255,255,255,0.10)', borderRadius: '20px', padding: '24px', marginBottom: '20px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px', color: MUT, marginBottom: '12px' }}>YOUR STRENGTHS</p>
            <ul style={{ margin: 0, paddingLeft: '18px', color: MUT, fontSize: '14px', lineHeight: 1.7 }}>
              {poles.map(p => <li key={p}><b style={{ color: TXT }}>{POLES[p].label}:</b> {POLES[p].plus}</li>)}
            </ul>
          </div>

          {userId ? (
            <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '16px', borderRadius: '14px', fontSize: '15px', fontWeight: 700, background: `linear-gradient(135deg, ${GOLD} 0%, #B8960C 100%)`, color: BG, border: 'none', cursor: 'pointer' }}>
              {saving ? 'Saving…' : 'Save to my passport →'}
            </button>
          ) : (
            <>
              <Link href="/signup" style={{ display: 'block', textAlign: 'center', width: '100%', padding: '16px', borderRadius: '14px', fontSize: '15px', fontWeight: 700, background: `linear-gradient(135deg, ${GOLD} 0%, #B8960C 100%)`, color: BG, textDecoration: 'none', boxSizing: 'border-box' }}>
                Join Bestie — save it & meet your matches →
              </Link>
              <p style={{ fontSize: '12px', color: MUT, textAlign: 'center', marginTop: '10px' }}>
                Your result is kept — it saves to your passport automatically after you sign up.
              </p>
            </>
          )}
          <button onClick={handleShare} style={{ width: '100%', marginTop: '12px', padding: '14px', borderRadius: '14px', fontSize: '14px', fontWeight: 700, background: shared ? 'rgba(52,211,153,0.12)' : '#131323', border: shared ? '1px solid rgba(52,211,153,0.35)' : '1px solid rgba(255,255,255,0.12)', color: shared ? '#34D399' : TXT, cursor: 'pointer' }}>
            {shared ? '✓ Copied — send it to a friend' : '↗ Share my type'}
          </button>
          <button onClick={start} style={{ width: '100%', marginTop: '12px', padding: '14px', borderRadius: '14px', fontSize: '14px', background: '#131323', border: '1px solid rgba(255,255,255,0.12)', color: MUT, cursor: 'pointer' }}>
            Retake
          </button>
        </div>
      </div>
    )
  }

  return null
}
