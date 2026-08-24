// @ts-nocheck
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const HomeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12L12 3l9 9v9a1 1 0 01-1 1h-5v-5H9v5H4a1 1 0 01-1-1v-9z"/>
  </svg>
)

const DashboardIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
)

const BrowseIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)

const EventsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
    <line x1="8" y1="14" x2="8" y2="14" strokeWidth="3" strokeLinecap="round"/>
    <line x1="12" y1="14" x2="12" y2="14" strokeWidth="3" strokeLinecap="round"/>
    <line x1="16" y1="14" x2="16" y2="14" strokeWidth="3" strokeLinecap="round"/>
  </svg>
)

const CrewsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87"/>
    <path d="M16 3.13a4 4 0 010 7.75"/>
  </svg>
)

const BookingsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)

const MessagesIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
  </svg>
)

const GUEST_LINKS = [
  { href: '/', label: 'Home', Icon: HomeIcon, match: (p: string) => p === '/' },
  { href: '/browse', label: 'Browse', Icon: BrowseIcon, match: (p: string) => p.startsWith('/browse') },
  { href: '/events', label: 'Events', Icon: EventsIcon, match: (p: string) => p.startsWith('/events') || p.startsWith('/group-sessions') || p.startsWith('/pulse') },
  { href: '/crews', label: 'Crews', Icon: CrewsIcon, match: (p: string) => p.startsWith('/crews') },
  { href: '/bookings', label: 'Bookings', Icon: BookingsIcon, match: (p: string) => p.startsWith('/bookings') },
]

const AUTH_LINKS = [
  { href: '/dashboard', label: 'Dashboard', Icon: DashboardIcon, match: (p: string) => p.startsWith('/dashboard') },
  { href: '/browse', label: 'Browse', Icon: BrowseIcon, match: (p: string) => p.startsWith('/browse') },
  { href: '/events', label: 'Events', Icon: EventsIcon, match: (p: string) => p.startsWith('/events') || p.startsWith('/group-sessions') || p.startsWith('/pulse') },
  { href: '/crews', label: 'Crews', Icon: CrewsIcon, match: (p: string) => p.startsWith('/crews') },
  { href: '/messages', label: 'Messages', Icon: MessagesIcon, match: (p: string) => p.startsWith('/messages') },
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
          .bottom-nav-wrap {
            display: flex;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 100;
            background: rgba(8, 8, 16, 0.97);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            border-top: 1px solid rgba(255,255,255,0.07);
            padding: 6px 4px;
            padding-bottom: max(10px, env(safe-area-inset-bottom));
            justify-content: space-around;
            align-items: center;
          }
          .bn-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 3px;
            padding: 6px 14px;
            border-radius: 14px;
            font-size: 10px;
            font-weight: 500;
            color: #5A5480;
            text-decoration: none;
            transition: all 0.15s ease;
            font-family: 'Plus Jakarta Sans', sans-serif;
            letter-spacing: 0.3px;
            min-width: 52px;
          }
          .bn-item.active {
            color: #D4AF37;
            background: rgba(212,175,55,0.1);
          }
          body { padding-bottom: 72px; }
        }
      `}</style>
      <nav className="bottom-nav-wrap">
        {LINKS.map(({ href, label, Icon, match }) => {
          const active = match(path)
          const showDot = href === '/messages' && unread > 0
          return (
            <Link key={href} href={href} className={`bn-item${active ? ' active' : ''}`}>
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                <Icon />
                {showDot && (
                  <span
                    style={{
                      position: 'absolute', top: '-2px', right: '-3px',
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: '#D4AF37', boxShadow: '0 0 0 2px rgba(8,8,16,0.97)',
                    }}
                  />
                )}
              </span>
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
