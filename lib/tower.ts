// @ts-nocheck
// ============================================================================
// «Вышки в США» — paid Telegram group (@towerUSA) run by @TowerCrewBot.
//
// SERVER-ONLY. Never import this from a client component: it uses the bot
// token, the Stripe secret key and the Supabase service role.
//
// Flow: the group requires join requests → the bot DMs the requester a signed
// pay link → /tower/join → Stripe Checkout (subscription) → the Stripe webhook
// calls syncSubscription() → the join request is approved. When the
// subscription ends (canceled / unpaid / expired) the person is removed
// (ban + immediate unban, i.e. a kick, never a permanent ban).
//
// Safety rules (enforced in syncSubscription):
//   • Only people with a tg_subscriptions row are ever touched.
//   • was_member_before = true → never kicked, at most demoted.
//   • The creator and admins we did not promote are never kicked or demoted.
//   • Someone banned by a human admin is never unbanned by us.
// ============================================================================
import crypto from 'crypto'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// ── Config ──────────────────────────────────────────────────────────────────
export const TOWER_CHAT = String(process.env.TOWER_CHAT || '@towerUSA').trim()
export const SITE = String(process.env.NEXT_PUBLIC_SITE_URL || 'https://bestiehere.com').replace(/\/+$/, '')
export const GROUP_NAME = 'Вышки в США'
export const GROUP_URL = /^-?\d+$/.test(TOWER_CHAT)
  ? 'https://t.me/towerUSA'
  : `https://t.me/${TOWER_CHAT.replace(/^@/, '')}`
export const TOWER_KIND = 'tg_group_sub'
export const GRACE_DAYS = 3
export const ADMIN_TITLE = 'Реклама'
export const PLANS = {
  basic: { lookupKey: 'tower_basic_monthly', label: 'Basic', priceUsd: 10 },
  admin: { lookupKey: 'tower_admin_monthly', label: 'Admin', priceUsd: 30 },
}

// Signed links have a purpose: 'pay' (choose a plan → Checkout) or 'manage'
// (Stripe Customer Portal). A forwarded pay link must never open someone's portal.
const LINK_TTL_SEC = { pay: 7 * 24 * 3600, manage: 24 * 3600 }

// past_due with an open invoice Stripe stopped retrying for this long → treat as unpaid
// (covers the account-wide «leave subscription past-due» setting).
const PAST_DUE_GIVEUP_DAYS = 7

export const BANNED_TEXT = '⛔ Вы заблокированы в группе — оплата недоступна, напишите админу.'

// Stripe statuses
const ACTIVE_STATUSES = ['active', 'trialing']                 // full access
const LIVE_STATUSES = ['active', 'trialing', 'past_due']       // Stripe still billing → keep access
const REMOVE_STATUSES = ['canceled', 'unpaid', 'incomplete_expired', 'paused']
// 'incomplete' = first payment not finished yet → do nothing
export const isActiveStatus = (s) => ACTIVE_STATUSES.includes(s)
export const isLiveStatus = (s) => LIVE_STATUSES.includes(s)

// Admin rights for paid "Admin" plan: ONLY can_manage_chat (admin badge,
// ignores slow mode). Never invite / restrict / promote / change info / delete.
const RIGHT_KEYS = [
  'is_anonymous', 'can_manage_chat', 'can_delete_messages', 'can_manage_video_chats',
  'can_restrict_members', 'can_promote_members', 'can_change_info', 'can_invite_users',
  'can_post_stories', 'can_edit_stories', 'can_delete_stories',
  'can_post_messages', 'can_edit_messages', 'can_pin_messages', 'can_manage_topics',
]
export const NO_RIGHTS = RIGHT_KEYS.reduce((acc, k) => { acc[k] = false; return acc }, {})
export const ADMIN_RIGHTS = { ...NO_RIGHTS, can_manage_chat: true }

// ── Clients (lazy, so importing this module never throws at build time) ─────
let dbClient = null
export function getDb() {
  if (!dbClient) {
    dbClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )
  }
  return dbClient
}

let stripeClient = null
export function getStripe() {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not set')
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
  }
  return stripeClient
}

// ── Telegram ────────────────────────────────────────────────────────────────
const botToken = () => process.env.TOWER_BOT_TOKEN || ''

function scrub(text) {
  const token = botToken()
  const s = String(text || '')
  return token ? s.split(token).join('***') : s
}

