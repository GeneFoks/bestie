// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function SocialPassportCTA() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session)
    })
  }, [])

  if (loggedIn === null || loggedIn) return null

  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(52,211,153,0.04) 100%)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
      <p style={{ fontSize: '14px', color: '#9B93C0', marginBottom: '4px' }}>Want your own Social Passport?</p>
      <p style={{ fontSize: '13px', color: '#9B93C0', marginBottom: '16px' }}>Build your Bestie Score, collect Sparks, get verified.</p>
      <Link href="/signup" style={{ display: 'inline-block', padding: '10px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>
        Create my Social Passport →
      </Link>
    </div>
  )
}
