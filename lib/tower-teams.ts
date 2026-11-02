// @ts-nocheck
// ============================================================================
// «Вышки в США» — teams (crews), profiles and reviews in @TowerCrewBot.
//
// SERVER-ONLY. Uses the bot token and the Supabase service role through
// lib/tower.ts. lib/tower.ts must never import this file (no cycles).
//
// Rebuilds the features of the original (lost) Python bot with the same
// commands and wording: /crew create · join · leave · kick, /profile, /myteam,
// /review, /reviews, /help. In the group: reply to someone's message with
// "/review 5 текст" or "/profile".
//
// /crew join НАЗВАНИЕ sends a request; the team's leader accepts or declines it
// (buttons, or /crew accept ID · /crew decline ID). A kick or a decline blocks
// new requests to that team for 7 days.
//
// Safety: nothing here kicks, bans, restricts, promotes / demotes, approves or
// declines anyone in the Telegram group, or touches subscriptions. /crew kick
// removes a person from a TEAM (a row in tg_team_members) — never from the
// group. The only message calls in the group are deleteMessage on the bot
// command itself and on / edits of the bot's OWN review confirmations.
//
// Tables + functions: lib/migration_tower_teams.sql.
// ============================================================================
import {
  tg, dm, esc, fmtDate, getDb, resolveChatId, memberStatus, botUsername, GROUP_NAME,
} from '@/lib/tower'

const HOUR = 3600 * 1000
const STATE_TTL_MS = 15 * 60 * 1000         // a multi-step answer must come within 15 min
const STATE_STALE_MS = 24 * HOUR            // ran out long ago → no «время вышло» notice
const MAX_REVIEWS_PER_DAY = 10              // new reviews per author (also a DB trigger)
const MAX_EDITS_PER_DAY = 20                // reviews an author may change per day
const EDIT_EVERY_MS = 10 * 60 * 1000        // one author → target review: one change per 10 min
const NOTIFY_EVERY_MS = 24 * HOUR           // «отзыв обновлён» DM: at most once a day per review
const REQUEST_TTL_MS = 48 * HOUR            // an unanswered join request expires
const REJOIN_AFTER_MS = 7 * 24 * HOUR       // after a kick / decline
const REREQUEST_MS = 24 * HOUR              // one request to the same team per day
const GROUP_COOLDOWN_MS = 15 * 1000         // one group command per person per 15 s
const MAX_REVIEW_TEXT = 1000
const MAX_DESC = 500
const NAME_MIN = 2
const NAME_MAX = 40
const PAGE = 1000
const ADMIN_PAGE = 50
// «—» (or similar) = skip the optional step.
const SKIP_RE = /^(—|–|-|−|―|нет|пропустить|skip)$/i
// Zero-width / bidi / control characters — invisible in a team name.
const INVISIBLE_RE = new RegExp('[\\p{Cf}\\p{Cc}]', 'gu')
const REVIEW_COLS = 'id, rating, text, hidden_at, created_at, updated_at, notified_at, group_chat_id, group_message_id'

// ── Texts ───────────────────────────────────────────────────────────────────
const CHECK_FAILED = '⚠️ Не удалось проверить участие в группе — попробуй чуть позже.'
const ONLY_MEMBERS = `Это доступно только участникам группы «${GROUP_NAME}».`
const SELF_REVIEW = 'Себе отзыв оставить нельзя 🙂'
const LIMIT_TEXT = `Лимит — ${MAX_REVIEWS_PER_DAY} новых отзывов в сутки. Попробуй завтра.`
const EDIT_LIMIT_TEXT = `Лимит — ${MAX_EDITS_PER_DAY} изменённых отзывов в сутки. Попробуй завтра.`
const BOT_REVIEW = '🤖 Ботам отзывы не оставляют.'
const FORWARDED_TEXT = 'это пересланное сообщение — ответь на сообщение самого человека.'

const REVIEW_HOW =
  'Как оставить отзыв:\n' +
  '• в группе — ответь на сообщение человека:\n<code>/review 5 отличный монтажник</code>\n' +
  '• здесь — <code>/review @username</code>\n\n' +
  'Оценка от 1 до 5, потом текст (можно без текста).'

const CREW_HELP =
  '👷 <b>Команды</b>\n\n' +
  '<code>/crew create</code> — создать команду\n' +
  '<code>/crew join НАЗВАНИЕ</code> — заявка в команду (лидер подтверждает)\n' +
  '<code>/crew leave</code> — выйти из команды (или отменить заявку)\n' +
  '<code>/crew kick @username</code> — исключить участника (только лидер)\n' +
  '<code>/crew accept ID</code> · <code>/crew decline ID</code> — ответить на заявку (только лидер)\n' +
  '/myteam — моя команда'

export const HELP_TEXT =
  `Я бот группы «${GROUP_NAME}».\n\n` +
  '👤 <b>Профиль и отзывы</b>\n' +
  '/profile — мой профиль: команда, рейтинг, отзывы\n' +
  '/reviews — отзывы обо мне\n' +
  '/review @username — оставить отзыв\n' +
  'В группе — ответь на сообщение человека:\n<code>/review 5 отличный монтажник</code>\n' +
  'или <code>/profile</code> — профиль человека\n\n' +
  '👷 <b>Команды</b>\n' +
  '/myteam — моя команда\n' +
  '<code>/crew create</code> — создать команду\n' +
  '<code>/crew join НАЗВАНИЕ</code> — заявка в команду (лидер подтверждает)\n' +
  '<code>/crew leave</code> — выйти из команды (или отменить заявку)\n' +
  '<code>/crew kick @username</code> — исключить участника (только лидер)\n\n' +
  '💳 <b>Подписка</b>\n' +
  '/status — статус подписки\n' +
  '/manage — управлять подпиской (тариф, карта, отмена)\n\n' +
  '/cancel — отменить текущее действие'

export const TEAMS_ERROR_TEXT = '⚠️ Команды и отзывы сейчас недоступны — попробуй чуть позже.'

function unknownUser(u) {
  return `Не знаю @${esc(u)} — бот ещё не видел этого человека.\n\n` +
    'Ответь на его сообщение в группе командой:\n<code>/review 5 текст</code>'
}

// ── Small helpers ───────────────────────────────────────────────────────────
const uniq = (ids) => Array.from(new Set((ids || []).map(Number).filter((x) => Number.isFinite(x) && x > 0)))
const cpLen = (s) => Array.from(String(s || '')).length
const cpSlice = (s, n) => Array.from(String(s || '')).slice(0, n).join('')
const stars = (n) => '⭐'.repeat(Math.max(0, Math.min(5, Number(n) || 0)))
const fmtAvg = (avg) => (Math.round(Number(avg || 0) * 10) / 10).toFixed(1)
const fmtRating = (r) => (r && r.count ? `${fmtAvg(r.avg)} (${r.count})` : 'нет оценок')
// ms since an ISO time; Infinity when missing / unparsable.
function ageMs(iso) {
  const t = Date.parse(iso || '')
  return Number.isFinite(t) ? Date.now() - t : Infinity
}

// Works for a Telegram user object ({ id, first_name, … }) and a tg_people row.
function plainName(p, id = null) {
  const n = [p?.first_name, p?.last_name].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
  if (n) return n
  if (p?.username) return '@' + p.username
  return 'id ' + (p?.telegram_user_id || p?.id || id || '?')
}
const nameHtml = (p, id = null) => esc(cpSlice(plainName(p, id), 64))
function fullNameHtml(p, id = null) {
  const base = nameHtml(p, id)
  return p?.username && plainName(p, id) !== '@' + p.username ? `${base} (@${esc(p.username)})` : base
}
const mention = (u) => `<a href="tg://user?id=${Number(u.id)}">${nameHtml(u)}</a>`

// Joins lines, stopping before Telegram's 4096-character limit.
function fit(lines, max = 3900) {
  let out = ''
  for (const l of lines) {
    const next = out ? out + '\n' + l : l
    if (next.length > max) return out + '\n…'
    out = next
  }
  return out
}

