// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FIRES, EVENTS, FACTIONS } from '@/lib/worldDemo'
import { ActivityIcon } from '@/lib/activityIcons'
import { showToast } from '@/components/Toast'
import { supabase } from '@/lib/supabase'

// ---------------------------------------------------------------------------
// Deterministic pseudo-random (same on server & client — no hydration drift)
// ---------------------------------------------------------------------------
function prand(seed) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

// 28 fireflies, generated once at module level
const FIREFLIES = Array.from({ length: 28 }, (_, i) => ({
  left: 3 + prand(i * 1.31 + 1) * 92,
  top: 14 + prand(i * 2.17 + 2) * 72,
  size: prand(i * 3.7 + 3) > 0.55 ? 3 : 2,
  dur: 14 + prand(i * 4.9 + 4) * 16,
  delay: -prand(i * 5.3 + 5) * 20,
  path: i % 4,
  scale: 0.8 + prand(i * 6.1 + 6) * 0.5,
}))

// Fire is rendered as LIGHT, not drawn flames — cinematic, not cartoon.
// Each state = ground light pool + halo + breathing white-amber core orbs +
// rising spark motes. No shaped "flame tongues" anywhere.
const FLAME_CFG = {
  blazing: {
    glow: 175, glowCore: 0.4,
    pool: { w: 120, h: 34, o: 0.34 },
    cores: [
      { s: 16, dur: 2.3, o: 0.9 },
      { s: 9,  dur: 1.5, o: 1 },
    ],
    sparks: 3,
  },
  steady: {
    glow: 120, glowCore: 0.3,
    pool: { w: 88, h: 26, o: 0.26 },
    cores: [
      { s: 12, dur: 2.9, o: 0.85 },
      { s: 7,  dur: 1.9, o: 1 },
    ],
    sparks: 2,
  },
  dim: {
    glow: 58, glowCore: 0.14,
    pool: { w: 46, h: 15, o: 0.12 },
    cores: [
      { s: 7, dur: 4.6, o: 0.7, dim: true },
    ],
    sparks: 0,
  },
  ash: { glow: 0, glowCore: 0, pool: null, cores: [], sparks: 0 },
  unlit: { glow: 0, glowCore: 0, pool: null, cores: [], sparks: 0 },
}

// Static film grain (SVG turbulence tile as data URI — zero runtime cost)
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")"

const HORIZON = [
  { id: 'light', left: '10%', w: '52vw', h: '30vh', dur: '7.5s' },
  { id: 'flow', left: '50%', w: '60vw', h: '34vh', dur: '9s' },
  { id: 'flame', left: '90%', w: '52vw', h: '30vh', dur: '6.5s' },
]

