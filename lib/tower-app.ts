// @ts-nocheck
// ============================================================================
// «Вышки в США» — Mini App (/tower/app) server side.
//
// SERVER-ONLY. app/api/tower/app/*/route.ts are thin wrappers around these
// functions. Auth = Telegram WebApp initData in the X-Tg-Init-Data header on
// every call, verified with the bot token (lib/tower.ts verifyInitData); the
// Telegram user it carries is the only identity used here.
//
// Every app* function checks the miniapp migration first, never throws, and
// returns plain JSON: { ok:true, … } | { ok:false, code, error, … } — the HTTP
// status comes from appResponse(). Reviews are written through
// storeWizardReview → storeReview (review gate inside); team rules come from
// lib/tower-teams.ts — nothing is duplicated here.
//
// R5: reputationForBestieUser() — the public «🗼 Вышки в США» block on a
// Bestie profile (never returns Telegram ids or usernames).
// ============================================================================
import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'
import {
  getDb, verifyInitData, appLink, botUsername, resolveChatId, memberStatus, miniappSchemaReady, SITE,
} from '@/lib/tower'
import {
  reviewerStatus, requireReviewer, invalidateReviewer, gatePublic, unlinkTelegram,
} from '@/lib/tower-access'
import {
  upsertPerson, ratingsFor, storeWizardReview, confirmReview, createTeam, requestJoinById, leaveTeam,
  cancelJoinRequest, decideJoin, teamsList, myTeamView, teamDetail, pagedRows, peopleByIds, plainName,
  membershipOf, teamById, checkPair, existingReview, editBlock, overDailyLimit, REVIEW_COLS_V2,
  SELF_REVIEW, LIMIT_TEXT,
} from '@/lib/tower-teams'
import {
  SKILL_CODES, STATE_CODES, MAX_SKILLS, CRITERIA_KEYS,
} from '@/lib/tower-app-shared'

export const INIT_HEADER = 'x-tg-init-data'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PAGE_SIZE = 30
const MAX_OFFSET = 5000
const DIRECTORY_TTL_MS = 20 * 1000
const EDITED_AFTER_MS = 15 * 60 * 1000   // the old 2-step flow saved text a moment after the stars

// ── Texts ───────────────────────────────────────────────────────────────────
const AUTH_APP = 'Сессия устарела. Закрой приложение и открой снова.'
const SCHEMA_APP = 'Приложение обновляется — загляни через пару минут.'
const GENERIC = '⚠️ Не получилось — попробуй ещё раз.'
const RATE_APP = 'Слишком много запросов — подожди минутку.'
const NOT_FOUND_PERSON = 'Человек не найден.'
const BAD_REQUEST = 'Неверный запрос.'

const APP_TEAM_TEXT = {
  created: 'Команда «{name}» создана ✅ Заявки увидишь здесь, во вкладке «Команды», и в личке с ботом (если он запущен).',
  join_ok: 'Заявка отправлена лидеру ✅ Ответ появится здесь, а если бот запущен — придёт и в личку.',
  in_team: 'Ты уже в команде «{name}». Чтобы перейти в другую, сначала выйди из своей.',
  pending_here: 'Заявка уже у лидера — жди ответа.',
  kicked: 'Лидер исключил тебя из этой команды — новую заявку можно подать с {date}.',
  declined: 'Лидер отклонил заявку — новую можно подать с {date}.',
  daily: 'Заявку в эту команду можно отправлять раз в сутки.',
  pending_other: 'У тебя уже есть заявка в команду «{name}» — дождись ответа или отмени её.',
  no_leader: 'У команды сейчас нет лидера — вступить нельзя.',
  leader_unreachable: 'Не получилось отправить заявку: лидер не запускал бота. Попроси его написать боту /start.',
  not_member: 'Это доступно только участникам группы «Вышки в США».',
  check_failed: 'Не удалось проверить участие в группе — попробуй чуть позже.',
  name_invalid: 'Название — от 2 до 40 символов и не с «/».',
  name_taken: 'Команда «{name}» уже есть — придумай другое название.',
  desc_long: 'Описание — до 500 символов.',
  left: 'Ты вышел из команды «{name}».',
  handover: 'Ты вышел из команды «{name}». Новый лидер — {heir}.',
  deleted: 'Ты вышел из команды «{name}». В ней никого не осталось — команда удалена.',
  cancelled: 'Заявка в команду «{name}» отменена.',
  not_in_team: 'Ты не в команде.',
  not_found: 'Команда не найдена.',
}

