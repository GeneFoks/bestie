'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ProfileNav() {
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session)
    })
  }, [])

  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
      {loggedIn ? (
        // Logged in: Dashboard button — hidden on mobile (bottom nav handles it)
        <Link
          href="/dashboard"
          className="desktop-nav-cta"
          style={{ fontSize: '14px', color: '#9B93C0', textDecoration: 'none', padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          Dashboard
        </Link>
      ) : (
        // Logged out: show Join Free on all screens, Log in only on desktop
        <>
          <Link
            href="/login"
            className="desktop-nav-cta"
            style={{ fontSize: '14px', color: '#9B93C0', textDecoration: 'none' }}
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
