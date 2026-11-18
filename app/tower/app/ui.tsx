// @ts-nocheck
'use client'

// «Вышки в США» Mini App — small UI kit. Our own look on Bestie tokens
// (globals.css flips them for light / dark), big tap targets, Russian copy.
import { useEffect, useRef, useState } from 'react'
import {
  Star, ChevronLeft, Loader2, AlertCircle, RefreshCw, Search, X, Check,
} from 'lucide-react'
import { SKILLS, US_STATES, CRITERIA, SCORE_WORDS, fmtWorkDate } from '@/lib/tower-app-shared'
import { useApp } from './ctx'
import { TEXT } from './api'
import s from './miniapp.module.css'

// ── Helpers ─────────────────────────────────────────────────────────────────
export const cx = (...a) => a.filter(Boolean).join(' ')
export const cpLen = (v) => Array.from(String(v ?? '')).length

const SKILL_LABEL = {}
SKILLS.forEach((k) => { SKILL_LABEL[k.code] = k.label })
export const skillLabel = (c) => SKILL_LABEL[c] || c

const STATE_NAME = {}
US_STATES.forEach((x) => { STATE_NAME[x.code] = x.name })
export const stateName = (c) => STATE_NAME[c] || c

export const CRIT_SHORT = { safety: 'Безопасность', quality: 'Качество', pace: 'Темп', docs: 'Документы', team: 'Команда' }

export function plural(n, forms) {
  const a = Math.abs(Number(n) || 0) % 100
  const b = a % 10
  if (a > 10 && a < 20) return forms[2]
  if (b > 1 && b < 5) return forms[1]
  if (b === 1) return forms[0]
  return forms[2]
}
export const reviewsText = (n) => `${n} ${plural(n, ['отзыв', 'отзыва', 'отзывов'])}`
export const fmtAvg = (v) => (v == null || !Number.isFinite(Number(v)) ? '—' : Number(v).toFixed(1))

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
export function fmtDate(iso) {
  const d = new Date(iso || '')
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

export function shareUrl(link) {
  return 'https://t.me/share/url?url=' + encodeURIComponent(link) +
    '&text=' + encodeURIComponent('Оставь мне отзыв в группе «Вышки в США» 🙏')
}

// ── Buttons, cards, chips ───────────────────────────────────────────────────
export function Btn({
  children = null, variant = 'primary', size = 'lg', block = false, loading = false, disabled = false,
  icon = null, onClick = undefined, style = undefined, track = undefined, type = 'button',
}) {
  return (
    <button
      type={type}
      data-track={track}
      className={cx(s.btn, s['btn_' + variant], s['btn_' + size], block && s.btnBlock)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={onClick}
      style={style}
    >
      {loading ? <Loader2 size={18} className={s.spin} /> : icon}
      {children != null && <span>{children}</span>}
    </button>
  )
}

export function Card({ children, className = '', style = undefined }) {
  return <div className={cx(s.card, className)} style={style}>{children}</div>
}

export function Chip({ active = false, onClick, children, icon = null, track = undefined }) {
  return (
    <button type="button" data-track={track} className={cx(s.chip, active && s.chipOn)} aria-pressed={active} onClick={onClick}>
      {icon}
      <span>{children}</span>
    </button>
  )
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className={s.seg} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          className={cx(s.segBtn, value === o.value && s.segOn)}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ on, onChange, label, hint = null, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!on}
      className={s.toggleRow}
      disabled={disabled}
      onClick={() => { if (!disabled) onChange(!on) }}
    >
      <span className={s.toggleText}>
        <span className={s.toggleLabel}>{label}</span>
        {hint && <span className={s.toggleHint}>{hint}</span>}
      </span>
      <span className={cx(s.toggle, on && s.toggleOn)}><span className={s.toggleKnob} /></span>
    </button>
  )
}