// NFKC + no invisible characters: «Монтажники» and «Монтажники + U+200B» are the
// same name (one can't pose as the other). The cleaned form is what is stored.
function cleanName(s) {
  return String(s || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .replace(INVISIBLE_RE, '')
    .replace(/\s+/g, ' ')
    .trim()
}
const nameKey = (s) => cleanName(s).toLowerCase()
function nameProblem(name) {
  const n = cpLen(name)
  if (n < NAME_MIN || n > NAME_MAX) return `Название — от ${NAME_MIN} до ${NAME_MAX} символов. Попробуй ещё раз (или /cancel):`
  if (name.startsWith('/')) return 'Название не может начинаться с «/». Попробуй ещё раз (или /cancel):'
  return null
}
function cleanText(s) {
  const t = String(s || '').trim()
  return t ? cpSlice(t, MAX_REVIEW_TEXT) : null
}

// "5 отличный монтажник", "5/5 супер", "4⭐ норм", "5" → { rating, text }.
// No leading 1..5 (or "10", "4.5") → null.
export function parseRating(rest) {
  const m = /^([1-5])(?![0-9])(?![.,][0-9])(?:\s*\/\s*5)?[\s⭐★*️]*(?:[,.:;!—–-]+\s*)?([\s\S]*)$/.exec(String(rest || '').trim())
  if (!m) return null
  return { rating: Number(m[1]), text: cleanText(m[2]) }
}

// Reads every row of a query in pages of 1000 (PostgREST's default cap).
// build() must return a fresh, ordered query each time.
async function pagedRows(build, max = 20000) {
  const out = []
  for (let start = 0; start < max; start += PAGE) {
    const { data, error } = await build().range(start, start + PAGE - 1)
    if (error) throw new Error(error.message)
    const rows = data || []
    for (const r of rows) out.push(r)
    if (rows.length < PAGE) break
  }
  return out
}

// ── People ──────────────────────────────────────────────────────────────────
// Never throws (tables may not exist yet).
export async function upsertPerson(u) {
  if (!u || !u.id || u.is_bot) return
  try {
    const { error } = await getDb().from('tg_people').upsert({
      telegram_user_id: u.id,
      username: u.username || null,
      first_name: u.first_name || null,
      last_name: u.last_name || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'telegram_user_id' })
    if (error) console.warn('[tower/teams] tg_people upsert:', error.message)
  } catch (e) {
    console.warn('[tower/teams] tg_people upsert:', e?.message || e)
  }
}

async function peopleByIds(ids) {
  const list = uniq(ids)
  const map = {}
  for (let i = 0; i < list.length; i += 150) {
    const { data, error } = await getDb().from('tg_people')
      .select('telegram_user_id, username, first_name, last_name')
      .in('telegram_user_id', list.slice(i, i + 150))
    if (error) throw new Error('tg_people read: ' + error.message)
    for (const p of data || []) map[String(p.telegram_user_id)] = p
  }
  return map
}

// Most recently seen holder of the username (usernames move between people).
async function personByUsername(u) {
  const pattern = String(u || '').replace(/[\\%_]/g, (c) => '\\' + c)
  const { data, error } = await getDb().from('tg_people')
    .select('telegram_user_id, username, first_name, last_name')
    .ilike('username', pattern)
    .order('updated_at', { ascending: false })
    .limit(1)
  if (error) throw new Error('tg_people read: ' + error.message)
  return (data && data[0]) || null
}

// ── Conversation state (tg_bot_state, 15 min) ───────────────────────────────
// null = no step. { expired: true, stale } = the step ran out (the row is
// already removed); stale = it ran out more than a day ago.
async function getState(uid) {
  try {
    const { data, error } = await getDb().from('tg_bot_state')
      .select('state, data, updated_at').eq('telegram_user_id', uid).maybeSingle()
    if (error || !data || !data.state) return null
    if (ageMs(data.updated_at) > STATE_TTL_MS) {
      // Removed only while still expired: a fresh step set in parallel stays.
      const gone = await clearState(uid, true)
      return gone ? { ...gone, expired: true } : null
    }
    return { state: data.state, data: data.data || {}, expired: false }
  } catch {
    return null
  }
}

async function setState(uid, state, data = {}) {
  const { error } = await getDb().from('tg_bot_state').upsert({
    telegram_user_id: uid,
    state,
    data,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'telegram_user_id' })
  if (error) throw new Error('tg_bot_state write: ' + error.message)
}

// Removes the step and returns it: { state, data, live, expired, stale } or
// null when there was none. Never throws.
async function clearState(uid, onlyExpired = false) {
  try {
    let q = getDb().from('tg_bot_state').delete().eq('telegram_user_id', uid)
    if (onlyExpired) q = q.lt('updated_at', new Date(Date.now() - STATE_TTL_MS).toISOString())
    const { data, error } = await q.select('state, data, updated_at')
    if (error || !data || !data.length || !data[0].state) return null
    const age = ageMs(data[0].updated_at)
    return {
      state: data[0].state,
      data: data[0].data || {},
      live: age <= STATE_TTL_MS,
      expired: age > STATE_TTL_MS,
      stale: age > STATE_TTL_MS + STATE_STALE_MS,
    }
  } catch {
    return null
  }
}

// ── Ratings ─────────────────────────────────────────────────────────────────
// { [telegramId]: { sum, count, avg } } — non-hidden reviews only.
function addRating(map, r) {
  const k = String(r.target_telegram_id)
  const o = map[k] || (map[k] = { sum: 0, count: 0, avg: 0 })
  o.sum += Number(r.rating) || 0
  o.count += 1
}
function finishRatings(map) {
  for (const k of Object.keys(map)) map[k].avg = map[k].count ? map[k].sum / map[k].count : 0
  return map
}

export async function ratingsFor(ids) {
  const list = uniq(ids)
  const map = {}
  for (let i = 0; i < list.length; i += 150) {
    const chunk = list.slice(i, i + 150)
    const rows = await pagedRows(() => getDb().from('tg_reviews')
      .select('id, target_telegram_id, rating')
      .in('target_telegram_id', chunk)
      .is('hidden_at', null)
      .order('id', { ascending: true }))
    rows.forEach((r) => addRating(map, r))
  }
  return finishRatings(map)
}

async function allRatings() {
  const map = {}
  const rows = await pagedRows(() => getDb().from('tg_reviews')
    .select('id, target_telegram_id, rating')
    .is('hidden_at', null)
    .order('id', { ascending: true }))
  rows.forEach((r) => addRating(map, r))
  return finishRatings(map)
}

// Team rating = average of members' ratings (members with ≥ 1 review).
function teamRating(memberIds, ratings) {
  const rated = (memberIds || []).map((id) => ratings[String(id)]).filter((r) => r && r.count)
  if (!rated.length) return null
  return { avg: rated.reduce((s, r) => s + r.avg, 0) / rated.length, rated: rated.length }
}

// ── Teams: rows ─────────────────────────────────────────────────────────────
// Leadership is decided ONLY by tg_team_members.role = 'leader'
// (tg_teams.leader_telegram_id is a copy kept in sync by tg_team_leave()).
async function membershipOf(uid) {
  const { data, error } = await getDb().from('tg_team_members')
    .select('team_id, role, joined_at').eq('telegram_user_id', uid).maybeSingle()
  if (error) throw new Error('tg_team_members read: ' + error.message)
  return data
}

async function teamById(id) {
  const { data, error } = await getDb().from('tg_teams')
    .select('id, chat_id, name, description, leader_telegram_id, created_at').eq('id', id).maybeSingle()
  if (error) throw new Error('tg_teams read: ' + error.message)
  return data
}

async function teamByName(chatId, name) {
  const { data, error } = await getDb().from('tg_teams')
    .select('id, chat_id, name, description, leader_telegram_id, created_at')
    .eq('chat_id', chatId).eq('name_key', nameKey(name)).maybeSingle()
  if (error) throw new Error('tg_teams read: ' + error.message)
  return data
}

async function teamMembers(teamId) {
  const { data, error } = await getDb().from('tg_team_members')
    .select('telegram_user_id, role, joined_at')
    .eq('team_id', teamId)
    .order('joined_at', { ascending: true })
    .limit(1000)
  if (error) throw new Error('tg_team_members read: ' + error.message)
  return data || []
}

async function teamLeaderId(teamId) {
  const { data, error } = await getDb().from('tg_team_members')
    .select('telegram_user_id').eq('team_id', teamId).eq('role', 'leader').limit(1)
  if (error) throw new Error('tg_team_members read: ' + error.message)
  return data && data[0] ? Number(data[0].telegram_user_id) : null
}

// Only group members (creator / administrator / member / restricted with is_member).
async function requireMember(uid) {
  const chatId = await resolveChatId()
  const m = await memberStatus(chatId, uid)
  if (!m.ok) return { ok: false, chatId, text: CHECK_FAILED }
  if (!m.isMember) return { ok: false, chatId, text: ONLY_MEMBERS }
  return { ok: true, chatId }
}

// ── Join requests (tg_team_requests) ────────────────────────────────────────
// status: pending → accepted | declined | cancelled; kicked = removed by the leader.
async function requestsOf(uid) {
  const { data, error } = await getDb().from('tg_team_requests')
    .select('team_id, status, requested_at, updated_at').eq('telegram_user_id', uid)
  if (error) throw new Error('tg_team_requests read: ' + error.message)
  return data || []
}

// true = a row changed. fromStatus: only if the request is still in that status.
async function setRequest(teamId, uid, status, fromStatus = null) {
  let q = getDb().from('tg_team_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('team_id', teamId).eq('telegram_user_id', uid)
  if (fromStatus) q = q.eq('status', fromStatus)
  const { data, error } = await q.select('team_id')
  if (error) throw new Error('tg_team_requests update: ' + error.message)
  return !!(data && data.length)
}

async function pendingRequests(teamId) {
  const since = new Date(Date.now() - REQUEST_TTL_MS).toISOString()
  const { data, error } = await getDb().from('tg_team_requests')
    .select('telegram_user_id, requested_at')
    .eq('team_id', teamId).eq('status', 'pending').gte('requested_at', since)
    .order('requested_at', { ascending: true })
    .limit(20)
  if (error) throw new Error('tg_team_requests read: ' + error.message)
  return data || []
}

// ── Profile card ────────────────────────────────────────────────────────────
async function profileData(uid) {
  const db = getDb()
  const [pRes, mine, ratings] = await Promise.all([
    db.from('tg_people').select('telegram_user_id, username, first_name, last_name').eq('telegram_user_id', uid).maybeSingle(),
    membershipOf(uid),
    ratingsFor([uid]),
  ])
  const team = mine ? await teamById(mine.team_id) : null
  return { person: pRes?.data || null, mine, team, rating: ratings[String(uid)] || null }
}

function profileText(uid, d, user = null) {
  const p = user || d.person || { telegram_user_id: uid }
  const leader = !!d.team && d.mine?.role === 'leader'
  return [
    `👤 ${fullNameHtml(p, uid)}`,
    leader ? '👑 Лидер' : '👷 Участник',
    `🗼 Команда: ${d.team ? `<b>${esc(d.team.name)}</b>` : 'нет'}`,
    `⭐ Рейтинг: ${fmtRating(d.rating)}`,
    // Same count as «Мои отзывы» and the rating: every visible review.
    `📝 Отзывов: ${d.rating?.count || 0}`,
  ].join('\n')
}

const PROFILE_BUTTONS = [[
  { text: 'Мои отзывы', callback_data: 'me:reviews' },
  { text: 'Моя команда', callback_data: 'me:team' },
]]

async function sendOwnProfile(from) {
  const d = await profileData(from.id)
  await dm(from.id, profileText(from.id, d, from), PROFILE_BUTTONS)
}

// /start for a group member: the card right after the subscription message.
// Never throws.
export async function profileAfterStart(from) {
  try {
    await sendOwnProfile(from)
  } catch (e) {
    console.warn('[tower/teams] profile after /start failed:', e?.message || e)
  }
}

// ── Team card ───────────────────────────────────────────────────────────────
// leaderView: a copyable «/crew kick ID» after each member (works for people
// without a @username and for namesakes).
async function teamText(team, { leaderView = false } = {}) {
  const members = await teamMembers(team.id)
  const ids = members.map((m) => m.telegram_user_id)
  const [people, ratings] = await Promise.all([peopleByIds(ids), ratingsFor(ids)])
  const lead = members.find((m) => m.role === 'leader')
  const leaderId = lead ? lead.telegram_user_id : team.leader_telegram_id
  const tr = teamRating(ids, ratings)
  const sorted = members.slice().sort((a, b) =>
    (a.role === 'leader' ? 0 : 1) - (b.role === 'leader' ? 0 : 1))
  const lines = [`🗼 Команда <b>${esc(team.name)}</b>`]
  if (team.description) lines.push(`📝 ${esc(team.description)}`)
  lines.push(`👑 Лидер: ${fullNameHtml(people[String(leaderId)], leaderId)}`)
  lines.push(`⭐ Рейтинг команды: ${tr ? `${fmtAvg(tr.avg)} (оценены ${tr.rated} из ${ids.length})` : 'нет оценок'}`)
  lines.push('', `👷 Участники (${ids.length}):`)
  for (const m of sorted) {
    const id = m.telegram_user_id
    const kick = leaderView && m.role !== 'leader' ? ` · <code>/crew kick ${Number(id)}</code>` : ''
    lines.push(`${m.role === 'leader' ? '👑' : '👷'} ${fullNameHtml(people[String(id)], id)} — ⭐ ${fmtRating(ratings[String(id)])}${kick}`)
  }
  return lines
}

async function sendMyTeam(from) {
  const mine = await membershipOf(from.id)
  const team = mine ? await teamById(mine.team_id) : null
  if (!team) {
    let pending = ''
    try {
      const p = (await requestsOf(from.id)).find((r) => r.status === 'pending' && ageMs(r.requested_at) < REQUEST_TTL_MS)
      const pt = p ? await teamById(p.team_id) : null
      if (pt) pending = `\n\n⏳ Заявка в команду <b>${esc(pt.name)}</b> ждёт ответа лидера.`
    } catch {}
    await dm(from.id,
      'Ты пока не в команде.' + pending + '\n\n' +
      'Создать свою: <code>/crew create</code>\n' +
      'Вступить: <code>/crew join НАЗВАНИЕ</code>')
    return
  }
  const leaderView = mine.role === 'leader'
  const lines = await teamText(team, { leaderView })
  if (leaderView) {
    const reqs = await pendingRequests(team.id)
    if (reqs.length) {
      const ppl = await peopleByIds(reqs.map((r) => r.telegram_user_id))
      lines.push('', `🙋 Заявки (${reqs.length}):`)
      for (const r of reqs) {
        const id = Number(r.telegram_user_id)
        lines.push(`• ${fullNameHtml(ppl[String(id)], id)} — <code>/crew accept ${id}</code> · <code>/crew decline ${id}</code>`)
      }
    }
  }
  const footer = [
    '',
    'Пригласить: дай человеку написать боту',
    `<code>/crew join ${esc(team.name)}</code>`,
  ]
  if (leaderView) footer.push('Исключить: <code>/crew kick @username</code> (или id из списка)')
  footer.push('Выйти: <code>/crew leave</code>')
  await dm(from.id, fit(lines, 3500) + '\n' + footer.join('\n'))
}

// ── /crew ───────────────────────────────────────────────────────────────────
async function crewCommand(from, rest) {
  const m = /^(\S+)\s*([\s\S]*)$/.exec(rest || '')
  const sub = m ? m[1].toLowerCase() : ''
  const arg = m ? cleanName(m[2]) : ''
  if (sub === 'create' || sub === 'new' || sub === 'создать') return crewCreate(from, arg)
  if (sub === 'join' || sub === 'вступить') return crewJoin(from, arg)
  if (sub === 'leave' || sub === 'выйти') return crewLeave(from)
  if (sub === 'kick' || sub === 'исключить') return crewKick(from, arg)
  if (sub === 'accept' || sub === 'принять') return crewDecide(from, arg, true)
  if (sub === 'decline' || sub === 'отклонить') return crewDecide(from, arg, false)
  await dm(from.id, CREW_HELP)
}

async function crewCreate(from, inlineName) {
  const gate = await requireMember(from.id)
  if (!gate.ok) return dm(from.id, gate.text)
  const mine = await membershipOf(from.id)
  if (mine) {
    const t = await teamById(mine.team_id)
    return dm(from.id,
      `Ты уже в команде <b>${esc(t?.name || '—')}</b>.\n` +
      'Чтобы создать новую, сначала выйди: <code>/crew leave</code>')
  }
  if (inlineName) return crewNameStep(from, inlineName, gate.chatId)
  await setState(from.id, 'crew_name', {})
  await dm(from.id, 'Название команды? (или /cancel)')
}

async function crewNameStep(from, raw, chatId = null) {
  const name = cleanName(raw)
  const problem = nameProblem(name)
  if (problem) {
    await setState(from.id, 'crew_name', {})
    return dm(from.id, problem)
  }
  const cid = chatId || await resolveChatId()
  if (await teamByName(cid, name)) {
    await setState(from.id, 'crew_name', {})
    return dm(from.id, `Команда <b>${esc(name)}</b> уже есть. Придумай другое название (или /cancel):`)
  }
  await setState(from.id, 'crew_desc', { name })
  await dm(from.id, '📝 Добавь описание команды (или напиши — чтобы пропустить):')
}

async function crewDescStep(from, raw, st) {
  const name = cleanName(st.data?.name)
  if (nameProblem(name)) {
    await clearState(from.id)
    return dm(from.id, 'Что-то пошло не так — начни заново: <code>/crew create</code>')
  }
  const t = String(raw || '').trim()
  const description = !t || SKIP_RE.test(t) ? null : t
  if (description && cpLen(description) > MAX_DESC) {
    await setState(from.id, 'crew_desc', { name })
    return dm(from.id, `Описание слишком длинное (максимум ${MAX_DESC} символов). Напиши покороче (или — чтобы пропустить):`)
  }
  const chatId = await resolveChatId()
  if (await membershipOf(from.id)) {
    await clearState(from.id)
    return dm(from.id, 'Ты уже в команде. Посмотреть: /myteam')
  }
  const db = getDb()
  const { data: team, error } = await db.from('tg_teams').insert({
    chat_id: chatId,
    name,
    name_key: nameKey(name),
    description,
    leader_telegram_id: from.id,
  }).select('id, name').single()
  if (error) {
    if (error.code === '23505') {
      await setState(from.id, 'crew_name', {})
      return dm(from.id, `Команда <b>${esc(name)}</b> уже есть. Придумай другое название (или /cancel):`)
    }
    throw new Error('tg_teams insert: ' + error.message)
  }
  const { error: mErr } = await db.from('tg_team_members').insert({
    team_id: team.id,
    telegram_user_id: from.id,
    role: 'leader',
  })
  if (mErr) {
    await db.from('tg_teams').delete().eq('id', team.id)
    await clearState(from.id)
    if (mErr.code === '23505') return dm(from.id, 'Ты уже в другой команде. Сначала выйди: <code>/crew leave</code>')
    throw new Error('tg_team_members insert: ' + mErr.message)
  }
  await clearState(from.id)
  await dm(from.id,
    `✅ Команда <b>${esc(team.name)}</b> создана!\n\n` +
    'Чтобы добавить участника, дай ему написать боту:\n' +
    `<code>/crew join ${esc(team.name)}</code>\n\n` +
    'Заявка придёт сюда — останется нажать «Принять».')
}

// A request, not an instant join: the leader decides. Kick / decline → no new
// request to that team for 7 days; one request to a team per day; one pending
// request per person at a time.
async function crewJoin(from, arg) {
  const name = cleanName(arg)
  if (!name) return dm(from.id, 'Напиши название команды:\n<code>/crew join НАЗВАНИЕ</code>')
  const gate = await requireMember(from.id)
  if (!gate.ok) return dm(from.id, gate.text)
  const [team, mine] = await Promise.all([teamByName(gate.chatId, name), membershipOf(from.id)])
  if (mine) {
    if (team && mine.team_id === team.id) return dm(from.id, `Ты уже в команде <b>${esc(team.name)}</b> ✅`)
    const cur = await teamById(mine.team_id)
    return dm(from.id,
      `Ты уже в команде <b>${esc(cur?.name || '—')}</b>.\n` +
      'Чтобы перейти в другую, сначала выйди: <code>/crew leave</code>')
  }
  if (!team) return dm(from.id, `Команда <b>${esc(name)}</b> не найдена. Проверь название — его можно узнать у лидера.`)
  const tName = esc(team.name)

  const reqs = await requestsOf(from.id)
  const here = reqs.find((r) => r.team_id === team.id)
  if (here) {
    if (here.status === 'pending' && ageMs(here.requested_at) < REQUEST_TTL_MS) {
      return dm(from.id, `⏳ Заявка в команду <b>${tName}</b> уже у лидера — жди ответа.`)
    }
    if ((here.status === 'kicked' || here.status === 'declined') && ageMs(here.updated_at) < REJOIN_AFTER_MS) {
      const until = fmtDate(new Date(Date.parse(here.updated_at) + REJOIN_AFTER_MS).toISOString())
      return dm(from.id, here.status === 'kicked'
        ? `Лидер исключил тебя из команды <b>${tName}</b> — новую заявку можно подать с ${until}.`
        : `Лидер отклонил твою заявку в команду <b>${tName}</b> — новую можно подать с ${until}.`)
    }
    if (ageMs(here.requested_at) < REREQUEST_MS) {
      return dm(from.id, `Заявку в команду <b>${tName}</b> можно отправлять не чаще раза в сутки.`)
    }
  }
  const other = reqs.find((r) => r.team_id !== team.id && r.status === 'pending' && ageMs(r.requested_at) < REQUEST_TTL_MS)
  if (other) {
    const ot = await teamById(other.team_id)
    if (ot) {
      return dm(from.id,
        `У тебя уже есть заявка в команду <b>${esc(ot.name)}</b> — дождись ответа лидера ` +
        'или отмени её: <code>/crew leave</code>')
    }
  }
  const leaderId = await teamLeaderId(team.id)
  if (!leaderId) return dm(from.id, `У команды <b>${tName}</b> сейчас нет лидера — вступить нельзя.`)

  const db = getDb()
  const now = new Date().toISOString()
  const { error } = await db.from('tg_team_requests').upsert({
    team_id: team.id,
    telegram_user_id: from.id,
    status: 'pending',
    requested_at: now,
    updated_at: now,
  }, { onConflict: 'team_id,telegram_user_id' })
  if (error) throw new Error('tg_team_requests upsert: ' + error.message)

  const r = (await ratingsFor([from.id]))[String(from.id)]
  const sent = await dm(leaderId,
    `🙋 ${fullNameHtml(from)} хочет вступить в команду <b>${tName}</b>.\n` +
    `⭐ Рейтинг: ${fmtRating(r)}\n\n` +
    `Принять: <code>/crew accept ${Number(from.id)}</code>\n` +
    `Отклонить: <code>/crew decline ${Number(from.id)}</code>`,
    [[
      { text: '✅ Принять', callback_data: `tj:${team.id}:${Number(from.id)}:y` },
      { text: '❌ Отклонить', callback_data: `tj:${team.id}:${Number(from.id)}:n` },
    ]])
  if (!sent.ok) {
    await db.from('tg_team_requests').delete()
      .eq('team_id', team.id).eq('telegram_user_id', from.id).eq('status', 'pending')
    return dm(from.id,
      `Не удалось отправить заявку лидеру команды <b>${tName}</b> — похоже, он не запускал бота или заблокировал его. ` +
      'Попроси лидера написать боту /start.')
  }
  await dm(from.id, `📨 Заявка в команду <b>${tName}</b> отправлена лидеру. Как только он ответит — я напишу.`)
}

// Accept / decline a join request. Only the team's current leader (by role).
// → { text, answer, keep } (keep = leave the buttons, e.g. Telegram didn't answer).
async function decideJoin(leader, teamId, uid, accept) {
  const db = getDb()
  const [team, lead] = await Promise.all([
    teamById(teamId),
    db.from('tg_team_members').select('role').eq('team_id', teamId).eq('telegram_user_id', leader.id).maybeSingle(),
  ])
  if (lead.error) throw new Error('tg_team_members read: ' + lead.error.message)
  if (!team) return { text: 'Команда не найдена — заявка неактуальна.', answer: 'Неактуально' }
  const tName = esc(team.name)
  if (lead.data?.role !== 'leader') {
    return { text: `Заявки в команду <b>${tName}</b> принимает только её лидер.`, answer: 'Только лидер' }
  }
  const { data: req, error } = await db.from('tg_team_requests')
    .select('status, requested_at').eq('team_id', teamId).eq('telegram_user_id', uid).maybeSingle()
  if (error) throw new Error('tg_team_requests read: ' + error.message)
  const who = fullNameHtml((await peopleByIds([uid]))[String(uid)], uid)
  const stale = { text: `Заявка ${who} в команду <b>${tName}</b> уже неактуальна.`, answer: 'Уже неактуально' }
  if (!req || req.status !== 'pending') return stale
  if (ageMs(req.requested_at) > REQUEST_TTL_MS) {
    await setRequest(teamId, uid, 'cancelled', 'pending')
    return {
      text: `Заявка ${who} устарела (больше 2 суток). Пусть отправит новую: <code>/crew join ${tName}</code>`,
      answer: 'Заявка устарела',
    }
  }

  if (!accept) {
    if (!(await setRequest(teamId, uid, 'declined', 'pending'))) return stale
    await dm(uid, `Лидер отклонил твою заявку в команду <b>${tName}</b>.`)
    return { text: `❌ Заявка ${who} в команду <b>${tName}</b> отклонена.`, answer: 'Отклонено' }
  }

  const ms = await memberStatus(await resolveChatId(), uid)
  if (!ms.ok) return { text: CHECK_FAILED, answer: 'Не получилось — попробуй позже', keep: true }
  if (!ms.isMember) {
    await setRequest(teamId, uid, 'cancelled', 'pending')
    return { text: `${who} уже не в группе «${GROUP_NAME}» — заявка отменена.`, answer: 'Заявка отменена' }
  }
  // Claim the request first: a double tap adds the person only once.
  if (!(await setRequest(teamId, uid, 'accepted', 'pending'))) return stale
  const { error: iErr } = await db.from('tg_team_members').insert({
    team_id: teamId,
    telegram_user_id: uid,
    role: 'member',
  })
  if (iErr) {
    if (iErr.code === '23505') {
      const cur = await membershipOf(uid)
      if (cur && cur.team_id === teamId) return { text: `✅ ${who} уже в команде <b>${tName}</b>.`, answer: 'Уже в команде' }
      await setRequest(teamId, uid, 'cancelled')
      return { text: `${who} уже в другой команде — заявка отменена.`, answer: 'Уже в другой команде' }
    }
    if (iErr.code === '23503') return { text: 'Команда не найдена — заявка неактуальна.', answer: 'Неактуально' }
    await setRequest(teamId, uid, 'pending')
    throw new Error('tg_team_members insert: ' + iErr.message)
  }
  await dm(uid, `✅ Лидер принял тебя в команду <b>${tName}</b>!\n\nКоманда: /myteam\nПрофиль: /profile`)
  return { text: `✅ ${who} теперь в команде <b>${tName}</b>.\n\nКоманда: /myteam`, answer: 'Принято ✅' }
}

// /crew accept ID · /crew decline ID (also works when the buttons don't).
async function crewDecide(from, arg, accept) {
  const mine = await membershipOf(from.id)
  if (!mine) return dm(from.id, 'Ты не в команде.')
  if (mine.role !== 'leader') return dm(from.id, 'Отвечать на заявки может только лидер команды.')
  const id = String(arg || '').trim()
  if (!/^\d{4,15}$/.test(id)) {
    return dm(from.id, `Напиши id из заявки: <code>/crew ${accept ? 'accept' : 'decline'} ID</code>\n\nЗаявки: /myteam`)
  }
  const r = await decideJoin(from, mine.team_id, Number(id), accept)
  await dm(from.id, r.text)
}

// One SQL function (tg_team_leave) does the leave and the handover under a lock
// on the team: the earliest-joined member becomes leader; nobody left → the
// team is deleted. Not in a team → cancels a pending join request.
async function crewLeave(from) {
  const db = getDb()
  const mine = await membershipOf(from.id)
  if (!mine) {
    try {
      const { data: pend } = await db.from('tg_team_requests')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('telegram_user_id', from.id).eq('status', 'pending')
        .select('team_id')
      if (pend && pend.length) {
        const t = await teamById(pend[0].team_id)
        return dm(from.id, `Заявка в команду <b>${esc(t?.name || '—')}</b> отменена.`)
      }
    } catch {}
    return dm(from.id, 'Ты не в команде.')
  }
  const { data: res, error } = await db.rpc('tg_team_leave', { p_uid: from.id })
  if (error) throw new Error('tg_team_leave: ' + error.message)
  if (!res || !res.left) return dm(from.id, 'Ты не в команде.')
  const tName = esc(res.team_name || '—')
  if (res.deleted) {
    return dm(from.id, `Ты вышел из команды <b>${tName}</b>. В ней никого не осталось — команда удалена.`)
  }
  if (res.new_leader) {
    const heirId = Number(res.new_leader)
    const people = await peopleByIds([heirId])
    await dm(from.id, `Ты вышел из команды <b>${tName}</b>. Новый лидер — ${fullNameHtml(people[String(heirId)], heirId)}.`)
    await dm(heirId, `👑 ${fullNameHtml(from)} вышел(а) из команды <b>${tName}</b> — теперь ты лидер.\n\nКоманда: /myteam`)
    return
  }
  await dm(from.id, `Ты вышел из команды <b>${tName}</b>.`)
  if (res.leader && Number(res.leader) !== Number(from.id)) {
    await dm(Number(res.leader), `👷 ${fullNameHtml(from)} вышел(а) из команды <b>${tName}</b>.`)
  }
}

// @username → team members who hold it NOW in Telegram (tg_people may be
// stale: usernames move between people). Stored matches are checked first;
// none confirmed → the other members are checked live (up to 50).
// → { ok, found } (ok:false = Telegram couldn't answer and nobody matched).
async function membersByUsername(members, u, pOf) {
  const chatId = await resolveChatId()
  const check = async (m) => {
    const s = await memberStatus(chatId, m.telegram_user_id)
    if (!s.ok) return { m, ok: false, match: false }
    const user = s.member?.user || null
    if (user) await upsertPerson(user)
    return { m, ok: true, match: !!user && String(user.username || '').toLowerCase() === u }
  }
  const stored = members.filter((m) => String(pOf(m)?.username || '').toLowerCase() === u)
  const first = await Promise.all(stored.map(check))
  let found = first.filter((x) => x.match).map((x) => x.m)
  let failed = first.some((x) => !x.ok)
  if (!found.length) {
    const rest = members.filter((m) => !stored.includes(m)).slice(0, 50)
    for (let i = 0; i < rest.length && !found.length; i += 10) {
      const part = await Promise.all(rest.slice(i, i + 10).map(check))
      found = found.concat(part.filter((x) => x.match).map((x) => x.m))
      failed = failed || part.some((x) => !x.ok)
    }
  }
  return { ok: found.length > 0 || !failed, found }
}

// Leader removes a member from the TEAM only — never from the Telegram group.
async function crewKick(from, arg) {
  const mine = await membershipOf(from.id)
  if (!mine) return dm(from.id, 'Ты не в команде.')
  if (mine.role !== 'leader') return dm(from.id, 'Исключать участников может только лидер команды.')
  const team = await teamById(mine.team_id)
  if (!team) return dm(from.id, 'Команда не найдена.')
  const q = cleanName(arg)
  if (!q) {
    return dm(from.id, 'Кого исключить? Напиши:\n<code>/crew kick @username</code>\n\nСписок участников (с id): /myteam')
  }
  const tName = esc(team.name)
  const members = await teamMembers(team.id)
  const people = await peopleByIds(members.map((m) => m.telegram_user_id))
  const pOf = (m) => people[String(m.telegram_user_id)]
  let found
  if (q.startsWith('@')) {
    const u = q.slice(1).toLowerCase()
    const r = await membersByUsername(members, u, pOf)
    if (!r.ok) return dm(from.id, `Не удалось проверить @${esc(u)} в Telegram — укажи id из /myteam:\n<code>/crew kick ID</code>`)
    found = r.found
  } else if (/^\d{4,15}$/.test(q)) {
    found = members.filter((m) => String(m.telegram_user_id) === q)
  } else {
    const n = q.toLowerCase()
    found = members.filter((m) => {
      const p = pOf(m)
      return [plainName(p), p?.first_name].filter(Boolean).some((x) => String(x).toLowerCase() === n)
    })
  }
  if (!found.length) return dm(from.id, `Не нашёл «${esc(q)}» в команде <b>${tName}</b>.\nСписок участников (с id): /myteam`)
  if (found.length > 1) {
    const list = found.slice(0, 20).map((m) =>
      `• ${fullNameHtml(pOf(m), m.telegram_user_id)} — <code>/crew kick ${Number(m.telegram_user_id)}</code>`)
    return dm(from.id, `Нашлось несколько участников «${esc(q)}» — выбери:\n${list.join('\n')}`)
  }
  const victim = found[0]
  const vid = Number(victim.telegram_user_id)
  if (vid === Number(from.id)) return dm(from.id, 'Себя исключить нельзя. Чтобы выйти: <code>/crew leave</code>')
  const db = getDb()
  const { data: gone, error } = await db.from('tg_team_members')
    .delete().eq('team_id', team.id).eq('telegram_user_id', vid).eq('role', 'member').select('telegram_user_id')
  if (error) throw new Error('tg_team_members delete: ' + error.message)
  if (!gone || !gone.length) return dm(from.id, `Не нашёл «${esc(q)}» в команде <b>${tName}</b>.`)
  // The kick sticks: no new request to this team for 7 days.
  const now = new Date().toISOString()
  const { error: kErr } = await db.from('tg_team_requests').upsert({
    team_id: team.id,
    telegram_user_id: vid,
    status: 'kicked',
    updated_at: now,
  }, { onConflict: 'team_id,telegram_user_id' })
  if (kErr) console.warn('[tower/teams] kick record failed:', kErr.message)
  await dm(from.id, `✅ ${fullNameHtml(pOf(victim), vid)} исключён(а) из команды <b>${tName}</b>.`)
  await dm(vid, `Лидер исключил тебя из команды <b>${tName}</b>. Подать новую заявку в эту команду можно через 7 дней.`)
}

// ── Reviews: rules + storage ────────────────────────────────────────────────
// Both must be group members; no self-reviews; bots can't be reviewed.
async function checkPair(chatId, authorId, targetId) {
  if (Number(authorId) === Number(targetId)) return { ok: false, text: SELF_REVIEW }
  const [ma, mt] = await Promise.all([memberStatus(chatId, authorId), memberStatus(chatId, targetId)])
  if (!ma.ok || !mt.ok) return { ok: false, text: CHECK_FAILED }
  if (!ma.isMember) return { ok: false, text: `Отзывы могут оставлять только участники группы «${GROUP_NAME}».` }
  const tu = mt.member?.user || null
  if (tu?.is_bot) return { ok: false, text: BOT_REVIEW }
  if (!mt.isMember) {
    return { ok: false, text: `${fullNameHtml(tu || { id: targetId }, targetId)} не состоит в группе «${GROUP_NAME}» — отзыв оставить нельзя.` }
  }
  if (tu) await upsertPerson(tu)
  return { ok: true, targetUser: tu }
}

async function existingReview(authorId, targetId) {
  const { data, error } = await getDb().from('tg_reviews')
    .select(REVIEW_COLS)
    .eq('author_telegram_id', authorId).eq('target_telegram_id', targetId).maybeSingle()
  if (error) throw new Error('tg_reviews read: ' + error.message)
  return data
}

async function overDailyLimit(authorId) {
  const since = new Date(Date.now() - 24 * HOUR).toISOString()
  const { count, error } = await getDb().from('tg_reviews')
    .select('id', { count: 'exact', head: true })
    .eq('author_telegram_id', authorId).gte('created_at', since)
  if (error) throw new Error('tg_reviews count: ' + error.message)
  return (count || 0) >= MAX_REVIEWS_PER_DAY
}

// Reviews this author created or changed in the last 24 h.
async function overDailyEdits(authorId) {
  const since = new Date(Date.now() - 24 * HOUR).toISOString()
  const { count, error } = await getDb().from('tg_reviews')
    .select('id', { count: 'exact', head: true })
    .eq('author_telegram_id', authorId).gte('updated_at', since)
  if (error) throw new Error('tg_reviews count: ' + error.message)
  return (count || 0) >= MAX_EDITS_PER_DAY
}

// Why an existing review can't be changed right now (null = it can).
async function editBlock(prev, authorId) {
  const age = ageMs(prev?.updated_at)
  if (age < EDIT_EVERY_MS) {
    const mins = Math.max(1, Math.ceil((EDIT_EVERY_MS - age) / 60000))
    return `Отзыв этому человеку можно менять не чаще раза в 10 минут — попробуй через ${mins} мин.`
  }
  if (await overDailyEdits(authorId)) return EDIT_LIMIT_TEXT
  return null
}

// One review per author → target: an edit replaces rating (+ text unless keepText).
// New reviews: max 10 per day (checked here AND by a DB trigger, so parallel
// requests can't get past it). Edits: one per 10 min per review, max 20 changed
// reviews per day. Hidden stays hidden after an edit.
// → { ok, created, prev, row, hidden } | { ok:false, text }
async function storeReview({ chatId, authorId, targetId, rating, text = null, keepText = false }) {
  const db = getDb()
  const now = new Date().toISOString()
  const fields: any = { rating, updated_at: now }
  if (!keepText) fields.text = text || null
  const update = async (prev) => {
    const { data, error } = await db.from('tg_reviews').update(fields)
      .eq('author_telegram_id', authorId).eq('target_telegram_id', targetId)
      .select(REVIEW_COLS)
    if (error) throw new Error('tg_reviews update: ' + error.message)
    const row = (data && data[0]) || prev
    return { ok: true, created: false, prev, row, hidden: !!(row?.hidden_at || prev?.hidden_at) }
  }
  const prev = await existingReview(authorId, targetId)
  if (prev) {
    const block = await editBlock(prev, authorId)
    if (block) return { ok: false, text: block }
    return update(prev)
  }
  if (await overDailyLimit(authorId)) return { ok: false, text: LIMIT_TEXT }
  const { data: row, error } = await db.from('tg_reviews').insert({
    chat_id: chatId,
    target_telegram_id: targetId,
    author_telegram_id: authorId,
    rating,
    text: keepText ? null : (text || null),
    created_at: now,
    updated_at: now,
  }).select(REVIEW_COLS).single()
  if (error) {
    if (error.code === '23505') {
      // Saved by a parallel request a moment ago → update that row (re-read, so
      // callers see hidden_at).
      return update(await existingReview(authorId, targetId))
    }
    if (error.code === '23514') return { ok: false, text: SELF_REVIEW }
    if (error.code === 'P0001' && /tg_reviews_daily_limit/.test(error.message || '')) return { ok: false, text: LIMIT_TEXT }
    throw new Error('tg_reviews insert: ' + error.message)
  }
  return { ok: true, created: true, prev: null, row, hidden: false }
}

async function confirmPrivate(from, targetId, tu, rating, text) {
  const r = (await ratingsFor([targetId]))[String(targetId)]
  await dm(from.id,
    `✅ Отзыв о ${fullNameHtml(tu, targetId)} сохранён: ${stars(rating)}` +
    (text ? `\n«${esc(cpSlice(text, 300))}»` : '') +
    `\n\n⭐ Рейтинг: ${fmtRating(r)}`)
}

async function notifyTarget(targetId, author, rating, text, created) {
  return dm(targetId,
    `${created ? '⭐ Новый отзыв о тебе' : '✏️ Отзыв о тебе обновлён'} — от ${fullNameHtml(author)}: ${stars(rating)}` +
    (text ? `\n«${esc(cpSlice(text, 300))}»` : '') +
    '\n\nВсе отзывы: /reviews')
}

// The reviewed person hears about a NEW review, and about a changed rating at
// most once a day per review. Text-only edits and hidden reviews: no DM.
async function notifyReview(row, targetId, author, { created = false, ratingChanged = false } = {}) {
  if (!row || row.hidden_at) return
  if (!created && !(ratingChanged && ageMs(row.notified_at) >= NOTIFY_EVERY_MS)) return
  const r = await notifyTarget(targetId, author, row.rating, row.text, created)
  if (r?.ok && row.id) {
    const { error } = await getDb().from('tg_reviews')
      .update({ notified_at: new Date().toISOString() }).eq('id', row.id)
    if (error) console.warn('[tower/teams] notified_at:', error.message)
  }
}

// A review_text step ended without the text (another command, a button, or the
// 15 minutes ran out). The rating is already saved — tell the person now.
// Never throws.
async function finishPendingReview(from, st) {
  try {
    if (!st || st.state !== 'review_text') return
    const d = st.data || {}
    if (!d.n && !d.ch) return
    const targetId = Number(d.t)
    if (!targetId) return
    const row = await existingReview(from.id, targetId)
    if (row) await notifyReview(row, targetId, from, { created: !!d.n, ratingChanged: !!d.ch })
  } catch (e) {
    console.warn('[tower/teams] pending review notify failed:', e?.message || e)
  }
}

// A review_text step is ended by a button («Мои отзывы», «Моя команда»).
async function settlePendingText(from) {
  const st = await getState(from.id)
  if (!st || st.state !== 'review_text') return
  if (!st.expired && !(await clearState(from.id))) return
  await finishPendingReview(from, st)
}

// /review @username, /review <id>, deep link /start review_<id>.
// opts.username: the @username that was resolved (re-checked against Telegram).
// opts.inline: { rating, text } from "/review @username 5 текст" → saved at once.
async function beginReview(from, targetId, opts: any = {}) {
  if (!targetId) return dm(from.id, REVIEW_HOW)
  if (Number(targetId) === Number(from.id)) return dm(from.id, SELF_REVIEW)
  const chatId = await resolveChatId()
  const pair = await checkPair(chatId, from.id, targetId)
  if (!pair.ok) return dm(from.id, pair.text)
  const tu = pair.targetUser || { id: targetId }
  // tg_people may be stale (usernames move) — trust only Telegram's current one.
  if (opts.username && String(tu.username || '').toLowerCase() !== String(opts.username).toLowerCase()) {
    return dm(from.id, unknownUser(opts.username))
  }
  if (opts.inline) {
    const res = await storeReview({
      chatId, authorId: from.id, targetId, rating: opts.inline.rating, text: opts.inline.text,
    })
    if (!res.ok) return dm(from.id, res.text)
    await confirmPrivate(from, targetId, tu, opts.inline.rating, opts.inline.text)
    await notifyReview(res.row, targetId, from, {
      created: res.created,
      ratingChanged: !res.created && Number(res.prev?.rating) !== Number(opts.inline.rating),
    })
    return
  }
  const prev = await existingReview(from.id, targetId)
  if (prev) {
    const block = await editBlock(prev, from.id)
    if (block) return dm(from.id, block)
  } else if (await overDailyLimit(from.id)) {
    return dm(from.id, LIMIT_TEXT)
  }
  await setState(from.id, 'review_stars', { t: Number(targetId) })
  const row = [1, 2, 3, 4, 5].map((n) => ({ text: `⭐${n}`, callback_data: `rv:${Number(targetId)}:${n}` }))
  await dm(from.id,
    `Оценка для ${fullNameHtml(tu, targetId)} (нажми ⭐ или напиши цифру 1–5):` +
    (prev ? `\n\nТвоя прошлая оценка: ${stars(prev.rating)} — новая её заменит.` : ''),
    [row])
}

async function reviewCommand(from, rest) {
  const m = /^(\S+)\s*([\s\S]*)$/.exec(rest || '')
  if (!m) return dm(from.id, REVIEW_HOW)
  const who = m[1]
  const inline = parseRating(m[2])
  if (/^@[A-Za-z0-9_]{4,32}$/.test(who)) {
    const uname = who.slice(1)
    const p = await personByUsername(uname)
    if (!p) return dm(from.id, unknownUser(uname))
    return beginReview(from, Number(p.telegram_user_id), { username: uname, inline })
  }
  if (/^\d{4,15}$/.test(who)) return beginReview(from, Number(who), { inline })
  await dm(from.id, REVIEW_HOW)
}

// Step 2 (after the stars): the optional text. raw '' / «—» = no text.
async function reviewTextStep(from, raw, st) {
  const targetId = Number(st.data?.t)
  const rating = Number(st.data?.s)
  if (!targetId || !(rating >= 1 && rating <= 5)) {
    await clearState(from.id)
    return dm(from.id, 'Что-то пошло не так — начни заново: /review @username')
  }
  const t = String(raw || '').trim()
  const text = !t || SKIP_RE.test(t) ? null : cleanText(t)
  const { data, error } = await getDb().from('tg_reviews')
    .update({ text, updated_at: new Date().toISOString() })
    .eq('author_telegram_id', from.id).eq('target_telegram_id', targetId)
    .select(REVIEW_COLS)
  if (error) throw new Error('tg_reviews update: ' + error.message)
  await clearState(from.id)
  if (!data || !data.length) return dm(from.id, 'Отзыв не найден — начни заново: /review @username')
  const people = await peopleByIds([targetId])
  const tp = people[String(targetId)] || { telegram_user_id: targetId }
  await confirmPrivate(from, targetId, tp, data[0].rating || rating, text)
  await notifyReview(data[0], targetId, from, { created: !!st.data?.n, ratingChanged: !!st.data?.ch })
}

// buttons: new inline keyboard; omitted → the old buttons are removed.
async function editCallbackMessage(cq, text, buttons = null) {
  const msg = cq?.message
  if (!msg?.chat?.id || !msg.message_id) return false
  const params: any = {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
    text,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
  }
  if (buttons && buttons.length) params.reply_markup = { inline_keyboard: buttons }
  const r = await tg('editMessageText', params)
  return !!r.ok
}

// Saves the stars — from a ⭐ button (opts.cq) or a typed «5» / «5 текст».
// With text → done; without → the optional text step (with «Без текста ✅»).
async function applyStars(from, targetId, rating, opts: any = {}) {
  const cq = opts.cq || null
  const say = async (text, buttons = null) => {
    if (!(cq && (await editCallbackMessage(cq, text, buttons)))) await dm(from.id, text, buttons)
  }
  const chatId = await resolveChatId()
  const pair = await checkPair(chatId, from.id, targetId)
  if (!pair.ok) {
    await clearState(from.id)
    await say(pair.text)
    return ''
  }
  const tu = pair.targetUser || { id: targetId }
  const text = opts.text || null
  const res = await storeReview({ chatId, authorId: from.id, targetId, rating, text, keepText: !text })
  if (!res.ok) {
    await clearState(from.id)
    await say(res.text)
    return ''
  }
  const ratingChanged = !res.created && Number(res.prev?.rating) !== Number(rating)
  if (text) {
    await clearState(from.id)
    await confirmPrivate(from, targetId, tu, rating, text)
    await notifyReview(res.row, targetId, from, { created: res.created, ratingChanged })
    return 'Сохранено ✅'
  }
  await setState(from.id, 'review_text', {
    t: Number(targetId),
    s: rating,
    n: res.created ? 1 : 0,
    ch: res.created || ratingChanged ? 1 : 0,
  })
  await say(
    `Оценка для ${fullNameHtml(tu, targetId)}: ${stars(rating)} — сохранена ✅\n\n` +
    'Напиши пару слов (или — чтобы пропустить)',
    [[{ text: 'Без текста ✅', callback_data: `rvs:${Number(targetId)}` }]])
  return 'Сохранено ✅'
}

// rv:<targetId>:<stars> — only the person whose /review started it (the state
// is keyed by the presser's id).
async function onStarPress(from, cq, targetId, rating) {
  const st = await getState(from.id)
  if (st?.expired) await finishPendingReview(from, st)
  const live = st && !st.expired ? st : null
  // A second tap right after the first one: already saved, keep the message.
  if (live && live.state === 'review_text' && Number(live.data?.t) === Number(targetId)) {
    return 'Оценка уже сохранена — напиши пару слов'
  }
  if (!live || live.state !== 'review_stars' || Number(live.data?.t) !== Number(targetId)) {
    await editCallbackMessage(cq, 'Эта оценка уже неактуальна. Начни заново: /review @username')
    return 'Уже неактуально — начни заново'
  }
  return applyStars(from, targetId, rating, { cq })
}

// rvs:<targetId> — «Без текста ✅»: finish the review without text.
async function onSkipText(from, cq, targetId) {
  const st = await getState(from.id)
  if (st?.expired) await finishPendingReview(from, st)
  if (!st || st.expired || st.state !== 'review_text' || Number(st.data?.t) !== Number(targetId)) {
    await editCallbackMessage(cq, 'Оценка сохранена ✅')
    return 'Уже сохранено'
  }
  await editCallbackMessage(cq, 'Оценка сохранена ✅ — без текста')
  await reviewTextStep(from, '', st)
  return 'Сохранено ✅'
}

// tj:<teamId>:<uid>:y|n — the leader's answer to a join request.
async function onJoinDecision(from, cq, teamId, uid, accept) {
  const r = await decideJoin(from, teamId, uid, accept)
  if (r.keep || !(await editCallbackMessage(cq, r.text))) await dm(from.id, r.text)
  return r.answer || ''
}

// Reviews about someone (latest first). Others' reviews: group members only.
async function sendReviewsOf(viewer, targetId) {
  const self = Number(viewer.id) === Number(targetId)
  if (!self) {
    const gate = await requireMember(viewer.id)
    if (!gate.ok) return dm(viewer.id, gate.text)
  }
  const db = getDb()
  const [{ data: rows, error }, ratings, tPeople] = await Promise.all([
    db.from('tg_reviews')
      .select('author_telegram_id, rating, text, created_at, updated_at')
      .eq('target_telegram_id', targetId).is('hidden_at', null)
      .order('updated_at', { ascending: false }).limit(10),
    ratingsFor([targetId]),
    peopleByIds([targetId]),
  ])
  if (error) throw new Error('tg_reviews read: ' + error.message)
  const list = rows || []
  const authors = await peopleByIds(list.map((r) => r.author_telegram_id))
  const tp = (self ? viewer : tPeople[String(targetId)]) || { telegram_user_id: targetId }
  const r = ratings[String(targetId)]
  const lines = [
    self ? '📝 <b>Отзывы о тебе</b>' : `📝 <b>Отзывы о ${fullNameHtml(tp, targetId)}</b>`,
    `⭐ Рейтинг: ${fmtRating(r)}`,
  ]
  if (!list.length) {
    lines.push('', self ? 'О тебе пока нет отзывов.' : 'Отзывов пока нет.')
  } else {
    for (const rv of list) {
      const a = rv.author_telegram_id
      lines.push('', `${stars(rv.rating)} ${fullNameHtml(authors[String(a)], a)} · ${fmtDate(rv.updated_at || rv.created_at)}` +
        (rv.text ? `\n«${esc(cpSlice(rv.text, 200))}»` : ''))
    }
    if (r && r.count > list.length) lines.push('', `Показаны последние ${list.length} из ${r.count}.`)
  }
  const bot = await botUsername()
  const link = `https://t.me/${bot}?start=review_${Number(targetId)}`
  const tail = self
    ? ['', 'Попроси коллег оставить отзыв — дай им ссылку:', link]
    : []
  const buttons = self ? null : [[{ text: '⭐ Оставить отзыв', url: link }]]
  await dm(viewer.id, fit(lines, 3600) + (tail.length ? '\n' + tail.join('\n') : ''), buttons)
}

// ── Private chat entry ──────────────────────────────────────────────────────
const PRIVATE_COMMANDS = {
  '/profile': 'profile', '/профиль': 'profile',
  '/myteam': 'myteam', '/team': 'myteam', '/команда': 'myteam',
  '/crew': 'crew', '/бригада': 'crew',
  // «/crewcreate» typed together, or picked from an old menu
  '/crewcreate': 'crew_create', '/createcrew': 'crew_create',
  '/crewjoin': 'crew_join', '/joincrew': 'crew_join',
  '/review': 'review', '/отзыв': 'review',
  '/reviews': 'reviews', '/отзывы': 'reviews',
  '/help': 'help', '/помощь': 'help',
  '/cancel': 'cancel', '/отмена': 'cancel',
}

// What to say when a step ran out and the person answers anyway.
async function expiredText(st) {
  if (st.state === 'crew_name' || st.state === 'crew_desc') {
    return '⏱ Время вышло — команда не создана. Начни заново: <code>/crew create</code>'
  }
  if (st.state === 'review_text' || st.state === 'review_stars') {
    const t = Number(st.data?.t)
    let again = '/review @username'
    try {
      const p = t ? (await peopleByIds([t]))[String(t)] : null
      if (p?.username) again = '/review @' + p.username
    } catch {}
    return st.state === 'review_text'
      ? `⏱ Время вышло. Оценка сохранена, текст можно добавить: <code>${esc(again)}</code>`
      : `⏱ Время вышло — начни заново: <code>${esc(again)}</code>`
  }
  return '⏱ Время вышло — начни заново.'
}

// true = handled here. false = not ours (/start, /status, /manage, other text)
// → the subscription code in the webhook route goes on as before.
export async function handleTeamsPrivate(msg, cmd, words) {
  const from = msg.from
  const text = String(msg.text || '').trim()
  await upsertPerson(from)

  if (text.startsWith('/')) {
    // Any new command cancels a pending step (a saved rating is announced now).
    const prev = await clearState(from.id)
    if (prev) await finishPendingReview(from, prev)
    const cancelled = !!prev?.live
    const rest = text.slice((words?.[0] || '').length).trim()
    const kind = PRIVATE_COMMANDS[cmd]
    if (kind === 'profile') { await sendOwnProfile(from); return true }
    if (kind === 'myteam') { await sendMyTeam(from); return true }
    if (kind === 'crew') { await crewCommand(from, rest); return true }
    if (kind === 'crew_create') { await crewCommand(from, ('create ' + rest).trim()); return true }
    if (kind === 'crew_join') { await crewCommand(from, ('join ' + rest).trim()); return true }
    if (kind === 'review') { await reviewCommand(from, rest); return true }
    if (kind === 'reviews') { await sendReviewsOf(from, from.id); return true }
    if (kind === 'help') { await dm(from.id, HELP_TEXT); return true }
    if (kind === 'cancel') { await dm(from.id, cancelled ? 'Отменено ✅' : 'Нечего отменять 🙂'); return true }
    if (cmd === '/start') {
      const p = String(words?.[1] || '')
      // From the group: «эта команда работает в личке» → t.me/<bot>?start=help
      if (p === 'help') { await dm(from.id, HELP_TEXT); return true }
      // Buttons under the group's «this works in the DM» replies
      if (p === 'crew_create') { await crewCommand(from, 'create'); return true }
      if (p === 'crew') { await crewCommand(from, ''); return true }
      if (p === 'myteam') { await sendMyTeam(from); return true }
      if (p === 'myreviews') { await sendReviewsOf(from, from.id); return true }
      let m = /^review_(\d{1,15})$/.exec(p)
      if (m) { await beginReview(from, Number(m[1])); return true }
      m = /^reviews_(\d{1,15})$/.exec(p)
      if (m) { await sendReviewsOf(from, Number(m[1])); return true }
    }
    return false
  }

  const st = await getState(from.id)
  if (!st) return false
  if (st.expired) {
    await finishPendingReview(from, st)
    if (st.stale) return false
    await dm(from.id, await expiredText(st))
    return true
  }
  if (st.state === 'crew_name') await crewNameStep(from, text)
  else if (st.state === 'crew_desc') await crewDescStep(from, text, st)
  else if (st.state === 'review_text') await reviewTextStep(from, text, st)
  else if (st.state === 'review_stars') {
    // A typed «5» or «5 отличный монтажник» works like the ⭐ buttons
    // (also when button presses don't reach the bot).
    const parsed = parseRating(text)
    const targetId = Number(st.data?.t)
    if (parsed && targetId) await applyStars(from, targetId, parsed.rating, { text: parsed.text })
    else await dm(from.id, 'Выбери оценку кнопкой ⭐ или напиши цифру 1–5 (или /cancel)')
  } else {
    await clearState(from.id)
    return false
  }
  return true
}

// ── callback_query ──────────────────────────────────────────────────────────
// 'rv:<targetId>:<stars>', 'rvs:<targetId>', 'tj:<teamId>:<uid>:y|n',
// 'me:reviews', 'me:team'. Always answered.
export async function handleCallback(cq) {
  const from = cq.from
  const data = String(cq.data || '')
  let answer = ''
  try {
    if (!from || from.is_bot) return
    // Our buttons live only in the private chat with the bot.
    if (cq.message?.chat?.type !== 'private') return
    await upsertPerson(from)
    let m
    if (data === 'me:reviews' || data === 'me:team') {
      await settlePendingText(from)
      if (data === 'me:reviews') await sendReviewsOf(from, from.id)
      else await sendMyTeam(from)
    } else if ((m = /^rv:(\d{1,15}):([1-5])$/.exec(data))) {
      answer = await onStarPress(from, cq, Number(m[1]), Number(m[2]))
    } else if ((m = /^rvs:(\d{1,15})$/.exec(data))) {
      answer = await onSkipText(from, cq, Number(m[1]))
    } else if ((m = /^tj:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}):(\d{1,15}):([yn])$/i.exec(data))) {
      answer = await onJoinDecision(from, cq, m[1].toLowerCase(), Number(m[2]), m[3].toLowerCase() === 'y')
    }
  } catch (e) {
    console.error('[tower/teams] callback failed:', e?.message || e)
    answer = '⚠️ Не получилось — попробуй ещё раз'
  } finally {
    const r = await tg('answerCallbackQuery', { callback_query_id: cq.id, ...(answer ? { text: answer } : {}) })
    if (!r.ok) console.warn('[tower/teams] answerCallbackQuery:', r.description)
  }
}