// POST to the Bot API. Never throws; never logs the token.
export async function tg(method, params = {}) {
  const token = botToken()
  if (!token) return { ok: false, error_code: 0, description: 'TOWER_BOT_TOKEN not set' }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    const data = await res.json().catch(() => null)
    if (!data || typeof data !== 'object') {
      return { ok: false, error_code: res.status, description: `HTTP ${res.status}` }
    }
    if (!data.ok && data.description) data.description = scrub(data.description)
    return data
  } catch (e) {
    return { ok: false, error_code: 0, description: 'network: ' + scrub(e?.message || 'fetch failed') }
  }
}

const isTransient = (r) => !r?.ok && (r?.error_code === 0 || r?.error_code === 429 || r?.error_code >= 500)

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function fmtDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/New_York',
    })
  } catch {
    return String(iso).slice(0, 10)
  }
}

// Send a DM (HTML). 403 = the person never started the bot / blocked it → ignore.
export async function dm(chatId, text, buttons = null) {
  const params: any = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
  }
  if (buttons && buttons.length) params.reply_markup = { inline_keyboard: buttons }
  const r = await tg('sendMessage', params)
  if (!r.ok && r.error_code === 403) {
    try {
      await getDb().from('tg_bot_users')
        .update({ blocked_at: new Date().toISOString() })
        .eq('telegram_user_id', chatId)
    } catch {}
  }
  return r
}

let botCache = null
export async function getBot() {
  if (botCache) return botCache
  const r = await tg('getMe')
  if (r.ok && r.result) botCache = r.result
  return botCache
}
export async function botUsername() {
  const me = await getBot()
  return me?.username || 'TowerCrewBot'
}

let chatIdCache = null
export async function resolveChatId() {
  if (chatIdCache) return chatIdCache
  if (/^-?\d+$/.test(TOWER_CHAT)) {
    chatIdCache = Number(TOWER_CHAT)
    return chatIdCache
  }
  const r = await tg('getChat', { chat_id: TOWER_CHAT })
  if (!r.ok || !r.result?.id) throw new Error('getChat failed: ' + (r.description || 'unknown'))
  chatIdCache = r.result.id
  return chatIdCache
}

export async function isTowerChat(chat) {
  if (!chat) return false
  if (chat.username && ('@' + chat.username).toLowerCase() === TOWER_CHAT.toLowerCase()) return true
  try {
    return chat.id === (await resolveChatId())
  } catch {
    return false
  }
}

// Membership in the group. ok:false = Telegram could not answer (unknown).
export async function memberStatus(chatId, userId) {
  const r = await tg('getChatMember', { chat_id: chatId, user_id: userId })
  if (!r.ok) {
    const d = String(r.description || '').toLowerCase()
    if (r.error_code === 400 && (d.includes('user not found') || d.includes('participant_id_invalid') || d.includes('member not found'))) {
      return { ok: true, status: 'left', isMember: false, member: null }
    }
    return { ok: false, status: 'unknown', isMember: false, transient: isTransient(r), error: r.description }
  }
  const st = r.result?.status
  const isMember = st === 'creator' || st === 'administrator' || st === 'member' ||
    (st === 'restricted' && !!r.result?.is_member)
  return { ok: true, status: st, isMember, member: r.result }
}

export async function promoteAdmin(chatId, userId) {
  const r = await tg('promoteChatMember', { chat_id: chatId, user_id: userId, ...ADMIN_RIGHTS })
  if (!r.ok) return { ok: false, error: r.description, transient: isTransient(r) }
  const t = await tg('setChatAdministratorCustomTitle', { chat_id: chatId, user_id: userId, custom_title: ADMIN_TITLE })
  if (!t.ok) console.warn('[tower] custom title failed:', t.description)
  return { ok: true, titleOk: !!t.ok }
}

export async function demote(chatId, userId) {
  const r = await tg('promoteChatMember', { chat_id: chatId, user_id: userId, ...NO_RIGHTS })
  return { ok: !!r.ok, error: r.ok ? undefined : r.description, transient: isTransient(r) }
}

// NOTE: the bot never creates invite links — a plain link skips the join
// request, so whoever got it would be inside without paying. Everyone gets in
// through a join request, approved only for their own active subscription.

