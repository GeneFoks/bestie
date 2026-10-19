// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Network, CalendarCheck } from 'lucide-react'

// Touch hit-area: the <Link> gets invisible padding cancelled by an equal
// negative margin, so the tap target reaches >=44px while the visible pill
// keeps its size and the header layout doesn't shift.
const hit = (y: number, x = 0) => ({
  display: 'inline-flex',
  padding: `${y}px ${x}px`,
  margin: `-${y}px -${x}px`,
  textDecoration: 'none',
  flexShrink: 0,
})

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
          <Link href="/plus" title="Bestie Plus" style={hit(5)}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: 700, color: '#9B7FFF', padding: '8px 13px', borderRadius: '12px', border: '1px solid rgba(155,127,255,0.4)', background: 'rgba(155,127,255,0.1)', whiteSpace: 'nowrap' }}>
              ✦ Plus
            </span>
          </Link>
          <Link href="/graph" aria-label="My Circle" title="My Circle" style={hit(3, 3)}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '12px', border: '1px solid rgba(155,127,255,0.25)', background: 'rgba(155,127,255,0.06)', color: '#9B7FFF' }}>
              <Network size={16} strokeWidth={1.8} aria-hidden="true" />
            </span>
          </Link>
          <Link href="/sessions" aria-label="My meetups" title="My meetups" style={hit(3, 3)}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '12px', border: '1px solid rgba(212,175,55,0.25)', background: 'rgba(212,175,55,0.06)', color: '#D4AF37' }}>
              <CalendarCheck size={16} strokeWidth={1.8} aria-hidden="true" />
            </span>
          </Link>
          <Link href="/dashboard" style={hit(5)}>
            <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '14px', color: 'var(--text-muted)', padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
              Dashboard
            </span>
          </Link>
        </>
      ) : (
        // Logged out: show Join Free on all screens, Log in only on desktop
        // (.desktop-nav-cta is display:none !important on mobile, which wins
        // over the inline display below).
        <>
          <Link
            href="/login"
            className="desktop-nav-cta"
            style={{ ...hit(14, 6), fontSize: '14px', color: 'var(--text-muted)' }}
          >
            Log in
          </Link>
          <Link href="/signup" style={hit(6)}>
            <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '14px', fontWeight: 600, padding: '8px 18px', borderRadius: '12px', background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', whiteSpace: 'nowrap' }}>
              Join Free
            </span>
          </Link>
        </>
      )}
    </div>
  )
}