// ── Helpers ─────────────────────────────────────────────────────────────────
// Bot HTML → plain text for the app.
export function plain(html) {
  return String(html ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
}

const round1 = (x) => Math.round(Number(x || 0) * 10) / 10
const schemaErr = () => ({ ok: false, code: 'schema', error: SCHEMA_APP })
const badRequest = (error = BAD_REQUEST) => ({ ok: false, code: 'bad_request', error })
const validId = (x) => Number.isSafeInteger(x) && x > 0

function cleanSkills(arr) {
  if (!Array.isArray(arr)) return []
  return Array.from(new Set(arr.map(String))).filter((s) => SKILL_CODES.includes(s)).slice(0, MAX_SKILLS)
}

// Stored scores → all 5 keys (1..5 | null); nothing rated → null (old review).
function normScores(s) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) return null
  const out = {}
  let any = false
  for (const k of CRITERIA_KEYS) {
    const v = s[k]
    out[k] = Number.isInteger(v) && v >= 1 && v <= 5 ? v : null
    if (out[k] != null) any = true
  }
  return any ? out : null
}

function isEdited(r) {
  const c = Date.parse(r?.created_at || '')
  const u = Date.parse(r?.updated_at || '')
  return Number.isFinite(c) && Number.isFinite(u) && u - c > EDITED_AFTER_MS
}

function reviewOut(r, authors, viewerId) {
  const aid = Number(r.author_telegram_id)
  const a = authors[String(aid)]
  return {
    id: r.id,
    author: { id: aid, name: plainName(a, aid), username: a?.username || null },
    rating: Number(r.rating) || 0,
    scores: normScores(r.scores),
    workPlace: r.work_place || null,
    workMonth: r.work_month ?? null,
    workYear: r.work_year ?? null,
    wouldWorkAgain: typeof r.would_work_again === 'boolean' ? r.would_work_again : null,
    text: r.text || null,
    date: r.updated_at || r.created_at,
    edited: isEdited(r),
    confirmed: !!r.confirmed_at,
    mine: aid === Number(viewerId),
  }
}

// The author's own review → the wizard's prefill.
function prefill(r) {
  if (!r) return null
  const scores = normScores(r.scores)
  return {
    rating: Number(r.rating) || 0,
    text: r.text || null,
    workPlace: r.work_place || null,
    workMonth: r.work_month ?? null,
    workYear: r.work_year ?? null,
    scores,
    wouldWorkAgain: typeof r.would_work_again === 'boolean' ? r.would_work_again : null,
    updatedAt: r.updated_at,
    wizard: !!r.work_place && !!scores,
  }
}

const REVIEW_SELECT = 'id, author_telegram_id, target_telegram_id, rating, text, scores, work_place, work_month, ' +
  'work_year, would_work_again, confirmed_at, disputed_at, created_at, updated_at'

// Every visible review of one person, newest change first.
function visibleReviewsOf(tgId) {
  const db = getDb()
  return pagedRows(() => db.from('tg_reviews')
    .select(REVIEW_SELECT)
    .eq('target_telegram_id', tgId)
    .is('hidden_at', null)
    .order('updated_at', { ascending: false })
    .order('id', { ascending: true }), 5000)
}

function wouldAgainOf(rows) {
  const answered = rows.filter((r) => typeof r.would_work_again === 'boolean')
  if (!answered.length) return null
  const yes = answered.filter((r) => r.would_work_again).length
  return { pct: Math.round((yes / answered.length) * 100), yes, total: answered.length }
}

