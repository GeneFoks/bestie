// @ts-nocheck
// ============================================================================
// «Вышки в США» — who may write reviews, and the Telegram ↔ Bestie link.
//
// SERVER-ONLY (service role, bot token via lib/tower.ts). Never import from a
// client component. Imports lib/tower.ts only — never lib/tower-teams.ts
// (tower-teams imports this file).
//
// THE review gate (owner rule): a Telegram user may create or change a review
// only when ALL are true:
//   1. their Telegram is linked to a Bestie account (tg_bestie_links);
//   2. that Bestie profile is filled: full_name, avatar_url, city;
//   3. they have a paid plan in the group (Basic / Admin, same definition as
//      the paywall — hasMembership in lib/tower.ts).
// requireReviewer() is called by storeReview() — the only write path — so no
// command, button or Mini App call gets around it. Review TARGETS need nothing.
//
// The link: the bot hands out a personal signed link (purpose 'link', 30 min)
// → /tower/link on Bestie → the logged-in person confirms → linkTelegramToBestie().
// One Telegram ↔ one Bestie account; a conflict is refused, never taken over.
// ============================================================================
import {
  getDb, dm, esc, SITE, PLANS, signLink, verifyLink, payUrl, appUrl, appLink,
  botUsername, resolveChatId, hasMembership, miniappSchemaReady,
} from '@/lib/tower'
import { GATE_FIELD_LABELS } from '@/lib/tower-app-shared'

export const PROFILE_FIELDS = ['full_name', 'avatar_url', 'city']

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const STATUS_TTL_MS = 10 * 1000

// ── Texts ───────────────────────────────────────────────────────────────────
export const SCHEMA_BOT = 'Отзывы временно недоступны — идёт обновление. Попробуй через пару минут.'
export const GATE_UNKNOWN_TEXT = '⚠️ Не удалось проверить доступ — попробуй чуть позже.'
export const GATE_BLOCKED_TEXT =
  'Чтобы оставлять отзывы, нужно привязать профиль Бести, заполнить анкету и оформить подписку. Подробнее: /access'
const LINK_TEXTS = {
  expired: 'Ссылка устарела или неверная. Напишите боту @TowerCrewBot команду /link — он пришлёт новую. Ссылка действует 30 минут.',
  schema: 'Привязка временно недоступна — попробуйте через несколько минут.',
  conflict_tg: 'Этот Telegram уже привязан к другому профилю Бести. Сначала отвяжите его там (Edit profile → Telegram) или в приложении «Вышки» → вкладка «Я».',
  conflict_user: (un) => `К вашему профилю Бести уже привязан другой Telegram${un ? ` (@${un})` : ''}. Сначала отвяжите его: Edit profile → Telegram.`,
  not_found: 'Профиль Бести не найден — войдите заново.',
  error: 'Не получилось — попробуйте ещё раз.',
}
const UNLINK_DM = 'Профиль Бести отвязан от этого Telegram. Отзывы сохранились; чтобы снова оставлять отзывы — /link.'

// ── Status ──────────────────────────────────────────────────────────────────
const statusCache = new Map()

function baseStatus() {
  return {
    ok: false, schema: true, unknown: false, memberUnknown: false,
    linked: false, profileOk: false, member: false, banned: false,
    missing: PROFILE_FIELDS.slice(), bestie: null, plan: null,
  }
}

async function loadStatus(tgId) {
  const st = baseStatus()
  try {
    if (!Number.isSafeInteger(tgId) || tgId <= 0) return { ...st, unknown: true }
    if (!(await miniappSchemaReady())) return { ...st, schema: false, unknown: true }
    const db = getDb()
    const [linkRes, mem] = await Promise.all([
      db.from('tg_bestie_links').select('user_id').eq('telegram_user_id', tgId).maybeSingle(),
      hasMembership(tgId),
    ])
    st.member = mem.member === true
    st.memberUnknown = mem.member === null
    st.plan = st.member ? (mem.plan || 'basic') : null
    if (linkRes.error) {
      st.unknown = true
    } else if (linkRes.data?.user_id) {
      const u = await db.from('users')
        .select('id, username, full_name, avatar_url, city, is_banned')
        .eq('id', linkRes.data.user_id).maybeSingle()
      if (u.error) {
        st.unknown = true
      } else if (u.data) {
        st.linked = true
        st.bestie = { id: u.data.id, username: u.data.username || null, full_name: u.data.full_name || null }
        st.banned = !!u.data.is_banned
        st.missing = PROFILE_FIELDS.filter((f) => !String(u.data[f] ?? '').trim())
      }
    }
    st.profileOk = st.linked && !st.missing.length && !st.banned
    st.ok = !st.unknown && st.linked && st.profileOk && st.member
    return st
  } catch {
    return { ...st, unknown: true }
  }
}

