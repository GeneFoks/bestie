// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import {
  getDb, getStripe, tg, webhookSecret, resolveChatId, findPrice, ensurePrices, portalConfigId,
  createJoinRequestLink, knownChatIds,
  PLANS, SITE, TOWER_CHAT, TOWER_CHAT_IS_ID, TOWER_EVENT_TYPES, GROUP_URL, GROUP_URL_FROM_ENV,
  GROUP_URL_ENV_INVALID, GROUP_URL_IS_BOT_FALLBACK, JOIN_LINK_NAME,
  TOWER_ALLOWED_UPDATES, TOWER_COMMANDS, TOWER_GROUP_COMMANDS,
} from '@/lib/tower'
import { adminCommunity, adminReviews, setReviewHidden } from '@/lib/tower-teams'

// Admin status + one-click setup for @TowerCrewBot («Вышки в США»).
// Auth: Authorization: Bearer <Supabase access token> of a users.is_admin = true account.
export const dynamic = 'force-dynamic'

const WEBHOOK_PATH = '/api/tower/telegram'

async function requireAdmin(req) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return null
  const db = getDb()
  const { data } = await db.auth.getUser(token)
  const user = data?.user
  if (!user) return null
  const { data: u } = await db.from('users').select('is_admin').eq('id', user.id).maybeSingle()
  return u?.is_admin ? user : null
}

function stripeMode() {
  const k = process.env.STRIPE_SECRET_KEY || ''
  if (!k) return 'missing'
  return /^(sk|rk)_live_/.test(k) ? 'live' : 'test'
}

// The existing Bestie Stripe endpoint(s) must deliver the subscription events.
async function stripeWebhookEndpoints(fix = false) {
  const s = getStripe()
  const list = await s.webhookEndpoints.list({ limit: 100 })
  const out = []
  for (const ep of list.data || []) {
    if (!/\/api\/stripe\/webhook\/?$/.test(ep.url || '')) continue
    const enabled = ep.enabled_events || []
    let missing = enabled.includes('*') ? [] : TOWER_EVENT_TYPES.filter((t) => !enabled.includes(t))
    let updated = false
    if (fix && missing.length && ep.status === 'enabled') {
      await s.webhookEndpoints.update(ep.id, { enabled_events: [...enabled, ...missing] })
      updated = true
      missing = []
    }
    out.push({ id: ep.id, url: ep.url, status: ep.status, missing, updated })
  }
  return out
}

