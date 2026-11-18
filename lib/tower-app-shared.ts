// @ts-nocheck
// ============================================================================
// «Вышки в США» — shared rules for the Mini App, the bot and the server.
//
// CLIENT-SAFE: pure JS, no secrets, imports nothing. The only tower lib file a
// 'use client' component may import (lib/tower*.ts are server-only).
//
// The review wizard is checked with validateWizard() twice: in the Mini App
// (to enable «Далее») and on the server (lib/tower-teams.ts storeWizardReview),
// so the two never disagree.
// ============================================================================

// ── Skills (Mini App «Я», filter chips in «Рейтинг») ────────────────────────
export const SKILLS = [
  { code: 'climbing', label: 'Climbing' },
  { code: 'rf', label: 'RF / Антенны' },
  { code: 'rigging', label: 'Rigging' },
  { code: 'fiber', label: 'Fiber' },
  { code: 'electrical', label: 'Электрика' },
  { code: 'rescue', label: 'Rescue' },
  { code: 'foreman', label: 'Foreman' },
  { code: 'safety', label: 'Инспекция / Safety' },
  { code: 'cdl', label: 'Водитель CDL' },
  { code: 'linesweep', label: 'Line Sweep / PIM' },
]
export const SKILL_CODES = SKILLS.map((s) => s.code)
export const MAX_SKILLS = 10

// ── US states (+ DC), alphabetical by name ──────────────────────────────────
export const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
]
export const STATE_CODES = US_STATES.map((s) => s.code)

// ── Review wizard ───────────────────────────────────────────────────────────
// Wizard order = this order (steps 2–6).
export const CRITERIA = [
  { key: 'safety', title: 'Безопасность', hint: 'Страховка всегда, проверяет снаряжение, готов помочь при спасении' },
  { key: 'quality', title: 'Качество работы', hint: 'Аккуратный монтаж, переделывать за ним не приходится' },
  { key: 'pace', title: 'Темп и сроки', hint: 'Держит темп, не срывает сроки' },
  { key: 'docs', title: 'Документы и фотоотчёт', hint: 'Closeout, фото и отчёты — вовремя и без напоминаний' },
  { key: 'team', title: 'Работа в команде', hint: 'Легко договориться, на него можно положиться' },
]
export const CRITERIA_KEYS = CRITERIA.map((c) => c.key)
export const SCORE_WORDS = ['', 'Плохо', 'Слабо', 'Нормально', 'Хорошо', 'Отлично']
export const MONTHS_RU = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
]
export const WORK_PLACE_MIN = 2
export const WORK_PLACE_MAX = 80
export const REVIEW_TEXT_MAX = 500
export const WORK_YEARS_BACK = 10
export const GATE_FIELD_LABELS = { full_name: 'имя', avatar_url: 'фото', city: 'город' }

// validateWizard() error texts. field ∈ targetId | workPlace | workDate |
// scores | wouldWorkAgain | text (the Mini App jumps to that step).
export const WIZARD_ERRORS = {
  targetId: 'Не выбран человек.',
  workPlace: 'Напиши объект или компанию (от 2 до 80 символов).',
  workDateMissing: 'Выбери месяц и год.',
  workDateFuture: 'Дата не может быть в будущем.',
  workDateOld: 'Можно указать работу не старше 10 лет.',
  scoresNone: 'Оцени хотя бы один пункт.',
  scoresKey: 'Неизвестный пункт оценки.',
  scoresValue: 'Оценка — от 1 до 5 звёзд.',
  wouldWorkAgain: 'Ответь: работал(а) бы с ним снова?',
  text: 'Комментарий — до 500 символов.',
}

// ── Start params (startapp=… / ?go=…) ───────────────────────────────────────
// Telegram allows only [A-Za-z0-9_-], ≤ 64 characters.
export const START_PARAM_RE = /^(home|teams|me|person_\d{1,15}|review_\d{1,15}|team_[0-9a-f-]{36})$/

// → { screen: 'home'|'teams'|'me'|'person'|'review'|'team', id }; invalid → home.
export function parseStartParam(s) {
  const p = String(s || '')
  if (!START_PARAM_RE.test(p)) return { screen: 'home', id: null }
  if (p === 'home' || p === 'teams' || p === 'me') return { screen: p, id: null }
  const i = p.indexOf('_')
  const kind = p.slice(0, i)
  const rest = p.slice(i + 1)
  if (kind === 'team') return { screen: 'team', id: rest }
  return { screen: kind, id: Number(rest) }
}

// ── Small helpers ───────────────────────────────────────────────────────────
const cpLen = (s) => Array.from(String(s || '')).length
// Zero-width / bidi / control characters (built at runtime: no regex flag
// support needed from the compiler target).
const INVISIBLE_RE = new RegExp('[\\p{Cf}\\p{Cc}]', 'gu')