// Internal status. Never throws. Cached 10 s per tgId (fresh:true bypasses);
// only definite answers are cached.
// → { ok, schema, unknown, memberUnknown, linked, profileOk, member, banned,
//     missing: string[] (⊆ PROFILE_FIELDS; all three when not linked),
//     bestie: { id, username, full_name } | null, plan: 'basic'|'admin'|null }
export async function reviewerStatus(tgId, { fresh = false }: any = {}) {
  const key = String(tgId)
  if (!fresh) {
    const hit = statusCache.get(key)
    if (hit && Date.now() - hit.at < STATUS_TTL_MS) return hit.status
  }
  const st = await loadStatus(Number(tgId))
  if (st.schema && !st.unknown && !st.memberUnknown) {
    if (statusCache.size > 2000) statusCache.clear()
    statusCache.set(key, { at: Date.now(), status: st })
  } else {
    statusCache.delete(key)
  }
  return st
}

export function invalidateReviewer(tgId) {
  statusCache.delete(String(tgId))
}

// THE gate. → { ok:true, status } | { ok:false, status, text } (text = short plain reason)
export async function requireReviewer(tgId) {
  const status = await reviewerStatus(tgId)
  if (status.ok) return { ok: true, status }
  if (!status.schema) return { ok: false, status, text: SCHEMA_BOT }
  if (status.unknown) return { ok: false, status, text: GATE_UNKNOWN_TEXT }
  // Everything else is in place — only the Stripe check failed.
  if (status.linked && status.profileOk && status.memberUnknown) return { ok: false, status, text: GATE_UNKNOWN_TEXT }
  return { ok: false, status, text: GATE_BLOCKED_TEXT }
}

// ── Checklist ───────────────────────────────────────────────────────────────
// → [{ key:'link'|'profile'|'member', done, title, hint, unknown? }]
export function gateLines(status) {
  const s = status || baseStatus()
  const link = s.linked
    ? { key: 'link', done: true, title: 'Профиль Бести привязан', hint: s.bestie?.username ? '@' + s.bestie.username : null }
    : { key: 'link', done: false, title: 'Привязать профиль Бести', hint: 'Войди на сайте Бести и подтверди — 1 минута' }
  let profile
  if (!s.linked) {
    profile = { key: 'profile', done: false, title: 'Заполнить анкету Бести', hint: 'Имя, фото и город' }
  } else if (s.banned) {
    profile = { key: 'profile', done: false, title: 'Профиль Бести заблокирован', hint: 'Напиши в поддержку Бести' }
  } else if (s.missing && s.missing.length) {
    profile = {
      key: 'profile', done: false, title: 'Заполнить анкету Бести',
      hint: 'Не хватает: ' + s.missing.map((f) => GATE_FIELD_LABELS[f] || f).join(', ') + ' (на сайте — Edit Profile)',
    }
  } else {
    profile = { key: 'profile', done: true, title: 'Анкета Бести заполнена', hint: null }
  }
  let member
  if (s.member) {
    member = { key: 'member', done: true, title: 'Подписка активна', hint: s.plan === 'admin' ? 'Admin' : 'Basic' }
  } else if (s.memberUnknown) {
    member = { key: 'member', done: false, unknown: true, title: 'Подписку проверить не удалось', hint: 'Попробуй чуть позже' }
  } else {
    member = {
      key: 'member', done: false, title: 'Оформить подписку',
      hint: `Basic — $${PLANS.basic.priceUsd} в месяц. Из группы никого не удаляем`,
    }
  }
  return [link, profile, member]
}

const lineText = (l) => `${l.done ? '✅' : l.unknown ? '⚠️' : '❌'} ${esc(l.title)}${l.hint ? ' — ' + esc(l.hint) : ''}`