function statsOf(rows) {
  const count = rows.length
  const criteria = {}
  for (const k of CRITERIA_KEYS) {
    const vals = rows.map((r) => normScores(r.scores)?.[k]).filter((v) => v != null)
    criteria[k] = vals.length ? { avg: round1(vals.reduce((s, v) => s + v, 0) / vals.length), n: vals.length } : null
  }
  return {
    avg: count ? round1(rows.reduce((s, r) => s + (Number(r.rating) || 0), 0) / count) : null,
    count,
    wouldAgain: wouldAgainOf(rows),
    criteria,
  }
}

async function bestieOf(tgId) {
  const db = getDb()
  const { data: link } = await db.from('tg_bestie_links').select('user_id').eq('telegram_user_id', tgId).maybeSingle()
  if (!link?.user_id) return null
  const { data: u } = await db.from('users').select('username').eq('id', link.user_id).maybeSingle()
  return u?.username ? { username: u.username, url: `${SITE}/${u.username}` } : null
}

// ── Response + auth wrapper ─────────────────────────────────────────────────
const STATUS = {
  auth: 401, bad_request: 400, invalid: 400, gate: 403, not_found: 404, rate: 429, schema: 503, error: 500,
}

export function appResponse(result) {
  const headers = { 'Cache-Control': 'no-store' }
  const r = result && typeof result === 'object' ? result : { ok: false, code: 'error', error: GENERIC }
  if (r.ok) return NextResponse.json(r, { status: 200, headers })
  const code = r.code || 'error'
  return NextResponse.json({ ...r, ok: false, code, error: r.error || GENERIC }, { status: STATUS[code] || 409, headers })
}

// Rate limit → initData auth → JSON body (non-GET; {} on bad JSON) →
// handler(user, { body, params, startParam }) → appResponse.
// opts.touch: save the person (tg_people) first. Never logs initData.
export async function withApp(req, handler, opts: any = {}) {
  try {
    const limited = rateLimit(req, 'tower-app', { limit: 120, windowMs: 60000 })
    if (limited) return appResponse({ ok: false, code: 'rate', error: RATE_APP })
    const auth = verifyInitData(req.headers.get(INIT_HEADER) || '')
    if (!auth) return appResponse({ ok: false, code: 'auth', error: AUTH_APP })
    let body = {}
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      try { body = await req.json() } catch { body = {} }
      if (!body || typeof body !== 'object' || Array.isArray(body)) body = {}
    }
    if (opts?.touch) await upsertPerson(auth.user)
    const result = await handler(auth.user, { body, params: req.nextUrl.searchParams, startParam: auth.startParam })
    return appResponse(result)
  } catch (e) {
    console.error('[tower/app] failed:', e?.message || e)
    return appResponse({ ok: false, code: 'error', error: GENERIC })
  }
}

// Wraps an app* body: schema check first, errors → { code:'error' }.
async function guarded(name, fn) {
  try {
    if (!(await miniappSchemaReady())) return schemaErr()
    return await fn()
  } catch (e) {
    console.error(`[tower/app] ${name}:`, e?.message || e)
    return { ok: false, code: 'error', error: GENERIC }
  }
}

// ── «Я» ─────────────────────────────────────────────────────────────────────
// Reviews about me with «где работали» that I haven't answered yet.
async function pendingConfirmations(tgId) {
  const { data, error } = await getDb().from('tg_reviews')
    .select(REVIEW_SELECT)
    .eq('target_telegram_id', tgId)
    .is('hidden_at', null)
    .not('work_place', 'is', null)
    .is('confirmed_at', null)
    .is('disputed_at', null)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw new Error('tg_reviews: ' + error.message)
  const rows = data || []
  const authors = await peopleByIds(rows.map((r) => r.author_telegram_id))
  return rows.map((r) => reviewOut(r, authors, tgId))
}