// Banned by a human admin (not our own 60-second kick, which we lift right away).
export function isBannedByAdmin(m) {
  if (!m?.ok || m.status !== 'kicked') return false
  const until = Number(m.member?.until_date || 0)
  return !until || until > Math.floor(Date.now() / 1000) + 120
}

// ── Derived secrets (no extra env vars) ─────────────────────────────────────
function hmacWithToken(label) {
  const token = botToken()
  if (!token) throw new Error('TOWER_BOT_TOKEN not set')
  return crypto.createHmac('sha256', token).update(label).digest()
}

// 64 hex chars — valid for Telegram's secret_token.
export function webhookSecret() {
  if (!botToken()) return ''
  return hmacWithToken('tower-webhook-v1').toString('hex')
}

export function safeEqual(a, b) {
  const ba = Buffer.from(String(a ?? ''), 'utf8')
  const bb = Buffer.from(String(b ?? ''), 'utf8')
  if (ba.length === 0 || ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

// Signed link payload: { u: telegram user id, c: chat id, k: purpose, n?: first name, un?: username, e: expiry }
export function signLink({ u, c, n, un }: any, purpose = 'pay') {
  const k = purpose === 'manage' ? 'manage' : 'pay'
  const payload: any = { u: Number(u), c: Number(c), k, e: Math.floor(Date.now() / 1000) + LINK_TTL_SEC[k] }
  if (n) payload.n = String(n).slice(0, 64)
  if (un) payload.un = String(un).slice(0, 64)
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const sig = crypto.createHmac('sha256', hmacWithToken('tower-link-v1')).update(body).digest('base64url')
  return body + '.' + sig
}

export function verifyLink(token, purpose = 'pay') {
  try {
    if (!botToken() || typeof token !== 'string' || !token || token.length > 2048) return null
    const parts = token.split('.')
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null
    const [body, sig] = parts
    const expected = crypto.createHmac('sha256', hmacWithToken('tower-link-v1')).update(body).digest('base64url')
    if (!safeEqual(sig, expected)) return null
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (!p || !Number.isFinite(p.u) || !Number.isFinite(p.c) || !Number.isFinite(p.e)) return null
    if (p.u <= 0) return null
    if ((p.k || 'pay') !== purpose) return null
    if (p.e < Math.floor(Date.now() / 1000)) return null
    return p
  } catch {
    return null
  }
}

export function payUrl(link) {
  return `${SITE}/tower/join?t=${encodeURIComponent(signLink(link, 'pay'))}`
}
// Only the bot hands this out (in the person's own private chat), 24h.
export function portalUrl(link) {
  return `${SITE}/api/tower/portal?t=${encodeURIComponent(signLink(link, 'manage'))}`
}
// Web pages never carry a portal link — they send people to /manage in the bot.
export async function manageInBotUrl() {
  return `https://t.me/${await botUsername()}?start=manage`
}

// ── Stripe prices / portal ──────────────────────────────────────────────────
const priceCache = {}
export async function findPrice(plan) {
  const cfg = PLANS[plan]
  if (!cfg) throw new Error('Unknown plan: ' + plan)
  const hit = priceCache[plan]
  if (hit && hit.at > Date.now() - 10 * 60 * 1000) return hit.price
  const list = await getStripe().prices.list({ lookup_keys: [cfg.lookupKey], active: true, limit: 1 })
  const price = list.data[0] || null
  if (price) priceCache[plan] = { price, at: Date.now() }
  return price
}

export async function priceFor(plan) {
  const price = await findPrice(plan)
  if (!price) {
    throw new Error(`Stripe price with lookup_key "${PLANS[plan].lookupKey}" not found — create it in /admin/tower`)
  }
  return price.id
}

// Creates the two monthly prices (one product each) if they are missing. Idempotent.
export async function ensurePrices() {
  const out = {}
  for (const plan of Object.keys(PLANS)) {
    const cfg = PLANS[plan]
    let price = await findPrice(plan)
    let created = false
    if (!price) {
      price = await getStripe().prices.create({
        currency: 'usd',
        unit_amount: cfg.priceUsd * 100,
        recurring: { interval: 'month' },
        lookup_key: cfg.lookupKey,
        transfer_lookup_key: true,
        nickname: `${GROUP_NAME} — ${cfg.label}`,
        metadata: { kind: TOWER_KIND, plan },
        product_data: { name: `${GROUP_NAME} — ${cfg.label}`, metadata: { kind: TOWER_KIND, plan } },
      })
      priceCache[plan] = { price, at: Date.now() }
      created = true
    }
    out[plan] = { id: price.id, created, livemode: !!price.livemode, unit_amount: price.unit_amount, currency: price.currency }
  }
  return out
}

// A dedicated Customer Portal configuration (cancel at period end, switch
// Basic ↔ Admin, update card, invoices). Found again by metadata.kind.
// Upgrades are invoiced right away ('always_invoice'), so the Admin badge
// is never given on credit until the next renewal.
const PORTAL_PRORATION = 'always_invoice'
let portalCfgCache = null
export async function portalConfigId({ create = true } = {}) {
  if (portalCfgCache) return portalCfgCache
  const s = getStripe()
  const list = await s.billingPortal.configurations.list({ active: true, limit: 100 })
  const found = (list.data || []).find((c) => c.metadata?.kind === TOWER_KIND)
  if (found) {
    const su = found.features?.subscription_update
    if (su?.enabled && su.proration_behavior !== PORTAL_PRORATION) {
      try {
        await s.billingPortal.configurations.update(found.id, {
          features: { subscription_update: { proration_behavior: PORTAL_PRORATION } },
        })
      } catch (e) {
        console.warn('[tower] portal proration update failed:', e?.message)
      }
    }
    portalCfgCache = found.id
    return found.id
  }
  if (!create) return null
  const prices = [await findPrice('basic'), await findPrice('admin')].filter(Boolean)
  if (prices.length < 2) return null // without both prices plan switching can't be configured yet
  const byProduct = {}
  prices.forEach((p) => {
    const pid = typeof p.product === 'string' ? p.product : p.product?.id
    if (!byProduct[pid]) byProduct[pid] = []
    byProduct[pid].push(p.id)
  })
  const cfg = await s.billingPortal.configurations.create({
    business_profile: {
      headline: `${GROUP_NAME} — управление подпиской`,
      privacy_policy_url: `${SITE}/privacy`,
      terms_of_service_url: `${SITE}/terms`,
    },
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true, mode: 'at_period_end' },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ['price'],
        proration_behavior: PORTAL_PRORATION,
        products: Object.keys(byProduct).map((product) => ({ product, prices: byProduct[product] })),
      },
    },
    metadata: { kind: TOWER_KIND },
  })
  portalCfgCache = cfg.id
  return cfg.id
}

