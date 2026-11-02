// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import {
  getDb, dm, esc, fmtDate, webhookSecret, safeEqual, payUrl, portalUrl,
  resolveChatId, isTowerChat, botUsername, memberStatus, isBannedByAdmin, loadRow, enforceActive,
  isActiveStatus, isLiveStatus, PLANS, GROUP_NAME, GROUP_URL, ADMIN_TITLE, BANNED_TEXT,
} from '@/lib/tower'

// Webhook for @TowerCrewBot («Вышки в США»). Registered from /admin/tower.
export const dynamic = 'force-dynamic'

const ok = () => NextResponse.json({ ok: true })

const PLANS_TEXT =
  `<b>Тарифы:</b>\n` +
  `• <b>Basic — $${PLANS.basic.priceUsd}/мес</b> — доступ в группу\n` +
  `• <b>Admin — $${PLANS.admin.priceUsd}/мес</b> — доступ + значок админа «${ADMIN_TITLE}» и можно публиковать рекламу`

// ── chat_join_request ───────────────────────────────────────────────────────
async function onJoinRequest(jr) {
  const db = getDb()
  const from = jr.from
  const chatId = jr.chat.id
  const userId = from.id
  const dmTo = jr.user_chat_id || userId
  const now = new Date().toISOString()

  await db.from('tg_join_requests').upsert({
    chat_id: chatId,
    telegram_user_id: userId,
    user_chat_id: jr.user_chat_id || null,
    username: from.username || null,
    first_name: from.first_name || null,
    status: 'pending',
    requested_at: now,
    resolved_at: null,
  }, { onConflict: 'chat_id,telegram_user_id' })

  const row = await loadRow(chatId, userId)

  // Already paying → let them straight in. DM first: user_chat_id only works
  // while the request is still pending.
  if (row && row.stripe_subscription_id && isActiveStatus(row.status)) {
    await dm(dmTo, row.approved_at
      ? `С возвращением! ✅ Подписка активна — заявка в «${GROUP_NAME}» одобрена.`
      : `Подписка активна ✅ Заявка одобрена — добро пожаловать в «${GROUP_NAME}»!`,
      [[{ text: '👉 Открыть группу', url: GROUP_URL }]])
    const out = await enforceActive(row, { actions: [] }, { silent: true })
    console.log('[tower/telegram] join (active sub)', userId, JSON.stringify(out.actions))
    return
  }

  const link = { u: userId, c: chatId, n: from.first_name, un: from.username }
  const bot = await botUsername()
  const hello = from.first_name ? `👋 ${esc(from.first_name)}, привет!` : '👋 Привет!'

  if (row && row.stripe_subscription_id && row.status === 'past_due') {
    await dm(dmTo,
      `${hello}\n\n⚠️ Не удалось списать оплату за подписку на «${GROUP_NAME}». ` +
      `Обновите карту — и заявку одобрим автоматически.`,
      [[{ text: '⚙️ Управлять подпиской', url: portalUrl(link) }]])
    return
  }

  await dm(dmTo,
    `${hello}\n\n` +
    `Группа <b>«${GROUP_NAME}»</b> — платная.\n\n` +
    `${PLANS_TEXT}\n\n` +
    `После оплаты заявка одобрится автоматически — ничего ждать не нужно.`,
    [
      [{ text: '💳 Выбрать тариф и оплатить', url: payUrl(link) }],
      [{ text: '▶️ Запустить бота (чтобы получать уведомления)', url: `https://t.me/${bot}?start=join` }],
    ])
}

// ── Private chat: /start, /status, /manage ──────────────────────────────────
async function upsertBotUser(from) {
  await getDb().from('tg_bot_users').upsert({
    telegram_user_id: from.id,
    username: from.username || null,
    first_name: from.first_name || null,
    blocked_at: null,
  }, { onConflict: 'telegram_user_id' })
}