export async function appMe(user) {
  return guarded('me', async () => {
    const db = getDb()
    const id = Number(user.id)
    const [pRes, mine, ratings, st, pending, bot, shareLink] = await Promise.all([
      db.from('tg_people').select('telegram_user_id, username, first_name, last_name, hidden_from_rating, skills, state')
        .eq('telegram_user_id', id).maybeSingle(),
      membershipOf(id),
      ratingsFor([id]),
      reviewerStatus(id, { fresh: true }),
      pendingConfirmations(id),
      botUsername(),
      appLink('review_' + id),
    ])
    if (pRes.error) throw new Error('tg_people: ' + pRes.error.message)
    const p = pRes.data || {}
    const team = mine ? await teamById(mine.team_id) : null
    const r = ratings[String(id)]
    const gate = await gatePublic(st, user)
    return {
      ok: true,
      me: {
        id,
        name: plainName(user, id),
        username: user.username || p.username || null,
        rating: r && r.count ? { avg: round1(r.avg), count: r.count } : null,
        team: team ? { id: team.id, name: team.name, role: mine.role } : null,
        hidden: !!p.hidden_from_rating,
        skills: cleanSkills(p.skills),
        state: p.state || null,
        bestie: gate.bestie,
        shareLink,
        botLinks: { manage: `https://t.me/${bot}?start=manage`, start: `https://t.me/${bot}?start=app` },
      },
      gate,
      pending,
    }
  })
}

// { hidden?, skills?, state? } → saved on tg_people.
export async function appSettings(user, body) {
  return guarded('settings', async () => {
    const b = body || {}
    const patch: any = {}
    if (b.hidden !== undefined) {
      if (typeof b.hidden !== 'boolean') return badRequest()
      patch.hidden_from_rating = b.hidden
    }
    if (b.skills !== undefined) {
      if (!Array.isArray(b.skills) || b.skills.length > 50) return badRequest()
      const skills = cleanSkills(b.skills)
      if (new Set(b.skills.map(String).filter((s) => SKILL_CODES.includes(s))).size > MAX_SKILLS) {
        return badRequest(`Можно выбрать до ${MAX_SKILLS} навыков.`)
      }
      patch.skills = skills
    }
    if (b.state !== undefined) {
      if (b.state === null || b.state === '') patch.state = null
      else {
        const s = String(b.state).toUpperCase()
        if (!STATE_CODES.includes(s)) return badRequest('Неизвестный штат.')
        patch.state = s
      }
    }
    if (!Object.keys(patch).length) return badRequest('Нечего сохранять.')
    await upsertPerson(user) // the row must exist
    const { data, error } = await getDb().from('tg_people').update(patch)
      .eq('telegram_user_id', Number(user.id))
      .select('hidden_from_rating, skills, state').maybeSingle()
    if (error) throw new Error('tg_people update: ' + error.message)
    if (!data) return { ok: false, code: 'error', error: GENERIC }
    invalidateDirectory()
    return { ok: true, me: { hidden: !!data.hidden_from_rating, skills: cleanSkills(data.skills), state: data.state || null } }
  })
}

export async function appUnlink(user) {
  return guarded('unlink', async () => {
    const r = await unlinkTelegram(user.id)
    if (!r.ok) return { ok: false, code: r.code === 'schema' ? 'schema' : 'error', error: r.error || GENERIC }
    invalidateDirectory()
    return { ok: true, unlinked: !!r.unlinked }
  })
}

// ── «Рейтинг»: the directory ────────────────────────────────────────────────
// tg_people + everyone with a visible review, minus people who hid themselves.
// Module-cached 20 s; settings saves and review submits clear it.
let dirCache = null
let dirGen = 0
let dirBuild = null

export function invalidateDirectory() {
  dirCache = null
  dirGen += 1
}

