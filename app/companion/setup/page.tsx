// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const COMPANIONS = [
  {
    type: 'spark',
    emoji: '⚡',
    name: 'Spark',
    tagline: 'Дерзкий и с юмором',
    description: 'Подтолкнёт тебя выйти из зоны комфорта. Прямой, весёлый, немного саркастичный — но всегда на твоей стороне.',
    color: '#34D399',
    glow: 'rgba(52,211,153,0.4)',
    bg: 'rgba(52,211,153,0.06)',
    border: 'rgba(52,211,153,0.3)',
    anim: 'spark',
  },
  {
    type: 'sage',
    emoji: '🔮',
    name: 'Sage',
    tagline: 'Мистический наставник',
    description: 'Мудрый и глубокий. Поможет найти настоящие связи, а не поверхностные знакомства.',
    color: '#D4AF37',
    glow: 'rgba(212,175,55,0.4)',
    bg: 'rgba(212,175,55,0.06)',
    border: 'rgba(212,175,55,0.3)',
    anim: 'sage',
  },
  {
    type: 'nova',
    emoji: '🌀',
    name: 'Nova',
    tagline: 'Футуристичный орб',
    description: 'Любопытный и аналитический. Видит паттерны в людях и помогает тебе найти идеальный match.',
    color: '#7B8FF5',
    glow: 'rgba(123,143,245,0.4)',
    bg: 'rgba(123,143,245,0.06)',
    border: 'rgba(123,143,245,0.3)',
    anim: 'nova',
  },
]

