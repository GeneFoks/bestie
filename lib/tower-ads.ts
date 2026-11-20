// @ts-nocheck
// ============================================================================
// «Вышки в США» — vacancies and ads only with the Admin plan ($30/мес).
//
// The bot is a group admin, so it sees every message. looksLikeAd() is a cheap
// text check run on each one; only a hit costs a getChatMember call. Allowed:
// group admins/creator (paid Admin = promoted with the «Реклама» title), an
// active Admin subscription, anonymous admins, the linked channel. Everyone
// else: the message is deleted, the author gets their text back in the bot DM
// with an «Оформить Admin» button (or, if the bot can't write to them, a short
// group reply that goes away after a minute). Job SEEKERS («ищу работу») are
// never touched — only employer posts, sales/promo with contacts, and invites
// to other groups.
//
// Owner controls on /admin/tower: on/off switch (tg_bot_settings 'ads_filter')
// and the last removed messages (tg_bot_settings 'ads_removed', 50 kept).
// ============================================================================
import {
  tg, dm, esc, resolveChatId, memberStatus, loadRow, isActiveStatus, payUrl, botUsername,
  getSetting, setSetting, rememberEphemeral, PLANS, GROUP_NAME, ADMIN_TITLE,
} from '@/lib/tower'

const MAX_LOG = 50
const NOTICE_EVERY_MS = 10 * 60 * 1000
const SETTING_TTL_MS = 60 * 1000

// ── The text check (pure, fast) ─────────────────────────────────────────────
// Employer side: «требуются», «ищем монтажников», «нужны люди», «hiring» …
const VACANCY_RE = new RegExp([
  'требу[ею]тся\\s+(\\S+\\s+){0,2}(люди|людей|монтажник|климбер|клаймбер|climber|ребят|техник|работник|рабоч|бригад|форман|foreman|хелпер|helper|сотрудник|специалист)',
  'набираем',
  'набор\\s+(в\\s+бригад|людей|монтажник|климбер|клаймбер|рабоч)',
  'ищем\\s+(людей|монтажник|климбер|клаймбер|climber|ребят|бригад|работник|сотрудник|техник|форман|foreman|хелпер|helper|рабоч)',
  'нужн[ыа]\\s+(люди|монтажник|климбер|клаймбер|climber|ребята|техник|работник|рабочие|бригад)',
  'нуж[ен]н?\\s+(монтажник|климбер|клаймбер|climber|техник|форман|foreman|хелпер|helper|рабочий)',
  'в\\s+бригаду\\s+нуж',
  'приглашаем\\s+на\\s+работу',
  'открыт[аы]\\s+ваканси',
  'есть\\s+ваканси[яи]\\s+(в|на|для)',
  "\\bwe('re|\\s+are)\\s+hiring",
  '\\bnow\\s+hiring',
  '\\bhiring\\s+(climbers?|techs?|technicians?|tower|crews?|foreman|helpers?)',
  '\\blooking\\s+for\\s+(climbers?|techs?|technicians?|tower\\s+\\w+|crews?|foreman|helpers?)',
  '\\bjob\\s+opening',
].join('|'), 'i')
// (JS \b only knows Latin letters → after a Russian word: (?![а-я]).)
// A pay offer: «$35/час», «30$ в час», «per diem», «оплата от …»
const PAY_RE = /\$\s?\d{2,3}\s*(\/|в|per|an?)?\s*(час|ч(?![а-я])|hr|hour|h\b)|\d{2,3}\s?\$\s*(\/|в)\s*(час|ч(?![а-я]))|per\s?diem|пер\s?дием|оплата\s+(от|до|\d)|зарплата|з\/п(?![а-я])|pay\s+rate|\/hr\b/i
// Contacts: a US phone, WhatsApp, «пишите в лс», «call or text»
const CONTACT_RE = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}|\+?\d{10,12}\b|wa\.me|whats\s?app|ватсап|вотсап|пиши(те)?\s+в\s+(лс|личк|личные)|звони(те|ть)?(?![а-я])|call\s+(or|\/)\s+text|text\s+me|dm\s+me/i
// Selling / promo / spam
const SALE_RE = /реклам|продам|продаю|прода[её]тся|скидк|акци[яи](?![а-я])|услуг[иа]|for\s+sale|selling|discount|promo\s?code|промокод|подписывай|подпишись/i
const SPAM_RE = /казино|casino|ставк[иа]\s+на|крипт|crypto|инвестиц|заработ(ок|ай)\s|доход\s+от|без\s+вложений|ставки(?![а-я])/i
// Invites to other groups/channels
const INVITE_RE = /t\.me\/(\+|joinchat\/)|telegram\.me\/(\+|joinchat\/)/i
const LINK_RE = /https?:\/\/|t\.me\/|telegram\.me\//i
const OWN_LINK_RE = /t\.me\/(towerusa|towercrewbot)\b|bestiehere\.com/gi