// HTML checklist for the bot DM.
export function gateText(status) {
  const s = status || baseStatus()
  if (!s.schema) return SCHEMA_BOT
  if (s.ok) {
    return '✅ <b>Всё готово — можно оставлять отзывы.</b>\n\n' +
      'Открой приложение, найди коллегу и нажми «Оставить отзыв».'
  }
  if (s.unknown) return GATE_UNKNOWN_TEXT
  return '📝 <b>Чтобы оставлять отзывы, нужно:</b>\n\n' +
    gateLines(s).map(lineText).join('\n') +
    '\n\nНажми кнопки ниже — потом «Проверить снова».'
}

function payLinkFor(from, chatId) {
  return payUrl({ u: from.id, c: chatId, n: from.first_name || undefined, un: from.username || undefined })
}

// Inline keyboard rows (personal links → private chat only, never the group).
export async function gateButtons(status, from) {
  const s = status || baseStatus()
  const rows = []
  if (s.schema && !s.unknown) {
    if (!s.linked) {
      try { rows.push([{ text: '🔗 Привязать Бести', url: linkUrl(from) }]) } catch {}
    }
    if (s.linked && !s.profileOk && !s.banned) {
      rows.push([{ text: '📝 Заполнить анкету', url: `${SITE}/profile/edit` }])
    }
    if (!s.member && !s.memberUnknown) {
      try { rows.push([{ text: '💳 Оформить подписку', url: payLinkFor(from, await resolveChatId()) }]) } catch {}
    }
  }
  if (!s.ok) rows.push([{ text: '🔄 Проверить снова', callback_data: 'acc:check' }])
  rows.push([{ text: '🗼 Открыть приложение', web_app: { url: appUrl('me') } }])
  return rows
}

// The gate for the Mini App: status + checklist + personal links (prefetched so
// the app can open them synchronously inside a tap).
export async function gatePublic(status, from) {
  const s = status || baseStatus()
  let link = null
  let pay = null
  if (s.schema && !s.linked) {
    try { link = linkUrl(from) } catch {}
  }
  if (s.schema && !s.member && !s.memberUnknown) {
    try { pay = payLinkFor(from, await resolveChatId()) } catch {}
  }
  const bot = await botUsername()
  return {
    ok: !!s.ok,
    schema: !!s.schema,
    unknown: !!s.unknown,
    linked: !!s.linked,
    profileOk: !!s.profileOk,
    member: !!s.member,
    memberUnknown: !!s.memberUnknown,
    missing: Array.isArray(s.missing) ? s.missing : [],
    plan: s.plan || null,
    bestie: s.bestie?.username ? { username: s.bestie.username, url: `${SITE}/${s.bestie.username}` } : null,
    items: gateLines(s),
    links: { link, profile: `${SITE}/profile/edit`, pay, bot: `https://t.me/${bot}?start=access` },
  }
}

// /access, /start access, a blocked /review: the personal checklist in the DM.
export async function sendGate(from, status = null) {
  const st = status || (await reviewerStatus(from.id, { fresh: true }))
  return dm(from.id, gateText(st), await gateButtons(st, from))
}

// ── Link (Telegram ↔ Bestie) ────────────────────────────────────────────────
// Personal, 30 min. Throws without TOWER_BOT_TOKEN (callers drop the button).
export function linkUrl(from) {
  const t = signLink({ u: from.id, c: 0, n: from.first_name || undefined, un: from.username || undefined }, 'link')
  return `${SITE}/tower/link?t=${encodeURIComponent(t)}`
}

// Sync. → { ok:true, tgId, tg:{ first_name, username } } | { ok:false }
export function linkPreview(t) {
  const p = verifyLink(t, 'link')
  if (!p) return { ok: false }
  return { ok: true, tgId: Number(p.u), tg: { first_name: p.n || null, username: p.un || null } }
}

async function telegramUsernameOf(row) {
  try {
    const { data } = await getDb().from('tg_people')
      .select('username').eq('telegram_user_id', row.telegram_user_id).maybeSingle()
    return data?.username || row.telegram_username || null
  } catch {
    return row.telegram_username || null
  }
}

async function personFor(tgId) {
  try {
    const { data } = await getDb().from('tg_people')
      .select('telegram_user_id, username, first_name').eq('telegram_user_id', tgId).maybeSingle()
    return { id: Number(tgId), first_name: data?.first_name || '', username: data?.username || null }
  } catch {
    return { id: Number(tgId), first_name: '', username: null }
  }
}