// ── Rows ────────────────────────────────────────────────────────────────────
export async function loadRow(chatId, userId) {
  const { data, error } = await getDb()
    .from('tg_subscriptions')
    .select('*')
    .eq('chat_id', chatId)
    .eq('telegram_user_id', userId)
    .maybeSingle()
  if (error) throw new Error('tg_subscriptions read: ' + error.message)
  return data
}

function planLabel(plan) {
  return PLANS[plan]?.label || 'Basic'
}

// Another live tower subscription of this customer for the same person/group
// (e.g. two Checkout tabs both paid). Prefers active/trialing over past_due.
export async function findLiveTowerSub(customerId, chatId, userId, excludeId = null) {
  if (!customerId) return null
  let list
  try {
    list = await getStripe().subscriptions.list({ customer: customerId, status: 'all', limit: 20 })
  } catch (e) {
    if (e?.code === 'resource_missing') return null
    throw e
  }
  const live = (list.data || []).filter((x) =>
    x.id !== excludeId &&
    x.metadata?.kind === TOWER_KIND &&
    Number(x.metadata?.chat_id) === Number(chatId) &&
    Number(x.metadata?.telegram_user_id) === Number(userId) &&
    isLiveStatus(x.status))
  return live.find((x) => isActiveStatus(x.status)) || live[0] || null
}

// past_due normally means Stripe is still retrying → keep access. But with the
// account-wide «leave subscription past-due» setting an invoice can stay open
// forever with no further attempts — then the person is not paying any more.
async function pastDueGivenUp(subId) {
  try {
    const list = await getStripe().invoices.list({ subscription: subId, status: 'open', limit: 20 })
    const cutoff = Math.floor(Date.now() / 1000) - PAST_DUE_GIVEUP_DAYS * 86400
    return (list.data || []).some((inv) => !inv.next_payment_attempt && inv.created && inv.created < cutoff)
  } catch (e) {
    console.warn('[tower] invoices.list failed:', e?.message)
    return false
  }
}