export default function CompanionSetupPage() {
  const router = useRouter()
  const [step, setStep] = useState<'choose' | 'name' | 'meet'>('choose')
  const [selected, setSelected] = useState<any>(null)
  const [companionName, setCompanionName] = useState('Bestie')
  const [saving, setSaving] = useState(false)
  const [confetti, setConfetti] = useState(false)
  const [greeting, setGreeting] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      // If already has companion — skip
      supabase.from('companions').select('id').eq('user_id', user.id).single()
        .then(({ data }) => { if (data) router.push('/bestie-type') })
    })
  }, [])

  const handleChoose = (c: any) => {
    setSelected(c)
    setCompanionName('Bestie')
    setStep('name')
  }

  const handleSave = async () => {
    if (!userId || saving) return
    setSaving(true)

    const { data: { session } } = await supabase.auth.getSession()

    // Save companion to DB
    await supabase.from('companions').upsert({
      user_id: userId,
      type: selected.type,
      name: companionName.trim() || 'Bestie',
      level: 1,
      xp: 0,
    }, { onConflict: 'user_id' })

    // Get a greeting from the companion
    try {
      const res = await fetch('/api/companion/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          message: `Привет! Меня зовут ${userId}. Это наше первое знакомство — поприветствуй меня как мой новый компаньон на Bestie! Я только что прошёл регистрацию.`,
        }),
      })
      const data = await res.json()
      setGreeting(data.reply || `Привет! Я ${companionName.trim() || 'Bestie'} — твой компаньон здесь. Давай найдём тебе настоящих друзей! ⚡`)
    } catch {
      setGreeting(`Отлично, что ты здесь! Я ${companionName.trim() || 'Bestie'} — готов помочь тебе найти настоящие связи. Поехали!`)
    }

    setSaving(false)
    setStep('meet')
    setConfetti(true)
    setTimeout(() => setConfetti(false), 3000)
  }

  const c = selected

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes floatSpark {
          0%,100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-12px) scale(1.08); }
        }
        @keyframes floatSage {
          0%,100% { transform: translateY(0) rotate(-3deg); }
          50% { transform: translateY(-10px) rotate(3deg); }
        }
        @keyframes floatNova {
          0%,100% { transform: translateY(0) rotate(0deg) scale(1); }
          33% { transform: translateY(-8px) rotate(5deg) scale(1.05); }
          66% { transform: translateY(-4px) rotate(-3deg) scale(0.97); }
        }
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 0 0 var(--glow); }
          50% { box-shadow: 0 0 0 16px transparent; }
        }
        @keyframes confettiPop {
          0% { opacity: 1; transform: translateY(0) rotate(0deg); }
          100% { opacity: 0; transform: translateY(-120px) rotate(720deg); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes sparkleOrbit {
          from { transform: rotate(0deg) translateX(44px) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(44px) rotate(-360deg); }
        }
      `}</style>

      {/* Confetti burst */}
      {confetti && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }}>
          {Array.from({ length: 32 }).map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${30 + Math.random() * 40}%`,
              top: `${40 + Math.random() * 20}%`,
              width: `${6 + Math.random() * 8}px`,
              height: `${6 + Math.random() * 8}px`,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              background: ['#34D399','#D4AF37','#7B8FF5','#FF6B35','#FF3B9A'][Math.floor(Math.random() * 5)],
              animation: `confettiPop ${0.8 + Math.random() * 1.2}s ease-out forwards`,
              animationDelay: `${Math.random() * 0.5}s`,
            }} />
          ))}
        </div>
      )}

      <div style={{ width: '100%', maxWidth: '520px', animation: 'fadeSlideUp 0.5s ease' }}>

        {/* STEP 1: Choose companion */}
        {step === 'choose' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>✨</div>
              <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', color: 'var(--text-primary)', marginBottom: '8px' }}>
                Выбери своего компаньона
              </h1>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Он будет помогать тебе на Bestie, давать квесты<br />и праздновать твои знакомства
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {COMPANIONS.map((companion) => (
                <button
                  key={companion.type}
                  onClick={() => handleChoose(companion)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '20px',
                    borderRadius: '20px',
                    background: companion.bg,
                    border: `1px solid ${companion.border}`,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                  }}
                >
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '18px',
                    background: `radial-gradient(circle, ${companion.glow} 0%, transparent 70%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                    flexShrink: 0,
                    animation: `float${companion.anim.charAt(0).toUpperCase() + companion.anim.slice(1)} 3s ease-in-out infinite`,
                    '--glow': companion.glow,
                  } as any}>
                    {companion.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '18px', fontWeight: 700, color: companion.color }}>{companion.name}</span>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: companion.bg, border: `1px solid ${companion.border}`, color: companion.color, fontWeight: 600 }}>{companion.tagline}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>{companion.description}</p>
                  </div>
                  <span style={{ color: companion.color, fontSize: '20px', flexShrink: 0 }}>→</span>
                </button>
              ))}
            </div>

            <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)', marginTop: '20px' }}>
              Всегда можно сменить позже в настройках
            </p>
          </>
        )}

        {/* STEP 2: Name it */}
        {step === 'name' && c && (
          <>
            <button onClick={() => setStep('choose')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '14px', cursor: 'pointer', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ← Назад
            </button>

            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{
                width: '96px',
                height: '96px',
                borderRadius: '28px',
                background: `radial-gradient(circle, ${c.glow} 0%, transparent 70%)`,
                border: `2px solid ${c.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px',
                margin: '0 auto 20px',
                animation: `float${c.anim.charAt(0).toUpperCase() + c.anim.slice(1)} 3s ease-in-out infinite`,
              }}>
                {c.emoji}
              </div>
              <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '24px', color: 'var(--text-primary)', marginBottom: '8px' }}>
                Как назовёшь?
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                По умолчанию — <span style={{ color: c.color }}>Bestie</span>. Или придумай своё имя.
              </p>
            </div>

            <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '20px', padding: '28px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '10px', letterSpacing: '0.5px' }}>
                ИМЯ КОМПАНЬОНА
              </label>
              <input
                value={companionName}
                onChange={e => setCompanionName(e.target.value.slice(0, 20))}
                placeholder="Bestie"
                maxLength={20}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  fontSize: '18px',
                  fontWeight: 600,
                  outline: 'none',
                  background: 'var(--bg)',
                  border: `1.5px solid ${c.border}`,
                  color: c.color,
                  boxSizing: 'border-box',
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  textAlign: 'center',
                }}
              />
              <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '8px', textAlign: 'right' }}>
                {companionName.length}/20
              </p>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                width: '100%',
                marginTop: '20px',
                padding: '16px',
                borderRadius: '16px',
                fontSize: '16px',
                fontWeight: 700,
                background: `linear-gradient(135deg, ${c.color} 0%, ${c.glow.replace('0.4', '1')} 100%)`,
                border: 'none',
                color: '#09090F',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {saving ? (
                <><span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(0,0,0,0.3)', borderTop: '2px solid #09090F', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> Знакомимся...</>
              ) : (
                `Знакомиться с ${companionName.trim() || 'Bestie'} →`
              )}
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </button>
          </>
        )}

        {/* STEP 3: Meet your companion */}
        {step === 'meet' && c && (
          <div style={{ animation: 'fadeSlideUp 0.6s ease' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{
                width: '110px',
                height: '110px',
                borderRadius: '32px',
                background: `radial-gradient(circle, ${c.glow} 0%, transparent 70%)`,
                border: `2px solid ${c.color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '56px',
                margin: '0 auto 20px',
                animation: `float${c.anim.charAt(0).toUpperCase() + c.anim.slice(1)} 3s ease-in-out infinite`,
                boxShadow: `0 0 40px ${c.glow}`,
              }}>
                {c.emoji}
              </div>

              <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', color: 'var(--text-primary)', marginBottom: '8px' }}>
                Познакомься с {companionName.trim() || 'Bestie'}!
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Твой <span style={{ color: c.color }}>{c.tagline.toLowerCase()}</span> компаньон</p>
            </div>

            {/* Greeting bubble */}
            {greeting && (
              <div style={{
                background: 'var(--surface-1)',
                border: `1px solid ${c.border}`,
                borderRadius: '20px',
                padding: '20px 24px',
                marginBottom: '20px',
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  left: '24px',
                  width: '20px',
                  height: '20px',
                  background: 'var(--surface-1)',
                  border: `1px solid ${c.border}`,
                  borderBottom: 'none',
                  borderRight: 'none',
                  transform: 'rotate(45deg)',
                }} />
                <p style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.7, margin: 0 }}>
                  {greeting}
                </p>
              </div>
            )}

            {/* First quest preview */}
            <div style={{
              background: 'rgba(212,175,55,0.06)',
              border: '1px solid rgba(212,175,55,0.2)',
              borderRadius: '16px',
              padding: '16px 20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <span style={{ fontSize: '24px' }}>📸</span>
              <div>
                <p style={{ fontSize: '12px', color: '#D4AF37', fontWeight: 700, letterSpacing: '1px', marginBottom: '2px' }}>ПЕРВЫЙ КВЕСТ</p>
                <p style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>Поставь аватар → +100 XP</p>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: '20px' }}>⚡</div>
            </div>

            <button
              onClick={() => router.push('/bestie-type')}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '16px',
                fontSize: '16px',
                fontWeight: 700,
                background: `linear-gradient(135deg, ${c.color} 0%, ${c.glow.replace('0.4', '1')} 100%)`,
                border: 'none',
                color: '#09090F',
                cursor: 'pointer',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
              }}
            >
              Поехали! 🚀
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
