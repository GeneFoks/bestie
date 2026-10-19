// @ts-nocheck
'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Flame, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Props = {
  weeks: number
  totalSessions?: number
  hideWhenEmpty?: boolean
  /** Current user's id — lets the strip fetch this week's meetups without an extra auth round-trip. */
  userId?: string
}

function streakTone(weeks: number) {
  if (weeks >= 12) return { color: '#34D399', glow: 'rgba(52,211,153,0.35)', label: 'Legend streak' }
  if (weeks >= 8)  return { color: '#D4AF37', glow: 'rgba(212,175,55,0.35)', label: 'On fire'      }
  if (weeks >= 4)  return { color: '#FF7857', glow: 'rgba(255,120,87,0.30)', label: 'Heating up'   }
  if (weeks >= 1)  return { color: '#9B7FFF', glow: 'rgba(155,127,255,0.25)',label: 'Building'    }
  return            { color: '#A99ECC', glow: 'rgba(169,158,204,0.0)',  label: 'Start now'   }
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// Monday = 0 … Sunday = 6, local time — used for the visual day dots
const isoDayIndex = (d: Date) => (d.getDay() + 6) % 7

// The server streak (recalculate_bestie_score) buckets ISO weeks in UTC, so
// the lapse WARNING must use UTC weeks too or it misfires near week edges.
function utcWeekBounds() {
  const now = new Date()
  const dow = (now.getUTCDay() + 6) % 7
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dow))
  const nextMonday = new Date(monday.getTime() + 7 * 86400000)
  const lastMonday = new Date(monday.getTime() - 7 * 86400000)
  return { monday, nextMonday, lastMonday }
}

function weekBounds() {
  const now = new Date()
  const monday = new Date(now)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() - isoDayIndex(now))
  const nextMonday = new Date(monday); nextMonday.setDate(monday.getDate() + 7)
  const lastMonday = new Date(monday); lastMonday.setDate(monday.getDate() - 7)
  return { now, monday, nextMonday, lastMonday }
}

/**
 * Slim streak indicator strip for the Dashboard.
 * Shows the current weekly streak with a fire icon, a Mon–Sun week track
 * (filled on days with a confirmed meetup or event check-in), and a soft
 * warning late in the week when the streak is about to lapse.
 */