// Same steps (and order) as cleanName in lib/tower-teams.ts.
export function cleanPlace(s) {
  return String(s ?? '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .replace(INVISIBLE_RE, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Month window for «когда работали вместе»: not in the future, not older than
// 10 years. ym = year * 12 + (month - 1). Uses LOCAL time getters.
export function wizardDateBounds(nowMs = Date.now()) {
  const d = new Date(nowMs)
  const y = d.getFullYear()
  const m = d.getMonth()
  return {
    minYear: y - WORK_YEARS_BACK,
    maxYear: y,
    minYm: y * 12 + m - WORK_YEARS_BACK * 12,
    maxYm: y * 12 + m,
  }
}

// Mean of the rated criteria, rounded, 1..5. Nothing rated → null.
export function ratingFromScores(scores) {
  if (!scores || typeof scores !== 'object') return null
  const vals = CRITERIA_KEYS
    .map((k) => scores[k])
    .filter((v) => typeof v === 'number' && Number.isFinite(v))
  if (!vals.length) return null
  const avg = vals.reduce((s, v) => s + v, 0) / vals.length
  return Math.max(1, Math.min(5, Math.round(avg)))
}

// 'март 2025' | ''
export function fmtWorkDate(month, year) {
  const m = Number(month)
  const y = Number(year)
  if (!Number.isInteger(m) || m < 1 || m > 12 || !Number.isInteger(y) || y <= 0) return ''
  return `${MONTHS_RU[m - 1]} ${y}`
}

function toInt(v) {
  if (typeof v === 'number') return Number.isInteger(v) ? v : NaN
  if (typeof v === 'string' && /^\d{1,4}$/.test(v.trim())) return Number(v.trim())
  return NaN
}

// → { ok:true, value:{ targetId, workPlace, workMonth, workYear, scores, wouldWorkAgain, text, rating } }
//   | { ok:false, field, error }
// scores in value: all 5 keys, null = «Не применимо».
export function validateWizard(input, { nowMs = Date.now(), slackMonths = 0 } = {}) {
  const x = input && typeof input === 'object' ? input : {}
  const fail = (field, error) => ({ ok: false, field, error })

  const targetId = typeof x.targetId === 'string' && /^\d{1,15}$/.test(x.targetId) ? Number(x.targetId) : x.targetId
  if (!Number.isSafeInteger(targetId) || targetId <= 0) return fail('targetId', WIZARD_ERRORS.targetId)

  const workPlace = cleanPlace(x.workPlace)
  const placeLen = cpLen(workPlace)
  if (placeLen < WORK_PLACE_MIN || placeLen > WORK_PLACE_MAX) return fail('workPlace', WIZARD_ERRORS.workPlace)

  const workMonth = toInt(x.workMonth)
  const workYear = toInt(x.workYear)
  if (!Number.isInteger(workMonth) || workMonth < 1 || workMonth > 12 || !Number.isInteger(workYear) || workYear < 1) {
    return fail('workDate', WIZARD_ERRORS.workDateMissing)
  }
  const b = wizardDateBounds(nowMs)
  const ym = workYear * 12 + workMonth - 1
  if (ym > b.maxYm) return fail('workDate', WIZARD_ERRORS.workDateFuture)
  if (ym < b.minYm - (Number(slackMonths) || 0)) return fail('workDate', WIZARD_ERRORS.workDateOld)

  const rawScores = x.scores && typeof x.scores === 'object' && !Array.isArray(x.scores) ? x.scores : {}
  for (const k of Object.keys(rawScores)) {
    if (!CRITERIA_KEYS.includes(k)) return fail('scores', WIZARD_ERRORS.scoresKey)
  }
  const scores = {}
  for (const k of CRITERIA_KEYS) {
    const v = rawScores[k]
    if (v === null || v === undefined || v === '') {
      scores[k] = null
      continue
    }
    const n = typeof v === 'string' && /^[1-5]$/.test(v) ? Number(v) : v
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > 5) return fail('scores', WIZARD_ERRORS.scoresValue)
    scores[k] = n
  }
  const rating = ratingFromScores(scores)
  if (rating == null) return fail('scores', WIZARD_ERRORS.scoresNone)

  if (typeof x.wouldWorkAgain !== 'boolean') return fail('wouldWorkAgain', WIZARD_ERRORS.wouldWorkAgain)

  const text = x.text == null ? '' : String(x.text).trim()
  if (cpLen(text) > REVIEW_TEXT_MAX) return fail('text', WIZARD_ERRORS.text)

  return {
    ok: true,
    value: {
      targetId,
      workPlace,
      workMonth,
      workYear,
      scores,
      wouldWorkAgain: x.wouldWorkAgain,
      text: text || null,
      rating,
    },
  }
}
