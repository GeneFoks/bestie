// @ts-nocheck
'use client'

// Public «🗼 Вышки в США» block on a Bestie profile: rating, team and the last
// reviews from the Telegram group — shown only when the person linked their
// Telegram (/tower/link) and didn't hide themselves in the rating.
// Data: /api/tower/profile (service role, public fields only).

import { useEffect, useState } from 'react'
import { fmtWorkDate } from '@/lib/tower-app-shared'

const GOLD = '#D4AF37'
const CARD = { background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', marginBottom: '16px' }
const LABEL = { fontSize: '11px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 14px' }
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

// 1 отзыв · 2 отзыва · 5 отзывов
export function reviewsWord(n) {
  const a = Math.abs(n) % 100
  const b = a % 10
  if (a > 10 && a < 20) return 'отзывов'
  if (b === 1) return 'отзыв'
  if (b >= 2 && b <= 4) return 'отзыва'
  return 'отзывов'
}

function fmtDay(iso) {
  const d = new Date(iso || '')
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

function Stars({ n, size = 13 }) {
  const full = Math.max(0, Math.min(5, Math.round(Number(n) || 0)))
  return (
    <span aria-label={`${full} из 5`} style={{ fontSize: `${size}px`, letterSpacing: '1px', whiteSpace: 'nowrap' }}>
      <span style={{ color: GOLD }}>{'★'.repeat(full)}</span>
      <span style={{ color: 'var(--text-dim)' }}>{'★'.repeat(5 - full)}</span>
    </span>
  )
}

export default function TowerReputation({ userId }: { userId: string }) {
  const [rep, setRep] = useState(null)

  useEffect(() => {
    let alive = true
    setRep(null)
    if (!userId) return
    fetch('/api/tower/profile?user=' + encodeURIComponent(userId), { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d?.show) setRep(d) })
      .catch(() => {})
    return () => { alive = false }
  }, [userId])

  if (!rep) return null

  const rating = rep.rating && rep.rating.count > 0 ? rep.rating : null
  const reviews = Array.isArray(rep.reviews) ? rep.reviews.slice(0, 3) : []

  return (
    <div style={CARD}>
      <p style={LABEL}>🗼 Вышки в США</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px 8px', fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
        {rating ? (
          <>
            <span style={{ fontWeight: 700 }}>
              <span style={{ color: GOLD }}>★</span> {Number(rating.avg).toFixed(1)}
            </span>
            <span style={{ color: 'var(--text-dim)' }}>·</span>
            <span style={{ color: 'var(--text-muted)' }}>{rating.count} {reviewsWord(rating.count)}</span>
          </>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>Пока нет отзывов</span>
        )}
        {rep.team?.name ? (
          <>
            <span style={{ color: 'var(--text-dim)' }}>·</span>
            <span style={{ color: 'var(--text-muted)' }}>команда «{rep.team.name}»</span>
          </>
        ) : null}
      </div>

      {rep.wouldAgain && rep.wouldAgain.total > 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '6px 0 0' }}>
          Работали бы снова: <b style={{ color: 'var(--green, #34D399)' }}>{rep.wouldAgain.pct}%</b>
        </p>
      ) : null}

      {reviews.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
          {reviews.map((r, i) => {
            const when = fmtWorkDate(r.month, r.year)
            return (
              <div key={i} style={{ padding: '12px 14px', borderRadius: '12px', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 8px', fontSize: '13px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.author || 'Участник'}</span>
                  <Stars n={r.rating} />
                  {r.date ? <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>{fmtDay(r.date)}</span> : null}
                </div>
                {r.place || when ? (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '6px 0 0', overflowWrap: 'anywhere' }}>
                    📍 {[r.place, when].filter(Boolean).join(' · ')}
                  </p>
                ) : null}
                {r.text ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5, margin: '6px 0 0', whiteSpace: 'pre-line', overflowWrap: 'anywhere', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {r.text}
                  </p>
                ) : null}
                {r.confirmed ? (
                  <span style={{ display: 'inline-block', marginTop: '8px', padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, color: 'var(--green, #34D399)', background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.3)' }}>
                    ✓ работали вместе
                  </span>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