export default function WorldPage() {
  const [selected, setSelected] = useState(null)
  const [hoveredMember, setHoveredMember] = useState(null)
  const [loggedIn, setLoggedIn] = useState(false)
  const [evIdx, setEvIdx] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setLoggedIn(!!session))
  }, [])

  // Deep link: /world?fire=burning-man opens that fire's card on arrival —
  // share the link and visitors land straight in the story, no signup wall.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('fire')
    if (!id) return
    const f = FIRES.find((x) => x.id === id)
    if (f) setTimeout(() => setSelected(f), 600)
  }, [])
  const [evVisible, setEvVisible] = useState(true)

  // Live feed ticker: hold ~3.5s, fade 0.7s (interval well above the 3s floor)
  useEffect(() => {
    const iv = setInterval(() => {
      setEvVisible(false)
      setTimeout(() => {
        setEvIdx((i) => (i + 1) % EVENTS.length)
        setEvVisible(true)
      }, 700)
    }, 4300)
    return () => clearInterval(iv)
  }, [])

  // Escape closes the bottom sheet
  useEffect(() => {
    if (!selected) return
    const onKey = (e) => { if (e.key === 'Escape') setSelected(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected])

  const totalMembers = FIRES.reduce((s, f) => s + f.members.length, 0) + 30
  const burning = FIRES.filter((f) => f.state !== 'ash' && f.state !== 'unlit').length
  const factionOf = (id) => FACTIONS.find((f) => f.id === id)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        height: '100dvh',
        overflow: 'hidden',
        background: '#050B08',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <style>{`
        .bw-fire-node { --mscale: 1; }
        @media (max-width: 640px) {
          .bw-fire-node { --mscale: 0.74; }
        }
        @media (prefers-reduced-motion: no-preference) {
          .bw-hglow { animation-name: bwHPulse; animation-iteration-count: infinite; animation-timing-function: ease-in-out; }
          .bw-fog { animation: bwFog 60s ease-in-out infinite alternate; }
          .bw-core { animation-name: bwBreathe; animation-iteration-count: infinite; animation-timing-function: ease-in-out; }
          .bw-core-dim { animation-name: bwBreatheDim; animation-iteration-count: infinite; animation-timing-function: ease-in-out; }
          .bw-spark { animation-name: bwSpark; animation-iteration-count: infinite; animation-timing-function: ease-out; }
          .bw-ember { animation: bwEmber 4s ease-in-out infinite; }
          .bw-ff0 { animation-name: bwDriftA; animation-iteration-count: infinite; animation-direction: alternate; animation-timing-function: ease-in-out; }
          .bw-ff1 { animation-name: bwDriftB; animation-iteration-count: infinite; animation-direction: alternate; animation-timing-function: ease-in-out; }
          .bw-ff2 { animation-name: bwDriftC; animation-iteration-count: infinite; animation-direction: alternate; animation-timing-function: ease-in-out; }
          .bw-ff3 { animation-name: bwDriftD; animation-iteration-count: infinite; animation-direction: alternate; animation-timing-function: ease-in-out; }
          .bw-sheet { animation: bwSheetUp 0.32s cubic-bezier(0.22, 1, 0.36, 1); }
          .bw-backdrop { animation: bwFadeIn 0.25s ease; }
        }
        @keyframes bwHPulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.8; } }
        @keyframes bwFog { 0% { transform: translateX(-3%); } 100% { transform: translateX(3%); } }
        @keyframes bwBreathe {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          23% { transform: translate(-50%, -50%) scale(1.14); opacity: 0.82; }
          47% { transform: translate(-50%, -50%) scale(0.93); opacity: 1; }
          71% { transform: translate(-50%, -50%) scale(1.08); opacity: 0.88; }
        }
        @keyframes bwBreatheDim {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.55; }
          50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.8; }
        }
        @keyframes bwSpark {
          0% { transform: translate(0, 0); opacity: 0; }
          12% { opacity: 0.9; }
          70% { opacity: 0.5; }
          100% { transform: translate(var(--sx, 4px), -34px); opacity: 0; }
        }
        @keyframes bwEmber { 0%, 100% { opacity: 0.12; } 50% { opacity: 0.9; } }
        @keyframes bwDriftA {
          0% { transform: translate(0, 0) scale(1); opacity: 0.3; }
          35% { opacity: 0.8; }
          70% { opacity: 0.4; }
          100% { transform: translate(46px, -34px) scale(0.9); opacity: 0.7; }
        }
        @keyframes bwDriftB {
          0% { transform: translate(0, 0) scale(0.9); opacity: 0.35; }
          40% { opacity: 0.75; }
          100% { transform: translate(-40px, -24px) scale(1.05); opacity: 0.45; }
        }
        @keyframes bwDriftC {
          0% { transform: translate(0, 0) scale(1); opacity: 0.4; }
          50% { opacity: 0.8; }
          100% { transform: translate(32px, 24px) scale(0.85); opacity: 0.3; }
        }
        @keyframes bwDriftD {
          0% { transform: translate(0, 0) scale(0.85); opacity: 0.3; }
          45% { opacity: 0.7; }
          100% { transform: translate(-28px, 30px) scale(1.1); opacity: 0.6; }
        }
        @keyframes bwSheetUp { from { transform: translateY(28px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes bwFadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* 1 — SKY & DAWN GLOW */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: [
            'radial-gradient(ellipse 72% 44% at 50% 24%, rgba(232,199,102,0.15), rgba(43,92,84,0.13) 45%, rgba(5,11,8,0) 70%)',
            'linear-gradient(to bottom, #061009 0%, #07120C 32%, #050B08 62%)',
          ].join(', '),
        }}
      />

      {/* Faction glows on the horizon */}
      {HORIZON.map((h) => {
        const c = factionOf(h.id)?.color || '#E8C766'
        return (
          <div
            key={h.id}
            className="bw-hglow"
            style={{
              position: 'absolute',
              left: h.left,
              top: '22%',
              width: h.w,
              height: h.h,
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background: `radial-gradient(ellipse at center, ${c}4D 0%, ${c}1F 42%, transparent 70%)`,
              opacity: 0.6,
              animationDuration: h.dur,
              pointerEvents: 'none',
            }}
          />
        )
      })}

      {/* Treeline silhouette — two static layers for depth */}
      <svg
        viewBox="0 0 100 12"
        preserveAspectRatio="none"
        style={{ position: 'absolute', top: '19.5%', left: 0, width: '100%', height: '11%', pointerEvents: 'none' }}
      >
        <path
          d="M0 12 L0 7 L2 5 L4 7 L6 4.4 L8 6.6 L11 4.8 L13 7 L16 4.5 L18 6.8 L21 4 L23 6.6 L26 4.7 L28 7 L31 4.3 L33 6.7 L36 4.8 L38 7 L41 4.1 L43 6.6 L46 4.6 L48 7 L51 4.4 L53 6.8 L56 4.9 L58 7 L61 4.2 L63 6.6 L66 4.7 L68 7 L71 4.3 L73 6.7 L76 4.8 L78 7 L81 4.1 L83 6.6 L86 4.6 L88 7 L91 4.5 L93 6.8 L96 4.9 L98 6.5 L100 5.2 L100 12 Z"
          fill="#04140C"
        />
        <path
          d="M0 12 L0 8.5 L3 6.2 L5 8.4 L8 5.6 L10 8 L13 6 L15 8.4 L18 5.8 L20 8.2 L23 6.3 L25 8.5 L28 5.7 L30 8.1 L33 6.1 L35 8.4 L38 5.9 L40 8.2 L43 6.2 L45 8.5 L48 5.8 L50 8.1 L53 6 L55 8.4 L58 6.2 L60 8.2 L63 5.9 L65 8.5 L68 6.1 L70 8.2 L73 6.3 L75 8.4 L78 5.8 L80 8.1 L83 6.2 L85 8.5 L88 6 L90 8.2 L93 6.2 L95 8.4 L98 6.4 L100 8 L100 12 Z"
          fill="#02100A"
        />
      </svg>

      {/* 2 — FOG at the treeline */}
      <div
        className="bw-fog"
        style={{
          position: 'absolute',
          left: '-6%',
          top: '24%',
          width: '70%',
          height: '9%',
          borderRadius: '50%',
          background: 'rgba(150,190,178,0.055)',
          filter: 'blur(28px)',
          pointerEvents: 'none',
        }}
      />
      <div
        className="bw-fog"
        style={{
          position: 'absolute',
          right: '-8%',
          top: '26.5%',
          width: '64%',
          height: '8%',
          borderRadius: '50%',
          background: 'rgba(170,200,170,0.05)',
          filter: 'blur(26px)',
          animationDelay: '-30s',
          animationDuration: '74s',
          pointerEvents: 'none',
        }}
      />

      {/* 3 — THE CLEARING */}
      <div
        style={{
          position: 'absolute',
          left: '-12%',
          right: '-12%',
          top: '28%',
          bottom: '-8%',
          background: [
            'radial-gradient(ellipse at 50% 52%, #121A10 0%, #0A130D 46%, rgba(10,19,13,0) 74%)',
            'repeating-radial-gradient(ellipse at 50% 52%, rgba(255,220,160,0.014) 0 42px, rgba(0,0,0,0) 42px 84px)',
          ].join(', '),
          pointerEvents: 'none',
        }}
      />

      {/* 4 — CAMPFIRES */}
      {FIRES.map((fire, idx) => {
        const cfg = FLAME_CFG[fire.state] || FLAME_CFG.steady
        const isAsh = fire.state === 'ash'
        const isUnlit = fire.state === 'unlit'
        const boost = fire.epic ? 1.45 : 1
        const depth = (0.72 + ((fire.y - 30) / 58) * 0.46) * boost
        const n = fire.members.length
        return (
          <div
            key={fire.id}
            className="bw-fire-node"
            role="button"
            tabIndex={0}
            aria-label={`${fire.name} — tap to view`}
            onClick={() => setSelected(fire)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelected(fire) }}
            style={{
              position: 'absolute',
              left: `${fire.x}%`,
              top: `${fire.y}%`,
              zIndex: Math.round(fire.y),
              transform: 'translate(-50%, -55%)',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <div
              style={{
                position: 'relative',
                width: 130,
                height: 108,
                transform: `scale(calc(${depth.toFixed(2)} * var(--mscale)))`,
                transformOrigin: '50% 48%',
              }}
            >
              {/* epic landmark: a soft column of light rising from the pyre */}
              {fire.epic && !isAsh && (
                <div
                  className="bw-hglow"
                  style={{
                    position: 'absolute',
                    left: 65,
                    top: -76,
                    width: 30,
                    height: 128,
                    transform: 'translateX(-50%)',
                    background: 'linear-gradient(to top, rgba(255,196,107,0.30), rgba(255,196,107,0.10) 55%, transparent 100%)',
                    borderRadius: '50% 50% 0 0 / 12% 12% 0 0',
                    animationDuration: '5.5s',
                    pointerEvents: 'none',
                  }}
                />
              )}

              {/* warm ground glow */}
              {!isAsh && !isUnlit && (
                <div
                  style={{
                    position: 'absolute',
                    left: 65,
                    top: 46,
                    width: cfg.glow,
                    height: cfg.glow,
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '50%',
                    background: `radial-gradient(circle, rgba(255,150,60,${cfg.glowCore}) 0%, rgba(255,110,40,${(cfg.glowCore * 0.35).toFixed(3)}) 45%, rgba(255,110,40,0) 72%)`,
                    pointerEvents: 'none',
                  }}
                />
              )}

              {/* crossed logs (cold, desaturated on an unlit pit) */}
              {!isAsh && (
                <>
                  <div style={{ position: 'absolute', left: 65, top: 52, width: 27, height: 5, borderRadius: 3, background: isUnlit ? '#2A2620' : '#4A2F1D', transform: 'translate(-50%, -50%) rotate(21deg)' }} />
                  <div style={{ position: 'absolute', left: 65, top: 52, width: 27, height: 5, borderRadius: 3, background: isUnlit ? '#241F1A' : '#3D2716', transform: 'translate(-50%, -50%) rotate(-23deg)' }} />
                </>
              )}

              {/* unlit pit: a quiet stone ring waiting for a founder */}
              {isUnlit && (
                <>
                  {[0, 1, 2, 3, 4, 5].map((k) => {
                    const a = (k / 6) * Math.PI * 2
                    return (
                      <div
                        key={k}
                        style={{
                          position: 'absolute',
                          left: 65 + Math.cos(a) * 17,
                          top: 53 + Math.sin(a) * 8,
                          width: 6,
                          height: 4.5,
                          transform: 'translate(-50%, -50%)',
                          borderRadius: '50%',
                          background: '#3A3F3A',
                          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.06)',
                        }}
                      />
                    )
                  })}
                </>
              )}

              {/* fire = light: ground pool + breathing core orbs + rising sparks */}
              {isAsh ? (
                <>
                  <div style={{ position: 'absolute', left: 65, top: 54, width: 27, height: 11, transform: 'translate(-50%, -100%)', borderRadius: '50% 50% 8% 8%', background: '#33332F', boxShadow: 'inset 0 3px 4px rgba(255,255,255,0.04)' }} />
                  <div className="bw-ember" style={{ position: 'absolute', left: 63, top: 45, width: 3, height: 3, borderRadius: '50%', background: '#FF9A3C', boxShadow: '0 0 6px rgba(255,154,60,0.8)', opacity: 0.12 }} />
                </>
              ) : (
                <>
                  {/* warm light pooling on the ground — the cinematic tell */}
                  {cfg.pool && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 65,
                        top: 57,
                        width: cfg.pool.w,
                        height: cfg.pool.h,
                        transform: 'translate(-50%, -50%)',
                        borderRadius: '50%',
                        background: `radial-gradient(ellipse at center, rgba(255,166,88,${cfg.pool.o}) 0%, rgba(214,120,50,${(cfg.pool.o * 0.4).toFixed(3)}) 48%, transparent 74%)`,
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                  {/* breathing white-amber cores — flicker as light, not shape */}
                  {cfg.cores.map((c, j) => (
                    <div
                      key={j}
                      className={c.dim ? 'bw-core-dim' : 'bw-core'}
                      style={{
                        position: 'absolute',
                        left: 65,
                        top: 47 - j * 2,
                        width: c.s,
                        height: c.s,
                        transform: 'translate(-50%, -50%)',
                        borderRadius: '50%',
                        background: c.dim
                          ? 'radial-gradient(circle, #E8B87E 0%, rgba(169,127,85,0.7) 55%, transparent 100%)'
                          : 'radial-gradient(circle, #FFF6E3 0%, #FFC46B 45%, rgba(255,122,47,0.55) 75%, transparent 100%)',
                        boxShadow: c.dim
                          ? '0 0 8px 2px rgba(200,150,90,0.3)'
                          : `0 0 ${10 + c.s}px ${3 + c.s * 0.3}px rgba(255,170,80,0.45)`,
                        opacity: c.o,
                        animationDuration: `${c.dur}s`,
                        animationDelay: `${((idx * 0.61 + j * 0.29) % 1.7).toFixed(2)}s`,
                        pointerEvents: 'none',
                      }}
                    />
                  ))}
                  {/* spark motes drifting up */}
                  {Array.from({ length: cfg.sparks }, (_, j) => (
                    <div
                      key={`s${j}`}
                      className="bw-spark"
                      style={{
                        position: 'absolute',
                        left: 63 + j * 3,
                        top: 44,
                        width: 2,
                        height: 2,
                        borderRadius: '50%',
                        background: '#FFC46B',
                        boxShadow: '0 0 4px rgba(255,196,107,0.8)',
                        '--sx': `${(j - 1) * 7}px`,
                        animationDuration: `${(1.9 + j * 0.45).toFixed(2)}s`,
                        animationDelay: `${((idx * 0.53 + j * 0.7) % 2.1).toFixed(2)}s`,
                        opacity: 0,
                        pointerEvents: 'none',
                      }}
                    />
                  ))}
                </>
              )}

              {/* members — warm dots in an arc; hover shows a passport preview */}
              {fire.members.map((m, j) => {
                const t = Math.PI * (0.22 + (n > 1 ? (j / (n - 1)) * 0.56 : 0.28))
                const mx = 65 + Math.cos(t) * 30
                const my = 55 + Math.sin(t) * 15
                const hovKey = `${fire.id}:${j}`
                const isHov = hoveredMember === hovKey
                return (
                  <div
                    key={j}
                    onMouseEnter={() => setHoveredMember(hovKey)}
                    onMouseLeave={() => setHoveredMember(null)}
                    onClick={(e) => { e.stopPropagation(); showToast(`${m.name}’s passport opens here when quests go live ✨`, { type: 'info' }) }}
                    style={{
                      position: 'absolute',
                      left: mx,
                      top: my,
                      width: 16,
                      height: 16,
                      margin: '-8px 0 0 -8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      zIndex: isHov ? 5 : 1,
                    }}
                  >
                    <div
                      style={{
                        width: isHov ? 10 : 7,
                        height: isHov ? 10 : 7,
                        borderRadius: '50%',
                        background: isAsh ? '#6E695E' : 'radial-gradient(circle, #FFE9C8 0%, #FFC98F 70%)',
                        boxShadow: isAsh ? 'none' : isHov ? '0 0 14px 4px rgba(255,190,120,0.65)' : '0 0 9px 2px rgba(255,190,120,0.4)',
                        opacity: isAsh ? 0.6 : 0.95,
                        transition: 'width 0.12s, height 0.12s, box-shadow 0.12s',
                      }}
                    />
                    {/* passport preview */}
                    {isHov && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 18,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 12px',
                          borderRadius: 12,
                          background: 'rgba(13,16,13,0.92)',
                          border: '1px solid rgba(212,175,55,0.3)',
                          boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
                          whiteSpace: 'nowrap',
                          pointerEvents: 'none',
                          backdropFilter: 'blur(8px)',
                        }}
                      >
                        <span style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#FFD9A0', background: 'rgba(255,217,160,0.12)', border: '1px solid rgba(255,217,160,0.4)', flexShrink: 0 }}>
                          {m.initials}
                        </span>
                        <span style={{ textAlign: 'left' }}>
                          <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#F0EAFF', lineHeight: 1.2 }}>{m.name}</span>
                          <span style={{ display: 'block', fontSize: 9.5, color: '#A99ECC', lineHeight: 1.3 }}>View passport →</span>
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* name + streak */}
              <div style={{ position: 'absolute', left: 0, right: 0, top: 76, textAlign: 'center', pointerEvents: 'none' }}>
                <div
                  style={{
                    fontSize: fire.epic ? 11 : 10,
                    fontWeight: fire.epic ? 700 : 400,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: fire.epic ? '#E8C766' : 'var(--text-muted, #A99ECC)',
                    whiteSpace: 'nowrap',
                    textShadow: '0 1px 6px rgba(0,0,0,0.8)',
                  }}
                >
                  {fire.name}
                </div>
                {!isAsh && !isUnlit && (
                  <div
                    style={{
                      display: 'inline-block',
                      marginTop: 4,
                      fontSize: 9,
                      lineHeight: 1,
                      padding: '3px 7px',
                      borderRadius: 999,
                      color: '#D4AF37',
                      border: '1px solid rgba(212,175,55,0.4)',
                      background: 'rgba(212,175,55,0.08)',
                    }}
                  >
                    🔥 {fire.streakDays} days burning
                  </div>
                )}
                {isUnlit && (
                  <div
                    style={{
                      display: 'inline-block',
                      marginTop: 4,
                      fontSize: 9,
                      lineHeight: 1,
                      padding: '3px 7px',
                      borderRadius: 999,
                      color: 'var(--text-muted, #A99ECC)',
                      border: '1px dashed rgba(212,175,55,0.45)',
                      background: 'rgba(212,175,55,0.05)',
                    }}
                  >
                    Light it first · +15 ✨
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {/* 5 — FIREFLIES */}
      {FIREFLIES.map((ff, i) => (
        <div
          key={i}
          className={`bw-ff${ff.path}`}
          style={{
            position: 'absolute',
            left: `${ff.left.toFixed(1)}%`,
            top: `${ff.top.toFixed(1)}%`,
            width: ff.size,
            height: ff.size,
            borderRadius: '50%',
            background: 'rgba(255,236,180,0.9)',
            boxShadow: '0 0 6px rgba(255,220,150,0.55)',
            opacity: 0.45,
            transform: `scale(${ff.scale.toFixed(2)})`,
            animationDuration: `${ff.dur.toFixed(1)}s`,
            animationDelay: `${ff.delay.toFixed(1)}s`,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* CINEMATIC GRADE — vignette + static film grain over the scene */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 92,
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse 105% 90% at 50% 44%, transparent 52%, rgba(0,0,0,0.34) 82%, rgba(0,0,0,0.62) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 93,
          pointerEvents: 'none',
          backgroundImage: GRAIN,
          backgroundSize: '180px 180px',
          opacity: 0.05,
          mixBlendMode: 'overlay',
        }}
      />

      {/* 6 — LIVE FEED (bottom-left) */}
      <div
        style={{
          position: 'absolute',
          left: 16,
          bottom: 'calc(18px + env(safe-area-inset-bottom))',
          zIndex: 95,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          maxWidth: '58vw',
          opacity: evVisible ? 1 : 0,
          transition: 'opacity 0.7s ease',
          pointerEvents: 'none',
        }}
      >
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#D4AF37', flexShrink: 0, boxShadow: '0 0 5px rgba(212,175,55,0.7)' }} />
        <span style={{ fontSize: 12, color: 'var(--text-muted, #A99ECC)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {EVENTS[evIdx]}
        </span>
      </div>

      {/* 7 — HUD */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 96,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 16px 0',
          paddingTop: 'calc(14px + env(safe-area-inset-top))',
        }}
      >
        <span
          style={{
            fontSize: 11,
            letterSpacing: '0.08em',
            color: '#D4AF37',
            border: '1px solid rgba(212,175,55,0.45)',
            borderRadius: 999,
            padding: '6px 12px',
            background: 'rgba(5,11,8,0.5)',
            backdropFilter: 'blur(4px)',
            whiteSpace: 'nowrap',
          }}
        >
          🌲 BESTIE WORLD · early concept
        </span>
        <Link
          href="/dashboard"
          style={{ fontSize: 13, color: 'var(--text-muted, #A99ECC)', textDecoration: 'none', padding: '6px 4px' }}
        >
          ‹ Back
        </Link>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 'calc(52px + env(safe-area-inset-top))',
          right: 16,
          zIndex: 96,
          fontSize: 11,
          color: 'var(--text-muted, #A99ECC)',
          textAlign: 'right',
          textShadow: '0 1px 6px rgba(0,0,0,0.8)',
        }}
      >
        {totalMembers} in the world · {burning} fires burning
      </div>

      {/* Faction legend (bottom-right) */}
      <div
        style={{
          position: 'absolute',
          right: 16,
          bottom: 'calc(16px + env(safe-area-inset-bottom))',
          zIndex: 95,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          alignItems: 'flex-end',
          pointerEvents: 'none',
        }}
      >
        {FACTIONS.map((f) => {
          const meaning = f.id === 'light' ? 'mind' : f.id === 'flow' ? 'people' : 'body'
          return (
            <div key={f.id} title={f.blurb} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted, #A99ECC)' }}>
                {f.label} <span style={{ opacity: 0.65 }}>· {meaning}</span>
              </span>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: f.color, boxShadow: `0 0 6px ${f.color}66` }} />
            </div>
          )
        })}
      </div>

      {/* 8 — BOTTOM SHEET */}
      {selected && (
        <>
          <div
            className="bw-backdrop"
            onClick={() => setSelected(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 97 }}
          />
          <div
            className="bw-sheet"
            role="dialog"
            aria-label={selected.name}
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 98,
              maxWidth: 520,
              margin: '0 auto',
              background: 'var(--surface-1, #111120)',
              borderRadius: '20px 20px 0 0',
              border: '1px solid rgba(255,255,255,0.07)',
              borderBottom: 'none',
              padding: '14px 20px calc(22px + env(safe-area-inset-bottom))',
              boxShadow: '0 -12px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '0 auto 16px' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ display: 'inline-flex', color: '#D4AF37' }}>
                <ActivityIcon type={selected.activityType} size={20} />
              </span>
              <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--text, #F0EDF7)' }}>{selected.name}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              {(() => {
                const fac = factionOf(selected.faction)
                return fac ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 11,
                      padding: '4px 10px',
                      borderRadius: 999,
                      color: fac.color,
                      border: `1px solid ${fac.color}66`,
                      background: `${fac.color}14`,
                    }}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: fac.color }} />
                    {fac.label}
                  </span>
                ) : null
              })()}
              {selected.state === 'ash' ? (
                <span
                  style={{
                    fontSize: 11,
                    padding: '4px 10px',
                    borderRadius: 999,
                    color: 'var(--text-muted, #A99ECC)',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  Gone to ash
                </span>
              ) : selected.state === 'unlit' ? (
                <span
                  style={{
                    fontSize: 11,
                    padding: '4px 10px',
                    borderRadius: 999,
                    color: 'var(--text-muted, #A99ECC)',
                    border: '1px dashed rgba(212,175,55,0.45)',
                  }}
                >
                  Waiting for a founder
                </span>
              ) : (
                <span
                  title="Days in a row this crew has checked in"
                  style={{
                    fontSize: 11,
                    padding: '4px 10px',
                    borderRadius: 999,
                    color: '#D4AF37',
                    border: '1px solid rgba(212,175,55,0.4)',
                    background: 'rgba(212,175,55,0.08)',
                  }}
                >
                  🔥 Burning {selected.streakDays} days straight
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              {selected.members.map((m, i) => (
                <span
                  key={i}
                  title={m.name}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#FFD9A0',
                    background: 'rgba(255,217,160,0.1)',
                    border: '1px solid rgba(255,217,160,0.35)',
                  }}
                >
                  {m.initials}
                </span>
              ))}
              <span style={{ fontSize: 12, color: 'var(--text-muted, #A99ECC)', marginLeft: 2 }}>
                {selected.state === 'unlit' ? 'No one here yet — light it and lead' : `${selected.members.length} around this fire`}
              </span>
            </div>

            {/* How the rewards work — founder earns more than a joiner */}
            <p style={{ fontSize: 12, color: 'var(--text-muted, #A99ECC)', lineHeight: 1.55, margin: '0 0 16px' }}>
              {selected.state === 'unlit'
                ? 'Light a fire and you’re its founder: +15 ✨ Sparks when the crew takes its first step together. Joining someone else’s fire earns +2 ✨.'
                : selected.state === 'ash'
                ? 'This fire went cold. Rekindle it and the founder bonus is yours: +15 ✨ when the crew moves again.'
                : 'Check in together to keep it burning — every shared day counts ×' + Math.max(selected.members.length, 1) + ' for everyone. Joining earns +2 ✨.'}
            </p>

            <button
              onClick={() => {
                // Landmark fires point at a REAL destination (an actual session)
                if (selected.href) { window.location.href = selected.href; return }
                // Visitors without an account → the join path starts at signup
                if (!loggedIn) { window.location.href = '/signup'; return }
                showToast('Quests are coming soon — this is a concept preview ✨', { type: 'info' })
              }}
              style={{
                width: '100%',
                padding: '13px 16px',
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '0.02em',
                color: '#141007',
                background: 'linear-gradient(135deg, #E5C558, #D4AF37)',
                boxShadow: '0 4px 18px rgba(212,175,55,0.25)',
              }}
            >
              {selected.href
                ? 'Open the camp →'
                : !loggedIn
                ? 'Sign up free to join this fire'
                : selected.state === 'ash'
                ? 'Rekindle from the ashes · +15 ✨'
                : selected.state === 'unlit'
                ? 'Light this fire · +15 ✨'
                : 'Join this fire · +2 ✨'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
