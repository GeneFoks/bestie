// ── First-party analytics tracker ───────────────────────────────────────────
// Logs lightweight events (page views + clicks) to the analytics_events table
// in Supabase. From those rows we can derive device mix, time on site, what
// people click, and where they drop off — all in plain SQL.
//
// Design rules:
//   • Never throw — analytics must never break the app.
//   • No PII beyond the logged-in user's id (null for anonymous visitors).
//   • One random session id per browser tab session (sessionStorage).

import { supabase } from '@/lib/supabase'

const SID_KEY = 'bestie_sid'

// A random id for this browser session (resets when the tab/session closes).
export function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let sid = sessionStorage.getItem(SID_KEY)
    if (!sid) {
      sid = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`
      sessionStorage.setItem(SID_KEY, sid)
    }
    return sid
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`
  }
}

// Rough device / browser / OS parse from the user agent.
export function deviceInfo(): { device_type: string; browser: string; os: string } {
  if (typeof navigator === 'undefined') return { device_type: 'unknown', browser: 'unknown', os: 'unknown' }
  const ua = navigator.userAgent || ''

  const isTablet = /iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))
  const isMobile = !isTablet && /Mobi|Android|iPhone|iPod|Windows Phone|IEMobile/i.test(ua)
  const device_type = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop'

  const browser =
    /Edg\//i.test(ua) ? 'Edge'
    : /OPR\/|Opera/i.test(ua) ? 'Opera'
    : /Chrome\//i.test(ua) ? 'Chrome'
    : /Firefox\//i.test(ua) ? 'Firefox'
    : /Safari\//i.test(ua) ? 'Safari'
    : 'Other'

  const os =
    /Windows/i.test(ua) ? 'Windows'
    : /iPhone|iPad|iPod/i.test(ua) ? 'iOS'
    : /Mac OS X/i.test(ua) ? 'macOS'
    : /Android/i.test(ua) ? 'Android'
    : /Linux/i.test(ua) ? 'Linux'
    : 'Other'

  return { device_type, browser, os }
}

// Cache the logged-in user id so each event doesn't await an auth round-trip.
let cachedUserId: string | null = null
let userResolved = false

async function resolveUser(): Promise<string | null> {
  if (userResolved) return cachedUserId
  try {
    const { data } = await supabase.auth.getUser()
    cachedUserId = data?.user?.id ?? null
  } catch {
    cachedUserId = null
  }
  userResolved = true
  return cachedUserId
}

// Let the auth layer push updates (login / logout) into the cache.
export function setAnalyticsUser(id: string | null) {
  cachedUserId = id
  userResolved = true
}

// Drop the query string and hash so tokens that sometimes ride in URLs
// (magic links, password resets) never land in analytics.
export function stripUrl(u: string | null | undefined): string | null {
  if (!u) return null
  return String(u).split(/[?#]/)[0]
}

// Clamp a string field so a crafted value can't bloat a row.
function cap(s: any, n: number) {
  return typeof s === 'string' ? s.slice(0, n) : s
}

// Fire-and-forget event logger.
export async function track(event_type: string, props: Record<string, any> = {}): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    const { device_type, browser, os } = deviceInfo()
    const user_id = await resolveUser()
    const row: Record<string, any> = {
      session_id: getSessionId(),
      user_id,
      event_type: cap(event_type, 40),
      path: cap(window.location.pathname, 300),
      device_type,
      browser,
      os,
      referrer: typeof document !== 'undefined' ? stripUrl(document.referrer) : null,
      screen_w: window.innerWidth || null,
      ...props,
    }
    // Sanitize/clamp any caller-supplied fields (element, href, referrer…).
    row.element = cap(row.element, 120)
    row.href = cap(stripUrl(row.href), 300)
    row.referrer = cap(stripUrl(row.referrer), 300)
    row.path = cap(row.path, 300)
    await supabase.from('analytics_events').insert(row)
  } catch {
    // Swallow — analytics must never surface an error to the user.
  }
}