async function buildDirectory() {
  const db = getDb()
  const [people, reviews, members, teamsRes, links] = await Promise.all([
    pagedRows(() => db.from('tg_people')
      .select('telegram_user_id, username, first_name, last_name, hidden_from_rating, skills, state, updated_at')
      .order('telegram_user_id', { ascending: true })),
    pagedRows(() => db.from('tg_reviews')
      .select('id, target_telegram_id, rating, updated_at')
      .is('hidden_at', null)
      .order('id', { ascending: true })),
    pagedRows(() => db.from('tg_team_members').select('team_id, telegram_user_id, role')
      .order('team_id', { ascending: true }).order('telegram_user_id', { ascending: true })),
    db.from('tg_teams').select('id, name').limit(2000),
    pagedRows(() => db.from('tg_bestie_links').select('telegram_user_id').order('telegram_user_id', { ascending: true })),
  ])
  if (teamsRes.error) throw new Error('tg_teams: ' + teamsRes.error.message)
  const stats = {}
  for (const r of reviews) {
    const k = String(r.target_telegram_id)
    const o = stats[k] || (stats[k] = { sum: 0, count: 0, lastAt: '' })
    o.sum += Number(r.rating) || 0
    o.count += 1
    if (String(r.updated_at || '') > o.lastAt) o.lastAt = String(r.updated_at || '')
  }
  const teamName = {}
  for (const t of teamsRes.data || []) teamName[t.id] = t.name
  const teamOf = {}
  for (const m of members) teamOf[String(m.telegram_user_id)] = { id: m.team_id, name: teamName[m.team_id] || '—' }
  const linked = new Set(links.map((l) => String(l.telegram_user_id)))
  const byId = {}
  for (const p of people) byId[String(p.telegram_user_id)] = p
  const ids = new Set([...Object.keys(byId), ...Object.keys(stats)])
  const list = []
  ids.forEach((k) => {
    const p = byId[k]
    if (p?.hidden_from_rating) return
    const s = stats[k]
    // Only people with something to show: reviews, a team, a Bestie profile or
    // skills they filled in — not everyone who ever wrote to the bot.
    if (!s && !teamOf[k] && !linked.has(k) && !cleanSkills(p?.skills).length) return
    const name = plainName(p, k)
    list.push({
      id: Number(k),
      name,
      username: p?.username || null,
      avg: s ? round1(s.sum / s.count) : null,
      count: s?.count || 0,
      team: teamOf[k] || null,
      skills: cleanSkills(p?.skills),
      state: p?.state || null,
      bestie: linked.has(k),
      _sum: s?.sum || 0,
      _lastAt: s?.lastAt || '',
      _seenAt: String(p?.updated_at || ''),
      _q: (name + ' ' + (p?.username || '')).toLowerCase(),
    })
  })
  return list
}

async function directory() {
  if (dirCache && Date.now() - dirCache.at < DIRECTORY_TTL_MS) return dirCache.list
  if (!dirBuild) {
    const gen = dirGen
    const build = buildDirectory()
    dirBuild = build
    build.then((list) => {
      if (gen === dirGen) dirCache = { at: Date.now(), list }
    }, () => {}).then(() => { if (dirBuild === build) dirBuild = null })
  }
  return dirBuild
}

const smoothed = (p) => (p._sum + 8) / (p.count + 2) // a prior of two 4★ reviews
const byName = (a, b) => a.name.localeCompare(b.name, 'ru')

function publicPerson(p) {
  return {
    id: p.id, name: p.name, username: p.username, avg: p.avg, count: p.count,
    team: p.team, skills: p.skills, state: p.state, bestie: p.bestie,
  }
}