export default function StreakStrip({ weeks, totalSessions = 0, hideWhenEmpty = false, userId }: Props) {
  // Week track state. `loaded` stays false if the queries fail — the cells
  // then render as visual-only (today marked) and the warning never shows.
  const [meetupDays, setMeetupDays] = useState<boolean[]>([false, false, false, false, false, false, false])
  const [checkinDays, setCheckinDays] = useState<boolean[]>([false, false, false, false, false, false, false])
  const [lastWeekMeetup, setLastWeekMeetup] = useState(false)
  const [utcThisWeekMeetup, setUtcThisWeekMeetup] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const skip = hideWhenEmpty && weeks === 0 && totalSessions === 0

  useEffect(() => {
    if (skip) return
    let cancelled = false
    const load = async () => {
      try {
        let uid = userId
        if (!uid) {
          const { data: { session } } = await supabase.auth.getSession()
          uid = session?.user?.id
        }
        if (!uid) return
        const { monday, nextMonday, lastMonday } = weekBounds()
        const utc = utcWeekBounds()
        // Cover both the local and the UTC previous week
        const since = new Date(Math.min(lastMonday.getTime(), utc.lastMonday.getTime()) - 86400000).toISOString()

        // Streak weeks key off COALESCE(scheduled_at, created_at) of bookings
        // confirmed by both sides — mirror that with two small queries.
        const [scheduled, unscheduled, checkins] = await Promise.all([
          supabase.from('bookings').select('scheduled_at, created_at')
            .or(`seeker_id.eq.${uid},provider_id.eq.${uid}`)
            .eq('confirmed_by_seeker', true).eq('confirmed_by_provider', true)
            .gte('scheduled_at', since)
            .limit(100),
          supabase.from('bookings').select('scheduled_at, created_at')
            .or(`seeker_id.eq.${uid},provider_id.eq.${uid}`)
            .eq('confirmed_by_seeker', true).eq('confirmed_by_provider', true)
            .is('scheduled_at', null)
            .gte('created_at', since)
            .limit(100),
          supabase.from('event_checkins').select('checked_in_at')
            .eq('user_id', uid)
            .gte('checked_in_at', since)
            .limit(50),
        ])
        if (cancelled) return
        if (scheduled.error || unscheduled.error) return

        const meet = [false, false, false, false, false, false, false]
        let prevWeekUtc = false
        let thisWeekUtc = false
        for (const b of [...(scheduled.data || []), ...(unscheduled.data || [])]) {
          const ts = b.scheduled_at || b.created_at
          if (!ts) continue
          const d = new Date(ts)
          // Dots: local week (what the user sees as "this week")
          if (d >= monday && d < nextMonday) meet[isoDayIndex(d)] = true
          // Warning: UTC weeks, matching the server's streak math
          if (d >= utc.monday && d < utc.nextMonday) thisWeekUtc = true
          else if (d >= utc.lastMonday && d < utc.monday) prevWeekUtc = true
        }
        const chk = [false, false, false, false, false, false, false]
        if (!checkins.error) {
          for (const c of checkins.data || []) {
            if (!c.checked_in_at) continue
            const d = new Date(c.checked_in_at)
            if (d >= monday && d < nextMonday) chk[isoDayIndex(d)] = true
          }
        }
        setMeetupDays(meet)
        setCheckinDays(chk)
        setLastWeekMeetup(prevWeekUtc)
        setUtcThisWeekMeetup(thisWeekUtc)
        setLoaded(true)
      } catch {
        // Leave the track visual-only.
      }
    }
    load()
    return () => { cancelled = true }
  }, [userId, skip])

  if (skip) return null
  const tone = streakTone(weeks)
  const active = weeks > 0

  const todayIdx = isoDayIndex(new Date())
  const dotColor = active ? tone.color : '#9B7FFF'
  // Only meetups (confirmed bookings) keep the streak alive. Warn from Friday
  // on, and only while the streak is genuinely still running — i.e. last week
  // counted — so a stale streak value never triggers a false alarm.
  const showWarning = loaded && weeks >= 1 && todayIdx >= 4 && !utcThisWeekMeetup && lastWeekMeetup

  return (
    <Link
      href="/score-guide"
      style={{
        display: 'block',
        padding: '14px 18px',
        borderRadius: '16px',
        background: active
          ? `linear-gradient(90deg, ${tone.color}1A 0%, transparent 100%)`
          : 'var(--surface-1)',
        border: `1px solid ${active ? tone.color + '40' : 'var(--border)'}`,
        textDecoration: 'none',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        marginBottom: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: active ? `${tone.color}1F` : 'rgba(169,158,204,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: active ? `0 0 16px ${tone.glow}` : 'none',
            position: 'relative',
          }}
        >
          {active
            ? <Flame size={22} color={tone.color} strokeWidth={1.8} fill={tone.color + '33'} />
            : <Sparkles size={20} color={tone.color} strokeWidth={1.8} />
          }
          {weeks >= 12 && (
            <span style={{
              position: 'absolute', inset: 0, borderRadius: '12px',
              border: `1.5px solid ${tone.color}66`,
              animation: 'streak-pulse 2.4s ease-out infinite',
            }} />
          )}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
            {active
              ? <>{weeks}-week streak <span style={{ color: tone.color, fontWeight: 600, fontSize: '12px', marginLeft: '6px' }}>{tone.label}</span></>
              : "Start your weekly streak"
            }
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {active
              ? (weeks >= 12 ? 'Max bonus unlocked — keep it alive' : `Meet someone this week to reach ${weeks + 1} weeks`)
              : 'One confirmed session per week. 12 weeks unlocks the rarest badge.'
            }
          </p>
        </div>
        <span className="streak-hint" style={{ fontSize: '13px', color: tone.color, fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>
          How it works →
        </span>
        <span className="streak-hint-mobile" style={{ display: 'none', color: tone.color, fontWeight: 700, fontSize: '18px', flexShrink: 0 }}>→</span>
      </div>

      {/* Week track — Mon…Sun */}
      <div
        role="list"
        aria-label="This week"
        style={{ display: 'flex', gap: '6px', marginTop: '12px', paddingLeft: '54px' }}
        className="streak-week"
      >
        {DAY_LABELS.map((label, i) => {
          const isToday = i === todayIdx
          const met = meetupDays[i]
          const checked = !met && checkinDays[i]
          const filled = met || checked
          const state = met ? 'meetup' : checked ? 'event check-in' : (i > todayIdx ? 'upcoming' : 'nothing yet')
          return (
            <div
              key={i}
              role="listitem"
              aria-label={`${DAY_NAMES[i]}${isToday ? ' (today)' : ''}: ${state}`}
              title={`${DAY_NAMES[i]}${isToday ? ' · today' : ''}${filled ? ` · ${state}` : ''}`}
              style={{ flex: '1 1 0', maxWidth: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
            >
              <span style={{ fontSize: '11px', fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--text-primary)' : 'var(--text-dim)', lineHeight: 1 }}>
                {label}
              </span>
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '999px',
                  background: met ? dotColor : checked ? `${dotColor}80` : 'transparent',
                  border: filled
                    ? `1.5px solid ${dotColor}`
                    : isToday ? '1.5px solid var(--text-primary)' : '1.5px solid var(--border-strong)',
                  boxShadow: met ? `0 0 8px ${dotColor}66` : 'none',
                  opacity: !filled && i > todayIdx ? 0.55 : 1,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )
        })}
      </div>

      {showWarning && (
        <p style={{ fontSize: '12px', fontWeight: 600, color: '#FF7857', marginTop: '10px', paddingLeft: '54px', lineHeight: 1.4 }} className="streak-warning">
          Your streak ends Sunday — one meetup keeps it alive 🔥
        </p>
      )}

      <style>{`
        @keyframes streak-pulse { 0% { transform: scale(1); opacity: 1 } 100% { transform: scale(1.5); opacity: 0 } }
        @media (max-width: 480px) {
          .streak-hint { display: none !important; }
          .streak-hint-mobile { display: inline !important; }
          .streak-week, .streak-warning { padding-left: 0 !important; }
        }
      `}</style>
    </Link>
  )
}
