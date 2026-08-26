// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Network, CalendarCheck } from 'lucide-react'

export default function ProfileNav() {
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session)
    })
  }, [])

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      {loggedIn ? (
        // Logged in: quick Graph access + Dashboard button — visible on all screens
        <>
          <Link
            href="/plus"
            title="Bestie Plus"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: 700, color: '#9B7FFF', textDecoration: 'none', padding: '8px 13px', borderRadius: '10px', border: '1px solid rgba(155,127,255,0.4)', background: 'rgba(155,127,255,0.1)', whiteSpace: 'nowrap' }}
          >
            ✦ Plus
          </Link>
          <Link
            href="/graph"
            aria-label="My Circle"
            title="My Circle"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '10px', border: '1px solid rgba(155,127,255,0.25)', background: 'rgba(155,127,255,0.06)', color: '#9B7FFF' }}
          >
            <Network size={16} strokeWidth={1.8} />
          </Link>
          <Link
            href="/sessions"
            aria-label="My meetups"
            title="My meetups"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '10px', border: '1px solid rgba(212,175,55,0.25)', background: 'rgba(212,175,55,0.06)', color: '#D4AF37' }}
          >
            <CalendarCheck size={16} strokeWidth={1.8} />
          </Link>
          <Link
            href="/dashboard"
            style={{ fontSize: '14px', color: 'var(--text-muted)', textDecoration: 'none', padding: '8px 16px', borderRadius: '10px', border: '1px solid var(--border)', whiteSpace: 'nowrap' }}
          >
            Dashboard
          </Link>
        </>
      ) : (
        // Logged out: show Join Free on all screens, Log in only on desktop
        <>
          <Link
            href="/login"
            className="desktop-nav-cta"
            style={{ fontSize: '14px', color: 'var(--text-muted)', textDecoration: 'none' }}
          >
            Log in
          </Link>
          <Link
            href="/signup"
            style={{ fontSize: '14px', fontWeight: 600, padding: '8px 18px', borderRadius: '12px', background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}
          >
            Join Free
          </Link>
        </>
      )}
    </div>
  )
}
