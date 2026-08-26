// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CAMPS, PLAYA_TICKER } from '@/lib/playaDemo'
import { showToast } from '@/components/Toast'
import { supabase } from '@/lib/supabase'

// ---------------------------------------------------------------------------
// Deterministic pseudo-random (same on server & client — no hydration drift)
// ---------------------------------------------------------------------------
function prand(seed) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

// ~40 STATIC stars — desert sky doesn't drift. Generated once at module level.
const STARS = Array.from({ length: 40 }, (_, i) => ({
  left: 2 + prand(i * 1.37 + 11) * 96,
  top: 2 + prand(i * 2.61 + 23) * 36,
  size: prand(i * 3.11 + 5) > 0.62 ? 2 : 1,
  o: 0.2 + prand(i * 4.73 + 7) * 0.5,
}))

// Static film grain (SVG turbulence tile as data URI — zero runtime cost)
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")"

// The BRC street plan, whispered: arc radii in % around the Man at (50, 46)
const CITY_ARCS = [19, 26, 33]

export default function BurningManPage() {
  const [selected, setSelected] = useState(null)
  const [hoveredMember, setHoveredMember] = useState(null)
  const [loggedIn, setLoggedIn] = useState(false)
  const [tkIdx, setTkIdx] = useState(0)
  const [tkVisible, setTkVisible] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setLoggedIn(!!session))
  }, [])

  // Live playa ticker: hold, fade 0.7s, swap — same rhythm as the world page
  useEffect(() => {
    const iv = setInterval(() => {
      setTkVisible(false)
      setTimeout(() => {
        setTkIdx((i) => (i + 1) % PLAYA_TICKER.length)
        setTkVisible(true)
      }, 700)
    }, 4500)
    return () => clearInterval(iv)
  }, [])

  // Escape closes the camp sheet
  useEffect(() => {
    if (!selected) return
    const onKey = (e) => { if (e.key === 'Escape') setSelected(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected])

  const totalBurners = CAMPS.reduce((s, c) => s + c.members.length, 0) + 40

  const gate = (msg) => {
    if (!loggedIn) { window.location.href = '/signup'; return }
    showToast(msg, { type: 'info' })
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        height: '100dvh',
        overflow: 'hidden',
        background: '#0A0810',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <style>{`
        .pm-node { --mscale: 1; }
        @media (max-width: 640px) {
          .pm-node { --mscale: 0.74; }
        }
        @media (prefers-reduced-motion: no-preference) {
          .pm-core { animation-name: pmBreathe; animation-iteration-count: infinite; animation-timing-function: ease-in-out; }
          .pm-spark { animation-name: pmSpark; animation-iteration-count: infinite; animation-timing-function: ease-out; }
          .pm-beam { animation: pmBeam 6.5s ease-in-out infinite; }
          .pm-dust { animation-name: pmDust; animation-iteration-count: infinite; animation-direction: alternate; animation-timing-function: ease-in-out; }
          .pm-sheet { animation: pmSheetUp 0.32s cubic-bezier(0.22, 1, 0.36, 1); }
          .pm-backdrop { animation: pmFadeIn 0.25s ease; }
        }
        @keyframes pmBreathe {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          23% { transform: translate(-50%, -50%) scale(1.14); opacity: 0.82; }
          47% { transform: translate(-50%, -50%) scale(0.93); opacity: 1; }
          71% { transform: translate(-50%, -50%) scale(1.08); opacity: 0.88; }
        }
        @keyframes pmSpark {
          0% { transform: translate(0, 0); opacity: 0; }
          12% { opacity: 0.9; }
          70% { opacity: 0.5; }
          100% { transform: translate(var(--sx, 4px), -38px); opacity: 0; }
        }
        @keyframes pmBeam { 0%, 100% { opacity: 0.55; } 50% { opacity: 0.85; } }
        @keyframes pmDust { 0% { transform: translateX(-3%); } 100% { transform: translateX(3%); } }
        @keyframes pmSheetUp { from { transform: translateY(28px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes pmFadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* 1 — SKY: near-black warm indigo */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: [
            'radial-gradient(ellipse 80% 60% at 50% 20%, #14101E 0%, #0E0B16 45%, #0A0810 78%)',
          ].join(', '),
        }}
      />

      {/* Milky-way band — one very soft diagonal stripe */}
      <div
        style={{
          position: 'absolute',
          left: '-22%',
          top: '2%',
          width: '144%',
          height: '30%',
          transform: 'rotate(-13deg)',
          background:
            'linear-gradient(to bottom, transparent 18%, rgba(233,224,255,0.05) 44%, rgba(255,242,220,0.06) 54%, rgba(233,224,255,0.04) 64%, transparent 84%)',
          pointerEvents: 'none',
        }}
      />

      {/* Static stars — no drift on the playa sky */}
      {STARS.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${s.left.toFixed(1)}%`,
            top: `${s.top.toFixed(1)}%`,
            width: s.size,
            height: s.size,
            borderRadius: '50%',
            background: '#FFF4E0',
            opacity: s.o.toFixed(2),
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* 3 — GROUND: the open playa, dark warm sand */}
      <div
        style={{
          position: 'absolute',
          left: '-10%',
          right: '-10%',
          top: '25%',
          bottom: '-6%',
          background: [
            'radial-gradient(ellipse at 50% 38%, #181009 0%, #120C07 48%, #0C0906 78%)',
          ].join(', '),
          pointerEvents: 'none',
        }}
      />

      {/* 4 — CITY ARCS: the BRC street plan, whispered not drawn */}
      <div style={{ position: 'absolute', inset: 0, clipPath: 'inset(48% 0 0 0)', pointerEvents: 'none' }}>
        {CITY_ARCS.map((r) => (
          <div
            key={r}
            style={{
              position: 'absolute',
              left: '50%',
              top: '46%',
              width: `${r * 2}%`,
              height: `${r * 2}%`,
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              border: '1px solid rgba(230,190,140,0.07)',
            }}
          />
        ))}
      </div>

      {/* 2 — DUST: warm haze drifting low over the ground */}
      <div
        className="pm-dust"
        style={{
          position: 'absolute',
          left: '-8%',
          top: '52%',
          width: '68%',
          height: '13%',
          borderRadius: '50%',
          background: 'rgba(214,170,120,0.05)',
          filter: 'blur(30px)',
          animationDuration: '82s',
          pointerEvents: 'none',
        }}
      />
      <div
        className="pm-dust"
        style={{
          position: 'absolute',
          right: '-10%',
          top: '66%',
          width: '62%',
          height: '11%',
          borderRadius: '50%',
          background: 'rgba(214,170,120,0.05)',
          filter: 'blur(28px)',
          animationDelay: '-40s',
          animationDuration: '74s',
          pointerEvents: 'none',
        }}
      />

      {/* 5 — THE MAN: a monument of pure light at the city's center */}
      <div
        className="pm-node"
        style={{
          position: 'absolute',
          left: '50%',
          top: '46%',
          zIndex: 46,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: 200,
            height: 240,
            transform: 'scale(var(--mscale))',
            transformOrigin: '50% 78%',
          }}
        >
          {/* wide static halo on the ground */}
          <div
            style={{
              position: 'absolute',
              left: 100,
              top: 188,
              width: 210,
              height: 210,
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(255,150,60,0.32) 0%, rgba(255,110,40,0.12) 45%, rgba(255,110,40,0) 72%)',
            }}
          />
          {/* light pooling on the dust — the largest pool in the scene */}
          <div
            style={{
              position: 'absolute',
              left: 100,
              top: 198,
              width: 150,
              height: 40,
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background:
                'radial-gradient(ellipse at center, rgba(255,166,88,0.36) 0%, rgba(214,120,50,0.15) 48%, transparent 74%)',
            }}
          />
          {/* the beam — a breathing column of light, no effigy, no shapes */}
          <div
            className="pm-beam"
            style={{
              position: 'absolute',
              left: 100,
              top: 16,
              width: 34,
              height: 170,
              transform: 'translateX(-50%)',
              background:
                'linear-gradient(to top, rgba(255,196,107,0.38), rgba(255,196,107,0.14) 52%, rgba(255,196,107,0.03) 82%, transparent 100%)',
              borderRadius: '50% 50% 0 0 / 10% 10% 0 0',
            }}
          />
          {/* blazing core — three breathing orbs of white-amber light */}
          {[
            { s: 22, dur: 2.4, o: 0.85, dy: 0 },
            { s: 14, dur: 1.7, o: 1, dy: -3 },
            { s: 8, dur: 1.2, o: 1, dy: -6 },
          ].map((c, j) => (
            <div
              key={j}
              className="pm-core"
              style={{
                position: 'absolute',
                left: 100,
                top: 184 + c.dy,
                width: c.s,
                height: c.s,
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, #FFF6E3 0%, #FFC46B 45%, rgba(255,122,47,0.55) 75%, transparent 100%)',
                boxShadow: `0 0 ${12 + c.s}px ${4 + c.s * 0.3}px rgba(255,170,80,0.5)`,
                opacity: c.o,
                animationDuration: `${c.dur}s`,
                animationDelay: `${(j * 0.43).toFixed(2)}s`,
              }}
            />
          ))}
          {/* spark motes rising off the Man */}
          {Array.from({ length: 5 }, (_, j) => (
            <div
              key={`s${j}`}
              className="pm-spark"
              style={{
                position: 'absolute',
                left: 92 + j * 4,
                top: 176,
                width: 2,
                height: 2,
                borderRadius: '50%',
                background: '#FFC46B',
                boxShadow: '0 0 4px rgba(255,196,107,0.8)',
                '--sx': `${(j - 2) * 8}px`,
                animationDuration: `${(1.8 + j * 0.4).toFixed(2)}s`,
                animationDelay: `${((j * 0.67) % 2.2).toFixed(2)}s`,
                opacity: 0,
              }}
            />
          ))}
          {/* the landmark's name */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 216,
              textAlign: 'center',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#E8C766',
              textShadow: '0 1px 8px rgba(0,0,0,0.9)',
            }}
          >
            The Man
          </div>
        </div>
      </div>

      {/* 6 — CAMPS on the arcs */}
      {CAMPS.map((camp, idx) => {
        const boost = camp.big ? 1.25 : 1
        const depth = (0.82 + ((camp.y - 52) / 36) * 0.24) * boost
        const n = camp.members.length
        return (
          <div
            key={camp.id}
            className="pm-node"
            role="button"
            tabIndex={0}
            aria-label={`${camp.name} — tap to view`}
            onClick={() => setSelected(camp)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelected(camp) }}
            style={{
              position: 'absolute',
              left: `${camp.x}%`,
              top: `${camp.y}%`,
              zIndex: Math.round(camp.y),
              transform: 'translate(-50%, -55%)',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <div
              style={{
                position: 'relative',
                width: 112,
                height: 92,
                transform: `scale(calc(${depth.toFixed(2)} * var(--mscale)))`,
                transformOrigin: '50% 46%',
              }}
            >
              {/* warm ground glow */}
              <div
                style={{
                  position: 'absolute',
                  left: 56,
                  top: 38,
                  width: camp.big ? 96 : 72,
                  height: camp.big ? 96 : 72,
                  transform: 'translate(-50%, -50%)',
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle, rgba(255,150,60,0.24) 0%, rgba(255,110,40,0.09) 45%, rgba(255,110,40,0) 72%)',
                  pointerEvents: 'none',
                }}
              />
              {/* light pool on the dust */}
              <div
                style={{
                  position: 'absolute',
                  left: 56,
                  top: 47,
                  width: camp.big ? 74 : 56,
                  height: camp.big ? 21 : 16,
                  transform: 'translate(-50%, -50%)',
                  borderRadius: '50%',
                  background:
                    'radial-gradient(ellipse at center, rgba(255,166,88,0.26) 0%, rgba(214,120,50,0.1) 48%, transparent 74%)',
                  pointerEvents: 'none',
                }}
              />
              {/* breathing cores — big camps burn with two */}
              {(camp.big
                ? [ { s: 12, dur: 2.6, o: 0.85 }, { s: 7, dur: 1.8, o: 1 } ]
                : [ { s: 9, dur: 2.9, o: 0.95 } ]
              ).map((c, j) => (
                <div
                  key={j}
                  className="pm-core"
                  style={{
                    position: 'absolute',
                    left: 56,
                    top: 38 - j * 2,
                    width: c.s,
                    height: c.s,
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '50%',
                    background:
                      'radial-gradient(circle, #FFF6E3 0%, #FFC46B 45%, rgba(255,122,47,0.55) 75%, transparent 100%)',
                    boxShadow: `0 0 ${10 + c.s}px ${3 + c.s * 0.3}px rgba(255,170,80,0.45)`,
                    opacity: c.o,
                    animationDuration: `${c.dur}s`,
                    animationDelay: `${((idx * 0.61 + j * 0.29) % 1.7).toFixed(2)}s`,
                    pointerEvents: 'none',
                  }}
                />
              ))}
              {/* spark motes */}
              {Array.from({ length: camp.big ? 2 : 1 }, (_, j) => (
                <div
                  key={`s${j}`}
                  className="pm-spark"
                  style={{
                    position: 'absolute',
                    left: 54 + j * 4,
                    top: 34,
                    width: 2,
                    height: 2,
                    borderRadius: '50%',
                    background: '#FFC46B',
                    boxShadow: '0 0 4px rgba(255,196,107,0.8)',
                    '--sx': `${(j === 0 ? -1 : 1) * 6}px`,
                    animationDuration: `${(2 + j * 0.5).toFixed(2)}s`,
                    animationDelay: `${((idx * 0.53 + j * 0.7) % 2.1).toFixed(2)}s`,
                    opacity: 0,
                    pointerEvents: 'none',
                  }}
                />
              ))}

              {/* members — warm presence dots in an arc around the fire */}
              {camp.members.map((m, j) => {
                const t = Math.PI * (0.2 + (n > 1 ? (j / (n - 1)) * 0.6 : 0.3))
                const mx = 56 + Math.cos(t) * 27
                const my = 45 + Math.sin(t) * 13
                const hovKey = `${camp.id}:${j}`
                const isHov = hoveredMember === hovKey
                return (
                  <div
                    key={j}
                    onMouseEnter={() => setHoveredMember(hovKey)}
                    onMouseLeave={() => setHoveredMember(null)}
                    onClick={(e) => { e.stopPropagation(); showToast(`${m.name}’s passport opens here when real profiles land ✨`, { type: 'info' }) }}
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
                        background: 'radial-gradient(circle, #FFE9C8 0%, #FFC98F 70%)',
                        boxShadow: isHov
                          ? '0 0 14px 4px rgba(255,190,120,0.65)'
                          : '0 0 9px 2px rgba(255,190,120,0.4)',
                        opacity: 0.95,
                        transition: 'width 0.12s, height 0.12s, box-shadow 0.12s',
                      }}
                    />
                    {/* passport preview — same card language as the world */}
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
                          background: 'rgba(16,12,10,0.92)',
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

              {/* camp name */}
              <div
                style={{
                  position: 'absolute',
                  left: -20,
                  right: -20,
                  top: 66,
                  textAlign: 'center',
                  fontSize: 10,
                  fontWeight: camp.big ? 700 : 400,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: camp.big ? '#E8C766' : 'var(--text-muted, #A99ECC)',
                  whiteSpace: 'nowrap',
                  textShadow: '0 1px 6px rgba(0,0,0,0.8)',
                  pointerEvents: 'none',
                }}
              >
                {camp.name}
              </div>
            </div>
          </div>
        )
      })}

      {/* CINEMATIC GRADE — vignette + static film grain */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 92,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse 105% 90% at 50% 44%, transparent 52%, rgba(0,0,0,0.34) 82%, rgba(0,0,0,0.64) 100%)',
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
            background: 'rgba(10,8,16,0.5)',
            backdropFilter: 'blur(4px)',
            whiteSpace: 'nowrap',
          }}
        >
          🔥 BURNING MAN · a world inside Bestie World
        </span>
        <Link
          href="/world"
          style={{ fontSize: 13, color: 'var(--text-muted, #A99ECC)', textDecoration: 'none', padding: '6px 4px', whiteSpace: 'nowrap' }}
        >
          ‹ Back to the world
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
        {CAMPS.length} camps · {totalBurners} burners on the playa
      </div>

      {/* 8 — LIVE TICKER (bottom-left) */}
      <div
        style={{
          position: 'absolute',
          left: 16,
          bottom: 'calc(20px + env(safe-area-inset-bottom))',
          zIndex: 95,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          maxWidth: '32vw',
          opacity: tkVisible ? 1 : 0,
          transition: 'opacity 0.7s ease',
          pointerEvents: 'none',
        }}
      >
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#D4AF37', flexShrink: 0, boxShadow: '0 0 5px rgba(212,175,55,0.7)' }} />
        <span style={{ fontSize: 12, color: 'var(--text-muted, #A99ECC)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {PLAYA_TICKER[tkIdx]}
        </span>
      </div>

      {/* 9 — REGISTER CTA (bottom-center): the acquisition hook.
          A camp IS a crew — members, privacy, its own (even ticketed) events —
          so registration goes straight to the real crew-creation flow. */}
      <button
        onClick={() => { window.location.href = loggedIn ? '/crews/new' : '/signup?next=%2Fcrews%2Fnew' }}
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 'calc(14px + env(safe-area-inset-bottom))',
          transform: 'translateX(-50%)',
          zIndex: 96,
          padding: '11px 22px',
          borderRadius: 999,
          border: '1px solid rgba(255,230,160,0.35)',
          cursor: 'pointer',
          fontSize: 13.5,
          fontWeight: 700,
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
          color: '#141007',
          background: 'linear-gradient(135deg, #E5C558, #D4AF37)',
          boxShadow: '0 4px 22px rgba(212,175,55,0.35)',
        }}
      >
        ⛺ Register your camp — free
      </button>

      {/* 10 — CAMP SHEET */}
      {selected && (
        <>
          <div
            className="pm-backdrop"
            onClick={() => setSelected(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 97 }}
          />
          <div
            className="pm-sheet"
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
              maxHeight: '78dvh',
              overflowY: 'auto',
              background: 'var(--surface-1, #111120)',
              borderRadius: '20px 20px 0 0',
              border: '1px solid rgba(255,255,255,0.07)',
              borderBottom: 'none',
              padding: '14px 20px calc(22px + env(safe-area-inset-bottom))',
              boxShadow: '0 -12px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '0 auto 16px' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 18 }}>⛺</span>
              <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary, #F0EDF7)' }}>{selected.name}</span>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted, #A99ECC)', lineHeight: 1.5, margin: '0 0 14px' }}>
              {selected.vibe}
            </p>

            {/* members */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
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
                {selected.members.length} camping here
              </span>
            </div>

            {/* their events */}
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--text-muted, #A99ECC)',
                marginBottom: 10,
              }}
            >
              Camp events
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              {selected.events.map((ev, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid var(--border, rgba(255,255,255,0.08))',
                    background: 'rgba(255,255,255,0.02)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #F0EDF7)', lineHeight: 1.3 }}>
                      {ev.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted, #A99ECC)' }}>{ev.time}</span>
                      {ev.openToAll ? (
                        <span
                          style={{
                            fontSize: 10,
                            lineHeight: 1,
                            padding: '3px 8px',
                            borderRadius: 999,
                            color: '#7BE6B4',
                            border: '1px solid rgba(123,230,180,0.4)',
                            background: 'rgba(123,230,180,0.08)',
                          }}
                        >
                          Open to all camps
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 10,
                            lineHeight: 1,
                            padding: '3px 8px',
                            borderRadius: 999,
                            color: 'var(--text-muted, #A99ECC)',
                            border: '1px solid rgba(255,255,255,0.12)',
                          }}
                        >
                          Camp only
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => gate('RSVPs go live soon — this is a concept preview ✨')}
                    style={{
                      flexShrink: 0,
                      padding: '6px 8px',
                      borderRadius: 8,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#D4AF37',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    I’m going
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => gate('Camps go live soon — this is a concept preview ✨')}
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
              {loggedIn ? 'Join this camp' : 'Sign up free to join this camp'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
