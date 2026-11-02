// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'

const GOLD = '#D4AF37'
const BOT_URL = 'https://t.me/TowerCrewBot'
const PLAN_LABEL = { basic: 'Basic', admin: 'Admin' }
const MAX_POLLS = 8

const wrap = { minHeight: '100vh', background: 'var(--bg)', fontFamily: 'Plus Jakarta Sans, sans-serif' }
const container = { maxWidth: '480px', margin: '0 auto', padding: '48px 16px 120px' }
const card = {
  background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '20px',
  padding: '28px 20px', textAlign: 'center',
}
const goldBtn = {
  display: 'block', width: '100%', boxSizing: 'border-box', textAlign: 'center',
  padding: '14px 16px', borderRadius: '14px', border: 'none',
  background: GOLD, color: '#09090F', fontSize: '15px', fontWeight: 700,
  textDecoration: 'none', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif',
}
const outlineBtn = {
  ...goldBtn, background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.45)', color: GOLD,
}

function fmt(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return '' }
}

export default function TowerSuccessClient({ sessionId }) {
  const [state, setState] = useState(sessionId ? 'loading' : 'error')
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    let timer = null
    let polls = 0

    const load = async () => {
      try {
        const res = await fetch('/api/tower/success', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId }),
        })
        const json = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) { setState('error'); return }
        setData(json)
        const s = json.status
        if (s === 'active' || s === 'trialing') { setState('done'); return }
        polls += 1
        if (polls < MAX_POLLS) {
          setState('waiting')
          timer = setTimeout(load, 4000)
        } else {
          setState('slow')
        }
      } catch {
        if (!cancelled) setState('slow')
      }
    }
    load()
    return () => { cancelled = true; if (timer) clearTimeout(timer) }
  }, [sessionId])

  const manageLine = (
    <p style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.6, margin: '18px 0 0' }}>
      Управлять подпиской (тариф, карта, отмена) — команда <b style={{ color: 'var(--text-muted)' }}>/manage</b> в боте @TowerCrewBot.
    </p>
  )

  let body = null

  if (state === 'loading' || state === 'waiting') {
    body = (
      <div style={card}>
        <p style={{ fontSize: '38px', margin: '0 0 10px' }}>⏳</p>
        <h1 style={{ fontSize: '20px', color: 'var(--text-primary)', margin: '0 0 8px' }}>Проверяем оплату…</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>Это займёт несколько секунд.</p>
      </div>
    )
  } else if (state === 'slow') {
    body = (
      <div style={card}>
        <p style={{ fontSize: '38px', margin: '0 0 10px' }}>⏳</p>
        <h1 style={{ fontSize: '20px', color: 'var(--text-primary)', margin: '0 0 8px' }}>Почти готово</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 20px' }}>
          Платёж ещё обрабатывается — обновите страницу через минуту.
        </p>
        <button onClick={() => window.location.reload()} style={goldBtn}>Обновить</button>
        {manageLine}
      </div>
    )
  } else if (state === 'error') {
    body = (
      <div style={card}>
        <p style={{ fontSize: '38px', margin: '0 0 10px' }}>🤔</p>
        <h1 style={{ fontSize: '20px', color: 'var(--text-primary)', margin: '0 0 8px' }}>Не нашли платёж</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 20px' }}>
          Если деньги списались — напишите <b style={{ color: 'var(--text-primary)' }}>/status</b> боту @TowerCrewBot, он всё проверит.
        </p>
        <a href={BOT_URL} style={goldBtn}>Открыть бота</a>
      </div>
    )
  } else if (state === 'done' && data) {
    const plan = PLAN_LABEL[data.plan] || 'Basic'
    const until = fmt(data.paid_until)
    body = (
      <div style={{ ...card, border: '1px solid rgba(52,211,153,0.4)' }}>
        <p style={{ fontSize: '42px', margin: '0 0 10px' }}>✅</p>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '26px', color: 'var(--text-primary)', margin: '0 0 8px' }}>Оплата прошла</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 20px' }}>
          Тариф <b style={{ color: 'var(--text-primary)' }}>{plan}</b>{until ? <> · оплачено до {until}</> : null}.
          {data.plan === 'admin' ? <><br />Админ-значок «Реклама» выдаётся автоматически, когда вы в группе.</> : null}
        </p>

        {data.approved ? (
          <>
            <p style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 600, margin: '0 0 14px' }}>Заявка одобрена — откройте группу</p>
            <a href={data.group_url} style={goldBtn}>👉 Открыть «Вышки в США»</a>
          </>
        ) : data.banned ? (
          <p style={{ fontSize: '14px', color: 'var(--coral)', lineHeight: 1.6, margin: '0 0 14px' }}>
            Вы заблокированы в группе администратором — напишите админу группы. Отменить подписку можно командой /manage в боте.
          </p>
        ) : data.need_request ? (
          <>
            <p style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 600, margin: '0 0 6px' }}>Осталось подать заявку в группу</p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 14px' }}>
              Откройте группу и нажмите «Подать заявку» — бот одобрит её автоматически за пару секунд.
            </p>
            <a href={data.group_url} style={goldBtn}>👉 Подать заявку в «Вышки в США»</a>
          </>
        ) : (
          <>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 14px' }}>
              Подписка активна. Если доступ ещё не открылся — напишите <b style={{ color: 'var(--text-primary)' }}>/status</b> боту, он всё проверит.
            </p>
            <a href={data.bot_url || BOT_URL} style={goldBtn}>Открыть бота</a>
          </>
        )}

        {data.manage_url ? (
          <a href={data.manage_url} style={{ ...outlineBtn, marginTop: '10px' }}>⚙️ Управлять подпиской в боте</a>
        ) : null}
        {manageLine}
      </div>
    )
  }

  return (
    <div style={wrap}>
      <div style={container}>{body}</div>
    </div>
  )
}