// Paid, outside the group, no join request to approve → ask them (once per
// billing period) to apply; the bot then approves instantly. The once-claim
// reuses stripe_events' primary key with a synthetic id (not a Stripe event).
async function nudgeToApply(row, out) {
  const { error } = await getDb().from('stripe_events').insert({
    event_id: `tower-nudge:${row.id}:${row.paid_until || ''}`,
    type: 'tower.nudge',
    processed_at: new Date().toISOString(),
  })
  if (error) {
    if (error.code !== '23505') console.warn('[tower] nudge claim failed:', error.message)
    return
  }
  const r = await dm(row.telegram_user_id,
    `Подписка на «${GROUP_NAME}» активна ✅\nПодайте заявку в группу — одобрим автоматически.`,
    [[{ text: '👉 Подать заявку в группу', url: GROUP_URL }]])
  out.actions.push(r.ok ? 'nudged' : 'nudge_undelivered')
}

// ── THE reconcile: Stripe subscription → DB row → Telegram ──────────────────
// Used by the Stripe webhook, the success page and the daily sweep.
// Idempotent. opts.retry = throw on transient Telegram errors (so Stripe retries).
export async function syncSubscription(subOrId, opts: any = {}) {
  let sub = subOrId
  if (typeof sub === 'string') sub = await getStripe().subscriptions.retrieve(sub)
  if (!sub || !sub.id) return { skipped: true, reason: 'no subscription' }

  const md = sub.metadata || {}
  if (md.kind !== TOWER_KIND) return { skipped: true, reason: 'not tower' }
  const chatId = Number(md.chat_id)
  const userId = Number(md.telegram_user_id)
  if (!chatId || !userId) {
    console.warn('[tower] subscription without chat/user metadata:', sub.id)
    return { skipped: true, reason: 'metadata' }
  }

  const item = sub.items?.data?.[0]
  const price = item?.price
  // lookup_key → the price's own metadata.plan (survives a transferred lookup_key)
  // → checkout-time metadata (not updated on portal plan switches, so last).
  const lk = price?.lookup_key
  const pricePlan = price?.metadata?.plan
  const plan = lk === PLANS.admin.lookupKey ? 'admin'
    : lk === PLANS.basic.lookupKey ? 'basic'
    : (pricePlan === 'admin' || pricePlan === 'basic') ? pricePlan
    : (md.plan === 'admin' ? 'admin' : 'basic')
  const periodEnd = sub.current_period_end ?? item?.current_period_end
  const paidUntil = periodEnd ? new Date(periodEnd * 1000).toISOString() : null
  const customerId = typeof sub.customer === 'string' ? sub.customer : (sub.customer?.id || null)
  const status = sub.status
  const db = getDb()

  let row = await loadRow(chatId, userId)

  // Stale guard: an old subscription's late event must not override a newer one.
  if (row && row.stripe_subscription_id && row.stripe_subscription_id !== sub.id &&
      ['active', 'trialing', 'past_due', 'incomplete'].includes(row.status) && !isActiveStatus(status)) {
    return { stale: true, subscription: sub.id, current: row.stripe_subscription_id }
  }

  // Ending? Never remove someone who still has another live tower subscription.
  let ending = REMOVE_STATUSES.includes(status)
  let gaveUp = false
  if (status === 'past_due' && await pastDueGivenUp(sub.id)) {
    ending = true
    gaveUp = true
  }
  if (ending && customerId && !opts.redirected) {
    const other = await findLiveTowerSub(customerId, chatId, userId, sub.id)
    if (other) {
      console.log('[tower]', sub.id, status, '→ another live subscription', other.id, '— syncing that one')
      return syncSubscription(other, { ...opts, redirected: true })
    }
  }

  const fields: any = {
    status,
    plan,
    paid_until: paidUntil,
    cancel_at_period_end: !!sub.cancel_at_period_end || !!sub.cancel_at,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    stripe_price_id: price?.id || null,
    livemode: !!sub.livemode,
    updated_at: new Date().toISOString(),
  }
  if (md.telegram_username) fields.telegram_username = md.telegram_username

  if (row) {
    const { data, error } = await db.from('tg_subscriptions').update(fields).eq('id', row.id).select('*').single()
    if (error) throw new Error('tg_subscriptions update: ' + error.message)
    row = data
  } else {
    // A subscription we never saw at checkout → protect existing members.
    const m0 = await memberStatus(chatId, userId)
    if (!m0.ok && m0.transient && opts.retry) throw new Error('telegram unavailable: ' + m0.error)
    const wasMember = m0.ok ? m0.isMember : true
    const { data, error } = await db.from('tg_subscriptions')
      .insert({ chat_id: chatId, telegram_user_id: userId, was_member_before: wasMember, ...fields })
      .select('*').single()
    if (error) {
      if (error.code !== '23505') throw new Error('tg_subscriptions insert: ' + error.message)
      const again = await db.from('tg_subscriptions').update(fields)
        .eq('chat_id', chatId).eq('telegram_user_id', userId).select('*').single()
      if (again.error) throw new Error('tg_subscriptions update: ' + again.error.message)
      row = again.data
    } else {
      row = data
    }
  }

  const out: any = { subscription: sub.id, status, plan, paid_until: paidUntil, actions: [] }
  if (isActiveStatus(status)) {
    await enforceActive(row, out, opts)
  } else if (ending) {
    if (gaveUp) out.actions.push('past_due_given_up')
    await enforceRemove(row, out, opts)
  } else {
    out.actions.push(status === 'past_due' ? 'kept_past_due' : 'waiting')
  }
  return out
}

