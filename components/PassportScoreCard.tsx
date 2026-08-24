// @ts-nocheck
'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Sparkles, Trophy } from 'lucide-react'

type Props = {
  score: number
  rating?: number | null
  sessions?: number
  sparks?: number
  fullName?: string
  username?: string
  city?: string | null
  avatarUrl?: string | null
}

// Canonical tier ladder — same thresholds as getTier() in app/[username]/page.tsx.
// Keep the two in sync: PLATINUM / GOLD / SILVER / BRONZE.
function scoreTone(s: number, sessions: number) {
  if (s >= 800 || sessions >= 25) return { color: '#C9B8FF', glow: 'rgba(155,143,255,0.40)', label: 'Excellent', tier: 'PLATINUM' }
  if (s >= 600 || sessions >= 10) return { color: '#D4AF37', glow: 'rgba(212,175,55,0.45)', label: 'Good',      tier: 'GOLD' }
  if (s >= 400 || sessions >= 5)  return { color: '#C0C8D8', glow: 'rgba(192,200,216,0.35)', label: 'Fair',      tier: 'SILVER' }
  return                             { color: '#CD8F4A', glow: 'rgba(205,143,74,0.30)', label: 'New',       tier: 'BRONZE' }
}

/**
 * Premium passport-style score card.
 * - Animated tick-up of the score on first paint
 * - Parallax tilt on mobile (devicemotion) and desktop (mouse)
 * - Glow intensity scales with score tier
 */
export default function PassportScoreCard({ score, rating, sessions, sparks, fullName, username, city, avatarUrl }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [displayedScore, setDisplayedScore] = useState(0)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [tiltEnabled, setTiltEnabled] = useState(false)

  const tone = scoreTone(score, sessions ?? 0)
  const pct = Math.min(100, Math.max(0, score / 10))

  // Decide tilt support after mount so SSR and first client render match.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (window.matchMedia('(hover: none)').matches) return
    setTiltEnabled(true)
  }, [])

  // Tick-up animation (eased)
  useEffect(() => {
    const start = performance.now()
    const duration = 1200
    const startVal = 0
    const delta = score - startVal
    let raf = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplayedScore(Math.round(startVal + delta * eased))
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [score])

  // Mouse parallax (desktop only, rAF-throttled)
  useEffect(() => {
    if (!tiltEnabled) return
    const el = cardRef.current
    if (!el) return
    let raf = 0
    let nextX = 0, nextY = 0
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      nextX = ((e.clientX - cx) / rect.width) * 6
      nextY = -((e.clientY - cy) / rect.height) * 6
      if (!raf) raf = requestAnimationFrame(() => {
        setTilt({ x: nextX, y: nextY })
        raf = 0
      })
    }
    const onLeave = () => setTilt({ x: 0, y: 0 })
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [tiltEnabled])

  const initials = fullName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <div
      ref={cardRef}
      style={{
        position: 'relative',
        borderRadius: '24px',
        padding: '28px 26px',
        background: 'linear-gradient(135deg, #131323 0%, #0E0E1B 100%)',
        border: `1px solid ${tone.color}33`,
        boxShadow: `0 8px 40px rgba(0,0,0,0.45), 0 0 60px ${tone.glow}`,
        transform: `perspective(900px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,
        transformStyle: 'preserve-3d',
        transition: 'transform 0.18s ease-out, box-shadow 0.4s ease',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow blob (follows tilt slightly) */}
      <div style={{
        position: 'absolute',
        top: '-40px',
        right: `${-40 + tilt.x * 1.2}px`,
        width: '220px',
        height: '220px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${tone.glow} 0%, transparent 70%)`,
        opacity: 0.6,
        pointerEvents: 'none',
      }} />

      {/* Top row — profile + tier badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px', overflow: 'hidden',
            background: '#1A1A2E',
            border: `1.5px solid ${tone.color}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontWeight: 700, color: tone.color, fontSize: '15px' }}>{initials}</span>
            }
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#F0EAFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fullName || 'Bestie'}
            </p>
            <p style={{ fontSize: '11px', color: '#A99ECC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              @{username || '—'}{city ? ` · ${city}` : ''}
            </p>
          </div>
        </div>
        <span style={{
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '1.5px',
          color: tone.color,
          padding: '5px 10px',
          borderRadius: '8px',
          background: `${tone.color}1A`,
          border: `1px solid ${tone.color}55`,
          whiteSpace: 'nowrap',
          flexShrink: 0,
          marginLeft: '8px',
        }}>
          {tone.tier}
        </span>
      </div>

      {/* Score */}
      <div style={{ textAlign: 'center', marginBottom: '14px', position: 'relative' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2.5px', color: '#A99ECC', marginBottom: '4px' }}>BESTIE SCORE</p>
        <div style={{
          fontFamily: 'DM Serif Display, serif',
          fontSize: 'clamp(64px, 14vw, 88px)',
          fontWeight: 700,
          color: tone.color,
          lineHeight: 1,
          textShadow: `0 0 40px ${tone.glow}`,
        }}>
          {displayedScore}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', marginBottom: '8px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: '999px',
          background: `linear-gradient(90deg, ${tone.color} 0%, #D4AF37 100%)`,
          boxShadow: `0 0 12px ${tone.glow}`,
          transition: 'width 1.2s cubic-bezier(.22,1,.36,1)',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#A99ECC', marginBottom: '22px' }}>
        <span>0</span>
        <span style={{ color: tone.color, fontWeight: 700 }}>{tone.label}</span>
        <span>1000</span>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '8px',
        paddingTop: '18px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}>
        {[
          { label: 'Sessions', val: sessions ?? 0 },
          { label: 'Rating',   val: rating ? rating.toFixed(1) : '—' },
          { label: 'Sparks',   val: sparks ?? 0 },
        ].map(s => (
          <div key={s.label} style={{ padding: '10px 4px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#F0EAFF', marginBottom: '2px' }}>{s.val}</div>
            <div style={{ fontSize: '10px', color: '#A99ECC', fontWeight: 600, letterSpacing: '0.5px' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