// → { ad: boolean, reason }
export function looksLikeAd(raw) {
  const text = String(raw || '').toLowerCase().replace(/ё/g, 'е')
  if (text.length < 12) return { ad: false, reason: '' }
  const foreign = text.replace(OWN_LINK_RE, '')
  const vacancy = VACANCY_RE.test(text)
  const pay = PAY_RE.test(text)
  const contact = CONTACT_RE.test(text)
  const link = LINK_RE.test(foreign)
  // A short question («Требуются ли монтажники в Техасе?») is not a vacancy.
  const question = /\?/.test(text) && text.length < 140 && !pay && !contact
  if (vacancy && !question) return { ad: true, reason: 'вакансия' }
  if (pay && (contact || link)) return { ad: true, reason: 'вакансия' }
  if (INVITE_RE.test(foreign)) return { ad: true, reason: 'ссылка на другую группу' }
  if (SPAM_RE.test(text) && (contact || link)) return { ad: true, reason: 'реклама' }
  if (SALE_RE.test(text) && (contact || link)) return { ad: true, reason: 'реклама' }
  return { ad: false, reason: '' }
}

// ── Settings (cached a minute per instance) ─────────────────────────────────
let enabledCache = null
export async function adsFilterEnabled() {
  if (enabledCache && Date.now() - enabledCache.at < SETTING_TTL_MS) return enabledCache.on
  const st = await getSetting('ads_filter')
  // No Mini App migration → the filter still runs (default on).
  const on = !st.ok || !st.value || st.value.enabled !== false
  enabledCache = { at: Date.now(), on }
  return on
}

export async function setAdsFilter(enabled) {
  const r = await setSetting('ads_filter', { enabled: !!enabled })
  enabledCache = null
  return r
}

export async function adsRemovedLog() {
  const st = await getSetting('ads_removed')
  return st.ok && Array.isArray(st.value?.items) ? st.value.items : []
}

async function logRemoved(item) {
  try {
    const items = await adsRemovedLog()
    items.unshift(item)
    await setSetting('ads_removed', { items: items.slice(0, MAX_LOG) })
  } catch (e) {
    console.warn('[tower/ads] log failed:', e?.message || e)
  }
}

// ── Who may post ads ────────────────────────────────────────────────────────
async function allowedToAdvertise(chatId, userId) {
  const m = await memberStatus(chatId, userId)
  // Can't check right now → don't delete (never punish on a Telegram hiccup).
  if (!m.ok) return true
  if (m.status === 'creator' || m.status === 'administrator') return true
  try {
    const row = await loadRow(chatId, userId)
    if (row && row.plan === 'admin' && row.stripe_subscription_id && isActiveStatus(row.status)) return true
  } catch {
    return true
  }
  return false
}

// ── The handler (called only when looksLikeAd() said yes) ───────────────────
const lastNotice = new Map()