export async function GET(req: NextRequest) {
  try {
    if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Reviews only (filter by person / «Ещё»): ?view=reviews&q=<id|@username>&before=<updated_at>
    const sp = req.nextUrl.searchParams
    if (sp.get('view') === 'reviews') {
      try {
        const r = await adminReviews({ q: sp.get('q') || '', before: sp.get('before') || '' })
        return NextResponse.json(r, { status: r.error ? 400 : 200 })
      } catch (e) {
        return NextResponse.json({ error: e?.message || 'error' }, { status: 500 })
      }
    }

    const db = getDb()
    const expectedUrl = `${SITE}${WEBHOOK_PATH}`
    const out: any = {
      site: SITE,
      towerChat: TOWER_CHAT,
      towerChatIsId: TOWER_CHAT_IS_ID,
      groupUrl: GROUP_URL,
      groupUrlFromEnv: GROUP_URL_FROM_ENV,
      // TOWER_GROUP_URL is set but is not an invite link (https://t.me/+…).
      groupUrlEnvInvalid: GROUP_URL_ENV_INVALID,
      // Numeric TOWER_CHAT, no valid TOWER_GROUP_URL → the bot links to itself.
      groupUrlIsBotFallback: GROUP_URL_IS_BOT_FALLBACK,
      expectedWebhook: expectedUrl,
      stripeMode: stripeMode(),
    }

    const [me, wh] = await Promise.all([tg('getMe'), tg('getWebhookInfo')])
    out.bot = me.ok
      ? { ok: true, username: me.result.username, id: me.result.id }
      : { ok: false, error: me.description }
    out.webhook = wh.ok
      ? {
          ok: wh.result.url === expectedUrl,
          url: wh.result.url || '',
          pending_update_count: wh.result.pending_update_count || 0,
          last_error_message: wh.result.last_error_message || null,
          last_error_date: wh.result.last_error_date ? new Date(wh.result.last_error_date * 1000).toISOString() : null,
          allowed_updates: wh.result.allowed_updates || null,
        }
      : { ok: false, error: wh.description }

    // The group's numeric id as stored in our own rows — the reference for
    // «is TOWER_CHAT really our group?» (e.g. a typo in a numeric TOWER_CHAT, or
    // the group made private while TOWER_CHAT is still '@towerUSA').
    const known = await knownChatIds()
    out.knownChatIds = known || []

    let chatId = null
    try {
      chatId = await resolveChatId()
    } catch (e) {
      out.chat = { ok: false, error: e?.message }
    }
    out.chatId = chatId
    out.chatIdMismatch = !!chatId && !!known && known.length > 0 && !known.includes(String(chatId))
    if (chatId) {
      const [chat, cnt] = await Promise.all([
        tg('getChat', { chat_id: chatId }),
        tg('getChatMemberCount', { chat_id: chatId }),
      ])
      out.isPublic = chat.ok ? !!chat.result.username : null
      out.chat = chat.ok
        ? {
            ok: true,
            id: chatId,
            title: chat.result.title,
            username: chat.result.username || null,
            is_public: !!chat.result.username,
            join_by_request: !!chat.result.join_by_request,
            // Members allowed to add people directly → those skip the join request
            // (and payment) and, having no row, are never removed.
            members_can_invite: !!chat.result.permissions?.can_invite_users,
            members: cnt.ok ? cnt.result : null,
          }
        : { ok: false, id: chatId, error: chat.description }

      // Is TOWER_GROUP_URL really a join-request link? editChatInviteLink only
      // works on a non-primary, non-revoked link CREATED BY THE BOT — so it fails
      // for the owner's / another admin's link, the primary link and a revoked
      // one. Idempotent, and it turns approval back on if someone switched it off
      // in Telegram. (member_limit is not allowed with creates_join_request.)
      // Never log the link.
      if (GROUP_URL_FROM_ENV && chat.ok) {
        const v = await tg('editChatInviteLink', {
          chat_id: chatId,
          invite_link: GROUP_URL,
          name: JOIN_LINK_NAME,
          creates_join_request: true,
        })
        out.groupUrlCheck = {
          ok: !!(v.ok && v.result?.creates_join_request === true && !v.result?.is_revoked && !v.result?.is_primary),
          error: v.ok ? null : (v.description || 'editChatInviteLink failed'),
        }
      }

      if (me.ok) {
        const bm = await tg('getChatMember', { chat_id: chatId, user_id: me.result.id })
        const r = bm.ok ? bm.result : {}
        out.botRights = {
          ok: bm.ok && r.status === 'administrator' && !!r.can_invite_users && !!r.can_restrict_members && !!r.can_promote_members,
          status: r.status || null,
          can_invite_users: !!r.can_invite_users,
          can_restrict_members: !!r.can_restrict_members,
          can_promote_members: !!r.can_promote_members,
          error: bm.ok ? null : bm.description,
        }
      }
    }

    out.prices = {}
    for (const plan of Object.keys(PLANS)) {
      try {
        const p = await findPrice(plan)
        out.prices[plan] = p
          ? { ok: true, id: p.id, unit_amount: p.unit_amount, currency: p.currency, livemode: !!p.livemode, lookupKey: PLANS[plan].lookupKey }
          : { ok: false, lookupKey: PLANS[plan].lookupKey }
      } catch (e) {
        out.prices[plan] = { ok: false, lookupKey: PLANS[plan].lookupKey, error: e?.message }
      }
    }
    try {
      const id = await portalConfigId({ create: false })
      out.portal = { ok: !!id, id }
    } catch (e) {
      out.portal = { ok: false, error: e?.message }
    }
    try {
      out.stripeWebhooks = await stripeWebhookEndpoints(false)
    } catch (e) {
      out.stripeWebhooks = { error: e?.message }
    }

    const [{ data: statuses }, { data: rows }, pendingJr, botUsers] = await Promise.all([
      db.from('tg_subscriptions').select('status').limit(10000),
      db.from('tg_subscriptions')
        .select('telegram_username, telegram_user_id, plan, status, paid_until, removed_at, promoted_at, approved_at, was_member_before, cancel_at_period_end, livemode, updated_at')
        .order('updated_at', { ascending: false })
        .limit(50),
      db.from('tg_join_requests').select('telegram_user_id', { count: 'exact', head: true }).eq('status', 'pending'),
      db.from('tg_bot_users').select('telegram_user_id', { count: 'exact', head: true }),
    ])
    const counts = {}
    ;(statuses || []).forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1 })
    out.counts = counts
    out.rows = rows || []
    out.pendingJoinRequests = pendingJr?.count || 0
    out.botUsers = botUsers?.count || 0

    // Teams and reviews (lib/migration_tower_teams.sql). Missing tables must
    // not break the subscription status above.
    try {
      out.community = await adminCommunity()
    } catch (e) {
      out.community = { error: e?.message || 'error' }
    }

    return NextResponse.json(out)
  } catch (e) {
    console.error('[tower/admin] GET error:', e?.message || e)
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    let body
    try { body = await req.json() } catch { body = {} }
    const action = body?.action

    if (action === 'setup') {
      const secret = webhookSecret()
      if (!secret) return NextResponse.json({ error: 'TOWER_BOT_TOKEN not set' }, { status: 500 })
      const setWebhook = await tg('setWebhook', {
        url: `${SITE}${WEBHOOK_PATH}`,
        secret_token: secret,
        allowed_updates: TOWER_ALLOWED_UPDATES,
        drop_pending_updates: false,
      })
      const setMyCommands = await tg('setMyCommands', { commands: TOWER_COMMANDS })
      // Inside the group the «/» menu shows only /review and /profile.
      const setGroupCommands = await tg('setMyCommands', {
        commands: TOWER_GROUP_COMMANDS,
        scope: { type: 'all_group_chats' },
      })
      console.log('[tower/admin] setup: webhook', setWebhook.ok, 'commands', setMyCommands.ok, 'group commands', setGroupCommands.ok)
      return NextResponse.json({
        ok: !!setWebhook.ok && !!setMyCommands.ok,
        setWebhook: { ok: !!setWebhook.ok, description: setWebhook.description || null },
        setMyCommands: { ok: !!setMyCommands.ok, description: setMyCommands.description || null },
        setGroupCommands: { ok: !!setGroupCommands.ok, description: setGroupCommands.description || null },
      })
    }

    // «Скрыть» / «Показать» a review (hidden = not in the bot's lists or ratings).
    if (action === 'review_hide') {
      const r = await setReviewHidden(body?.id, !!body?.hidden)
      if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: r.status || 400 })
      console.log('[tower/admin] review_hide', r.id, r.hidden_at ? 'hidden' : 'shown', 'group message:', r.group_message || '—')
      return NextResponse.json({ ok: true, id: r.id, hidden_at: r.hidden_at, group_message: r.group_message || null })
    }

    if (action === 'stripe') {
      const prices = await ensurePrices()
      let portal
      try {
        portal = { ok: true, id: await portalConfigId() }
      } catch (e) {
        portal = { ok: false, error: e?.message }
      }
      let webhooks
      try {
        webhooks = await stripeWebhookEndpoints(true)
      } catch (e) {
        webhooks = { error: e?.message }
      }
      console.log('[tower/admin] stripe setup:', JSON.stringify({ prices, portal: portal.ok }))
      return NextResponse.json({ ok: true, prices, portal, webhooks })
    }

    // Invite link that creates join requests — needed before the group is made
    // private (a private group has no t.me/<username> link to apply through).
    if (action === 'invite_link') {
      let chatId
      try {
        chatId = await resolveChatId()
      } catch (e) {
        return NextResponse.json({ ok: false, error: 'Группа не найдена: ' + (e?.message || 'unknown') }, { status: 500 })
      }
      const r = await createJoinRequestLink(chatId)
      console.log('[tower/admin] invite_link:', r.ok ? 'created' : 'failed') // never log the link itself
      if (!r.ok) return NextResponse.json({ ok: false, chat_id: chatId, error: r.error }, { status: 502 })
      return NextResponse.json({
        ok: true,
        chat_id: chatId,
        link: r.link,
        name: r.name,
        creates_join_request: r.creates_join_request,
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    console.error('[tower/admin] POST error:', e?.message || e)
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 })
  }
}
