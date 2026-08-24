// @ts-nocheck
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { showToast } from '@/components/Toast'

// Feature flag: Google OAuth ships dark until the provider is configured in
// Supabase and NEXT_PUBLIC_GOOGLE_AUTH=1 is set in Netlify.
const GOOGLE_AUTH_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_AUTH === '1'

function GoogleGLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

async function handleGoogleSignIn() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/onboarding' },
  })
  if (error) showToast("Google sign-in isn't available yet — use email below.", { type: 'error' })
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    // Emails are case-insensitive — normalize so "Natalia@" == "natalia@"
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      const next = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('next') : null
      router.push(next && next.startsWith('/') ? next : '/dashboard')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
          <p style={{ marginTop: '12px', fontSize: '15px', color: 'var(--text-primary)', fontFamily: 'DM Serif Display, serif' }}>Welcome back</p>
        </div>
        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '20px', padding: '32px' }}>
          {GOOGLE_AUTH_ENABLED && (
            <>
              <button type="button" onClick={handleGoogleSignIn} style={{ width: '100%', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '10px 16px', borderRadius: '12px', background: '#FCFCFC', border: 'none', color: '#1F1F1F', fontSize: '14px', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
                <GoogleGLogo /> Continue with Google
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              </div>
            </>
          )}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', outline: 'none', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>Password</label>
                <Link href="/forgot-password" style={{ fontSize: '12px', color: '#D4AF37', textDecoration: 'none' }}>Forgot password?</Link>
              </div>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', outline: 'none', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
            </div>
            {error && <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.2)', fontSize: '13px', color: '#ff6b6b' }}>{error}</div>}
            <Button type="submit" variant="primary" disabled={loading} style={{ width: '100%', marginTop: '8px', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Logging in...' : 'Log in'}
            </Button>
          </form>
          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
            Don't have an account? <Link href="/signup" style={{ color: '#D4AF37', textDecoration: 'none', fontWeight: 600 }}>Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
