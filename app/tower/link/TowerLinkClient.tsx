// @ts-nocheck
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Link2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { GATE_FIELD_LABELS } from '@/lib/tower-app-shared'

// /tower/link — the logged-in person confirms «this Telegram ↔ my Bestie
// profile». The server re-checks the token and writes the link.
// The signed token never goes into an <a href> (click analytics records
// hrefs): login / signup are buttons with router.push.

const GOLD = '#D4AF37'
const TG_BLUE = '#2AABEE'

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
  padding: '24px 20px',
}
const goldBtn = {
  display: 'block', width: '100%', boxSizing: 'border-box', textAlign: 'center',
  minHeight: '48px', padding: '14px 16px', borderRadius: '14px', border: 'none',
  background: GOLD, color: '#09090F', fontSize: '15px', fontWeight: 700,
  textDecoration: 'none', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif',
}
const outlineBtn = {
  ...goldBtn,
  background: 'rgba(212,175,55,0.12)',
  border: '1px solid rgba(212,175,55,0.45)',
  color: GOLD,
}
const ghostBtn = {
  ...goldBtn,
  background: 'transparent',
  border: '1px solid var(--border-strong)',
  color: 'var(--text-muted)',
  fontWeight: 600,
}
const titleStyle = { fontSize: '19px', lineHeight: 1.35, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 10px' }
const textStyle = { fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 20px' }
const stack = { display: 'flex', flexDirection: 'column', gap: '10px' }

const ERRORS = {
  conflict_tg: 'Этот Telegram уже привязан к другому профилю Бести. Сначала отвяжите его там (Edit profile → Telegram) или в приложении «Вышки» → вкладка «Я».',
  conflict_user: 'К вашему профилю Бести уже привязан другой Telegram. Сначала отвяжите его: Edit profile → Telegram.',
  not_found: 'Профиль Бести не найден — войдите заново.',
  schema: 'Привязка временно недоступна — попробуйте через несколько минут.',
  rate: 'Слишком много попыток — подождите минутку.',
  network: 'Нет связи — проверьте интернет и попробуйте ещё раз.',
  error: 'Не получилось — попробуйте ещё раз.',
}

// Phases the login state may move between on its own (auth changes).
const FLOW = ['loading', 'login', 'confirm', 'error']

function tgLabel(tg) {
  const name = String(tg?.first_name || '').trim()
  const un = tg?.username ? '@' + tg.username : ''
  if (name && un) return `${name} (${un})`
  return name || un
}

function initial(s) {
  const ch = Array.from(String(s || '').replace(/^@/, '').trim())[0]
  return ch ? ch.toUpperCase() : '?'
}

function MiniCard({ label, name, sub, avatar, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '14px', background: 'var(--surface-2)', border: '1px solid var(--border)', minWidth: 0 }}>
      <div style={{ width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${color}22`, color, fontSize: '18px', fontWeight: 700 }}>
        {avatar
          ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : initial(name || sub)}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color }}>{label}</div>
        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name || sub || '—'}</div>
        {sub && name ? <div style={{ fontSize: '13px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div> : null}
      </div>
    </div>
  )
}

export default function TowerLinkClient({ t, tg, botLink }) {
  const router = useRouter()
  const [phase, setPhase] = useState(t ? 'loading' : 'expired')
  const [me, setMe] = useState(null)
  const [result, setResult] = useState(null)
  const [err, setErr] = useState(null)
  const uidRef = useRef(undefined)

  const label = tgLabel(tg)
  const botName = (String(botLink || '').match(/t\.me\/([A-Za-z0-9_]+)/) || [])[1] || 'TowerCrewBot'
  const back = '/tower/link?t=' + t

  // Who is logged in (and stays in sync if they log in / out in another tab).
  useEffect(() => {
    if (!t) return
    let alive = true
    const apply = async (session) => {
      const uid = session?.user?.id || null
      if (uid === uidRef.current) return
      uidRef.current = uid
      if (!uid) {
        if (alive) {
          setMe(null)
          setPhase((p) => (FLOW.includes(p) ? 'login' : p))
        }
        return
      }
      let profile = null
      try {
        const { data } = await supabase
          .from('users').select('username, full_name, avatar_url, city')
          .eq('id', uid).single()
        profile = data || null
      } catch {}
      if (!alive || uidRef.current !== uid) return
      setMe({
        username: profile?.username || null,
        full_name: profile?.full_name || session.user?.user_metadata?.full_name || '',
        avatar_url: profile?.avatar_url || null,
      })
      setErr(null)
      setPhase((p) => (FLOW.includes(p) ? 'confirm' : p))
    }
    supabase.auth.getSession()
      .then(({ data }) => apply(data?.session || null))
      .catch(() => apply(null))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => { apply(session) })
    return () => {
      alive = false
      sub?.subscription?.unsubscribe()
    }
  }, [t])

  const goLogin = () => router.push('/login?next=' + encodeURIComponent(back))
  const goSignup = () => router.push('/signup?next=' + encodeURIComponent(back))
  const switchAccount = async () => {
    try { await supabase.auth.signOut() } catch {}
    uidRef.current = null
    setMe(null)
    setErr(null)
    setPhase('login')
  }

  const confirmLink = async () => {
    if (phase === 'busy') return
    setPhase('busy')
    setErr(null)
    try {
      const { data } = await supabase.auth.getSession()
      const token = data?.session?.access_token
      if (!token) {
        uidRef.current = null
        setMe(null)
        setPhase('login')
        return
      }
      const res = await fetch('/api/tower/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ t }),
      })
      const body = await res.json().catch(() => ({}))
      if (body?.ok) {
        setResult(body)
        setPhase('done')
        return
      }
      if (res.status === 401 || body?.code === 'auth') { setPhase('login'); return }
      if (body?.code === 'expired') { setPhase('expired'); return }
      const code = res.status === 429 ? 'rate' : body?.code || 'error'
      setErr({ code, text: (res.status !== 429 && body?.error) || ERRORS[code] || ERRORS.error })
      setPhase('error')
    } catch {
      setErr({ code: 'network', text: ERRORS.network })
      setPhase('error')
    }
  }

  const header = (
    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
      <div style={{ display: 'inline-block', padding: '6px 14px', borderRadius: '999px', background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.4)', color: GOLD, fontSize: '11px', fontWeight: 700, letterSpacing: '1px', marginBottom: '14px' }}>
        🗼 ВЫШКИ В США
      </div>
      <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', lineHeight: 1.2, color: 'var(--text-primary)', margin: 0 }}>
        Привязать Telegram к Бести
      </h1>
    </div>
  )

  let body = null

  if (phase === 'expired') {
    body = (
      <div style={{ ...card, textAlign: 'center' }}>
        <p style={{ fontSize: '38px', margin: '0 0 10px' }}>⏳</p>
        <h2 style={titleStyle}>Ссылка устарела или неверная</h2>
        <p style={textStyle}>
          Напишите боту @{botName} команду <b style={{ color: 'var(--text-primary)' }}>/link</b> — он пришлёт новую. Ссылка действует 30 минут.
        </p>
        <a href={botLink} style={goldBtn}>Открыть бота</a>
      </div>
    )
  } else if (phase === 'loading') {
    body = (
      <div style={{ ...card, textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
        Загрузка…
      </div>
    )
  } else if (phase === 'login') {
    body = (
      <div style={card}>
        <h2 style={titleStyle}>Войдите в Бести</h2>
        <p style={textStyle}>
          Чтобы привязать Telegram{label ? <> <b style={{ color: 'var(--text-primary)' }}>{label}</b></> : null}, войдите в свой профиль Бести или создайте новый — это бесплатно.
        </p>
        <div style={stack}>
          <button type="button" onClick={goLogin} style={goldBtn}>Войти</button>
          <button type="button" onClick={goSignup} style={outlineBtn}>Создать профиль</button>
        </div>
        <p style={{ ...textStyle, fontSize: '13px', color: 'var(--text-dim)', margin: '16px 0 0' }}>
          Сайт Бести пока на английском. Создать профиль: <b>Your name</b> — имя, <b>Email</b> и <b>Password</b> (пароль),
          потом <b>Add your photo</b> — фото и <b>Where are you?</b> — город. После этого вы вернётесь сюда.
        </p>
      </div>
    )
  } else if (phase === 'confirm' || phase === 'busy') {
    const busy = phase === 'busy'
    const bestieName = me?.full_name || (me?.username ? '@' + me.username : '')
    body = (
      <div style={card}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', marginBottom: '20px' }}>
          <MiniCard label="Telegram" name={String(tg?.first_name || '').trim()} sub={tg?.username ? '@' + tg.username : ''} avatar={null} color={TG_BLUE} />
          <div style={{ display: 'flex', justifyContent: 'center', margin: '-4px 0' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--surface-1)', border: '1px solid rgba(212,175,55,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
              <Link2 size={18} color={GOLD} strokeWidth={2.2} />
            </div>
          </div>
          <MiniCard label="Бести" name={me?.full_name || ''} sub={me?.username ? '@' + me.username : ''} avatar={me?.avatar_url} color={GOLD} />
        </div>
        <h2 style={titleStyle}>
          Привязать Telegram{label ? ' ' + label : ''} к профилю Бести{me?.username ? ' @' + me.username : bestieName ? ' ' + bestieName : ''}?
        </h2>
        <p style={{ ...textStyle, margin: '0 0 10px' }}>
          После привязки ваш рейтинг из группы «Вышки в США» появится в профиле Бести, а вы сможете оставлять отзывы (нужны ещё анкета и подписка).
        </p>
        <p style={{ ...textStyle, color: 'var(--text-dim)', fontSize: '13px' }}>
          Если это не ваш Telegram — не нажимайте.
        </p>
        <div style={stack}>
          <button type="button" onClick={confirmLink} disabled={busy} style={{ ...goldBtn, opacity: busy ? 0.7 : 1, cursor: busy ? 'wait' : 'pointer' }}>
            {busy ? 'Привязываем…' : 'Привязать'}
          </button>
          <button type="button" onClick={() => setPhase('cancelled')} disabled={busy} style={ghostBtn}>
            Это не мой Telegram
          </button>
        </div>
        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)', margin: '16px 0 0' }}>
          Не тот профиль Бести?{' '}
          <button type="button" onClick={switchAccount} disabled={busy} style={{ background: 'none', border: 'none', padding: 0, color: GOLD, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Войти в другой
          </button>
        </p>
      </div>
    )
  } else if (phase === 'done') {
    const r = result || {}
    const un = r.bestie?.username || me?.username || ''
    const missing = Array.isArray(r.missing) ? r.missing : []
    const appLink = r.appLink || String(botLink || '').replace('start=link', 'start=app')
    body = (
      <div style={card}>
        <p style={{ fontSize: '38px', margin: '0 0 10px', textAlign: 'center' }}>✅</p>
        <h2 style={{ ...titleStyle, textAlign: 'center' }}>
          {r.status === 'already'
            ? <>Telegram уже привязан{un ? ` к @${un}` : ''}.</>
            : <>Готово! Telegram привязан{un ? ` к @${un}` : ''}.</>}
        </h2>
        {missing.length ? (
          <div style={{ padding: '12px 14px', borderRadius: '12px', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)', marginBottom: '12px' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.5, margin: '0 0 10px' }}>
              Осталось заполнить анкету: {missing.map((f) => GATE_FIELD_LABELS[f] || f).join(', ')}.
              На сайте это раздел <b>Edit Profile</b>: <b>Your name</b> — имя, фото сверху, город — в поле с местом.
            </p>
            <button type="button" onClick={() => router.push('/profile/edit')} style={outlineBtn}>Заполнить анкету</button>
          </div>
        ) : null}
        {r.member === false ? (
          <div style={{ padding: '12px 14px', borderRadius: '12px', background: 'var(--surface-2)', border: '1px solid var(--border)', margin: '0 0 12px' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 10px' }}>
              Остался последний шаг — подписка на группу. Бот пришлёт личную ссылку на оплату.
            </p>
            <button type="button" onClick={() => window.location.assign(String(botLink || '').replace('start=link', 'start=access'))} style={outlineBtn}>
              Оформить подписку
            </button>
          </div>
        ) : null}
        {r.status !== 'already' && r.dmSent ? (
          <p style={{ ...textStyle, textAlign: 'center', margin: '0 0 16px' }}>
            Бот @{botName} уже прислал вам сообщение в Telegram.
          </p>
        ) : null}
        <button type="button" onClick={() => window.location.assign(appLink)} style={goldBtn}>Вернуться в Telegram</button>
      </div>
    )
  } else if (phase === 'cancelled') {
    body = (
      <div style={{ ...card, textAlign: 'center' }}>
        <p style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.6, margin: 0 }}>
          Ничего не привязано. Страницу можно закрыть.
        </p>
      </div>
    )
  } else {
    // error
    const code = err?.code || 'error'
    let action = null
    if (code === 'conflict_user') {
      action = <button type="button" onClick={() => router.push('/profile/edit#telegram')} style={outlineBtn}>Открыть настройки профиля</button>
    } else if (code === 'conflict_tg') {
      action = <a href={botLink} style={outlineBtn}>Открыть бота</a>
    } else if (code === 'not_found') {
      action = <button type="button" onClick={switchAccount} style={goldBtn}>Войти заново</button>
    } else {
      action = (
        <button type="button" onClick={() => setPhase(me ? 'confirm' : 'login')} style={goldBtn}>
          Попробовать снова
        </button>
      )
    }
    body = (
      <div style={card}>
        <p style={{ fontSize: '34px', margin: '0 0 10px', textAlign: 'center' }}>⚠️</p>
        <p role="alert" style={{ ...textStyle, color: 'var(--text-primary)', fontSize: '15px' }}>{err?.text || ERRORS.error}</p>
        {action}
      </div>
    )
  }

  return (
    <div style={wrap}>
      <div style={container}>
        {header}
        {body}
        <p style={{ textAlign: 'center', fontSize: '12px', marginTop: '22px' }}>
          <a href="/" style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>Работает на <span style={{ color: GOLD, fontWeight: 700 }}>Bestie</span></a>
        </p>
      </div>
    </div>
  )
}