async function onStatus(from) {
  const chatId = await resolveChatId()
  const row = await loadRow(chatId, from.id)
  const link = { u: from.id, c: chatId, n: from.first_name, un: from.username }
  const m = await memberStatus(chatId, from.id)
  const banned = isBannedByAdmin(m)

  if (row && row.stripe_subscription_id && isLiveStatus(row.status)) {
    const label = PLANS[row.plan]?.label || 'Basic'
    const until = fmtDate(row.paid_until)
    let text = row.cancel_at_period_end
      ? `Подписка <b>${label}</b> отменена — доступ сохранится до <b>${until}</b>.`
      : `✅ Подписка активна: <b>${label}</b>, оплачено до <b>${until}</b>.`
    if (row.status === 'past_due') {
      text = `⚠️ Не удалось списать оплату за <b>${label}</b>. Обновите карту — иначе доступ в группу закроется.`
    }
    const buttons = [[{ text: '⚙️ Управлять подпиской', url: portalUrl(link) }]]

    if (banned) {
      text += `\n\n${BANNED_TEXT}\nОтменить подписку можно кнопкой ниже.`
    } else if (m.ok && !m.isMember && isActiveStatus(row.status)) {
      // Paid but not inside yet → approve a pending request; otherwise they
      // apply via the group link and the bot approves it instantly.
      // (No invite links — those would let anyone in without paying.)
      const out = await enforceActive(row, { actions: [] }, { silent: true })
      if (out.inGroup) {
        text += `\n\nЗаявка в группу одобрена 🎉`
        buttons.unshift([{ text: '👉 Открыть группу', url: GROUP_URL }])
      } else {
        text += `\n\nПодайте заявку в группу — одобрим автоматически.`
        buttons.unshift([{ text: '👉 Подать заявку в группу', url: GROUP_URL }])
      }
    } else {
      buttons.unshift([{ text: '👉 Открыть группу', url: GROUP_URL }])
    }
    await dm(from.id, text, buttons)
    return
  }

  if (banned) {
    await dm(from.id, BANNED_TEXT)
    return
  }

  if (m.ok && m.isMember) {
    await dm(from.id,
      `Вы уже в группе «${GROUP_NAME}» ✅ Платить ничего не нужно.\n\n` +
      `Хотите значок админа «${ADMIN_TITLE}» и публиковать рекламу? ` +
      `Тариф <b>Admin — $${PLANS.admin.priceUsd}/мес</b>.`,
      [[{ text: `⭐ Тариф Admin — $${PLANS.admin.priceUsd}/мес`, url: payUrl(link) }]])
    return
  }

  await dm(from.id,
    `Группа <b>«${GROUP_NAME}»</b> — платная.\n\n` +
    `${PLANS_TEXT}\n\n` +
    `Подайте заявку в группу и оплатите — заявка одобрится автоматически.`,
    [
      [{ text: '💳 Выбрать тариф и оплатить', url: payUrl(link) }],
      [{ text: '👥 Открыть группу', url: GROUP_URL }],
    ])
}

async function onManage(from) {
  const chatId = await resolveChatId()
  const row = await loadRow(chatId, from.id)
  const link = { u: from.id, c: chatId, n: from.first_name, un: from.username }
  if (row?.stripe_customer_id && row?.stripe_subscription_id) {
    await dm(from.id,
      `⚙️ Управление подпиской: смена тарифа (Basic ↔ Admin), карта, счета, отмена.`,
      [[{ text: '⚙️ Управлять подпиской', url: portalUrl(link) }]])
    return
  }
  await dm(from.id,
    `У вас пока нет подписки на «${GROUP_NAME}».\n\n${PLANS_TEXT}`,
    [[{ text: '💳 Выбрать тариф и оплатить', url: payUrl(link) }]])
}

async function onPrivateMessage(msg) {
  const from = msg.from
  const text = String(msg.text || '').trim()
  const words = text.split(/\s+/)
  const cmd = words[0].split('@')[0].toLowerCase()
  await upsertBotUser(from)
  // t.me/<bot>?start=manage (from the web pages) arrives as "/start manage".
  if (cmd === '/manage' || (cmd === '/start' && words[1] === 'manage')) return onManage(from)
  if (cmd === '/start' || cmd === '/status') return onStatus(from)
  await dm(from.id,
    `Я бот группы «${GROUP_NAME}».\n\n` +
    `/status — статус подписки\n` +
    `/manage — управлять подпиской (тариф, карта, отмена)`)
}

// ── Entry ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const expected = webhookSecret()
  const got = req.headers.get('x-telegram-bot-api-secret-token') || ''
  if (!expected || !safeEqual(got, expected)) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  let update
  try {
    update = await req.json()
  } catch {
    return ok()
  }

  try {
    // Classify first — group chatter, channel posts etc. are dropped with no DB writes.
    let kind = null
    if (update.chat_join_request) {
      if (await isTowerChat(update.chat_join_request.chat)) kind = 'join'
    } else if (update.message) {
      const msg = update.message
      if (msg.chat?.type === 'private' && msg.from && !msg.from.is_bot && typeof msg.text === 'string') kind = 'private'
    } else if (update.my_chat_member) {
      const mcm = update.my_chat_member
      console.log('[tower/telegram] my_chat_member', mcm.chat?.id, mcm.chat?.title || '', mcm.new_chat_member?.status)
      return ok()
    }
    if (!kind) return ok()

    // Dedupe (Telegram may redeliver to several instances).
    if (typeof update.update_id === 'number') {
      const { error } = await getDb().from('tg_bot_updates').insert({ update_id: update.update_id })
      if (error && error.code === '23505') return ok()
      if (error) console.warn('[tower/telegram] dedupe insert failed:', error.message)
    }

    if (kind === 'join') await onJoinRequest(update.chat_join_request)
    else if (kind === 'private') await onPrivateMessage(update.message)
  } catch (e) {
    console.error('[tower/telegram] error:', e?.message || e)
  }
  return ok()
}
