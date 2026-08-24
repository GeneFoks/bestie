// @ts-nocheck
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
          View profile & connect →
        </Link>
        <Link
          href={messageUrl}
          style={{ display: 'block', padding: '14px', borderRadius: '16px', textAlign: 'center', fontSize: '14px', fontWeight: 600, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)', textDecoration: 'none' }}
        >
          💬 Send a message
        </Link>
      </div>
    )
  }

  // Low-friction first: the free test (no signup) is the strongest hook for
  // cold ad traffic. Joining is the secondary action.
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <Link
        href="/bestie-type"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', borderRadius: '16px', textAlign: 'center', fontSize: '16px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', textDecoration: 'none' }}
      >
        🧭 Take the free personality test →
      </Link>
      <p style={{ fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center', margin: '-2px 0 4px' }}>
        5 minutes · no signup · find out who you click with
      </p>
      <Link
        href={signupUrl}
        style={{ display: 'block', padding: '14px', borderRadius: '16px', textAlign: 'center', fontSize: '14px', fontWeight: 600, background: 'var(--surface-2)', border: '1px solid rgba(212,175,55,0.25)', color: '#D4AF37', textDecoration: 'none' }}
      >
        Join Bestie & connect
      </Link>
      <Link
        href={loginUrl}
        style={{ display: 'block', padding: '10px', textAlign: 'center', fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)', textDecoration: 'none' }}
      >
        Already have an account? Log in
      </Link>
    </div>
  )
}
