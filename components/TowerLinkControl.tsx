// @ts-nocheck
'use client'

// The owner's own «Telegram · Вышки в США» link status and actions.
//   full (Edit profile → #telegram): status + «Привязать Telegram» / «Отвязать»
//   compact (own public profile):    one row, only when linked → «Управлять»
// Renders nothing for logged-out visitors. Auth: Bearer access token →
// /api/tower/link (the server takes the user from the token).
// Linking itself starts in the bot (t.me/<bot>?start=link → personal link →
// /tower/link), so no signed token ever passes through this page.

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { confirmSheet } from '@/components/ConfirmSheet'
import { showToast } from '@/components/Toast'
import { reviewsWord } from '@/components/TowerReputation'

const GOLD = '#D4AF37'
const SECTION = { background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '20px', padding: '24px', marginBottom: '20px' }
const HEADING = { fontFamily: 'DM Serif Display, serif', fontSize: '18px', color: 'var(--text-primary)', margin: '0 0 8px' }
const MUTED = { fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }
const GOLD_BTN = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: '44px',
  padding: '10px 18px', borderRadius: '12px', border: 'none', boxSizing: 'border-box',
  background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F',
  fontSize: '14px', fontWeight: 700, textDecoration: 'none', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif',
}
const NEUTRAL_BTN = {
  ...GOLD_BTN,
  background: 'var(--surface-3)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', fontWeight: 600,
}
const DANGER_BTN = {
  ...GOLD_BTN,
  background: 'transparent', border: '1px solid rgba(255,120,87,0.45)', color: 'var(--coral, #FF7857)', fontWeight: 600,
}

const DEFAULT_BOT_LINK = 'https://t.me/TowerCrewBot?start=link'

async function accessToken() {
  try {
    const { data } = await supabase.auth.getSession()
    return data?.session?.access_token || null
  } catch {
    return null
  }
}