// ?q &skill &state &sort=best|count|new &offset
export async function appPeople(user, params) {
  return guarded('people', async () => {
    const get = (k) => String(params?.get?.(k) || '').trim()
    const q = get('q').slice(0, 64).replace(/^@/, '').toLowerCase()
    const skill = SKILL_CODES.includes(get('skill')) ? get('skill') : ''
    const st = get('state').toUpperCase()
    const state = STATE_CODES.includes(st) ? st : ''
    const sort = ['best', 'count', 'new'].includes(get('sort')) ? get('sort') : 'best'
    const off = Number(get('offset') || 0)
    const offset = Number.isInteger(off) ? Math.max(0, Math.min(MAX_OFFSET, off)) : 0

    const list = (await directory()).filter((p) =>
      (!q || p._q.includes(q)) &&
      (!skill || p.skills.includes(skill)) &&
      (!state || p.state === state))

    if (sort === 'count') {
      list.sort((a, b) => b.count - a.count || (b.avg ?? -1) - (a.avg ?? -1) || byName(a, b))
    } else if (sort === 'new') {
      list.sort((a, b) => {
        if (!!a.count !== !!b.count) return a.count ? -1 : 1
        if (a.count) return a._lastAt < b._lastAt ? 1 : a._lastAt > b._lastAt ? -1 : 0
        return a._seenAt < b._seenAt ? 1 : a._seenAt > b._seenAt ? -1 : 0
      })
    } else {
      list.sort((a, b) => {
        if (!!a.count !== !!b.count) return a.count ? -1 : 1
        if (a.count) return smoothed(b) - smoothed(a) || b.count - a.count || byName(a, b)
        return byName(a, b)
      })
    }
    const page = list.slice(offset, offset + PAGE_SIZE).map(publicPerson)
    return { ok: true, people: page, total: list.length, more: offset + PAGE_SIZE < list.length }
  })
}

// ── Person card ─────────────────────────────────────────────────────────────
async function personRow(id) {
  const { data, error } = await getDb().from('tg_people')
    .select('telegram_user_id, username, first_name, last_name, hidden_from_rating, skills, state')
    .eq('telegram_user_id', id).maybeSingle()
  if (error) throw new Error('tg_people: ' + error.message)
  if (data) return data
  // Not seen by the bot yet (e.g. a shared link) → ask Telegram once. Only a
  // current group member gets a card, and it isn't saved: opening a card must
  // not add strangers to the public list.
  try {
    const m = await memberStatus(await resolveChatId(), id)
    const u = m.ok && m.isMember ? m.member?.user : null
    if (u && !u.is_bot) {
      return { telegram_user_id: id, username: u.username || null, first_name: u.first_name || null, last_name: u.last_name || null, hidden_from_rating: false, skills: [], state: null }
    }
  } catch {}
  // Reviewed but never saved → still a card.
  const { count } = await getDb().from('tg_reviews').select('id', { count: 'exact', head: true })
    .eq('target_telegram_id', id).is('hidden_at', null)
  return count ? { telegram_user_id: id, hidden_from_rating: false, skills: [], state: null } : null
}

export async function appPerson(user, targetId) {
  return guarded('person', async () => {
    const id = Number(targetId)
    if (!validId(id)) return badRequest()
    const viewer = Number(user.id)
    const self = id === viewer
    const p = await personRow(id)
    if (!p) return { ok: false, code: 'not_found', error: NOT_FOUND_PERSON }
    const name = plainName(p, id)
    const mineRev = self ? null : await existingReview(viewer, id, REVIEW_COLS_V2)
    if (p.hidden_from_rating && !self) {
      return {
        ok: true,
        person: { id, name, username: p.username || null, hidden: true, self: false },
        stats: null,
        reviews: [],
        myReview: prefill(mineRev),
      }
    }
    const [mine, bestie, rows] = await Promise.all([membershipOf(id), bestieOf(id), visibleReviewsOf(id)])
    const team = mine ? await teamById(mine.team_id) : null
    const shown = rows.slice(0, 50)
    const authors = await peopleByIds(shown.map((r) => r.author_telegram_id))
    return {
      ok: true,
      person: {
        id,
        name,
        username: p.username || null,
        team: team ? { id: team.id, name: team.name, role: mine.role } : null,
        skills: cleanSkills(p.skills),
        state: p.state || null,
        bestie,
        hidden: !!p.hidden_from_rating,
        self,
      },
      stats: statsOf(rows),
      reviews: shown.map((r) => reviewOut(r, authors, viewer)),
      myReview: prefill(mineRev),
    }
  })
}