// ── Group commands ──────────────────────────────────────────────────────────
// The bot is an admin, so it gets EVERY group message. This is the fast path:
// a pure string check, no network, no DB.
const GROUP_CMD_RE = /^\/(review|отзыв|profile|профиль)(?:@([A-Za-z0-9_]{3,64}))?(?=\s|$)/i
// Our private-chat commands typed in the group (with or without @bot) → a
// pointer to the private chat with a button that starts the right action.
// People type «/crew create» right in the group; silence there is a dead end.
const GROUP_DM_RE = /^\/(crew|бригада|crewcreate|createcrew|crewjoin|joincrew|myteam|team|команда|reviews|отзывы|help|помощь)(?:@([A-Za-z0-9_]{3,64}))?(?=\s|$)/i
// Generic names other bots also use → only with our @bot suffix.
const GROUP_DM_SUFFIX_RE = /^\/(start|status|manage)@([A-Za-z0-9_]{3,64})(?=\s|$)/i
export function parseGroupCommand(text) {
  if (typeof text !== 'string' || text.charCodeAt(0) !== 47) return null // '/'
  let m = GROUP_CMD_RE.exec(text)
  if (m) {
    const w = m[1].toLowerCase()
    return {
      cmd: w === 'review' || w === 'отзыв' ? 'review' : 'profile',
      bot: m[2] || '',
      rest: text.slice(m[0].length).trim(),
    }
  }
  m = GROUP_DM_RE.exec(text) || GROUP_DM_SUFFIX_RE.exec(text)
  if (m) return { cmd: 'dm_only', name: m[1].toLowerCase(), bot: m[2] || '', rest: text.slice(m[0].length).trim() }
  return null
}

