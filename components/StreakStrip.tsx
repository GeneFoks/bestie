// @ts-nocheck
'use client'

import React from 'react'
import Link from 'next/link'
import { Flame, Sparkles } from 'lucide-react'

type Props = {
  weeks: number
  totalSessions?: number
  hideWhenEmpty?: boolean
}

function streakTone(weeks: number) {
  if (weeks >= 12) return { color: '#34D399', glow: 'rgba(52,211,153,0.35)', label: 'Legend streak' }
  if (weeks >= 8)  return { color: '#D4AF37', glow: 'rgba(212,175,55,0.35)', label: 'On fire'      }
  if (weeks >= 4)  return { color: '#FF7857', glow: 'rgba(255,120,87,0.30)', label: 'Heating up'   }
  if (weeks >= 1)  return { color: '#9B7FFF', glow: 'rgba(155,127,255,0.25)',label: 'Building'    }
  return            { color: '#A99ECC', glow: 'rgba(169,158,204,0.0)',  label: 'Start now'   }
}

/**
 * Slim streak indicator strip for the Dashboard.
 * Shows the current weekly streak with a fire icon; nudges users with 0
 * streak to book their first session.
 */
export default function StreakStrip({ weeks, totalSessions = 0, hideWhenEmpty = false }: Props) {
  if (hideWhenEmpty && weeks === 0 && totalSessions === 0) return null
  const tone = streakTone(weeks)
  const active = weeks > 0

  return (
    <Link
      href="/score-guide"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '14px 18px',
        borderRadius: '14px',
        background: active
          ? `linear-gradient(90deg, ${tone.color}1A 0%, transparent 100%)`
          : 'var(--surface-1)',
        border: `1px solid ${active ? tone.color + '40' : 'var(--border)'}`,
        textDecoration: 'none',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        marginBottom: '20px',
      }}
    >
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
      <style>{`
        @keyframes streak-pulse { 0% { transform: scale(1); opacity: 1 } 100% { transform: scale(1.5); opacity: 0 } }
        @media (max-width: 480px) {
          .streak-hint { display: none !important; }
          .streak-hint-mobile { display: inline !important; }
        }
      `}</style>
    </Link>
  )
}
