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
  const [invite, setInvite] = useState(null) // { link, chat_id } | { error }
  const [copied, setCopied] = useState('')
  const [hiding, setHiding] = useState('') // review id being hidden / shown
  // Reviews table beyond the latest 50: null = the list from the main GET;
  // { items, more, q, user, notFound } = filtered by a person and / or «Ещё».
  const [rv, setRv] = useState(null)
  const [rq, setRq] = useState('')
  const [rvBusy, setRvBusy] = useState(false)

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(String(text))
      setCopied(String(text))
      setTimeout(() => setCopied(''), 1500)
    } catch {}
  }

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

  const makeInviteLink = async () => {
    if (busy) return
    const ok = await confirmSheet({
      title: 'Создать ссылку с одобрением?',
      body: 'Бот создаст в группе новую пригласительную ссылку «Вступление через оплату». Войти по ней сразу нельзя: человек подаёт заявку, бот присылает ему оплату и одобряет заявку после оплаты. Старые ссылки и участники не меняются.',
      confirmLabel: 'Создать',
    })
    if (!ok) return
    setBusy('invite_link')
    const h = await authHeader()
    if (!h) { setBusy(''); return }
    try {
      const res = await fetch('/api/tower/admin', {
        method: 'POST',
        headers: { ...h, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'invite_link' }),
      })
      const data = await res.json().catch(() => ({}))
      setInvite(res.ok && data.link ? { link: data.link, chat_id: data.chat_id } : { error: data.error || `Ошибка ${res.status}` })
    } catch {
      setInvite({ error: 'Нет связи с сервером' })
    }
    setBusy('')
  }

  // «Скрыть» / «Показать» a review — updates the row in place (team ratings
  // are recalculated on «Обновить»).
  const toggleReview = async (r) => {
    if (hiding || !r?.id) return
    setHiding(r.id)
    const h = await authHeader()
    if (!h) { setHiding(''); return }
    try {
      const res = await fetch('/api/tower/admin', {
        method: 'POST',
        headers: { ...h, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'review_hide', id: r.id, hidden: !r.hidden_at }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        setInfo((prev) => {
          if (!prev?.community?.reviews) return prev
          const was = !!r.hidden_at
          const now = !!data.hidden_at
          const totals = prev.community.totals || {}
          return {
            ...prev,
            community: {
              ...prev.community,
              totals: { ...totals, hidden: Math.max(0, (totals.hidden || 0) + (now ? 1 : 0) - (was ? 1 : 0)) },
              reviews: prev.community.reviews.map((x) => (x.id === r.id ? { ...x, hidden_at: data.hidden_at || null } : x)),
            },
          }
        })
        setRv((prev) => (prev
          ? { ...prev, items: prev.items.map((x) => (x.id === r.id ? { ...x, hidden_at: data.hidden_at || null } : x)) }
          : prev))
      } else {
        setError(data.error || `Ошибка ${res.status}`)
      }
    } catch {
      setError('Нет связи с сервером')
    }
    setHiding('')
  }

  // Reviews by / about one person (Telegram id or @username) and «Ещё» paging.
  // base = rows already shown (appended to), [] = a fresh list.
  const loadReviews = async ({ q = '', before = '', base = [] } = {}) => {
    if (rvBusy) return
    setRvBusy(true)
    const h = await authHeader()
    if (!h) { setRvBusy(false); return }
    try {
      const params = new URLSearchParams({ view: 'reviews' })
      if (q) params.set('q', q)
      if (before) params.set('before', before)
      const res = await fetch('/api/tower/admin?' + params.toString(), { headers: h, cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.error) {
        setError(data.error || `Ошибка ${res.status}`)
      } else {
        const fresh = Array.isArray(data.reviews) ? data.reviews : []
        const seen = new Set(base.map((x) => x.id))
        setRv({
          q,
          items: [...base, ...fresh.filter((x) => !seen.has(x.id))],
          more: !!data.more,
          user: data.user || null,
          notFound: !!data.notFound,
        })
      }
    } catch {
      setError('Нет связи с сервером')
    }
    setRvBusy(false)
  }

  if (loading) return <PageLoader fullscreen={false} message="Загружаем статус бота…" />

  const i = info || {}
  const prices = i.prices || {}
  const pricesOk = !!prices.basic?.ok && !!prices.admin?.ok
  const stripeHooks = Array.isArray(i.stripeWebhooks) ? i.stripeWebhooks : []
  const stripeHooksOk = stripeHooks.length > 0 && stripeHooks.every((w) => !w.missing?.length)
  const ch = i.chat || {}
  const isPrivate = !!ch.ok && !ch.is_public
  const known = Array.isArray(i.knownChatIds) ? i.knownChatIds : []
  const knownText = known.length ? ` (в базе встречается: ${known.join(', ')})` : ''
  const mismatch = !!i.chatIdMismatch
  // TOWER_GROUP_URL counts only when Telegram confirmed: made by the bot, not
  // revoked, with join requests (see groupUrlCheck in the admin GET).
  const urlVerified = !!i.groupUrlFromEnv && !!i.groupUrlCheck?.ok
  const urlProblem = !!i.groupUrlEnvInvalid || !!i.groupUrlIsBotFallback || (!!i.groupUrlFromEnv && !urlVerified)
  const privateReady = !!i.towerChatIsId && urlVerified && !mismatch
  const groupOk = !!ch.ok && !ch.members_can_invite && !mismatch && !urlProblem &&
    (isPrivate ? privateReady : !!ch.join_by_request)
  // Only an id Telegram actually found (and that matches our rows) is offered for copying.
  const numericId = ch.ok && !mismatch && ch.id != null
    ? String(ch.id)
    : (invite?.chat_id != null && !mismatch ? String(invite.chat_id) : '')
  const envLines = `TOWER_CHAT=${numericId || '<id группы>'}\nTOWER_GROUP_URL=${invite?.link || (urlVerified ? i.groupUrl : '<ссылка>')}`
  const codeBox = { display: 'block', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', color: 'var(--text-primary)', wordBreak: 'break-all', whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }
  const smallBtn = { padding: '6px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface-1)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '12px', cursor: 'pointer', fontFamily: font }
  // Teams and reviews (lib/tower-teams.ts → GET community)
  const community = i.community || {}
  const cTotals = community.totals || {}
  const cTeams = Array.isArray(community.teams) ? community.teams : []
  const cReviews = Array.isArray(community.reviews) ? community.reviews : []
  const shownReviews = rv ? rv.items : cReviews
  const reviewsMore = rv ? !!rv.more : !!community.reviewsMore
  const lastReview = shownReviews.length ? shownReviews[shownReviews.length - 1] : null
  // No allowed_updates in getWebhookInfo = all types (callback_query included).
  const allowedUpdates = i.webhook?.allowed_updates
  const callbacksOn = !!i.webhook?.ok && (!Array.isArray(allowedUpdates) || allowedUpdates.includes('callback_query'))
  const personLabel = (p) => (p ? `${p.name}${p.username && p.name !== '@' + p.username ? ' (@' + p.username + ')' : ''}` : '—')
  const td = { padding: '9px 10px', borderBottom: '1px solid var(--border)', verticalAlign: 'top' }

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
          <Check ok={groupOk} title="Группа">
            {i.chat?.ok ? (
              <>
                {i.chat.title} ({i.chat.username ? '@' + i.chat.username : i.chat.id})
                <br />Тип: {isPrivate ? 'частная' : 'публичная (по ссылке t.me/' + i.chat.username + ' её видит и может подать заявку любой)'}
                <br />Участников: {i.chat.members ?? '—'}
                {isPrivate ? (
                  <>
                    <br />Вступление: {privateReady
                      ? 'по ссылке TOWER_GROUP_URL с одобрением заявок'
                      : 'НЕ НАСТРОЕНО — см. блок «Закрыть группу» ниже'}
                  </>
                ) : (
                  <>
                    <br />Заявки на вступление: {i.chat.join_by_request ? 'включены' : 'ВЫКЛЮЧЕНЫ — включите «Одобрение новых участников» в настройках группы'}
                  </>
                )}
                <br />Участники добавляют людей: {i.chat.members_can_invite
                  ? 'ДА — выключите «Добавление участников» в разрешениях группы, иначе люди попадают в группу без оплаты'
                  : 'нет'}
                {mismatch ? (
                  <><br />❗ В базе подписок и заявок у группы другой id{knownText} — TOWER_CHAT указывает не на ту группу. Проверьте TOWER_CHAT в Netlify.</>
                ) : null}
                {urlProblem ? (
                  <><br />❗ Ссылка для вступления не проверена — см. блок «Закрыть группу» ниже.</>
                ) : null}
                <br />Старые пригласительные ссылки без одобрения отзовите вручную (Управление группой → Пригласительные ссылки) — бот их не видит.
              </>
            ) : (
              <>
                {i.chat?.error || '—'}
                {i.towerChatIsId ? (
                  <><br />TOWER_CHAT={i.towerChat} не найден ботом — проверьте id{knownText} и что бот — админ группы.</>
                ) : (
                  <><br />Если группа уже частная — укажите в Netlify TOWER_CHAT = числовой id группы{knownText} и сделайте redeploy.</>
                )}
              </>
            )}
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
          <button onClick={() => { setRv(null); setRq(''); setLoading(true); load() }} disabled={!!busy} style={{ padding: '12px 18px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface-1)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '14px', cursor: 'pointer', fontFamily: font }}>
            Обновить
          </button>
        </div>

        <div style={{ background: 'var(--surface-1)', border: `1px solid ${isPrivate && privateReady ? 'rgba(52,211,153,0.35)' : 'rgba(212,175,55,0.35)'}`, borderRadius: '14px', padding: '16px', marginBottom: '18px' }}>
          <p style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
            🔒 Закрыть группу (сделать частной)
          </p>
          <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.55 }}>
            Сейчас группа: <b style={{ color: 'var(--text-primary)' }}>{!ch.ok ? 'нет данных' : isPrivate ? 'частная' : `публичная (@${ch.username})`}</b>.
            {' '}У частной группы нет ссылки t.me/towerUSA — новые люди подают заявку по специальной ссылке, бот присылает им оплату и одобряет после оплаты. Участники и подписки не меняются.
          </p>

          <div style={{ display: 'grid', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.5 }}>
            <div>
              Числовой id группы: {numericId ? (
                <>
                  <b style={{ color: 'var(--text-primary)' }}>{numericId}</b>{' '}
                  <button onClick={() => copy(numericId)} style={smallBtn}>{copied === numericId ? 'Скопировано' : 'Скопировать'}</button>
                </>
              ) : mismatch ? (
                <b style={{ color: 'var(--coral)' }}>❗ TOWER_CHAT указывает на другой чат{knownText} — не копируйте этот id, проверьте TOWER_CHAT</b>
              ) : `не определён${knownText}`}
            </div>
            <div>
              {i.towerChatIsId && ch.ok && !mismatch ? '✅' : '❌'} TOWER_CHAT = {i.towerChat || '—'}
              {!i.towerChatIsId
                ? ' — нужно указать числовой id, иначе после закрытия группы бот её не найдёт'
                : !ch.ok
                  ? ` — бот не нашёл такую группу, проверьте id${knownText}`
                  : mismatch ? ' — это не та группа, что в базе' : ''}
            </div>
            <div style={{ wordBreak: 'break-all' }}>
              {urlVerified ? '✅' : '❌'} Ссылка, которую бот даёт людям (GROUP_URL): {i.groupUrl || '—'}
              {i.groupUrlFromEnv
                ? (urlVerified
                    ? ' (из TOWER_GROUP_URL; проверена: создана ботом, с одобрением заявок)'
                    : ` — эта ссылка создана не ботом, отозвана или без одобрения заявок: по ней могут войти без оплаты. Нажмите «Создать ссылку с одобрением» и вставьте новую в TOWER_GROUP_URL${i.groupUrlCheck?.error ? ` (Telegram: ${i.groupUrlCheck.error})` : ''}`)
                : i.groupUrlIsBotFallback
                  ? ' — TOWER_GROUP_URL не задан: бот вместо группы даёт ссылку на себя. Создайте ссылку ниже и добавьте её в Netlify'
                  : ' — по @username; после закрытия группы перестанет работать, а имя может занять чужая группа'}
              {i.groupUrlEnvInvalid ? (
                <><br />❌ TOWER_GROUP_URL задан, но не распознан — нужен вид https://t.me/+… (ссылка из кнопки ниже)</>
              ) : null}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <button onClick={makeInviteLink} disabled={!!busy} style={{ padding: '12px 18px', borderRadius: '12px', border: 'none', background: GOLD, color: '#09090F', fontWeight: 700, fontSize: '14px', cursor: busy ? 'wait' : 'pointer', fontFamily: font, opacity: busy && busy !== 'invite_link' ? 0.5 : 1 }}>
              {busy === 'invite_link' ? 'Создаём…' : 'Создать ссылку с одобрением'}
            </button>
          </div>

          {invite?.error ? (
            <p style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,120,87,0.12)', border: '1px solid rgba(255,120,87,0.4)', color: 'var(--coral)', fontSize: '13px', margin: '0 0 12px' }}>
              {invite.error}
            </p>
          ) : null}
          {invite?.link ? (
            <div style={{ marginBottom: '12px' }}>
              <p style={{ margin: '0 0 6px', fontSize: '13px', color: 'var(--text-muted)' }}>✅ Ссылка создана (с одобрением заявок):</p>
              <code style={codeBox}>{invite.link}</code>
              <div style={{ marginTop: '6px' }}>
                <button onClick={() => copy(invite.link)} style={smallBtn}>{copied === invite.link ? 'Скопировано' : 'Скопировать ссылку'}</button>
              </div>
            </div>
          ) : null}

          <p style={{ margin: '0 0 6px', fontSize: '13px', color: 'var(--text-muted)' }}>Переменные для Netlify:</p>
          <code style={codeBox}>{envLines}</code>
          <div style={{ marginTop: '6px', marginBottom: '12px' }}>
            <button onClick={() => copy(envLines)} style={smallBtn}>{copied === envLines ? 'Скопировано' : 'Скопировать обе'}</button>
          </div>

          <ol style={{ margin: '0 0 10px', paddingLeft: '20px', fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.6 }}>
            <li>Добавьте в Netlify переменные TOWER_CHAT={numericId || '<id>'} и TOWER_GROUP_URL={invite?.link || '<ссылка>'} и сделайте redeploy (лучше сразу, пока группа ещё публичная — тогда бот перестаёт зависеть от имени @towerUSA);</li>
            <li>только потом сделайте группу частной (Telegram → группа → Изменить → Тип группы → Частная).</li>
            <li>Нажмите «Обновить» здесь — все пункты выше должны стать ✅.</li>
          </ol>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-dim)', lineHeight: 1.55 }}>
            Основную пригласительную ссылку группы никому не давайте — по ней входят без заявки и без оплаты.
            Имя @towerUSA после закрытия освободится и его может занять кто-то другой (например, для фейковой группы) — при желании сразу закрепите его за своим каналом.
            Старые ссылки t.me/towerUSA в прежних сообщениях перестанут работать — бот везде будет давать новую ссылку.
          </p>
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

        {/* ── Команды и отзывы ─────────────────────────────────────────── */}
        <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', color: 'var(--text-primary)', margin: '32px 0 6px' }}>
          Команды и отзывы
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.55 }}>
          Команды (/crew), профили (/profile) и отзывы (/review) в боте. Вступление в команду — по заявке, её подтверждает лидер.
          Скрытый отзыв не виден в боте и не входит в рейтинг, а его подтверждение в группе бот меняет на «🙈 Отзыв скрыт модератором».
          Бот ничего не делает с участниками группы: «исключить» в команде убирает человека только из команды.
          После обновления бота ещё раз выполните в Supabase lib/migration_tower_teams.sql (повторный запуск безопасен).
        </p>

        <div style={{ background: 'var(--surface-1)', border: `1px solid ${callbacksOn ? 'rgba(52,211,153,0.35)' : 'rgba(255,120,87,0.35)'}`, borderRadius: '14px', padding: '12px 14px', marginBottom: '12px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.55 }}>
          {callbacksOn ? '✅' : '❗'} После деплоя нажмите «Подключить бота (webhook)» ещё раз — бот начнёт получать нажатия кнопок
          (⭐ оценки, «Мои отзывы», «Моя команда») и обновит меню команд (/profile, /myteam, /crew, /review, /reviews, /help).
          {' '}{callbacksOn ? 'Кнопки сейчас доходят до бота.' : 'Сейчас нажатия кнопок до бота не доходят.'}
        </div>

        {community.error ? (
          <p style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,120,87,0.12)', border: '1px solid rgba(255,120,87,0.4)', color: 'var(--coral)', fontSize: '13px', margin: '0 0 12px', wordBreak: 'break-word' }}>
            Таблицы команд и отзывов недоступны — выполните в Supabase lib/migration_tower_teams.sql. ({community.error})
          </p>
        ) : null}

        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 10px' }}>
          Команд: {cTotals.teams ?? 0} · отзывов: {cTotals.reviews ?? 0} (скрыто: {cTotals.hidden ?? 0}) · людей в базе бота: {cTotals.people ?? 0}
        </p>

        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '14px', background: 'var(--surface-1)', marginBottom: '14px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '560px' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-dim)' }}>
                {['Команда', 'Лидер', 'Участников', 'Рейтинг', 'Создана'].map((h) => (
                  <th key={h} style={{ padding: '10px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cTeams.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '18px', textAlign: 'center', color: 'var(--text-dim)' }}>Команд пока нет</td></tr>
              ) : cTeams.map((t) => (
                <tr key={t.id} style={{ color: 'var(--text-primary)' }}>
                  <td style={td}>
                    <b>{t.name}</b>
                    {t.description ? <div style={{ color: 'var(--text-dim)', marginTop: '2px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{t.description}</div> : null}
                  </td>
                  <td style={td}>{personLabel(t.leader)}<span style={{ color: 'var(--text-dim)' }}> · {t.leader?.id}</span></td>
                  <td style={td}>{t.members}</td>
                  <td style={td}>{t.rating != null ? `⭐ ${Number(t.rating).toFixed(1)} (оценены ${t.rated})` : 'нет оценок'}</td>
                  <td style={{ ...td, color: 'var(--text-dim)' }}>{fmt(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); const q = rq.trim(); if (q) loadReviews({ q }); else setRv(null) }}
          style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', margin: '0 0 10px' }}
        >
          <input
            value={rq}
            onChange={(e) => setRq(e.target.value)}
            placeholder="Telegram id или @username"
            style={{ flex: '1 1 200px', minWidth: 0, padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', fontSize: '13px', fontFamily: font }}
          />
          <button type="submit" disabled={rvBusy} style={{ ...smallBtn, cursor: rvBusy ? 'wait' : 'pointer' }}>
            {rvBusy ? '…' : 'Найти отзывы'}
          </button>
          {rv ? (
            <button type="button" onClick={() => { setRv(null); setRq('') }} style={smallBtn}>Сбросить</button>
          ) : null}
        </form>

        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 10px' }}>
          {rv?.q
            ? (rv.notFound
                ? `Пользователь ${rv.q} не найден в базе бота.`
                : `Отзывы от и о ${rv.user ? personLabel(rv.user) + ' · ' + rv.user.id : rv.q} (новые и изменённые сверху):`)
            : 'Последние отзывы (новые и изменённые сверху):'}
        </p>
        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '14px', background: 'var(--surface-1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '680px' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-dim)' }}>
                {['Дата', 'Автор → кому', 'Оценка', 'Текст', ''].map((h, idx) => (
                  <th key={h || 'action-' + idx} style={{ padding: '10px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shownReviews.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '18px', textAlign: 'center', color: 'var(--text-dim)' }}>{rv?.q ? 'Отзывов не найдено' : 'Отзывов пока нет'}</td></tr>
              ) : shownReviews.map((r) => (
                <tr key={r.id} style={{ color: 'var(--text-primary)', opacity: r.hidden_at ? 0.55 : 1 }}>
                  <td style={{ ...td, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{fmt(r.updated_at || r.created_at)}</td>
                  <td style={td}>{personLabel(r.author)} → <b>{personLabel(r.target)}</b></td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>{'⭐'.repeat(Math.max(0, Math.min(5, Number(r.rating) || 0)))}</td>
                  <td style={{ ...td, maxWidth: '320px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: r.text ? 'var(--text-primary)' : 'var(--text-dim)' }}>
                    {r.text || '— без текста'}
                    {r.hidden_at ? <div style={{ color: 'var(--coral)', marginTop: '2px' }}>скрыт {fmt(r.hidden_at)}</div> : null}
                  </td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    <button onClick={() => toggleReview(r)} disabled={!!hiding} style={{ ...smallBtn, cursor: hiding ? 'wait' : 'pointer' }}>
                      {hiding === r.id ? '…' : r.hidden_at ? 'Показать' : 'Скрыть'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {reviewsMore && lastReview ? (
          <div style={{ marginTop: '10px' }}>
            <button
              onClick={() => loadReviews({ q: rv?.q || '', before: lastReview.updated_at || '', base: shownReviews })}
              disabled={rvBusy}
              style={{ ...smallBtn, cursor: rvBusy ? 'wait' : 'pointer' }}
            >
              {rvBusy ? 'Загружаем…' : 'Ещё'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
