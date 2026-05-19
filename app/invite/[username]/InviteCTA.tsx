'use client'
// Client component — checks auth state and shows correct CTA:
// - Logged in  → "Book Session" + "Message" (no need to sign up)
// - Logged out → "Accept & Create Account" + "Log in"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Props {
  username: string
  activityKey?: string
  signupUrl: string
}

export default function InviteCTA({ username, activityKey, signupUrl }: Props) {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null) // null = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session)
    })
  }, [])

  // Redirect back to this invite page after login (not to profile)
  const inviteUrl = `/invite/${username}${activityKey ? `?activity=${activityKey}` : ''}`
  const loginUrl = `/login?next=${encodeURIComponent(inviteUrl)}`

  // Where to go once already logged in
  const bookUrl = `/${username}${activityKey ? `?book=${activityKey}` : ''}`
  const messageUrl = `/messages?to=${username}`

  if (loggedIn === null) {
    // Loading
    return (
      <div style={{ width: '100%', height: '56px', borderRadius: '16px', background: 'rgba(212,175,55,0.08)', animation: 'pulse 1.5s ease-in-out infinite' }}>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      </div>
    )
  }

  if (loggedIn) {
    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <Link
          href={bookUrl}
          style={{ display: 'block', padding: '16px', borderRadius: '16px', textAlign: 'center', fontSize: '16px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', textDecoration: 'none' }}
        >
          Book a Session →
        </Link>
        <Link
          href={messageUrl}
          style={{ display: 'block', padding: '14px', borderRadius: '16px', textAlign: 'center', fontSize: '14px', fontWeight: 600, background: '#161628', border: '1px solid rgba(255,255,255,0.1)', color: '#A99ECC', textDecoration: 'none' }}
        >
          💬 Send a message
        </Link>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <Link
        href={signupUrl}
        style={{ display: 'block', padding: '16px', borderRadius: '16px', textAlign: 'center', fontSize: '16px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', textDecoration: 'none' }}
      >
        Accept &amp; Create Account →
      </Link>
      <Link
        href={loginUrl}
        style={{ display: 'block', padding: '14px', borderRadius: '16px', textAlign: 'center', fontSize: '14px', fontWeight: 600, background: '#161628', border: '1px solid rgba(255,255,255,0.1)', color: '#A99ECC', textDecoration: 'none' }}
      >
        Already have an account? Log in
      </Link>
    </div>
  )
}
