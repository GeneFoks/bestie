'use client'

// Mounts the first-party analytics tracker. Records a page view on every
// route change and a 'click' on any button/link/[data-track] element, plus a
// best-effort 'session_end' when the tab is hidden. Everything else (time on
// site, exit pages, device mix) is derived from these rows in SQL.

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { track } from '@/lib/analytics'

export default function AnalyticsProvider() {
  const pathname = usePathname()
  const lastPath = useRef<string | null>(null)

  // Page views — fire when the route changes.
  useEffect(() => {
    if (!pathname || lastPath.current === pathname) return
    // referrer = the previous in-app path (or the external referrer on first load)
    track('pageview', {
      referrer: lastPath.current || (typeof document !== 'undefined' ? document.referrer || null : null),
    })
    lastPath.current = pathname
  }, [pathname])

  // Clicks — capture the nearest meaningful target.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement)?.closest?.('a, button, [role="button"], [data-track]') as HTMLElement | null
      if (!el) return
      const label =
        el.getAttribute('data-track') ||
        el.getAttribute('aria-label') ||
        (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60) ||
        el.tagName.toLowerCase()
      const href = el.getAttribute('href') || undefined
      track('click', { element: label, href })
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  // Best-effort end-of-session marker when the user leaves/backgrounds the tab.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') track('session_end')
    }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [])

  return null
}