// In a forum topic every message "replies" to the topic's first message — that
// is not a real reply.
function repliedMessage(msg) {
  const r = msg.reply_to_message
  if (!r) return null
  if (r.forum_topic_created) return null
  if (msg.is_topic_message && msg.message_thread_id && r.message_id === msg.message_thread_id) return null
  return r
}

async function groupSend(msg, text, replyToId = null, buttons = null) {
  const params: any = {
    chat_id: msg.chat.id,
    text,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
  }
  if (msg.is_topic_message && msg.message_thread_id) params.message_thread_id = msg.message_thread_id
  if (replyToId) params.reply_parameters = { message_id: replyToId, allow_sending_without_reply: true }
  if (buttons && buttons.length) params.reply_markup = { inline_keyboard: buttons }
  const r = await tg('sendMessage', params)
  if (!r.ok) console.warn('[tower/teams] group send failed:', r.description)
  return r
}

function groupReviewText(tu, author, rating, text, edited, r) {
  return `${stars(rating)} <b>${nameHtml(tu)}</b> — отзыв от ${nameHtml(author)}${edited ? ' (обновлён)' : ''}` +
    (text ? `\n«${esc(cpSlice(text, 300))}»` : '') +
    `\n⭐ Рейтинг: ${fmtRating(r)}`
}

