// @ts-nocheck
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Home, LayoutDashboard, Search, CalendarDays, CalendarCheck, Users, MessageCircle } from 'lucide-react'

const GUEST_LINKS = [
  { href: '/', label: 'Home', Icon: Home, match: (p: string) => p === '/' },
  { href: '/browse', label: 'Browse', Icon: Search, match: (p: string) => p.startsWith('/browse') },
  { href: '/events', label: 'Events', Icon: CalendarDays, match: (p: string) => p.startsWith('/events') || p.startsWith('/group-sessions') || p.startsWith('/pulse') },
  { href: '/crews', label: 'Crews', Icon: Users, match: (p: string) => p.startsWith('/crews') },
  { href: '/bookings', label: 'Bookings', Icon: CalendarCheck, match: (p: string) => p.startsWith('/bookings') },
]

const AUTH_LINKS = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard, match: (p: string) => p.startsWith('/dashboard') },
  { href: '/browse', label: 'Browse', Icon: Search, match: (p: string) => p.startsWith('/browse') },
  { href: '/events', label: 'Events', Icon: CalendarDays, match: (p: string) => p.startsWith('/events') || p.startsWith('/group-sessions') || p.startsWith('/pulse') },
  { href: '/crews', label: 'Crews', Icon: Users, match: (p: string) => p.startsWith('/crews') },
  { href: '/messages', label: 'Messages', Icon: MessageCircle, match: (p: string) => p.startsWith('/messages') },
]

export default function BottomNav() {
  const path = usePathname()
  const [loggedIn, setLoggedIn] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session)
      setUserId(session?.user?.id || null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setLoggedIn(!!session)
      setUserId(session?.user?.id || null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Unread messages badge — cheap head-count on mount, auth change, and route change.
  useEffect(() => {
    if (!userId) { setUnread(0); return }
    let cancelled = false
    supabase
      .from('direct_messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('read', false)
      .then(({ count }) => {
        if (!cancelled) setUnread(count || 0)
      })
    return () => { cancelled = true }
  }, [userId, path])

  const LINKS = loggedIn ? AUTH_LINKS : GUEST_LINKS

  return (
    <>
      <style>{`
        .bottom-nav-wrap {
          display: none;
        }
        @media (max-width: 768px) {
          /* Total nav height, exposed so fixed bars (sticky CTAs, sheets) can sit
             on top of the nav instead of underneath it:
             1px border + 6px top pad + 53px item + bottom pad (safe-area aware).
             Keep in sync with the .bn-item box below. */
          :root {
            --bottom-nav-h: calc(60px + max(10px, env(safe-area-inset-bottom)));
          }
          nav.bottom-nav-wrap {
            display: flex;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 100;
            background: var(--nav-bg);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            border-top: 1px solid var(--border);
            /* !important + higher specificity beats the global mobile
               "nav { padding: 12px 16px !important }" rule, so the
               home-indicator safe area is actually honoured. */
            padding: 6px 4px max(10px, env(safe-area-inset-bottom)) !important;
            justify-content: space-around;
            align-items: center;
          }
          .bn-item {
            flex: 1 1 0;
            min-width: 0;
            max-width: 88px;
            min-height: 44px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3px;
            padding: 6px 4px;
            border-radius: 12px;
            border: 1px solid transparent;
            font-size: 11px;
            font-weight: 500;
            color: var(--text-dim);
            text-decoration: none;
            transition: all 0.15s ease;
            font-family: 'Plus Jakarta Sans', sans-serif;
            letter-spacing: 0.3px;
          }
          .bn-label {
            display: block;
            max-width: 100%;
            line-height: 14px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .bn-item.active {
            color: var(--text-primary);
            background: var(--surface-3);
            border-color: var(--border-strong);
          }
          body { padding-bottom: calc(var(--bottom-nav-h) + 4px); }
        }
      `}</style>
      <nav className="bottom-nav-wrap">
        {LINKS.map(({ href, label, Icon, match }) => {
          const active = match(path)
          const showDot = href === '/messages' && unread > 0
          return (
            <Link
              key={href}
              href={href}
              className={`bn-item${active ? ' active' : ''}`}
              aria-current={active ? 'page' : undefined}
              aria-label={showDot ? `${label}, unread messages` : undefined}
            >
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
                {showDot && (
                  <span
                    style={{
                      position: 'absolute', top: '-2px', right: '-3px',
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: '#D4AF37', boxShadow: '0 0 0 2px var(--bg)',
                    }}
                  />
                )}
              </span>
              <span className="bn-label">{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
