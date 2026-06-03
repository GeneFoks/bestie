// ── Lightweight in-memory rate limiter ──────────────────────────────────────
// Best-effort fixed-window limiter keyed by IP + bucket name.
//
// NOTE: serverless functions are stateless across cold starts and may run on
// multiple instances, so this is NOT a hard global guarantee. It still blocks
// the common case — a single client hammering a warm instance — at zero cost
// and zero dependencies. For a hard guarantee later, swap the Map for Upstash
// Redis (same interface).

import { NextRequest, NextResponse } from 'next/server'

type Hit = { count: number; resetAt: number }

const store = new Map<string, Hit>()

// Periodically drop expired entries so the Map can't grow unbounded.
let lastSweep = 0
function sweep(now: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  store.forEach((hit, key) => {
    if (hit.resetAt <= now) store.delete(key)
  })
}

export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-nf-client-connection-ip') || 'unknown'
}

/**
 * Returns null if the request is allowed, or a 429 NextResponse if the caller
 * has exceeded `limit` requests within `windowMs`.
 *
 *   const limited = rateLimit(req, 'email', { limit: 5, windowMs: 60_000 })
 *   if (limited) return limited
 */
export function rateLimit(
  req: NextRequest,
  bucket: string,
  opts: { limit: number; windowMs: number },
): NextResponse | null {
  const now = Date.now()
  sweep(now)

  const key = `${bucket}:${clientIp(req)}`
  const hit = store.get(key)

  if (!hit || hit.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + opts.windowMs })
    return null
  }

  hit.count += 1
  if (hit.count > opts.limit) {
    const retryAfter = Math.ceil((hit.resetAt - now) / 1000)
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )
  }
  return null
}
