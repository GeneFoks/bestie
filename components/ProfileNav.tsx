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
    <div style={{ display: 'flex', gap: '12px' }}>
      {loggedIn ? (
        <>
          <Link href="/crews" style={{ fontSize: '14px', color: '#9B93C0', textDecoration: 'none' }}>Crews</Link>
          <Link href="/dashboard" style={{ fontSize: '14px', color: '#9B93C0', textDecoration: 'none', padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>Dashboard</Link>
          <Link href="/browse" style={{ fontSize: '14px', fontWeight: 600, padding: '8px 20px', borderRadius: '12px', background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>Browse</Link>
        </>
      ) : (
        <>
          <Link href="/crews" style={{ fontSize: '14px', color: '#9B93C0', textDecoration: 'none' }}>Crews</Link>
          <Link href="/browse" style={{ fontSize: '14px', color: '#9B93C0', textDecoration: 'none' }}>Browse</Link>
          <Link href="/signup" style={{ fontSize: '14px', fontWeight: 600, padding: '8px 20px', borderRadius: '12px', background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>Join Free</Link>
        </>
      )}
    </div>
  )
}