// ACTIVE → make sure they are in the group (+ admin badge for the Admin plan).
export async function enforceActive(row, out: any = { actions: [] }, opts: any = {}) {
  const db = getDb()
  const chatId = row.chat_id
  const userId = row.telegram_user_id
  const now = new Date().toISOString()
  if (!out.actions) out.actions = []

  // Our own kick is a 60-second ban that we lift immediately, so there is
  // nothing to unban here — just clear the flag.
  if (row.removed_at) {
    await db.from('tg_subscriptions').update({ removed_at: null }).eq('id', row.id)
    row.removed_at = null
  }

  const m = await memberStatus(chatId, userId)
  if (!m.ok) {
    if (m.transient && opts.retry) throw new Error('telegram unavailable: ' + m.error)
    out.actions.push('member_status_unknown')
    return out
  }
  if (m.status === 'kicked') {
    // Banned by a human admin — never lift that.
    out.actions.push('banned_by_admin')
    return out
  }

  let inGroup = m.isMember
  let approvedNow = false
  if (!inGroup) {
    const r = await tg('approveChatJoinRequest', { chat_id: chatId, user_id: userId })
    if (r.ok) {
      inGroup = true
      approvedNow = true
      out.actions.push('approved')
      await db.from('tg_join_requests')
        .update({ status: 'approved', resolved_at: now })
        .eq('chat_id', chatId).eq('telegram_user_id', userId)
    } else {
      // No pending request (or already processed) → they have to apply; the bot approves it.
      out.actions.push('approve_failed')
      out.approveError = r.description
      if (isTransient(r)) out.transientFailure = true
    }
  }
  out.inGroup = inGroup
  if (!inGroup) {
    if (out.transientFailure) {
      if (opts.retry) throw new Error('telegram unavailable: ' + out.approveError)
    } else if (!opts.silent) {
      await nudgeToApply(row, out)
    }
    return out
  }

  // First activation → claim approved_at exactly once (concurrent webhooks).
  const hadApproved = !!row.approved_at
  if (!row.approved_at) {
    const { data: claimed } = await db.from('tg_subscriptions')
      .update({ approved_at: now })
      .eq('id', row.id).is('approved_at', null)
      .select('id')
    if (claimed && claimed.length) {
      row.approved_at = now
      out.firstActivation = true
    }
  }

  let promotedNow = false
  if (row.plan === 'admin') {
    // Promote plain members only (never touch the creator / existing admins).
    // If we promoted them before and a human demoted them, respect that —
    // unless they just (re)joined through us.
    const plainMember = m.status === 'member' || approvedNow
    if (plainMember && (!row.promoted_at || approvedNow)) {
      // Claim the promotion once (webhook events + success page run together).
      // A fresh approval succeeds for one caller only, so a re-promote after
      // (re)joining is already ours.
      let mine = approvedNow && !!row.promoted_at
      if (!mine) {
        const { data: c } = await db.from('tg_subscriptions')
          .update({ promoted_at: now })
          .eq('id', row.id).is('promoted_at', null)
          .select('id')
        mine = !!(c && c.length)
      }
      if (mine) {
        const p = await promoteAdmin(chatId, userId)
        if (p.ok) {
          await db.from('tg_subscriptions').update({ promoted_at: now }).eq('id', row.id)
          row.promoted_at = now
          promotedNow = true
          out.actions.push('promoted')
        } else {
          // Release the claim so the next sync tries again.
          await db.from('tg_subscriptions').update({ promoted_at: null }).eq('id', row.id)
          row.promoted_at = null
          out.actions.push('promote_failed')
          out.promoteError = p.error
          if (p.transient) out.transientFailure = true
          console.warn('[tower] promote failed for', userId, p.error)
        }
      } else {
        out.actions.push('promote_in_progress')
      }
    }
  } else if (row.promoted_at) {
    // Switched Admin → Basic: remove the badge we gave.
    if (m.status === 'administrator') {
      const d = await demote(chatId, userId)
      if (!d.ok) {
        out.actions.push('demote_failed')
        out.demoteError = d.error
        if (d.transient) out.transientFailure = true
      }
      if (d.ok) {
        await db.from('tg_subscriptions').update({ promoted_at: null }).eq('id', row.id)
        row.promoted_at = null
        out.actions.push('demoted')
      }
    } else {
      await db.from('tg_subscriptions').update({ promoted_at: null }).eq('id', row.id)
      row.promoted_at = null
    }
  }

  if (!opts.silent) {
    if (out.firstActivation) {
      const lines = [
        'Оплата прошла ✅',
        approvedNow
          ? `Добро пожаловать в «${GROUP_NAME}»!`
          : `Подписка на «${GROUP_NAME}» активна — тариф <b>${planLabel(row.plan)}</b>.`,
      ]
      if (row.plan === 'admin') {
        lines.push(promotedNow
          ? `Вам выдан значок админа «${ADMIN_TITLE}» — можно публиковать рекламу.`
          : `Значок админа «${ADMIN_TITLE}» появится чуть позже.`)
      }
      lines.push('', 'Управлять подпиской: /manage')
      await dm(userId, lines.join('\n'), [[{ text: '👉 Открыть группу', url: GROUP_URL }]])
    } else if (promotedNow && hadApproved) {
      // Upgrade Basic → Admin later on. (If approved_at was just claimed by a
      // concurrent call, that call sends the welcome — no second message.)
      await dm(userId,
        `Тариф <b>Admin</b> активен ✅\nВам выдан значок админа «${ADMIN_TITLE}» — можно публиковать рекламу в «${GROUP_NAME}».`,
        [[{ text: '👉 Открыть группу', url: GROUP_URL }]])
    }
  }
  // Webhook path: a transient Telegram failure → throw so Stripe retries the
  // event (the claims above make the retry safe and DM-free).
  if (opts.retry && out.transientFailure) {
    throw new Error('telegram unavailable: ' + (out.promoteError || out.demoteError || out.approveError || ''))
  }
  return out
}

