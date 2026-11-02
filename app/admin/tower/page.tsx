// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PageLoader } from '@/components/Loading'
import { confirmSheet } from '@/components/ConfirmSheet'

const GOLD = '#D4AF37'
const font = 'Plus Jakarta Sans, sans-serif'

const STATUS_COLOR = {
  active: '#34D399', trialing: '#34D399', past_due: '#FBBF24',
  incomplete: 'var(--text-dim)', canceled: '#FF7857', unpaid: '#FF7857',
  incomplete_expired: 'var(--text-dim)', paused: '#FF7857',
}

function fmt(iso) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return '—' }
}

function Check({ ok, title, children }) {
  return (
    <div style={{ background: 'var(--surface-1)', border: `1px solid ${ok ? 'rgba(52,211,153,0.35)' : 'rgba(255,120,87,0.35)'}`, borderRadius: '14px', padding: '14px' }}>
      <p style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{ok ? '✅' : '❌'} {title}</p>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.55, wordBreak: 'break-word' }}>{children}</div>
    </div>
  )
}

export default function AdminTowerPage() {
  const router = useRouter()
  const [info, setInfo] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [lastResult, setLastResult] = useState(null)

  const authHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return null }
    return { Authorization: `Bearer ${session.access_token}` }
  }

  const load = async () => {
    setError('')
    const h = await authHeader()
    if (!h) return
    try {
      const res = await fetch('/api/tower/admin', { headers: h, cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) setError(data.error || `Ошибка ${res.status}`)
      else setInfo(data)
    } catch {
      setError('Нет связи с сервером')
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const run = async (action) => {
    if (busy) return
    if (action === 'stripe') {
      const ok = await confirmSheet({
        title: 'Настроить Stripe?',
        body: `Режим: ${info?.stripeMode === 'live' ? 'LIVE' : info?.stripeMode}. Создадим недостающие тарифы Basic $10/мес и Admin $30/мес, портал управления подпиской и включим события подписок на вебхуке Bestie. Повторный запуск ничего не дублирует.`,
        confirmLabel: 'Настроить',
      })
      if (!ok) return
    }
    setBusy(action)
    const h = await authHeader()
    if (!h) { setBusy(''); return }
    try {
      const res = await fetch('/api/tower/admin', {
        method: 'POST',
        headers: { ...h, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json().catch(() => ({}))
      setLastResult({ action, status: res.status, data })
    } catch {
      setLastResult({ action, status: 0, data: { error: 'Нет связи с сервером' } })
    }
    setBusy('')
    load()
  }

  if (loading) return <PageLoader fullscreen={false} message="Загружаем статус бота…" />

  const i = info || {}
  const prices = i.prices || {}
  const pricesOk = !!prices.basic?.ok && !!prices.admin?.ok
  const stripeHooks = Array.isArray(i.stripeWebhooks) ? i.stripeWebhooks : []
  const stripeHooksOk = stripeHooks.length > 0 && stripeHooks.every((w) => !w.missing?.length)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: font }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: GOLD, textDecoration: 'none' }}>BESTIE</Link>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <Link href="/admin/analytics" style={{ fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none' }}>Analytics</Link>
          <Link href="/admin/moderation" style={{ fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none' }}>Moderation</Link>
          <span style={{ fontSize: '13px', color: GOLD }}>Tower</span>
        </div>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '28px 16px 120px' }}>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '26px', color: 'var(--text-primary)', margin: '0 0 4px' }}>
          «Вышки в США» — бот и подписки
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 20px' }}>
          Группа {i.towerChat || '@towerUSA'} · бот {i.bot?.username ? '@' + i.bot.username : '—'} · Stripe: <b style={{ color: i.stripeMode === 'live' ? '#34D399' : '#FBBF24' }}>{(i.stripeMode || '—').toUpperCase()}</b>
        </p>

        {error ? (
          <p style={{ padding: '12px 14px', borderRadius: '12px', background: 'rgba(255,120,87,0.12)', border: '1px solid rgba(255,120,87,0.4)', color: 'var(--coral)', fontSize: '14px', marginBottom: '16px' }}>{error}</p>
        ) : null}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px', marginBottom: '18px' }}>
          <Check ok={!!i.bot?.ok} title="Бот">
            {i.bot?.ok ? <>@{i.bot.username} (id {i.bot.id})</> : i.bot?.error || 'Нет ответа от Telegram (TOWER_BOT_TOKEN?)'}
          </Check>
          <Check ok={!!i.webhook?.ok} title="Webhook">
            {i.webhook?.url ? <>URL: {i.webhook.url}</> : 'Не подключён'}
            <br />Ожидает: {i.webhook?.pending_update_count ?? '—'}
            {i.webhook?.last_error_message ? <><br />Последняя ошибка: {i.webhook.last_error_message} ({fmt(i.webhook.last_error_date)})</> : null}
            {i.webhook?.error ? <><br />{i.webhook.error}</> : null}
          </Check>
          <Check ok={!!i.chat?.ok && !!i.chat?.join_by_request && !i.chat?.members_can_invite} title="Группа">
            {i.chat?.ok ? (
              <>
                {i.chat.title} ({i.chat.username ? '@' + i.chat.username : i.chat.id})
                <br />Участников: {i.chat.members ?? '—'}
                <br />Заявки на вступление: {i.chat.join_by_request ? 'включены' : 'ВЫКЛЮЧЕНЫ — включите «Одобрение новых участников» в настройках группы'}
                <br />Участники добавляют людей: {i.chat.members_can_invite
                  ? 'ДА — выключите «Добавление участников» в разрешениях группы, иначе люди попадают в группу без оплаты'
                  : 'нет'}
                <br />Старые пригласительные ссылки без одобрения отзовите вручную (Управление группой → Пригласительные ссылки) — бот их не видит.
              </>
            ) : i.chat?.error || '—'}
          </Check>
          <Check ok={!!i.botRights?.ok} title="Права бота в группе">
            Статус: {i.botRights?.status || '—'}
            <br />Приглашать/одобрять: {i.botRights?.can_invite_users ? '✅' : '❌'}
            <br />Банить: {i.botRights?.can_restrict_members ? '✅' : '❌'}
            <br />Назначать админов: {i.botRights?.can_promote_members ? '✅' : '❌'}
            {i.botRights?.error ? <><br />{i.botRights.error}</> : null}
          </Check>
          <Check ok={pricesOk} title="Тарифы в Stripe">
            Basic: {prices.basic?.ok ? `${prices.basic.id} · $${(prices.basic.unit_amount || 0) / 100}${prices.basic.livemode ? ' · live' : ' · test'}` : `нет (${prices.basic?.lookupKey || 'tower_basic_monthly'})`}
            <br />Admin: {prices.admin?.ok ? `${prices.admin.id} · $${(prices.admin.unit_amount || 0) / 100}${prices.admin.livemode ? ' · live' : ' · test'}` : `нет (${prices.admin?.lookupKey || 'tower_admin_monthly'})`}
          </Check>
          <Check ok={stripeHooksOk && !!i.portal?.ok} title="Stripe: вебхук и портал">
            {stripeHooks.length
              ? stripeHooks.map((w) => (
                  <span key={w.id}>{w.url} ({w.status}){w.missing?.length ? ` — не хватает: ${w.missing.join(', ')}` : ' — события ок'}<br /></span>
                ))
              : i.stripeWebhooks?.error || 'Вебхук /api/stripe/webhook не найден'}
            Портал: {i.portal?.ok ? i.portal.id : (i.portal?.error || 'ещё не создан')}
          </Check>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
          <button onClick={() => run('setup')} disabled={!!busy} style={{ padding: '12px 18px', borderRadius: '12px', border: 'none', background: GOLD, color: '#09090F', fontWeight: 700, fontSize: '14px', cursor: busy ? 'wait' : 'pointer', fontFamily: font, opacity: busy && busy !== 'setup' ? 0.5 : 1 }}>
            {busy === 'setup' ? 'Подключаем…' : 'Подключить бота (webhook)'}
          </button>
          <button onClick={() => run('stripe')} disabled={!!busy} style={{ padding: '12px 18px', borderRadius: '12px', border: '1px solid rgba(212,175,55,0.45)', background: 'rgba(212,175,55,0.12)', color: GOLD, fontWeight: 700, fontSize: '14px', cursor: busy ? 'wait' : 'pointer', fontFamily: font, opacity: busy && busy !== 'stripe' ? 0.5 : 1 }}>
            {busy === 'stripe' ? 'Настраиваем…' : 'Настроить Stripe (тарифы, портал, события)'}
          </button>
          <button onClick={() => { setLoading(true); load() }} disabled={!!busy} style={{ padding: '12px 18px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface-1)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '14px', cursor: 'pointer', fontFamily: font }}>
            Обновить
          </button>
        </div>

        {lastResult ? (
          <pre style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', fontSize: '12px', color: 'var(--text-muted)', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: '18px' }}>
            {lastResult.action} → HTTP {lastResult.status}{'\n'}{JSON.stringify(lastResult.data, null, 2)}
          </pre>
        ) : null}

        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 10px' }}>
          Подписки: {Object.keys(i.counts || {}).length
            ? Object.entries(i.counts).map(([k, v]) => `${k}: ${v}`).join(' · ')
            : 'пока нет'}
          {' '}· заявок в ожидании: {i.pendingJoinRequests ?? 0} · запустили бота: {i.botUsers ?? 0}
        </p>

        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '14px', background: 'var(--surface-1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '680px' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-dim)' }}>
                {['Пользователь', 'Тариф', 'Статус', 'Оплачено до', 'Удалён', 'Флаги', 'Обновлено'].map((h) => (
                  <th key={h} style={{ padding: '10px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(i.rows || []).length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '18px', textAlign: 'center', color: 'var(--text-dim)' }}>Подписок пока нет</td></tr>
              ) : (i.rows || []).map((r) => (
                <tr key={r.telegram_user_id} style={{ color: 'var(--text-primary)' }}>
                  <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--border)' }}>
                    {r.telegram_username ? '@' + r.telegram_username : '—'}
                    <span style={{ color: 'var(--text-dim)' }}> · {r.telegram_user_id}</span>
                  </td>
                  <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--border)' }}>{r.plan === 'admin' ? 'Admin' : 'Basic'}</td>
                  <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--border)', color: STATUS_COLOR[r.status] || 'var(--text-muted)', fontWeight: 600 }}>
                    {r.status}{r.cancel_at_period_end ? ' (отменяется)' : ''}
                  </td>
                  <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--border)' }}>{fmt(r.paid_until)}</td>
                  <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--border)' }}>{fmt(r.removed_at)}</td>
                  <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    {[r.was_member_before ? 'был в группе' : null, r.approved_at ? 'одобрен' : null, r.promoted_at ? 'админ' : null, r.livemode ? null : 'test'].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-dim)' }}>{fmt(r.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