export default function TowerLinkControl({ compact = false }: { compact?: boolean }) {
  // undefined = loading · null = logged out · object = /api/tower/link body
  const [data, setData] = useState(undefined)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const token = await accessToken()
    if (!token) { setData(null); return }
    try {
      const res = await fetch('/api/tower/link', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      if (res.status === 401) { setData(null); return }
      const body = await res.json().catch(() => null)
      setData(body && typeof body === 'object' ? body : { ok: false, code: 'error' })
    } catch {
      setData({ ok: false, code: 'error' })
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Linked in another tab (/tower/link) → refresh when the person comes back.
  useEffect(() => {
    if (compact) return
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [compact, load])

  // /profile/edit#telegram: the section mounts after the page loads, so the
  // browser's own hash jump misses it.
  const loaded = data !== undefined
  useEffect(() => {
    if (compact || !loaded) return
    try {
      if (window.location.hash === '#telegram') {
        document.getElementById('telegram')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    } catch {}
  }, [compact, loaded])

  const unlink = async () => {
    if (busy) return
    const ok = await confirmSheet({
      title: 'Отвязать Telegram?',
      body: 'Рейтинг из группы «Вышки в США» пропадёт из профиля, а оставлять новые отзывы будет нельзя, пока не привяжете снова. Отзывы сохранятся.',
      confirmLabel: 'Отвязать',
      danger: true,
    })
    if (!ok) return
    setBusy(true)
    try {
      const token = await accessToken()
      if (!token) { setData(null); return }
      const res = await fetch('/api/tower/link', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      const body = await res.json().catch(() => ({}))
      if (body?.ok) {
        showToast('Telegram отвязан', { type: 'success' })
      } else {
        showToast(body?.error || 'Не получилось — попробуйте ещё раз.', { type: 'error' })
      }
    } catch {
      showToast('Нет связи — попробуйте ещё раз.', { type: 'error' })
    } finally {
      setBusy(false)
    }
    load()
  }

  // ── Compact row (own public profile) ──
  if (compact) {
    if (!data?.ok || !data.linked) return null
    const name = data.telegram?.first_name || (data.telegram?.username ? '@' + data.telegram.username : '')
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 14px', borderRadius: '12px', background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)', marginBottom: '16px' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0, minWidth: 0 }}>
          🗼 Telegram привязан{name ? <> · <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{name}</span></> : null}
          {data.reputation?.hidden ? ' · скрыт из рейтинга' : ''}
        </p>
        <Link href="/profile/edit#telegram" style={{ flexShrink: 0, fontSize: '13px', fontWeight: 700, color: GOLD, textDecoration: 'none' }}>
          Управлять
        </Link>
      </div>
    )
  }

  // ── Full section (Edit profile) ──
  if (data === null) return null

  const botLink = data?.botLink || DEFAULT_BOT_LINK
  const botName = (String(botLink).match(/t\.me\/([A-Za-z0-9_]+)/) || [])[1] || 'TowerCrewBot'
  let content

  if (data === undefined) {
    content = <p style={MUTED}>Проверяем привязку…</p>
  } else if (!data.ok && data.code === 'schema') {
    content = <p style={MUTED}>Привязка Telegram скоро будет доступна.</p>
  } else if (!data.ok) {
    content = (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <p style={MUTED}>Не удалось загрузить статус привязки.</p>
        <button type="button" onClick={() => { setData(undefined); load() }} style={NEUTRAL_BTN}>Обновить</button>
      </div>
    )
  } else if (!data.linked) {
    content = (
      <>
        <p style={{ ...MUTED, margin: '0 0 16px' }}>
          Привяжите Telegram, чтобы оставлять отзывы коллегам в группе «Вышки в США» и показывать свой рейтинг в профиле.
        </p>
        <a href={botLink} target="_blank" rel="noopener" style={GOLD_BTN}>Привязать Telegram</a>
        <p style={{ fontSize: '12px', color: 'var(--text-dim)', lineHeight: 1.5, margin: '10px 0 0' }}>
          Откроется бот @{botName} — нажмите «Start» (или «Запустить»), он пришлёт кнопку для привязки.
        </p>
      </>
    )
  } else {
    const tgName = data.telegram?.first_name || ''
    const tgUn = data.telegram?.username ? '@' + data.telegram.username : ''
    const rep = data.reputation || {}
    const rating = rep.show && rep.rating && rep.rating.count > 0 ? rep.rating : null
    content = (
      <>
        <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.5, margin: '0 0 6px' }}>
          ✅ Привязан: <b>{tgName || tgUn || 'Telegram'}</b>{tgName && tgUn ? <span style={{ color: 'var(--text-muted)' }}> ({tgUn})</span> : null}
        </p>
        {rating || rep.team?.name ? (
          <p style={{ ...MUTED, margin: '0 0 6px' }}>
            {rating ? <><span style={{ color: GOLD }}>★</span> {Number(rating.avg).toFixed(1)} · {rating.count} {reviewsWord(rating.count)}</> : 'Пока нет отзывов'}
            {rep.team?.name ? <> · команда «{rep.team.name}»</> : null}
          </p>
        ) : null}
        {rep.hidden ? (
          <p style={{ ...MUTED, margin: '0 0 6px' }}>
            Вы скрыты из рейтинга — блок «Вышки в США» в профиле не показывается. Включить можно в приложении (вкладка «Я»).
          </p>
        ) : null}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '14px' }}>
          {data.appLink ? <a href={data.appLink} target="_blank" rel="noopener" style={NEUTRAL_BTN}>🗼 Открыть приложение</a> : null}
          <button type="button" onClick={unlink} disabled={busy} style={{ ...DANGER_BTN, opacity: busy ? 0.6 : 1, cursor: busy ? 'wait' : 'pointer' }}>
            {busy ? 'Отвязываем…' : 'Отвязать'}
          </button>
        </div>
      </>
    )
  }

  return (
    <div style={SECTION}>
      <h3 style={HEADING}>Telegram · Вышки в США</h3>
      {content}
    </div>
  )
}