// ── Stars ───────────────────────────────────────────────────────────────────
// Read-only; partial fill (4.6 → four and a bit).
export function Stars({ value = 0, size = 14 }) {
  const v = Math.max(0, Math.min(5, Number(value) || 0))
  return (
    <span className={s.stars} role="img" aria-label={`${fmtAvg(v)} из 5`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, v - i))
        return (
          <span key={i} className={s.starBox} style={{ width: size, height: size }}>
            <Star size={size} className={s.starEmpty} strokeWidth={1.8} />
            {fill > 0 && (
              <span className={s.starFill} style={{ width: `${Math.round(fill * 100)}%` }}>
                <Star size={size} fill="currentColor" strokeWidth={1.8} />
              </span>
            )}
          </span>
        )
      })}
    </span>
  )
}

// The wizard's big stars. value 0 = nothing chosen.
export function StarInput({ value = 0, onChange }) {
  const [popped, setPopped] = useState(0)
  const raf = useRef(0)
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const press = (n) => {
    setPopped(0)
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => setPopped(n))
    onChange(n)
  }
  return (
    <div className={s.starInput} role="radiogroup" aria-label="Оценка">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} из 5 — ${SCORE_WORDS[n]}`}
          className={cx(s.starBtn, n <= value && s.starBtnOn, popped === n && s.starPop)}
          onClick={() => press(n)}
        >
          <Star className={s.starIcon} fill={n <= value ? 'currentColor' : 'none'} strokeWidth={1.6} />
        </button>
      ))}
    </div>
  )
}

// ── Avatar ──────────────────────────────────────────────────────────────────
// [background rgb, text on dark, text on light]
const AV = [
  ['212,175,55', '#D4AF37', '#8C7210'],
  ['155,127,255', '#9B7FFF', '#6B4FD8'],
  ['96,165,250', '#60A5FA', '#2563EB'],
  ['52,211,153', '#34D399', '#0B8A5E'],
  ['255,120,87', '#FF7857', '#C8461F'],
]
export function initials(name) {
  const w = String(name || '').replace(/^@/, '').trim().split(/\s+/).filter(Boolean)
  const a = Array.from(w[0] || '?')[0] || '?'
  const b = w[1] ? Array.from(w[1])[0] || '' : ''
  return (a + b).toUpperCase()
}
export function Avatar({ id = 0, name = '', size = 44, square = false }) {
  const [rgb, dark, light] = AV[Math.abs(Math.floor(Number(id) || 0)) % 5]
  return (
    <span
      className={s.avatar}
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: square ? Math.round(size * 0.3) : '50%',
        background: `rgba(${rgb},0.22)`,
        '--av-ink': dark,
        '--av-ink-light': light,
        fontSize: Math.max(12, Math.round(size * 0.38)),
      }}
    >
      {initials(name)}
    </span>
  )
}

// ── Screen chrome ───────────────────────────────────────────────────────────
// In-app back button: mirrors Telegram's header «Назад» (both call ctx.back).
// Fixed, not sticky: globals.css puts overflow-x:hidden on <body>, which turns
// it into a scroll container and quietly disables position:sticky.
// progress (0..1) → a thin gold bar under the title (the review wizard).
export function TopBar({ title, onBack, sub = null, right = null, progress = null }) {
  const withBar = typeof progress === 'number'
  return (
    <>
      <div className={withBar ? s.topSpaceBar : s.topSpace} aria-hidden="true" />
      <div className={s.topBar}>
        <div className={s.topRow}>
          <button type="button" className={s.backBtn} onClick={onBack} aria-label="Назад">
            <ChevronLeft size={26} />
          </button>
          <div className={s.topTitleWrap}>
            <div className={s.topTitle}>{title}</div>
            {sub && <div className={s.topSub}>{sub}</div>}
          </div>
          {right || <span className={s.topSpacer} />}
        </div>
        {withBar && (
          <div className={s.progress} aria-hidden="true">
            <div className={s.progressFill} style={{ width: `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%` }} />
          </div>
        )}
      </div>
    </>
  )
}

// Fixed bottom bar for the screen's main action.
export function ActionBar({ children }) {
  return (
    <div className={s.actionBar}>
      <div className={s.actionInner}>{children}</div>
    </div>
  )
}

export function Section({ title = '', right = null, hint = null, children }) {
  return (
    <div className={s.section}>
      {(title || right) && (
        <div className={s.sectionHead}>
          <h2 className={s.sectionTitle}>{title}</h2>
          {right}
        </div>
      )}
      {hint && <div className={s.sectionHint}>{hint}</div>}
      {children}
    </div>
  )
}

export function Spinner({ size = 22, label = '' }) {
  return (
    <span className={s.spinnerWrap}>
      <Loader2 size={size} className={s.spin} />
      {label && <span>{label}</span>}
    </span>
  )
}

export function Empty({ icon = null, title = '', text = '', action = null }) {
  return (
    <div className={s.empty}>
      {icon && <div className={s.emptyIcon}>{icon}</div>}
      {title && <div className={s.emptyTitle}>{title}</div>}
      {text && <div className={s.emptyText}>{text}</div>}
      {action}
    </div>
  )
}

export function ErrorBox({ text = '', onRetry = null }) {
  return (
    <div className={s.errorBox} role="alert">
      <AlertCircle size={24} />
      <div className={s.errorText}>{text || TEXT.generic}</div>
      {onRetry && (
        <Btn variant="soft" size="md" icon={<RefreshCw size={16} />} onClick={onRetry}>Попробовать снова</Btn>
      )}
    </div>
  )
}

export function SkeletonList({ n = 5, h = 68 }) {
  return (
    <div className={s.list} aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => <div key={i} className={s.skel} style={{ height: h }} />)}
    </div>
  )
}

// ── Bottom sheet ────────────────────────────────────────────────────────────
// Registers with the root so Telegram «Назад» closes the sheet first.
export function Sheet({ open, onClose, title, children }) {
  const { addOverlay, removeOverlay } = useApp()
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!open) return
    const id = addOverlay(() => closeRef.current && closeRef.current())
    let prev = ''
    try {
      prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    } catch {}
    return () => {
      removeOverlay(id)
      try { document.body.style.overflow = prev } catch {}
    }
  }, [open])
  if (!open) return null
  return (
    <div className={s.sheetWrap} role="dialog" aria-modal="true" aria-label={title}>
      <div className={s.sheetBackdrop} onClick={onClose} />
      <div className={s.sheet}>
        <div className={s.sheetHandle} />
        <div className={s.sheetHead}>
          <div className={s.sheetTitle}>{title}</div>
          <button type="button" className={s.iconBtn} onClick={onClose} aria-label="Закрыть"><X size={20} /></button>
        </div>
        <div className={s.sheetBody}>{children}</div>
      </div>
    </div>
  )
}

export function StatePicker({ value = '', onPick, allLabel = 'Все штаты' }) {
  const [f, setF] = useState('')
  const q = f.trim().toLowerCase()
  const list = q
    ? US_STATES.filter((x) => x.name.toLowerCase().includes(q) || x.code.toLowerCase() === q)
    : US_STATES
  return (
    <>
      <div className={s.searchBox}>
        <Search size={18} className={s.searchIcon} />
        <input
          className={s.searchInput}
          value={f}
          onChange={(e) => setF(e.target.value)}
          placeholder="Найти штат"
          autoComplete="off"
          enterKeyHint="search"
        />
      </div>
      <div className={s.pickList}>
        {!q && (
          <button type="button" className={cx(s.pickItem, !value && s.pickOn)} onClick={() => onPick('')}>
            <span>{allLabel}</span>
            {!value && <Check size={18} />}
          </button>
        )}
        {list.map((x) => (
          <button key={x.code} type="button" className={cx(s.pickItem, value === x.code && s.pickOn)} onClick={() => onPick(x.code)}>
            <span><span className={s.pickCode}>{x.code}</span>{x.name}</span>
            {value === x.code && <Check size={18} />}
          </button>
        ))}
        {!list.length && <div className={s.emptyText} style={{ padding: 16 }}>Такого штата нет</div>}
      </div>
    </>
  )
}

// ── People and reviews ──────────────────────────────────────────────────────
export function RatingMini({ avg, count }) {
  if (!count) {
    return <span className={s.rateMini}><span className={s.rateNone}>нет отзывов</span></span>
  }
  return (
    <span className={s.rateMini}>
      <span className={s.rateVal}><Star size={15} fill="currentColor" className={s.goldIcon} />{fmtAvg(avg)}</span>
      <span className={s.rateCount}>{reviewsText(count)}</span>
    </span>
  )
}

// One row of the rating / a team list. right = custom right side.
export function PersonRow({ p, onClick, right = undefined, sub = null, me = false, lead = null }) {
  const skills = (p.skills || []).slice(0, 2)
  return (
    <button type="button" className={s.personRow} onClick={onClick} data-track="tower_person_row">
      <Avatar id={p.id} name={p.name} size={44} />
      <span className={s.personMid}>
        <span className={s.personName}>
          {lead}
          <span className={s.personNameText}>{p.name}</span>
          {me && <span className={s.youTag}>это ты</span>}
        </span>
        {(sub || p.username) && <span className={s.personSub}>{sub || '@' + p.username}</span>}
        {(skills.length > 0 || p.bestie) && (
          <span className={s.personTags}>
            {p.bestie && <span className={s.bestieTag}>Бести ✓</span>}
            {skills.map((c) => <span key={c} className={s.miniTag}>{skillLabel(c)}</span>)}
          </span>
        )}
      </span>
      {right !== undefined ? right : <RatingMini avg={p.avg} count={p.count} />}
    </button>
  )
}

export function ReviewCard({ r, onAuthor }) {
  const crit = r.scores
    ? CRITERIA.filter((c) => r.scores[c.key] != null).map((c) => `${CRIT_SHORT[c.key]} ${r.scores[c.key]}`)
    : []
  const when = fmtWorkDate(r.workMonth, r.workYear)
  return (
    <div className={s.reviewCard}>
      <div className={s.reviewHead}>
        <button type="button" className={s.reviewAuthor} onClick={onAuthor} data-track="tower_review_author">
          <Avatar id={r.author?.id} name={r.author?.name} size={36} />
          <span className={s.reviewAuthorText}>
            <span className={s.reviewName}>
              <span className={s.personNameText}>{r.author?.name}</span>
              {r.mine && <span className={s.youTag}>твой</span>}
            </span>
            <span className={s.reviewDate}>{fmtDate(r.date)}{r.edited ? ' · изменён' : ''}</span>
          </span>
        </button>
        <Stars value={r.rating} size={14} />
      </div>
      {(r.workPlace || r.confirmed) && (
        <div className={s.reviewPlace}>
          {r.workPlace && <span className={s.reviewPlaceText}>📍 {r.workPlace}{when ? ' · ' + when : ''}</span>}
          {r.confirmed && <span className={s.okTag}><Check size={12} strokeWidth={3} />работали вместе</span>}
        </div>
      )}
      {crit.length > 0 && <div className={s.reviewCrit}>{crit.join(' · ')}</div>}
      {typeof r.wouldWorkAgain === 'boolean' && (
        <div className={s.reviewAgain}>
          Работал(а) бы снова:{' '}
          <span className={r.wouldWorkAgain ? s.yesText : s.noText}>{r.wouldWorkAgain ? 'Да' : 'Нет'}</span>
        </div>
      )}
      {r.text && <div className={s.reviewText}>{r.text}</div>}
    </div>
  )
}