// Anti-flood: one group command per person per 15 s (atomic: a conditional
// update of tg_people.last_group_cmd_at). Fails open if the column is missing.
async function takeGroupSlot(uid) {
  try {
    const db = getDb()
    const since = new Date(Date.now() - GROUP_COOLDOWN_MS).toISOString()
    const { data, error } = await db.from('tg_people')
      .update({ last_group_cmd_at: new Date().toISOString() })
      .eq('telegram_user_id', uid)
      .or(`last_group_cmd_at.is.null,last_group_cmd_at.lt.${since}`)
      .select('telegram_user_id')
    if (error) {
      console.warn('[tower/teams] group cooldown:', error.message)
      return true
    }
    if (data && data.length) return true
    // No row at all (the person wasn't saved) → don't block.
    const { data: row } = await db.from('tg_people')
      .select('telegram_user_id').eq('telegram_user_id', uid).maybeSingle()
    return !row
  } catch {
    return true
  }
}

// The bot's latest group confirmation of a review: the previous one is removed
// (one per review in the chat), and «Скрыть» in /admin/tower edits this one.
async function rememberGroupMessage(res, chatId, sent) {
  try {
    const mid = sent?.ok ? sent.result?.message_id : null
    const row = res?.row
    if (!mid || !row?.id) return
    const { error } = await getDb().from('tg_reviews')
      .update({ group_chat_id: chatId, group_message_id: mid }).eq('id', row.id)
    if (error) console.warn('[tower/teams] group_message_id:', error.message)
    if (row.group_chat_id && row.group_message_id &&
        !(Number(row.group_chat_id) === Number(chatId) && Number(row.group_message_id) === Number(mid))) {
      // The bot's own old message. May fail after 48 h without the delete right — fine.
      const d = await tg('deleteMessage', { chat_id: row.group_chat_id, message_id: row.group_message_id })
      if (!d.ok) console.warn('[tower/teams] old confirmation not deleted:', d.description)
    }
  } catch (e) {
    console.warn('[tower/teams] remember group message:', e?.message || e)
  }
}