// ENDED → demote what we gave; kick only people who joined through payment.
async function enforceRemove(row, out, opts: any = {}) {
  const db = getDb()
  const chatId = row.chat_id
  const userId = row.telegram_user_id
  const now = new Date().toISOString()

  const m = await memberStatus(chatId, userId)
  if (!m.ok) {
    if (m.transient && opts.retry) throw new Error('telegram unavailable: ' + m.error)
    out.actions.push('member_status_unknown') // the daily sweep will try again
    return out
  }

  const promotedBefore = !!row.promoted_at
  // A human (re)promoted them, or they are the creator → hands off entirely.
  const foreignAdmin = m.status === 'creator' ||
    (m.status === 'administrator' && (!promotedBefore || m.member?.can_be_edited === false))

  if (promotedBefore && !foreignAdmin) {
    if (m.status === 'administrator') {
      const d = await demote(chatId, userId)
      if (!d.ok) {
        out.actions.push('demote_failed')
        out.demoteError = d.error
        if (d.transient && opts.retry) throw new Error('telegram unavailable: ' + d.error)
        return out // keep promoted_at → retried by the sweep
      }
      out.actions.push('demoted')
    }
    await db.from('tg_subscriptions').update({ promoted_at: null }).eq('id', row.id)
    row.promoted_at = null
  } else if (promotedBefore && foreignAdmin) {
    await db.from('tg_subscriptions').update({ promoted_at: null }).eq('id', row.id)
    row.promoted_at = null
  }

  if (row.was_member_before) { out.actions.push('kept_existing_member'); return out }
  if (row.removed_at) { out.actions.push('already_removed'); return out }
  if (foreignAdmin) { out.actions.push('kept_admin'); return out }

  if (!m.isMember) {
    // Already out (left, never joined, or banned by a human admin) — just record it.
    await db.from('tg_subscriptions')
      .update({ removed_at: now, approved_at: null })
      .eq('id', row.id).is('removed_at', null)
    out.actions.push('already_out')
    return out
  }

  // Claim the removal once, then kick (ban + immediate unban = not permanent).
  const { data: claimed } = await db.from('tg_subscriptions')
    .update({ removed_at: now, approved_at: null })
    .eq('id', row.id).is('removed_at', null)
    .select('id')
  if (!claimed || !claimed.length) { out.actions.push('already_removed'); return out }

  const ban = await tg('banChatMember', {
    chat_id: chatId,
    user_id: userId,
    until_date: Math.floor(Date.now() / 1000) + 60,
    revoke_messages: false,
  })
  if (!ban.ok) {
    await db.from('tg_subscriptions')
      .update({ removed_at: null, approved_at: row.approved_at || null })
      .eq('id', row.id)
    out.actions.push('kick_failed')
    out.kickError = ban.description
    console.warn('[tower] kick failed for', userId, ban.description)
    if (isTransient(ban) && opts.retry) throw new Error('telegram unavailable: ' + ban.description)
    return out
  }
  const unban = await tg('unbanChatMember', { chat_id: chatId, user_id: userId, only_if_banned: true })
  if (!unban.ok) console.warn('[tower] unban after kick failed (ban expires in 60s anyway):', unban.description)
  out.actions.push('removed')

  let link = null
  try {
    link = payUrl({ u: userId, c: chatId, un: row.telegram_username || undefined })
  } catch {}
  await dm(userId,
    `Подписка на «${GROUP_NAME}» закончилась — доступ в группу закрыт.\nВернуться можно в любой момент:`,
    link ? [[{ text: '💳 Оформить подписку', url: link }]] : null)
  return out
}