// ── Review ──────────────────────────────────────────────────────────────────
// Before the wizard opens. Order: self, gate, pair, edit block / daily limit.
export async function appReviewCheck(user, targetId) {
  return guarded('review check', async () => {
    const id = Number(targetId)
    if (!validId(id)) return badRequest()
    if (id === Number(user.id)) return { ok: false, code: 'self', error: SELF_REVIEW }
    invalidateReviewer(user.id)
    const g = await requireReviewer(user.id)
    const gate = await gatePublic(g.status, user)
    if (!g.ok) return { ok: false, code: 'gate', error: plain(g.text), gate }
    const pair = await checkPair(await resolveChatId(), user.id, id)
    if (!pair.ok) return { ok: false, code: 'pair', error: plain(pair.text) }
    const prev = await existingReview(user.id, id, REVIEW_COLS_V2)
    if (prev) {
      const block = await editBlock(prev, user.id)
      if (block) return { ok: false, code: 'edit_block', error: block }
    } else if (await overDailyLimit(user.id)) {
      return { ok: false, code: 'limit', error: LIMIT_TEXT }
    }
    let tp = pair.targetUser
    if (!tp) tp = (await peopleByIds([id]))[String(id)] || null
    return {
      ok: true,
      target: { id, name: plainName(tp, id), username: tp?.username || null },
      existing: prefill(prev),
      gate,
    }
  })
}

// { targetId, workPlace, workMonth, workYear, scores, wouldWorkAgain, text? }
export async function appReviewSubmit(user, body) {
  return guarded('review submit', async () => {
    const r = await storeWizardReview(user, body || {})
    if (!r.ok) {
      const out: any = { ok: false, code: r.code || 'error', error: plain(r.text) || GENERIC }
      if (r.code === 'invalid' && r.field) out.field = r.field
      if (r.code === 'gate') out.gate = await gatePublic(r.status, user)
      return out
    }
    invalidateDirectory()
    const tp = r.targetUser || (await peopleByIds([r.targetId]))[String(r.targetId)] || null
    return { ok: true, created: !!r.created, reviewId: r.reviewId, target: { id: r.targetId, name: plainName(tp, r.targetId) } }
  })
}

// { reviewId, worked } — «Вы работали вместе?» from «Я» → «Ждут подтверждения».
export async function appConfirm(user, body) {
  return guarded('confirm', async () => {
    const b = body || {}
    if (typeof b.worked !== 'boolean' || !UUID_RE.test(String(b.reviewId || ''))) return badRequest()
    const r = await confirmReview(user.id, b.reviewId, b.worked)
    if (!r.ok) return { ok: false, code: r.code || 'error', error: plain(r.text) || GENERIC }
    return { ok: true, confirmed: r.confirmed, disputed: r.disputed }
  })
}

// ── «Команды» ───────────────────────────────────────────────────────────────
export async function appTeams(user) {
  return guarded('teams', async () => {
    const [view, teams] = await Promise.all([myTeamView(Number(user.id)), teamsList()])
    return { ok: true, mine: view.mine, pending: view.pending, teams, canCreate: !view.mine }
  })
}

export async function appTeamDetail(user, teamId) {
  return guarded('team', async () => {
    if (!UUID_RE.test(String(teamId || ''))) return badRequest()
    const d = await teamDetail(teamId, Number(user.id))
    if (!d) return { ok: false, code: 'not_found', error: APP_TEAM_TEXT.not_found }
    return { ok: true, ...d }
  })
}

function teamText(r) {
  const tpl = APP_TEAM_TEXT[r.code]
  if (!tpl) return plain(r.text) || GENERIC
  return tpl
    .replace('{name}', r.name || r.teamName || r.team?.name || '—')
    .replace('{date}', r.until || '—')
    .replace('{heir}', r.heirName || '—')
}

function teamResult(r, extra = {}) {
  if (!r) return { ok: false, code: 'error', error: GENERIC }
  if (r.ok) return { ok: true, code: r.code, text: teamText(r), ...extra }
  return { ok: false, code: r.code || 'error', error: teamText(r) }
}