export async function handleAdMessage(msg, reason = 'реклама') {
  if (!(await adsFilterEnabled())) return { action: 'off' }
  const chatId = msg.chat.id
  const sc = msg.sender_chat
  // Anonymous admin (posts as the group) and the linked channel's auto-forwards are the owner's.
  if (sc && (Number(sc.id) === Number(chatId) || msg.is_automatic_forward)) return { action: 'allowed' }
  const from = sc ? null : msg.from
  if (from && (await allowedToAdvertise(chatId, from.id))) return { action: 'allowed' }

  const d = await tg('deleteMessage', { chat_id: chatId, message_id: msg.message_id })
  if (!d.ok) {
    console.warn('[tower/ads] delete failed:', d.description)
    return { action: 'delete_failed' }
  }
  const text = String(msg.text || msg.caption || '')
  await logRemoved({
    at: new Date().toISOString(),
    uid: from ? from.id : null,
    name: from ? [from.first_name, from.last_name].filter(Boolean).join(' ') : (sc?.title || 'канал'),
    username: from ? from.username || null : sc?.username || null,
    reason,
    text: Array.from(text).slice(0, 400).join(''),
  })
  console.log('[tower/ads] removed', from ? from.id : 'channel', reason)
  if (!from) return { action: 'deleted' }

  // The author: their text back + how to post legally. DM first; if the bot
  // can't write to them, one short group reply (gone in a minute), at most
  // once per 10 min per person.
  let resolvedChat = chatId
  try { resolvedChat = await resolveChatId() } catch {}
  const link = { u: from.id, c: resolvedChat, n: from.first_name, un: from.username }
  const quote = text ? `\n\n<b>Твой текст</b> (чтобы не потерять):\n<blockquote>${esc(Array.from(text).slice(0, 1500).join(''))}</blockquote>` : ''
  const sent = await dm(from.id,
    `🧹 Твоё сообщение в «${GROUP_NAME}» удалено: вакансии и реклама в группе — только с тарифом <b>Admin — $${PLANS.admin.priceUsd}/мес</b>.\n\n` +
    `С Admin бот не трогает твои объявления, а рядом с именем появляется значок «${ADMIN_TITLE}». ` +
    `Если это не объявление — просто перефразируй без контактов и ставок.` + quote,
    [[{ text: `💳 Оформить Admin — $${PLANS.admin.priceUsd}/мес`, url: payUrl(link) }]])
  if (sent.ok) return { action: 'deleted', dm: true }

  const prev = lastNotice.get(from.id) || 0
  if (Date.now() - prev < NOTICE_EVERY_MS) return { action: 'deleted', dm: false }
  lastNotice.set(from.id, Date.now())
  const bot = await botUsername()
  const who = from.username ? '@' + esc(from.username) : esc(from.first_name || 'Участник')
  const params: any = {
    chat_id: chatId,
    text: `${who}, вакансии и реклама в группе — только с тарифом Admin. Подробнее 👇`,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
    reply_markup: { inline_keyboard: [[{ text: '📢 Как разместить объявление', url: `https://t.me/${bot}?start=ads` }]] },
  }
  if (msg.is_topic_message && msg.message_thread_id) params.message_thread_id = msg.message_thread_id
  const r = await tg('sendMessage', params)
  if (r.ok && r.result?.message_id) await rememberEphemeral(chatId, r.result.message_id)
  return { action: 'deleted', dm: false }
}

// /start ads — from that group reply: what Admin gives + a personal pay button.
export async function sendAdsInfo(from) {
  let chatId = 0
  try { chatId = await resolveChatId() } catch {}
  const link = { u: from.id, c: chatId, n: from.first_name, un: from.username }
  return dm(from.id,
    `📢 <b>Вакансии и реклама в «${GROUP_NAME}»</b>\n\n` +
    `Публиковать вакансии и рекламу в группе можно только с тарифом <b>Admin — $${PLANS.admin.priceUsd}/мес</b>. ` +
    `Без него бот удаляет такие сообщения автоматически.\n\n` +
    `С Admin:\n• твои объявления остаются в группе\n• рядом с именем значок «${ADMIN_TITLE}»\n• всё из Basic: группа, рейтинг, отзывы, команды`,
    [[{ text: `💳 Оформить Admin — $${PLANS.admin.priceUsd}/мес`, url: payUrl(link) }]])
}