// ── Stripe webhook hook ─────────────────────────────────────────────────────
export const TOWER_EVENT_TYPES = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
]

// Returns true when the event belonged to the tower group (and was handled),
// false to let the existing Bestie webhook logic run unchanged. Throws → 500 → Stripe retries.
export async function handleTowerStripeEvent(event) {
  if (!event || !TOWER_EVENT_TYPES.includes(event.type)) return false
  const obj = event.data?.object || {}
  if (obj.metadata?.kind !== TOWER_KIND) return false

  const db = getDb()
  const { data: seen, error: seenErr } = await db.from('stripe_events')
    .select('processed_at').eq('event_id', event.id).maybeSingle()
  if (seenErr) throw new Error('stripe_events read: ' + seenErr.message)
  if (seen?.processed_at) return true
  if (!seen) {
    const { error } = await db.from('stripe_events')
      .upsert({ event_id: event.id, type: event.type }, { onConflict: 'event_id', ignoreDuplicates: true })
    if (error) throw new Error('stripe_events write: ' + error.message)
  }

  const s = getStripe()
  let result
  if (event.type === 'checkout.session.completed') {
    const subId = typeof obj.subscription === 'string' ? obj.subscription : obj.subscription?.id
    result = subId
      ? await syncSubscription(await s.subscriptions.retrieve(subId), { retry: true })
      : { skipped: true, reason: 'no subscription on session' }
  } else {
    // Events can arrive out of order → reconcile against the current state.
    let sub = obj
    try {
      sub = await s.subscriptions.retrieve(obj.id)
    } catch (e) {
      if (e?.code !== 'resource_missing') throw e
    }
    result = await syncSubscription(sub, { retry: true })
  }

  await db.from('stripe_events').update({ processed_at: new Date().toISOString() }).eq('event_id', event.id)
  console.log('[tower] stripe', event.type, event.id, JSON.stringify({
    status: result?.status, plan: result?.plan, actions: result?.actions, stale: result?.stale, skipped: result?.skipped,
  }))
  return true
}
