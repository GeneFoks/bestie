'use client'

/**
 * Sensory celebration utilities — confetti + haptic feedback.
 * Designed to fire on micro-moments of success: match, knock-back, spark received,
 * streak unlocked, etc. Kept tasteful: short bursts, no looping.
 */

type ConfettiOptions = {
  count?: number       // number of particles
  spread?: number      // angular spread in degrees
  origin?: { x: number; y: number }  // 0..1 viewport coords
  colors?: string[]
  duration?: number    // ms
}

const DEFAULT_COLORS = ['#D4AF37', '#34D399', '#9B7FFF', '#FF7857', '#F0EAFF']

/**
 * Fires a short, vibrant confetti burst at the given origin.
 * Self-contained — no external lib. Cleans up after itself.
 */
export function celebrate(opts: ConfettiOptions = {}) {
  if (typeof window === 'undefined') return
  // Respect reduced-motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const {
    count = 36,
    spread = 70,
    origin = { x: 0.5, y: 0.45 },
    colors = DEFAULT_COLORS,
    duration = 1400,
  } = opts

  const canvas = document.createElement('canvas')
  canvas.style.position = 'fixed'
  canvas.style.inset = '0'
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  canvas.style.pointerEvents = 'none'
  canvas.style.zIndex = '9999'
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = window.innerWidth * dpr
  canvas.height = window.innerHeight * dpr
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)

  const W = window.innerWidth
  const H = window.innerHeight
  const cx = W * origin.x
  const cy = H * origin.y

  type Particle = {
    x: number; y: number; vx: number; vy: number
    size: number; rot: number; vr: number
    color: string; shape: 'rect' | 'circle'
    alpha: number
  }

  const baseAngle = -Math.PI / 2 // straight up
  const spreadRad = (spread * Math.PI) / 180

  const particles: Particle[] = Array.from({ length: count }).map(() => {
    const angle = baseAngle + (Math.random() - 0.5) * spreadRad
    const power = 6 + Math.random() * 8
    return {
      x: cx,
      y: cy,
      vx: Math.cos(angle) * power,
      vy: Math.sin(angle) * power,
      size: 5 + Math.random() * 7,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.4,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: Math.random() < 0.55 ? 'rect' : 'circle',
      alpha: 1,
    }
  })

  const start = performance.now()
  let raf = 0

  const tick = (now: number) => {
    const t = now - start
    if (t > duration) {
      canvas.remove()
      return
    }
    ctx.clearRect(0, 0, W, H)
    particles.forEach(p => {
      // physics
      p.vy += 0.22 // gravity
      p.vx *= 0.99
      p.x += p.vx
      p.y += p.vy
      p.rot += p.vr
      p.alpha = Math.max(0, 1 - t / duration)

      ctx.save()
      ctx.globalAlpha = p.alpha
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillStyle = p.color
      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.45)
      } else {
        ctx.beginPath()
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    })
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
}

/**
 * Fires a short haptic pattern on supported devices.
 * Safe no-op on unsupported devices.
 */
export function buzz(pattern: 'tap' | 'success' | 'match' = 'tap') {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return
  const patterns = {
    tap:     12,
    success: [18, 60, 18],
    match:   [22, 80, 22, 80, 50],
  } as const
  try { (navigator as any).vibrate(patterns[pattern]) } catch {}
}

/**
 * Convenience: full match celebration — confetti + match haptic.
 */
export function celebrateMatch() {
  celebrate({ count: 60, spread: 100 })
  buzz('match')
}