export async function handleGroupCommand(msg) {
  const gc = parseGroupCommand(msg?.text)
  if (!gc || !msg.from) return
  // «/help@SomeOtherBot» is not for us.
  if (gc.bot) {
    const me = String((await botUsername()) || '').toLowerCase()
    if (me && gc.bot.toLowerCase() !== me) return
  }
  const from = msg.from
  const replied = repliedMessage(msg)
  // A forwarded message: replied.from is whoever forwarded it, not the author.
  const forwarded = !!(replied && (replied.forward_origin || replied.forward_date))
  // A reply to a channel post / anonymous admin has sender_chat — not a person.
  const target = replied && replied.from && !replied.sender_chat && !forwarded ? replied.from : null
  await Promise.all([
    upsertPerson(from),
    target && !target.is_bot ? upsertPerson(target) : null,
  ])
  if (!(await takeGroupSlot(from.id))) {
    // Too fast → no answer. A bare command is removed (nothing typed is lost).
    if (!gc.rest) await tg('deleteMessage', { chat_id: msg.chat.id, message_id: msg.message_id })
    return
  }
  const ctx: any = { msg, from, replied, target, forwarded, deleted: false }
  // Keep the chat clean: a command that did its job is removed. A malformed
  // one stays (with its text) and the hint replies to it. Without the right to
  // delete, answers go as a reply to the command itself.
  ctx.clean = async () => {
    const r = await tg('deleteMessage', { chat_id: msg.chat.id, message_id: msg.message_id })
    ctx.deleted = !!r.ok
  }
  ctx.replyTo = (id) => (ctx.deleted ? id : msg.message_id)
  try {
    if (gc.cmd === 'dm_only') await groupDmOnly(ctx, gc)
    else if (gc.cmd === 'profile') await groupProfile(ctx)
    else await groupReview(ctx, gc.rest)
  } catch (e) {
    console.error('[tower/teams] group command failed:', e?.message || e)
    await groupSend(msg, `${mention(from)}: ${TEAMS_ERROR_TEXT}`, ctx.replyTo(null))
  }
}