// → { ok:true, status:'linked'|'already', telegram:{ first_name, username }, bestie:{ username },
//     missing: string[], member: true|false|null, appLink }
//   | { ok:false, code:'expired'|'schema'|'conflict_tg'|'conflict_user'|'not_found'|'error', error }
export async function linkTelegramToBestie(t, userId) {
  try {
    const p = verifyLink(t, 'link')
    if (!p) return { ok: false, code: 'expired', error: LINK_TEXTS.expired }
    if (!UUID_RE.test(String(userId || ''))) return { ok: false, code: 'not_found', error: LINK_TEXTS.not_found }
    if (!(await miniappSchemaReady())) return { ok: false, code: 'schema', error: LINK_TEXTS.schema }
    const db = getDb()
    const tgId = Number(p.u)
    const cols = 'telegram_user_id, user_id, telegram_username'

    // null = no link either way; 'already' = this exact pair; else a refusal.
    const classify = async () => {
      const [byTg, byUser] = await Promise.all([
        db.from('tg_bestie_links').select(cols).eq('telegram_user_id', tgId).maybeSingle(),
        db.from('tg_bestie_links').select(cols).eq('user_id', userId).maybeSingle(),
      ])
      if (byTg.error || byUser.error) throw new Error('tg_bestie_links read: ' + (byTg.error || byUser.error).message)
      if (byTg.data && String(byTg.data.user_id) === String(userId)) return 'already'
      // Never reveal which Bestie account holds this Telegram.
      if (byTg.data) return { ok: false, code: 'conflict_tg', error: LINK_TEXTS.conflict_tg }
      if (byUser.data) {
        const un = await telegramUsernameOf(byUser.data)
        return { ok: false, code: 'conflict_user', error: LINK_TEXTS.conflict_user(un), telegram: { username: un } }
      }
      return null
    }

    let state = 'linked'
    let c = await classify()
    if (c === 'already') state = 'already'
    else if (c) return c
    else {
      const { error } = await db.from('tg_bestie_links').insert({
        telegram_user_id: tgId,
        user_id: userId,
        telegram_username: p.un || null,
      })
      if (error) {
        if (error.code === '23503') return { ok: false, code: 'not_found', error: LINK_TEXTS.not_found }
        if (error.code !== '23505') throw new Error('tg_bestie_links insert: ' + error.message)
        // A parallel confirm (or another account) got there first.
        c = await classify()
        if (c === 'already') state = 'already'
        else if (c) return c
        else throw new Error('tg_bestie_links insert: conflict without a row')
      }
    }

    invalidateReviewer(tgId)
    const st = await reviewerStatus(tgId, { fresh: true })
    let dmSent = false
    if (state === 'linked') {
      console.log('[tower/link] linked', tgId)
      try { dmSent = !!(await afterLinkDm(tgId, st))?.ok } catch (e) { console.warn('[tower/link] after-link DM:', e?.message || e) }
    }
    let bestieUsername = st.bestie?.username || null
    if (!bestieUsername) {
      try {
        const { data } = await db.from('users').select('username').eq('id', userId).maybeSingle()
        bestieUsername = data?.username || null
      } catch {}
    }
    return {
      ok: true,
      status: state,
      telegram: { first_name: p.n || null, username: p.un || null },
      bestie: { username: bestieUsername },
      missing: st.linked ? st.missing : [],
      member: st.memberUnknown || st.unknown ? null : !!st.member,
      appLink: await appLink('me'),
      dmSent,
    }
  } catch (e) {
    console.warn('[tower/link] link failed:', e?.message || e)
    return { ok: false, code: 'error', error: LINK_TEXTS.error }
  }
}

async function unlinkWhere(col, val) {
  try {
    if (!(await miniappSchemaReady())) return { ok: false, code: 'schema', error: LINK_TEXTS.schema }
    const { data, error } = await getDb().from('tg_bestie_links').delete().eq(col, val).select('telegram_user_id')
    if (error) {
      console.warn('[tower/link] unlink:', error.message)
      return { ok: false, code: 'error', error: LINK_TEXTS.error }
    }
    const rows = data || []
    for (const r of rows) {
      invalidateReviewer(r.telegram_user_id)
      console.log('[tower/link] unlinked', r.telegram_user_id)
      try { await dm(r.telegram_user_id, UNLINK_DM) } catch {}
    }
    return { ok: true, unlinked: rows.length > 0 }
  } catch (e) {
    console.warn('[tower/link] unlink failed:', e?.message || e)
    return { ok: false, code: 'error', error: LINK_TEXTS.error }
  }
}

