// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'

const GOLD = '#D4AF37'
const BOT_URL = 'https://t.me/TowerCrewBot?start=join'
// The pay link never opens the billing portal (a forwarded link would give
// access to someone's subscription) — managing goes through /manage in the bot.
const MANAGE_URL = 'https://t.me/TowerCrewBot?start=manage'

const PLAN_CARDS = [
  {
    id: 'basic',
    label: 'Basic',
    price: 10,
    perks: ['Доступ в группу «Вышки в США»'],
  },
  {
    id: 'admin',
    label: 'Admin',
    price: 30,
    featured: true,
    perks: ['Доступ в группу «Вышки в США»', 'Админ-значок «Реклама»', 'Можно публиковать рекламу'],
  },
]

const PLAN_LABEL = { basic: 'Basic', admin: 'Admin' }

const wrap = {
  minHeight: '100vh',
  background: 'var(--bg)',
  fontFamily: 'Plus Jakarta Sans, sans-serif',
}
const container = { maxWidth: '480px', margin: '0 auto', padding: '32px 16px 120px' }
const card = {
  background: 'var(--surface-1)',
  border: '1px solid var(--border)',
  borderRadius: '18px',
  padding: '20px 18px',
}
const goldBtn = {
  display: 'block', width: '100%', boxSizing: 'border-box', textAlign: 'center',
  padding: '14px 16px', borderRadius: '14px', border: 'none',
  background: GOLD, color: '#09090F', fontSize: '15px', fontWeight: 700,
  textDecoration: 'none', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif',
}
const outlineBtn = {
  ...goldBtn,
  background: 'rgba(212,175,55,0.12)',
  border: '1px solid rgba(212,175,55,0.45)',
  color: GOLD,
}

export default function TowerJoinClient({ t, name, active, groupUrl }) {
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const [already, setAlready] = useState(null)
  const manageUrl = MANAGE_URL

  // Coming back from Stripe with the browser's back button → re-enable buttons.
  useEffect(() => {
    const onShow = (e) => { if (e.persisted) setBusy(null) }
    window.addEventListener('pageshow', onShow)
    return () => window.removeEventListener('pageshow', onShow)
  }, [])

  const choose = async (plan) => {
    if (busy) return
    setBusy(plan)
    setError('')
    try {
      const res = await fetch('/api/tower/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ t, plan }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.url) { window.location.href = data.url; return }
      if (data.already) {
        setAlready({ plan: data.plan, manageUrl: data.manageUrl || manageUrl })
      } else {
        setError(data.error || 'Не получилось открыть оплату — попробуйте ещё раз')
      }
    } catch {
      setError('Нет связи — проверьте интернет и попробуйте ещё раз')
    }
    setBusy(null)
  }

  const header = (
    <div style={{ textAlign: 'center', marginBottom: '28px' }}>
      <div style={{ display: 'inline-block', padding: '6px 14px', borderRadius: '999px', background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.4)', color: GOLD, fontSize: '11px', fontWeight: 700, letterSpacing: '1px', marginBottom: '14px' }}>
        TELEGRAM-ГРУППА
      </div>
      <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '34px', lineHeight: 1.15, color: 'var(--text-primary)', margin: '0 0 10px' }}>
        Вышки в США
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.55, margin: 0 }}>
        {name ? <>Привет, {name}! </> : null}
        Доступ в группу — по подписке. После оплаты заявка одобряется автоматически.
      </p>
    </div>
  )

  // ── Invalid / expired link ──
  if (!t) {
    return (
      <div style={wrap}>
        <div style={container}>
          {header}
          <div style={{ ...card, textAlign: 'center', padding: '28px 20px' }}>
            <p style={{ fontSize: '38px', margin: '0 0 10px' }}>⏳</p>
            <h2 style={{ fontSize: '18px', color: 'var(--text-primary)', margin: '0 0 8px' }}>Ссылка устарела</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 20px' }}>
              Нажмите <b style={{ color: 'var(--text-primary)' }}>/start</b> в боте @TowerCrewBot, чтобы получить новую.
            </p>
            <a href={BOT_URL} style={goldBtn}>Открыть бота</a>
          </div>
        </div>
      </div>
    )
  }

  const activeInfo = already || active

  return (
    <div style={wrap}>
      <div style={container}>
        {header}

        {activeInfo ? (
          <div style={{ ...card, background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.4)', marginBottom: '20px' }}>
            <p style={{ color: '#34D399', fontWeight: 700, fontSize: '16px', margin: '0 0 6px' }}>
              ✅ Подписка уже активна
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.55, margin: '0 0 16px' }}>
              {activeInfo.plan ? <>Тариф <b style={{ color: 'var(--text-primary)' }}>{PLAN_LABEL[activeInfo.plan] || 'Basic'}</b>. </> : null}
              {active?.status === 'past_due'
                ? 'Последний платёж не прошёл — обновите карту, чтобы не потерять доступ.'
                : active?.canceling
                  ? `Подписка отменена — доступ сохранится до ${active.until}.`
                  : active?.until ? `Оплачено до ${active.until}.` : null}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a href={groupUrl} style={goldBtn}>👉 Открыть группу</a>
              <a href={activeInfo.manageUrl || manageUrl} style={outlineBtn}>⚙️ Управлять подпиской в боте</a>
            </div>
          </div>
        ) : null}

        {!activeInfo ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {PLAN_CARDS.map((p) => (
              <div key={p.id} style={{ ...card, position: 'relative', border: p.featured ? '1px solid rgba(212,175,55,0.55)' : card.border }}>
                {p.featured ? (
                  <span style={{ position: 'absolute', top: '-11px', right: '16px', padding: '3px 10px', borderRadius: '999px', background: GOLD, color: '#09090F', fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px' }}>
                    ДЛЯ РЕКЛАМЫ
                  </span>
                ) : null}
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{p.label}</span>
                  <span style={{ fontSize: '26px', fontWeight: 800, color: p.featured ? GOLD : 'var(--text-primary)' }}>
                    ${p.price}<span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>/мес</span>
                  </span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {p.perks.map((perk) => (
                    <li key={perk} style={{ display: 'flex', gap: '8px', fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                      <span style={{ color: GOLD, fontWeight: 700 }}>✓</span>
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => choose(p.id)}
                  disabled={!!busy}
                  style={{ ...(p.featured ? goldBtn : outlineBtn), opacity: busy && busy !== p.id ? 0.5 : 1, cursor: busy ? 'wait' : 'pointer' }}
                >
                  {busy === p.id ? 'Открываем оплату…' : `Выбрать ${p.label} — $${p.price}/мес`}
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {error ? (
          <p role="alert" style={{ marginTop: '16px', padding: '12px 14px', borderRadius: '12px', background: 'rgba(255,120,87,0.12)', border: '1px solid rgba(255,120,87,0.4)', color: 'var(--coral)', fontSize: '14px', lineHeight: 1.5 }}>
            {error}
          </p>
        ) : null}

        <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px', lineHeight: 1.6, marginTop: '22px' }}>
          🔒 Оплата через Stripe — данные карты не хранятся у нас. Подписка ежемесячная, отменить можно в любой момент: команда /manage в боте @TowerCrewBot.
        </p>
        <p style={{ textAlign: 'center', fontSize: '12px', marginTop: '8px' }}>
          <a href="/" style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>Работает на <span style={{ color: GOLD, fontWeight: 700 }}>Bestie</span></a>
        </p>
      </div>
    </div>
  )
}