// { action:'create', name, description? } | { action:'join', teamId } | { action:'cancel' }
// | { action:'leave' } | { action:'decide', userId, accept }
export async function appTeamAction(user, body) {
  return guarded('team action', async () => {
    const b = body || {}
    const a = String(b.action || '')
    if (a === 'create') {
      if (typeof b.name !== 'string' || (b.description != null && typeof b.description !== 'string')) return badRequest()
      const r = await createTeam(user, b.name, b.description || '')
      if (r.ok) return { ok: true, code: 'created', text: teamText({ code: 'created', name: r.team.name }), team: r.team }
      return teamResult(r)
    }
    if (a === 'join') return teamResult(await requestJoinById(user, b.teamId))
    if (a === 'cancel') return teamResult((await cancelJoinRequest(user)) || { ok: false, code: 'not_found', text: 'Заявок нет.' })
    if (a === 'leave') return teamResult(await leaveTeam(user))
    if (a === 'decide') {
      const uid = Number(b.userId)
      if (!validId(uid) || typeof b.accept !== 'boolean') return badRequest()
      const mine = await membershipOf(Number(user.id))
      if (!mine) return { ok: false, code: 'not_in_team', error: APP_TEAM_TEXT.not_in_team }
      if (mine.role !== 'leader') return { ok: false, code: 'not_leader', error: 'Отвечать на заявки может только лидер команды.' }
      const r = await decideJoin(user, mine.team_id, uid, b.accept)
      if (r.keep) return { ok: false, code: 'check_failed', error: plain(r.text) }
      return { ok: true, text: plain(r.text) }
    }
    return badRequest()
  })
}

// ── R5: the public block on a Bestie profile ────────────────────────────────
// { show:false } when: no migration, no link, hidden (unless includeHidden), or
// no visible reviews and no team. Never returns Telegram ids or usernames.
export async function reputationForBestieUser(userId, { includeHidden = false }: any = {}) {
  try {
    if (!UUID_RE.test(String(userId || ''))) return { show: false }
    if (!(await miniappSchemaReady())) return { show: false }
    const db = getDb()
    const { data: link, error } = await db.from('tg_bestie_links')
      .select('telegram_user_id').eq('user_id', userId).maybeSingle()
    if (error || !link) return { show: false }
    const id = Number(link.telegram_user_id)
    const [pRes, mine, rows] = await Promise.all([
      db.from('tg_people').select('hidden_from_rating').eq('telegram_user_id', id).maybeSingle(),
      membershipOf(id).catch(() => null),
      visibleReviewsOf(id),
    ])
    // Can't tell whether they hid themselves → show nothing publicly.
    if (pRes.error && !includeHidden) return { show: false }
    const hidden = !!pRes.data?.hidden_from_rating
    if (hidden && !includeHidden) return { show: false }
    const team = mine ? await teamById(mine.team_id).catch(() => null) : null
    if (!rows.length && !team) return includeHidden ? { show: false, hidden } : { show: false }
    const last = rows.slice(0, 3)
    const authors = await peopleByIds(last.map((r) => r.author_telegram_id))
    const wa = wouldAgainOf(rows)
    return {
      show: true,
      hidden,
      rating: rows.length
        ? { avg: round1(rows.reduce((s, r) => s + (Number(r.rating) || 0), 0) / rows.length), count: rows.length }
        : null,
      team: team ? { name: team.name } : null,
      wouldAgain: wa ? { pct: wa.pct, total: wa.total } : null,
      reviews: last.map((r) => {
        const a = authors[String(r.author_telegram_id)]
        const first = String(a?.first_name || '').trim()
        return {
          author: first ? Array.from(first).slice(0, 64).join('') : 'Участник',
          rating: Number(r.rating) || 0,
          text: r.text || null,
          date: r.updated_at || r.created_at,
          place: r.work_place || null,
          month: r.work_month ?? null,
          year: r.work_year ?? null,
          confirmed: !!r.confirmed_at,
        }
      }),
    }
  } catch (e) {
    console.warn('[tower/app] reputation:', e?.message || e)
    return { show: false }
  }
}