// → { ok:true, unlinked:boolean } | { ok:false, code, error }
export async function unlinkTelegram(tgId) {
  const id = Number(tgId)
  if (!Number.isSafeInteger(id) || id <= 0) return { ok: false, code: 'bad_request', error: LINK_TEXTS.error }
  return unlinkWhere('telegram_user_id', id)
}

export async function unlinkBestieUser(userId) {
  if (!UUID_RE.test(String(userId || ''))) return { ok: false, code: 'bad_request', error: LINK_TEXTS.error }
  return unlinkWhere('user_id', userId)
}

// → { ok:true, linked, telegram:{ first_name, username }|null, linkedAt|null, botLink, appLink }
//   | { ok:false, code:'schema'|'error', error }
export async function linkStatusForBestieUser(userId) {
  try {
    const bot = await botUsername()
    const botLink = `https://t.me/${bot}?start=link`
    if (!(await miniappSchemaReady())) return { ok: false, code: 'schema', error: LINK_TEXTS.schema, botLink }
    if (!UUID_RE.test(String(userId || ''))) return { ok: false, code: 'error', error: LINK_TEXTS.error }
    const db = getDb()
    const { data: row, error } = await db.from('tg_bestie_links')
      .select('telegram_user_id, telegram_username, linked_at').eq('user_id', userId).maybeSingle()
    if (error) return { ok: false, code: 'error', error: LINK_TEXTS.error }
    let telegram = null
    if (row) {
      const p = await personFor(row.telegram_user_id)
      telegram = { first_name: p.first_name || null, username: p.username || row.telegram_username || null }
    }
    return {
      ok: true,
      linked: !!row,
      telegram,
      linkedAt: row?.linked_at || null,
      botLink,
      appLink: await appLink('me'),
    }
  } catch (e) {
    console.warn('[tower/link] status failed:', e?.message || e)
    return { ok: false, code: 'error', error: LINK_TEXTS.error }
  }
}

// Authorization: Bearer <Supabase access token> → the Bestie auth user | null.
// Same check as the admin route (never trusts a user id from the body).
export async function bestieUserFromRequest(req) {
  try {
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
    if (!token || token.length > 4096) return null
    const { data, error } = await getDb().auth.getUser(token)
    if (error) return null
    return data?.user || null
  } catch {
    return null
  }
}

// /link, /start link: the personal link button (or «already linked»).
export async function sendLinkButton(from) {
  if (!(await miniappSchemaReady())) return dm(from.id, SCHEMA_BOT)
  const st = await reviewerStatus(from.id, { fresh: true })
  if (st.linked) {
    return dm(from.id,
      `✅ Telegram уже привязан к профилю Бести @${esc(st.bestie?.username || '—')}.\n` +
      'Отвязать можно в приложении (вкладка «Я») или на сайте Бести → Edit profile → Telegram.',
      await gateButtons(st, from))
  }
  let url
  try {
    url = linkUrl(from)
  } catch {
    return dm(from.id, GATE_UNKNOWN_TEXT)
  }
  return dm(from.id,
    '🔗 <b>Привязка к профилю Бести</b>\n\n' +
    'Нажми кнопку — откроется сайт Бести. Войди (или создай профиль) и подтверди привязку.\n' +
    'Ссылка личная и действует 30 минут — никому её не пересылай.',
    [[{ text: '🔗 Привязать Бести', url }]])
}

// Right after the link: «✅ Привязано» + what is still missing.
export async function afterLinkDm(tgId, status) {
  const st = status || (await reviewerStatus(tgId, { fresh: true }))
  const from = await personFor(tgId)
  const head = `✅ Привязано к профилю Бести @${esc(st.bestie?.username || '—')}.`
  let body
  if (st.ok) body = 'Всё готово — можно оставлять отзывы коллегам 👇'
  else if (st.unknown) body = 'Остальное проверить не удалось — нажми «Проверить снова».'
  else body = 'Чтобы оставлять отзывы, осталось:\n' + gateLines(st).filter((l) => !l.done).map(lineText).join('\n')
  return dm(tgId, head + '\n\n' + body, await gateButtons(st, from))
}