async function groupReview(ctx, rest) {
  const { msg, from, replied, target } = ctx
  const hint =
    `${mention(from)}, чтобы оставить отзыв, ответь на сообщение человека:\n` +
    '<code>/review 5 отличный монтажник</code>\n(оценка от 1 до 5, потом текст)'
  if (!replied) return groupSend(msg, hint, ctx.replyTo(null))
  if (ctx.forwarded) return groupSend(msg, `${mention(from)}, ${FORWARDED_TEXT}`, ctx.replyTo(null))
  if (!target || target.is_bot) return groupSend(msg, `${mention(from)}, отзыв можно оставить только человеку 🙂`, ctx.replyTo(null))
  if (Number(target.id) === Number(from.id)) return groupSend(msg, `${mention(from)}, себе отзыв оставить нельзя 🙂`, ctx.replyTo(null))
  const parsed = parseRating(rest)
  if (!parsed) {
    // E.g. «/review@TowerCrewBot» from the «/» menu: show the format for THIS
    // person + a button into the private ⭐ flow.
    const bot = await botUsername()
    return groupSend(msg,
      `${mention(from)}, поставь оценку ${nameHtml(target)}: <code>/review 5 текст</code> ответом на сообщение — или кнопкой ниже`,
      ctx.replyTo(null),
      [[{ text: '⭐ Оценить', url: `https://t.me/${bot}?start=review_${Number(target.id)}` }]])
  }

  const chatId = msg.chat.id
  const pair = await checkPair(chatId, from.id, target.id)
  if (!pair.ok) return groupSend(msg, `${mention(from)}: ${pair.text}`, ctx.replyTo(null))
  const res = await storeReview({ chatId, authorId: from.id, targetId: target.id, rating: parsed.rating, text: parsed.text })
  if (!res.ok) return groupSend(msg, `${mention(from)}: ${res.text}`, ctx.replyTo(null))
  await ctx.clean()
  // A review an admin hid never goes back to the chat, even after an edit.
  if (res.hidden) return groupSend(msg, `${mention(from)}: ✅ сохранено`, ctx.replyTo(null))

  const tu = pair.targetUser || target
  const r = (await ratingsFor([target.id]))[String(target.id)]
  const sent = await groupSend(msg,
    groupReviewText(tu, from, parsed.rating, parsed.text, !res.created, r),
    ctx.replyTo(replied.message_id))
  await rememberGroupMessage(res, chatId, sent)
}

async function groupProfile(ctx) {
  const { msg, from, replied, target } = ctx
  if (ctx.forwarded) return groupSend(msg, `${mention(from)}, ${FORWARDED_TEXT}`, ctx.replyTo(null))
  if (replied && (!target || target.is_bot)) {
    return groupSend(msg, `${mention(from)}, профиль есть только у людей 🙂`, ctx.replyTo(null))
  }
  const who = target || from
  const d = await profileData(who.id)
  const bot = await botUsername()
  const row = []
  if (Number(who.id) !== Number(from.id)) {
    row.push({ text: '⭐ Оставить отзыв', url: `https://t.me/${bot}?start=review_${Number(who.id)}` })
  }
  row.push({ text: '📝 Отзывы', url: `https://t.me/${bot}?start=reviews_${Number(who.id)}` })
  await ctx.clean()
  await groupSend(msg, profileText(who.id, d, who), ctx.replyTo(target ? replied.message_id : null), [row])
}

// /crew create, /myteam, /help … in the group → «it works in the DM» + a
// button that opens the bot right at that action.
function dmOnlyTarget(name, rest) {
  const sub = String(rest || '').split(/\s+/)[0].toLowerCase()
  if (name === 'crewcreate' || name === 'createcrew' ||
      ((name === 'crew' || name === 'бригада') && (sub === 'create' || sub === 'new' || sub === 'создать'))) {
    return { what: 'создать команду можно в личке со мной', start: 'crew_create', button: '👷 Создать команду' }
  }
  if (name === 'crewjoin' || name === 'joincrew' ||
      ((name === 'crew' || name === 'бригада') && (sub === 'join' || sub === 'вступить'))) {
    return {
      what: 'вступить в команду можно в личке со мной: напиши там <code>/crew join Название</code>',
      start: 'crew', button: '👷 Открыть бота',
    }
  }
  if (name === 'crew' || name === 'бригада') return { what: 'команды — в личке со мной', start: 'crew', button: '👷 Команды' }
  if (name === 'myteam' || name === 'team' || name === 'команда') {
    return { what: 'твоя команда — в личке со мной', start: 'myteam', button: '👷 Моя команда' }
  }
  if (name === 'reviews' || name === 'отзывы') {
    return { what: 'отзывы о тебе — в личке со мной', start: 'myreviews', button: '📝 Мои отзывы' }
  }
  return { what: 'все команды бота — в личке со мной', start: 'help', button: '💬 Открыть бота' }
}

async function groupDmOnly(ctx, gc) {
  const { msg, from } = ctx
  const bot = await botUsername()
  const t = dmOnlyTarget(gc?.name || '', gc?.rest || '')
  await ctx.clean()
  await groupSend(msg, `${mention(from)}, ${t.what} 👇`, ctx.replyTo(null),
    [[{ text: t.button, url: `https://t.me/${bot}?start=${t.start}` }]])
}

// ── Admin (/admin/tower) ────────────────────────────────────────────────────
const TS_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}(:?\d{2})?)?$/

function whoFrom(people) {
  return (id) => {
    const p = people[String(id)]
    return { id: Number(id), name: plainName(p, id), username: p?.username || null }
  }
}

// Reviews for the admin table, newest change first. q = Telegram id or
// @username (reviews by OR about that person); before = updated_at of the
// last row shown («Ещё»).
export async function adminReviews({ q = '', before = '' }: any = {}) {
  const db = getDb()
  const s = String(q || '').trim()
  let uid = null
  if (s) {
    if (/^\d{1,15}$/.test(s)) uid = Number(s)
    else if (/^@?[A-Za-z0-9_]{3,32}$/.test(s)) {
      const p = await personByUsername(s.replace(/^@/, ''))
      if (!p) return { reviews: [], more: false, user: null, notFound: true }
      uid = Number(p.telegram_user_id)
    } else {
      return { error: 'Нужен Telegram id или @username' }
    }
  }
  const b = String(before || '').trim()
  if (b && !TS_RE.test(b)) return { error: 'Bad cursor' }
  let query = db.from('tg_reviews')
    .select('id, author_telegram_id, target_telegram_id, rating, text, created_at, updated_at, hidden_at')
  if (uid) query = query.or(`target_telegram_id.eq.${uid},author_telegram_id.eq.${uid}`)
  if (b) query = query.lt('updated_at', b)
  const { data, error } = await query.order('updated_at', { ascending: false }).limit(ADMIN_PAGE + 1)
  if (error) throw new Error('tg_reviews: ' + error.message)
  const all = data || []
  const rows = all.slice(0, ADMIN_PAGE)
  const people = await peopleByIds([
    ...rows.map((r) => r.author_telegram_id),
    ...rows.map((r) => r.target_telegram_id),
    ...(uid ? [uid] : []),
  ])
  const who = whoFrom(people)
  return {
    reviews: rows.map((r) => ({
      id: r.id,
      author: who(r.author_telegram_id),
      target: who(r.target_telegram_id),
      rating: r.rating,
      text: r.text || null,
      created_at: r.created_at,
      updated_at: r.updated_at,
      hidden_at: r.hidden_at || null,
    })),
    more: all.length > ADMIN_PAGE,
    user: uid ? who(uid) : null,
  }
}

export async function adminCommunity() {
  const db = getDb()
  const [teamsQ, latest, teamsCount, reviewsCount, hiddenCount, peopleCount] = await Promise.all([
    db.from('tg_teams').select('id, name, description, leader_telegram_id, created_at')
      .order('created_at', { ascending: false }).limit(200),
    adminReviews({}),
    db.from('tg_teams').select('id', { count: 'exact', head: true }),
    db.from('tg_reviews').select('id', { count: 'exact', head: true }),
    db.from('tg_reviews').select('id', { count: 'exact', head: true }).not('hidden_at', 'is', null),
    db.from('tg_people').select('telegram_user_id', { count: 'exact', head: true }),
  ])
  if (teamsQ.error) throw new Error('tg_teams: ' + teamsQ.error.message)
  const teams = teamsQ.data || []
  const [members, ratings] = await Promise.all([
    pagedRows(() => db.from('tg_team_members').select('team_id, telegram_user_id, role')
      .order('team_id', { ascending: true }).order('telegram_user_id', { ascending: true })),
    allRatings(),
  ])
  const byTeam = {}
  const leaderOf = {}
  members.forEach((m) => {
    (byTeam[m.team_id] = byTeam[m.team_id] || []).push(m.telegram_user_id)
    if (m.role === 'leader') leaderOf[m.team_id] = m.telegram_user_id
  })
  const people = await peopleByIds(teams.map((t) => leaderOf[t.id] || t.leader_telegram_id))
  const who = whoFrom(people)
  return {
    totals: {
      teams: teamsCount.count || 0,
      reviews: reviewsCount.count || 0,
      hidden: hiddenCount.count || 0,
      people: peopleCount.count || 0,
    },
    teams: teams.map((t) => {
      const ids = byTeam[t.id] || []
      const tr = teamRating(ids, ratings)
      return {
        id: t.id,
        name: t.name,
        description: t.description || null,
        leader: who(leaderOf[t.id] || t.leader_telegram_id),
        members: ids.length,
        rating: tr ? Math.round(tr.avg * 10) / 10 : null,
        rated: tr ? tr.rated : 0,
        created_at: t.created_at,
      }
    }),
    reviews: latest.reviews || [],
    reviewsMore: !!latest.more,
  }
}

// The bot's own confirmation in the group follows the moderation: hidden →
// «🙈 Отзыв скрыт модератором» (deleted if it can't be edited); shown again →
// the review is put back. Touches only the bot's message, never a person.
async function syncGroupMessage(row) {
  const chat_id = row.group_chat_id
  const message_id = row.group_message_id
  const same = (r) => r.ok || /not modified/i.test(r.description || '')
  if (row.hidden_at) {
    const e = await tg('editMessageText', { chat_id, message_id, text: '🙈 Отзыв скрыт модератором' })
    if (same(e)) return 'edited'
    const d = await tg('deleteMessage', { chat_id, message_id })
    return d.ok ? 'deleted' : 'failed'
  }
  const tId = row.target_telegram_id
  const aId = row.author_telegram_id
  const [people, ratings] = await Promise.all([peopleByIds([aId, tId]), ratingsFor([tId])])
  const tu = people[String(tId)] || { telegram_user_id: tId }
  const au = people[String(aId)] || { telegram_user_id: aId }
  const edited = !!row.updated_at && !!row.created_at && row.updated_at !== row.created_at
  const e = await tg('editMessageText', {
    chat_id,
    message_id,
    text: groupReviewText(tu, au, row.rating, row.text, edited, ratings[String(tId)]),
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
  })
  return same(e) ? 'restored' : 'failed'
}

// «Скрыть» / «Показать»: a hidden review is left out of the bot's lists and
// ratings, and its group confirmation is replaced.
export async function setReviewHidden(id, hidden) {
  const sid = String(id || '')
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sid)) {
    return { ok: false, status: 400, error: 'Bad id' }
  }
  const { data, error } = await getDb().from('tg_reviews')
    .update({ hidden_at: hidden ? new Date().toISOString() : null })
    .eq('id', sid)
    .select('id, hidden_at, author_telegram_id, target_telegram_id, rating, text, created_at, updated_at, group_chat_id, group_message_id')
    .maybeSingle()
  if (error) return { ok: false, status: 500, error: error.message }
  if (!data) return { ok: false, status: 404, error: 'Отзыв не найден' }
  let groupMessage = null
  if (data.group_chat_id && data.group_message_id) {
    try {
      groupMessage = await syncGroupMessage(data)
    } catch (e) {
      console.warn('[tower/teams] group message sync:', e?.message || e)
      groupMessage = 'failed'
    }
  }
  return { ok: true, id: data.id, hidden_at: data.hidden_at, group_message: groupMessage }
}
